-- ═══════════════════════════════════════════════════════════════════════════
-- PORTEIRO ERP — schema completo
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. É idempotente: pode
-- rodar de novo sem quebrar nada. A seção MIGRAÇÃO no topo cuida dos bancos
-- que já rodaram a versão anterior.
--
-- PRINCÍPIOS QUE O SCHEMA IMPÕE (não são detalhe, são o jogo):
--   1. Não existe coluna "culpado". O gabarito é DERIVADO da regra do contrato
--      pelo motor do jogo. Se alguém pudesse marcar aqui, o gabarito descolaria
--      da regra e o jogo ficaria injusto.
--   2. `chance` nunca é 1 (CHECK no banco). Certeza vira checklist, e checklist
--      mata o jogo.
--   3. Arquivo é IMUTÁVEL e endereçado pelo sha256. Nunca se sobrescreve um
--      asset — sobe outro e a peça passa a apontar pra ele. É isso que faz o
--      rollback de um bundle antigo reproduzir o jogo daquele dia pixel a pixel.
--   4. RLS ligado e SEM policy: ninguém alcança as tabelas com a chave pública.
--      Todo acesso passa pelo servidor do ERP, que usa a secret key.
--
-- VOCABULÁRIO (refatoração de ago/2026):
--   REGIÃO   → VILA    (a unidade de mundo; sempre no singular, "vila")
--   CIDADE   → LUGAR   (nome solto que vai pro passe; SEMPRE ligado a uma vila)
--   (novo)     NÍVEL   (a vila tem ~3 níveis, cada um com N variações)
--   (novo)     RAÇA    (atravessa tudo que é de personagem)
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── utilidades ─────────────────────────────────────────────────────────────
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO — Região vira VILA, Cidade vira LUGAR
--
-- Precisa vir ANTES de qualquer `create table`, senão o `create table if not
-- exists vila` criaria uma tabela vazia ao lado da `regiao` cheia de dados.
-- Renomear preserva as linhas, os ids e as FKs que apontam pra cá.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
begin
  -- regiao → vila
  if to_regclass('public.regiao') is not null and to_regclass('public.vila') is null then
    alter table public.regiao rename to vila;
  end if;

  -- regiao_ligacao → vila_ligacao (+ coluna e constraints, que o PostgREST usa
  -- pelo NOME na hora de embutir a relação — ver as consultas em app/mundo/vilas)
  if to_regclass('public.regiao_ligacao') is not null and to_regclass('public.vila_ligacao') is null then
    alter table public.regiao_ligacao rename to vila_ligacao;
  end if;
  if to_regclass('public.vila_ligacao') is not null then
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = 'vila_ligacao' and column_name = 'regiao_id') then
      alter table public.vila_ligacao rename column regiao_id to vila_id;
    end if;
    if exists (select 1 from pg_constraint where conname = 'regiao_ligacao_regiao_id_fkey') then
      alter table public.vila_ligacao rename constraint regiao_ligacao_regiao_id_fkey to vila_ligacao_vila_id_fkey;
    end if;
    if exists (select 1 from pg_constraint where conname = 'regiao_ligacao_destino_id_fkey') then
      alter table public.vila_ligacao rename constraint regiao_ligacao_destino_id_fkey to vila_ligacao_destino_id_fkey;
    end if;
  end if;

  -- regiao_documento → vila_documento
  if to_regclass('public.regiao_documento') is not null and to_regclass('public.vila_documento') is null then
    alter table public.regiao_documento rename to vila_documento;
  end if;
  if to_regclass('public.vila_documento') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'vila_documento' and column_name = 'regiao_id') then
    alter table public.vila_documento rename column regiao_id to vila_id;
  end if;

  -- cidade → lugar
  if to_regclass('public.cidade') is not null and to_regclass('public.lugar') is null then
    alter table public.cidade rename to lugar;
  end if;
  if to_regclass('public.lugar') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'lugar' and column_name = 'regiao_id') then
    alter table public.lugar rename column regiao_id to vila_id;
  end if;

  -- missao.regiao_id → missao.vila_id
  if to_regclass('public.missao') is not null
     and exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'missao' and column_name = 'regiao_id') then
    alter table public.missao rename column regiao_id to vila_id;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CONFIGURAÇÃO — as travas que o admin edita na tela de Settings
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.config (
  chave       text primary key,
  valor       jsonb not null,
  descricao   text,
  atualizado_em timestamptz not null default now()
);

insert into public.config (chave, valor, descricao) values
  ('canvas_largura', '1080'::jsonb, 'Largura EXATA exigida de toda peça de personagem.'),
  ('canvas_altura',  '1080'::jsonb, 'Altura EXATA exigida de toda peça de personagem.'),
  ('max_kb',         '400'::jsonb,  'Tamanho máximo de uma PEÇA de personagem, em KB.'),
  ('max_kb_cenario', '4096'::jsonb, 'Tamanho máximo de uma arte de cenário, em KB (são telas inteiras).'),
  ('max_kb_audio',   '8192'::jsonb, 'Tamanho máximo de um arquivo de áudio, em KB.'),
  ('max_kb_mapa',    '20480'::jsonb, 'Tamanho máximo da imagem do mapa-múndi, em KB.'),
  ('formatos_imagem','["image/png"]'::jsonb, 'MIME types aceitos para imagem.'),
  ('formatos_audio', '["audio/mpeg","audio/wav"]'::jsonb, 'MIME types aceitos para áudio.')
on conflict (chave) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- ASSETS — content-addressed, imutáveis
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.asset (
  id         uuid primary key default gen_random_uuid(),
  sha256     text not null unique,
  caminho    text not null,          -- caminho no bucket `assets`
  nome_original text,
  mime       text not null,
  bytes      int  not null,
  largura    int,                    -- só imagem
  altura     int,
  criado_em  timestamptz not null default now()
);

-- Bucket público: o jogo e o preview do ERP carregam a arte direto por URL.
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- RAÇA — o eixo novo do conteúdo de personagem
--
-- A raça atravessa paleta de cor, peça de arte e vocabulário de NOMES (não as
-- falas, que ficam genéricas de propósito). Temperamento é o único vocabulário
-- de personagem que NÃO tem raça própria — é geral, e mora em Gameplay.
--
-- `raca_id` NULO nessas tabelas quer dizer "serve para TODAS as raças" — é o
-- que permite ter uma peça genérica (um cinto, um item de roupa) sem duplicá-la
-- em cada raça. As telas mostram isso como o card "Todas".
--
-- `codigo` é o código interno SEQUENCIAL pedido no cadastro. Humano nasce como
-- 1 e é a raça padrão de filtro em todas as telas de Personagem.
-- ═══════════════════════════════════════════════════════════════════════════
create sequence if not exists public.raca_codigo_seq;

create table if not exists public.raca (
  id        uuid primary key default gen_random_uuid(),
  codigo    int  not null unique default nextval('public.raca_codigo_seq'),
  chave     text not null unique,
  nome      text not null,
  descricao text,
  /* Etnias da raça — lista de textos livres, sem tabela própria de propósito:
     é vocabulário de lore, não entidade com comportamento. */
  etnias    text[] not null default '{}',
  cor       text check (cor is null or cor ~* '^#[0-9a-f]{6}$'),
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter sequence public.raca_codigo_seq owned by public.raca.codigo;

-- A raça padrão. Todo filtro de tela abre nela.
insert into public.raca (codigo, chave, nome, descricao, ordem)
values (1, 'humano', 'Humano', 'A raça padrão do jogo — o único visitante que existe hoje na cabine.', 0)
on conflict (chave) do nothing;

-- Mantém a sequência à frente do maior código já usado (inclusive o 1 semeado).
select setval('public.raca_codigo_seq', greatest(1, coalesce((select max(codigo) from public.raca), 1)));

-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPERAMENTO — o vocabulário de como um povo reage a outro
--
-- É GERAL, sem raça própria — "desconfiança" não muda de significado entre
-- povos. Vive em Gameplay › Temperamentos, e a Vila usa a lista na Aba
-- Temperamento pra dizer "esta vila sente TANTO de TAL temperamento por TAL
-- raça" (a raça entra ali, na ligação — não aqui no cadastro).
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.temperamento (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  descricao text,
  /* Positivo (+1) sobe no gráfico, negativo (-1) desce. É o que dá sinal ao
     eixo do gráfico da Aba Temperamento sem precisar de uma tabela de
     "polaridade". */
  sinal     int not null default -1 check (sinal in (-1, 1)),
  cor       text check (cor is null or cor ~* '^#[0-9a-f]{6}$'),
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
-- Migração de bancos que já rodaram a versão anterior (temperamento tinha raça própria).
alter table public.temperamento drop column if exists raca_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROTAGONISTAS — o elenco fixo do jogo (não sorteado)
--
-- Nasce simples de propósito: nome e descrição. Fica em Personagens, primeiro
-- item do menu, porque é o primeiro lugar onde um novo integrante do time
-- entende quem são os personagens fixos antes de mexer em conteúdo sorteado.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.protagonista (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  descricao text,
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONAGEM MODULAR
-- ═══════════════════════════════════════════════════════════════════════════

-- Paletas: uma cor é sorteada POR PALETA e pintada em todas as peças que
-- apontam pra ela. É isso que garante que corpo, orelha, rosto e nariz nunca
-- saiam em tons de pele diferentes.
create table if not exists public.paleta (
  id     uuid primary key default gen_random_uuid(),
  chave  text not null unique,
  nome   text not null,
  descricao text,
  /* Nulo = paleta de todas as raças. Um tom de pele élfico mora numa paleta
     com raca_id da raça élfica; o couro do cinto fica em uma paleta sem raça. */
  raca_id uuid references public.raca(id) on delete set null,
  ordem  int  not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.paleta add column if not exists raca_id uuid references public.raca(id) on delete set null;
create index if not exists paleta_raca_idx on public.paleta(raca_id, ordem);

create table if not exists public.cor (
  id        uuid primary key default gen_random_uuid(),
  paleta_id uuid not null references public.paleta(id) on delete cascade,
  nome      text not null,
  hex       text not null check (hex ~* '^#[0-9a-f]{6}$'),
  ordem     int  not null default 0
);
create index if not exists cor_paleta_idx on public.cor(paleta_id, ordem);

-- Grupo de camada: "cabelo-traseiro", "corpo", "roupa"... A ORDEM aqui é o
-- empilhamento. Grupo novo (uma bolsa, um chapéu) entra sem renumerar nada.
--
-- ⚠️ Camadas NÃO tem raça: a ordem de empilhamento é geral do jogo, não de um
-- povo. Por isso a tela dela mudou de Personagens para Settings.
create table if not exists public.grupo_camada (
  id       uuid primary key default gen_random_uuid(),
  chave    text not null unique,
  nome     text not null,
  ordem    int  not null default 0,
  -- Grupo opcional entra ou não entra no personagem, com esta chance.
  opcional boolean not null default false,
  chance   numeric(4,3) check (chance is null or (chance > 0 and chance < 1)),
  -- Peças de famílias iguais são sorteadas EM CONJUNTO (a franja e a massa de
  -- trás do mesmo penteado; o blush desenhado pra aquele nariz).
  familia  text,
  descricao text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists grupo_camada_ordem_idx on public.grupo_camada(ordem);

-- Sub-camada: dentro do grupo, a ordem fina.
--   cor         → máscara pintada por uma paleta
--   traco       → arte de linha, por cima
--   arte_pronta → arquivo único com a cor já embutida (blush, rugas)
create table if not exists public.sub_camada (
  id        uuid primary key default gen_random_uuid(),
  grupo_id  uuid not null references public.grupo_camada(id) on delete cascade,
  chave     text not null,
  nome      text not null,
  ordem     int  not null default 0,
  tipo      text not null check (tipo in ('cor','traco','arte_pronta')),
  paleta_id uuid references public.paleta(id) on delete set null,
  -- Sub-camada OPCIONAL entra pela chance dela, no meio do grupo. É o que
  -- permite blush e rugas ficarem ENTRE a cor e o traço do rosto — a coisa que
  -- a lista chapada de níveis não conseguia expressar sem um comentário.
  opcional  boolean not null default false,
  chance    numeric(4,3) check (chance is null or (chance > 0 and chance < 1)),
  unique (grupo_id, chave),
  -- tipo 'cor' exige paleta; os outros não têm paleta.
  constraint paleta_so_em_cor check (
    (tipo = 'cor' and paleta_id is not null) or (tipo <> 'cor' and paleta_id is null)
  )
);
create index if not exists sub_camada_grupo_idx on public.sub_camada(grupo_id, ordem);

-- A peça: uma variante do grupo (cabelo 1, cabelo 2, nariz 3...).
create table if not exists public.peca (
  id       uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupo_camada(id) on delete cascade,
  chave    text not null,
  nome     text not null,
  -- Restrições de sorteio. `genero` nulo = serve pra qualquer um.
  genero   text check (genero in ('masculino','feminino')),
  /* Nulo = peça de todas as raças. É o caminho para a arte genérica não
     precisar ser duplicada em cada povo. */
  raca_id  uuid references public.raca(id) on delete set null,
  arquetipos text[] not null default '{generico}',
  -- Conjunto: dentro de uma família, o que casa com o quê. Duas peças de
  -- grupos diferentes com a mesma família+conjunto entram sempre juntas.
  conjunto text,
  ativo    boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (grupo_id, chave)
);
alter table public.peca add column if not exists raca_id uuid references public.raca(id) on delete set null;
create index if not exists peca_grupo_idx on public.peca(grupo_id);
create index if not exists peca_raca_idx on public.peca(raca_id);

-- Um arquivo por sub-camada da peça. É aqui que traço e cor se juntam.
create table if not exists public.peca_arquivo (
  id            uuid primary key default gen_random_uuid(),
  peca_id       uuid not null references public.peca(id) on delete cascade,
  sub_camada_id uuid not null references public.sub_camada(id) on delete cascade,
  asset_id      uuid not null references public.asset(id),
  unique (peca_id, sub_camada_id)
);

-- A sombra: não é peça sorteável, entra sempre por cima de tudo.
create table if not exists public.sombra (
  id        int primary key default 1 check (id = 1),
  asset_id  uuid references public.asset(id),
  opacidade numeric(4,3) not null default 0.220 check (opacidade >= 0 and opacidade <= 1),
  atualizado_em timestamptz not null default now()
);
insert into public.sombra (id) values (1) on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- MUNDO
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.cenario (
  id    uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome  text not null,
  arte_dia_id   uuid references public.asset(id),
  arte_tarde_id uuid references public.asset(id),
  arte_noite_id uuid references public.asset(id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.som (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  asset_id  uuid references public.asset(id),
  volume    numeric(4,3) not null default 0.500 check (volume >= 0 and volume <= 1),
  loop      boolean not null default false,
  categoria text not null default 'efeito' check (categoria in ('musica','efeito')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.ambiente_sonoro (
  id           uuid primary key default gen_random_uuid(),
  chave        text not null unique,
  nome         text not null,
  tema_id      uuid references public.som(id) on delete set null,
  ambiente_id  uuid references public.som(id) on delete set null,
  portao_id    uuid references public.som(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- A imagem base do mapa-múndi sobre a qual as vilas são posicionadas
-- (Vilas → Editar mapa). Linha única, como `sombra`.
create table if not exists public.mapa_mundi (
  id        int primary key default 1 check (id = 1),
  asset_id  uuid references public.asset(id),
  atualizado_em timestamptz not null default now()
);
insert into public.mapa_mundi (id) values (1) on conflict (id) do nothing;

-- ── CLIMA: cadastro solto, usado pela vila em proporção ────────────────────
-- A vila não tem UM clima: tem uma distribuição ("70% chuvoso, 30% neblina").
-- O cadastro é geral (fica no fim do menu Mundo) e a proporção é por vila.
create table if not exists public.clima (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  descricao text,
  icone     text not null default '🌤️',
  cor       text check (cor is null or cor ~* '^#[0-9a-f]{6}$'),
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ── VILA (era `regiao`) ────────────────────────────────────────────────────
-- A unidade de mundo. Tudo pendura aqui: níveis, documentos, clima, relações
-- com outras vilas, opiniões e temperamento por raça.
create table if not exists public.vila (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  descricao text,
  cor       text check (cor is null or cor ~* '^#[0-9a-f]{6}$'),
  clima     text,                    -- LEGADO: texto livre da versão anterior
  -- posição no mapa-múndi do jogo (em % da imagem, definida arrastando em Vilas → Editar mapa)
  pos_x     int,
  pos_y     int,
  -- ícone que representa a vila no mapa-múndi; sem ícone, o editor desenha um pino da `cor`
  icone_mapa_id uuid references public.asset(id),
  cenario_id        uuid references public.cenario(id) on delete set null,
  ambiente_sonoro_id uuid references public.ambiente_sonoro(id) on delete set null,
  regras_especificas text,
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.vila add column if not exists icone_mapa_id uuid references public.asset(id);

-- Aba 2 — Política: como o reino funciona por dentro.
alter table public.vila add column if not exists politica_interna text;
-- Aba 3 — Cultura: costumes + o nível educacional em distribuição.
alter table public.vila add column if not exists costumes text;

-- ⚠️ NÍVEL EDUCACIONAL: quatro faixas que SOMAM 100. Subir uma abaixa as
-- outras — é distribuição de população, não quatro notas independentes. O
-- padrão é 100% na média, como pedido.
--   0–20   analfabeto / ignorante  (Analfabeto, Inculto, Rústico)
--   21–50  na média                (Letrado básico, Instruído, Paroquiano)
--   51–80  acima da média          (Erudito, Estudioso, Escrivão)
--   81–100 muito alto / rebuscado  (Sábio magistral, Filósofo real, Polímata)
alter table public.vila add column if not exists educacao_analfabeto numeric(5,2) not null default 0;
alter table public.vila add column if not exists educacao_media      numeric(5,2) not null default 100;
alter table public.vila add column if not exists educacao_acima      numeric(5,2) not null default 0;
alter table public.vila add column if not exists educacao_alto       numeric(5,2) not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vila_educacao_soma_100') then
    alter table public.vila add constraint vila_educacao_soma_100 check (
      round(educacao_analfabeto + educacao_media + educacao_acima + educacao_alto) = 100
    );
  end if;
end $$;

-- Estradas: caminhos possíveis entre vilas.
create table if not exists public.vila_ligacao (
  vila_id    uuid not null references public.vila(id) on delete cascade,
  destino_id uuid not null references public.vila(id) on delete cascade,
  primary key (vila_id, destino_id),
  check (vila_id <> destino_id)
);

-- ── Aba 1 — a distribuição de clima da vila ────────────────────────────────
-- `percentual` é quanto aquele clima aparece por lá. O validador avisa quando
-- a soma foge de 100.
create table if not exists public.vila_clima (
  vila_id    uuid not null references public.vila(id) on delete cascade,
  clima_id   uuid not null references public.clima(id) on delete cascade,
  percentual numeric(5,2) not null default 0 check (percentual >= 0 and percentual <= 100),
  primary key (vila_id, clima_id)
);

-- ── Aba 2 — relações entre reinos ──────────────────────────────────────────
-- Vila que NÃO aparece aqui é neutra por omissão: não existe linha "neutro",
-- e é por isso que o tipo é obrigatório (tirar a relação = apagar a linha).
create table if not exists public.vila_relacao (
  vila_id  uuid not null references public.vila(id) on delete cascade,
  alvo_id  uuid not null references public.vila(id) on delete cascade,
  tipo     text not null check (tipo in ('oposicao','alianca')),
  primary key (vila_id, alvo_id),
  check (vila_id <> alvo_id)
);

-- ── Aba 5 — o que ESTA vila pensa sobre as outras ──────────────────────────
-- Diferente de `vila_relacao` (que é o fato político), isto é a opinião do
-- povo: um texto e um percentual que anda de -100 (ódio) a +100 (admiração).
create table if not exists public.vila_opiniao_externa (
  id         uuid primary key default gen_random_uuid(),
  vila_id    uuid not null references public.vila(id) on delete cascade,
  alvo_id    uuid not null references public.vila(id) on delete cascade,
  descricao  text,
  percentual numeric(5,2) not null default 0 check (percentual >= -100 and percentual <= 100),
  ordem      int not null default 0,
  unique (vila_id, alvo_id),
  check (vila_id <> alvo_id)
);

-- ── Aba 6 — temperamento popular em relação a outras raças ─────────────────
-- "Nesta vila, os humanos sentem 60% de desconfiança pelos élficos."
create table if not exists public.vila_temperamento (
  id              uuid primary key default gen_random_uuid(),
  vila_id         uuid not null references public.vila(id) on delete cascade,
  raca_id         uuid not null references public.raca(id) on delete cascade,
  temperamento_id uuid not null references public.temperamento(id) on delete cascade,
  percentual      numeric(5,2) not null default 50 check (percentual >= 0 and percentual <= 100),
  ordem           int not null default 0,
  unique (vila_id, raca_id, temperamento_id)
);

-- ── Aba Raças — quais raças costumam aparecer por aqui ─────────────────────
-- Distribuição, igual clima: sobe uma, as outras cedem espaço (mesmo gráfico
-- de barra 100%, cores tiradas da própria raça). Vila sem linha nenhuma aqui
-- é lida como "só Humano" — é o único povo que o jogo tem hoje.
create table if not exists public.vila_raca (
  vila_id    uuid not null references public.vila(id) on delete cascade,
  raca_id    uuid not null references public.raca(id) on delete cascade,
  percentual numeric(5,2) not null default 0 check (percentual >= 0 and percentual <= 100),
  primary key (vila_id, raca_id)
);

-- ── Aba Celebridades — gente famosa desta vila ──────────────────────────────
-- Hoje só nome + descrição, presa à vila por FK. Vira cadastro com menu
-- próprio mais pra frente; por ora é uma tabela simples.
create table if not exists public.celebridade (
  id        uuid primary key default gen_random_uuid(),
  vila_id   uuid not null references public.vila(id) on delete cascade,
  nome      text not null,
  descricao text,
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists celebridade_vila_idx on public.celebridade(vila_id, ordem);

-- ── Aba 4 — NÍVEL (o que antes era "cidade" como lugar jogável) ────────────
-- A chave de verdade é VILA + NÍVEL + VARIAÇÃO. Normalmente 3 níveis por vila,
-- com quantas variações se quiser dentro de cada um.
--
-- Cada nível carrega as três artes de cenário (dia/tarde/noite) do mesmo jeito
-- que a tabela `cenario` — é o mesmo contrato de arte, só que ancorado na vila.
create table if not exists public.nivel (
  id       uuid primary key default gen_random_uuid(),
  vila_id  uuid not null references public.vila(id) on delete cascade,
  nivel    int not null check (nivel > 0),
  variacao int not null check (variacao > 0),
  nome     text,                     -- rótulo opcional ("Muralha externa")
  descricao text,
  arte_dia_id   uuid references public.asset(id),
  arte_tarde_id uuid references public.asset(id),
  arte_noite_id uuid references public.asset(id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (vila_id, nivel, variacao)
);
create index if not exists nivel_vila_idx on public.nivel(vila_id, nivel, variacao);

-- Opiniões do povo daquele nível. `tipo` decide o lado do gráfico:
--   popular   → sobe (vai virar prompt POSITIVO)
--   impopular → desce (vai virar prompt NEGATIVO)
-- O `percentual` é editado FORA do modal, direto no gráfico.
create table if not exists public.nivel_opiniao (
  id         uuid primary key default gen_random_uuid(),
  nivel_id   uuid not null references public.nivel(id) on delete cascade,
  tipo       text not null check (tipo in ('popular','impopular')),
  titulo     text not null,
  descricao  text,
  percentual numeric(5,2) not null default 50 check (percentual >= 0 and percentual <= 100),
  ordem      int not null default 0
);
create index if not exists nivel_opiniao_idx on public.nivel_opiniao(nivel_id, tipo, ordem);

-- ── LUGAR (era `cidade`) ───────────────────────────────────────────────────
-- Nome solto que vai para o campo "Cidade" do passe e para a resposta de "de
-- onde você veio". Continua sendo sorteado aleatoriamente — a diferença é que
-- agora TODO lugar pertence a uma vila, então o mundo fica amarrado.
create table if not exists public.lugar (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  vila_id   uuid references public.vila(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- Lugares órfãos da versão anterior adotam a primeira vila; depois disso a
-- coluna vira obrigatória. Se não existe vila nenhuma ainda, fica como está e
-- a trava entra na próxima rodada do schema.
do $$
declare primeira uuid;
begin
  select id into primeira from public.vila order by ordem, nome limit 1;
  if primeira is not null then
    update public.lugar set vila_id = primeira where vila_id is null;
  end if;
  if not exists (select 1 from public.lugar where vila_id is null) then
    alter table public.lugar alter column vila_id set not null;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOCUMENTOS
--
-- O "selo do Rei" deixou de ser um campo booleano do passe e virou um TIPO DE
-- DOCUMENTO como outro qualquer. Consequência: cada vila pode exigir papéis
-- diferentes (carta da guilda, salvo-conduto, mandado) sem nenhuma lógica nova.
--
-- ⚠️ A falsificação continua tendo que ser visível A OLHO NU: o documento
-- declara a cor autêntica da cera e as cores que o falsificador erra. É isso
-- que garante que o jogador sempre consegue decidir olhando.
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.tipo_documento (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  descricao text,
  /* Cor autêntica da cera/lacre. Nulo = documento sem selo (só campos). */
  cor_autentica text,
  /* As cores que o falsificador erra. Nunca inclua a autêntica. */
  cores_falsas  text[] not null default '{}',
  arte_id   uuid references public.asset(id),
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Os campos que o documento mostra. `fonte` liga o campo à verdade do
-- visitante — é o que permite a regra comparar declarado × real.
create table if not exists public.tipo_documento_campo (
  id       uuid primary key default gen_random_uuid(),
  tipo_documento_id uuid not null references public.tipo_documento(id) on delete cascade,
  chave    text not null,
  rotulo   text not null,
  ordem    int not null default 0,
  fonte    text not null default 'texto_livre'
           check (fonte in ('nome','cidade','profissao','texto_livre')),
  /* Campo vazio fica VAZIO na tela — a ausência é a pista. */
  pode_faltar boolean not null default false,
  unique (tipo_documento_id, chave)
);
create index if not exists tipo_documento_campo_idx
  on public.tipo_documento_campo(tipo_documento_id, ordem);

-- Quais papéis cada vila cobra. É aqui que "variedade de documento por vila"
-- acontece, sem tocar em código.
create table if not exists public.vila_documento (
  vila_id uuid not null references public.vila(id) on delete cascade,
  tipo_documento_id uuid not null references public.tipo_documento(id) on delete cascade,
  exigido   boolean not null default true,
  primary key (vila_id, tipo_documento_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- CONTEÚDO DE GAMEPLAY
-- ═══════════════════════════════════════════════════════════════════════════

-- Itens que podem aparecer numa bolsa inspecionada.
--   comum    → ruído, qualquer um carrega, nunca significa nada
--   oficio   → ferramenta de trabalho, revela a profissão REAL
--   suspeito → difícil de justificar
create table if not exists public.item_bolsa (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  icone     text not null default '📦',
  categoria text not null check (categoria in ('comum','oficio','suspeito')),
  camada    text check (camada in ('fraca','forte','decisiva')),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Marcas no corpo. Coordenadas em % do canvas do personagem.
-- ⚠️ topo + altura tem que caber na faixa visível: a arte da cabine cobre o
-- visitante a partir de ~74% da altura do canvas.
create table if not exists public.marca (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  regiao    text not null check (regiao in ('roupa','rosto')),
  cor       text not null,
  topo      numeric(6,3) not null check (topo >= 0 and topo <= 100),
  esquerda  numeric(6,3) not null check (esquerda >= 0 and esquerda <= 100),
  largura   numeric(6,3) not null check (largura > 0 and largura <= 100),
  altura    numeric(6,3) not null check (altura > 0 and altura <= 100),
  opacidade numeric(4,3) not null default 0.5 check (opacidade > 0 and opacidade <= 1),
  desfoque  numeric(6,2) not null default 0,
  giro      numeric(6,2) not null default 0,
  /* border-radius CSS da mancha — é o que tira a cara de "bolha" perfeita. */
  raio      text not null default '50%',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- a trava da faixa visível, no banco
  constraint marca_cabe_na_janela check (topo + altura <= 74)
);

create table if not exists public.profissao (
  id    uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome  text not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ⚠️ chance < 1 SEMPRE. "80% dos fazendeiros têm lama" quer dizer que 20% não
-- têm — e é essa margem que impede o jogador de decorar uma tabela.
create table if not exists public.profissao_item (
  profissao_id uuid not null references public.profissao(id) on delete cascade,
  item_id      uuid not null references public.item_bolsa(id) on delete cascade,
  chance       numeric(4,3) not null check (chance > 0 and chance < 1),
  primary key (profissao_id, item_id)
);

create table if not exists public.profissao_marca (
  profissao_id uuid not null references public.profissao(id) on delete cascade,
  marca_id     uuid not null references public.marca(id) on delete cascade,
  chance       numeric(4,3) not null check (chance > 0 and chance < 1),
  primary key (profissao_id, marca_id)
);

-- Falas na voz do personagem. NUNCA entregam a verdade — são atmosfera.
create table if not exists public.profissao_fala (
  id           uuid primary key default gen_random_uuid(),
  profissao_id uuid not null references public.profissao(id) on delete cascade,
  tipo         text not null check (tipo in ('trabalho','motivo')),
  texto        text not null,
  ordem        int not null default 0
);
create index if not exists profissao_fala_idx on public.profissao_fala(profissao_id, tipo);

-- Vocabulário solto que a geração sorteia. Agora por RAÇA: nome élfico não sai
-- na boca de um humano. `raca_id` nulo = serve para todas as raças.
create table if not exists public.vocabulario (
  id    uuid primary key default gen_random_uuid(),
  tipo  text not null check (tipo in (
    'nome_masculino','nome_feminino','sobrenome','fala_neutra','resposta_origem'
  )),
  texto text not null,
  raca_id uuid references public.raca(id) on delete cascade,
  ordem int not null default 0,
  unique (tipo, texto)
);
alter table public.vocabulario add column if not exists raca_id uuid references public.raca(id) on delete cascade;
create index if not exists vocabulario_tipo_idx on public.vocabulario(tipo, ordem);
create index if not exists vocabulario_raca_idx on public.vocabulario(raca_id, tipo, ordem);

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRAÇÃO — conteúdo de personagem sem raça vira Humano (ago/2026)
--
-- Antes de raça existir, todo conteúdo de personagem era implicitamente
-- humano. Joga esse legado pra dentro do Humano explicitamente — MENOS as
-- falas (fala_neutra, resposta_origem), que continuam genéricas de propósito.
--
-- ⚠️ Roda toda vez que este arquivo é colado: uma peça/paleta/nome que você
-- deixar sem raça de propósito DEPOIS desta migração também vai ser puxada
-- pro Humano na próxima colada do schema.sql. Cole só quando for aplicar
-- mudança nova, não como rotina.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare humano_id uuid;
begin
  select id into humano_id from public.raca where codigo = 1;
  if humano_id is not null then
    update public.paleta set raca_id = humano_id where raca_id is null;
    update public.peca   set raca_id = humano_id where raca_id is null;
    update public.vocabulario set raca_id = humano_id
      where raca_id is null and tipo in ('nome_masculino', 'nome_feminino', 'sobrenome');
  end if;
end $$;

-- ── REGRAS: a condição é DADO, não código ──────────────────────────────────
-- `condicao` é uma árvore JSON avaliada por um interpretador puro no jogo.
-- Ex.: {"e":[{"documentoAutentico":"passe"},{"campoPreenchido":"profissao"}]}
-- ⚠️ Toda regra tem que ser verificável A OLHO NU pelo jogador.
create table if not exists public.regra (
  id       uuid primary key default gen_random_uuid(),
  chave    text not null unique,
  nome     text not null,
  texto    text not null,            -- o que aparece pro jogador
  condicao jsonb not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Cartaz pregado na parede da cabine: a cola DURANTE o turno.
create table if not exists public.cartaz (
  id       uuid primary key default gen_random_uuid(),
  chave    text not null unique,
  regra_id uuid references public.regra(id) on delete cascade,
  titulo   text not null,
  texto    text not null,
  amostra  jsonb,                    -- {"tipo":"selo","cor":"vermelho"} | {"tipo":"sem-selo"}
  itens    text[] not null default '{}',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ── PERFIL DE GERAÇÃO: a dificuldade de um nível, em números ────────────────
create table if not exists public.perfil_geracao (
  id    uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome  text not null,
  chance_sem_selo            numeric(4,3) not null default 0 check (chance_sem_selo >= 0 and chance_sem_selo <= 1),
  chance_selo_forjado        numeric(4,3) not null default 0 check (chance_selo_forjado >= 0 and chance_selo_forjado <= 1),
  chance_farsante            numeric(4,3) not null default 0 check (chance_farsante >= 0 and chance_farsante <= 1),
  chance_farsante_se_entrega numeric(4,3) not null default 0 check (chance_farsante_se_entrega >= 0 and chance_farsante_se_entrega <= 1),
  -- ⚠️ manter baixo: passe em branco é atalho grátis que dispensa investigar
  chance_sem_profissao       numeric(4,3) not null default 0 check (chance_sem_profissao >= 0 and chance_sem_profissao <= 1),
  chance_cidade_divergente   numeric(4,3) not null default 0 check (chance_cidade_divergente >= 0 and chance_cidade_divergente <= 1),
  chance_item_suspeito       numeric(4,3) not null default 0 check (chance_item_suspeito >= 0 and chance_item_suspeito <= 1),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Quais profissões aparecem no nível — é aqui que o "evento do dia" atua.
create table if not exists public.perfil_profissao (
  perfil_id    uuid not null references public.perfil_geracao(id) on delete cascade,
  profissao_id uuid not null references public.profissao(id) on delete cascade,
  primary key (perfil_id, profissao_id)
);

create table if not exists public.perfil_item_suspeito (
  perfil_id uuid not null references public.perfil_geracao(id) on delete cascade,
  item_id   uuid not null references public.item_bolsa(id) on delete cascade,
  primary key (perfil_id, item_id)
);

-- ── MISSÕES: o catálogo do quadro da guilda ────────────────────────────────
create table if not exists public.missao (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  vila_id   uuid references public.vila(id) on delete set null,
  classe    text not null default 'F' check (classe in ('tutorial','F','E','D','C','B','A','S')),
  evento    text,
  problemas text[] not null default '{}',
  dificuldade int not null default 1 check (dificuldade between 1 and 5),
  cenario_id         uuid references public.cenario(id) on delete set null,
  ambiente_sonoro_id uuid references public.ambiente_sonoro(id) on delete set null,
  regra_id  uuid references public.regra(id) on delete set null,
  perfil_id uuid references public.perfil_geracao(id) on delete set null,
  periodo   text not null default 'dia' check (periodo in ('dia','noite')),
  num_visitantes      int not null default 8 check (num_visitantes > 0),
  pagamento_por_acerto int not null default 10,
  multa_por_erro       int not null default 5,
  fracao_para_aprovar  numeric(4,3) not null default 0.8 check (fracao_para_aprovar > 0 and fracao_para_aprovar <= 1),
  ativo     boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.missao add column if not exists vila_id uuid references public.vila(id) on delete set null;

-- Em que NÍVEL da vila a missão acontece. Nulo = a vila inteira decide.
alter table public.missao add column if not exists nivel_id uuid references public.nivel(id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════════════
-- AJUSTES GLOBAIS DO JOGO (o que hoje é data/timelapse.ts etc.)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ajustes_jogo (
  id int primary key default 1 check (id = 1),
  timelapse_segundos_por_momento int not null default 20 check (timelapse_segundos_por_momento > 0),
  timelapse_segundos_de_fade     int not null default 4  check (timelapse_segundos_de_fade >= 0),
  timelapse_ativo                boolean not null default true,
  atualizado_em timestamptz not null default now()
);
insert into public.ajustes_jogo (id) values (1) on conflict (id) do nothing;

-- A cor do selo saiu daqui e foi para o TIPO DE DOCUMENTO: cada papel declara a
-- própria cera autêntica, e é isso que permite variedade de documento por vila.
-- (Migração de bancos que já rodaram a versão anterior.)
alter table public.ajustes_jogo drop column if exists cor_selo_autentica;
alter table public.ajustes_jogo drop column if exists cores_selo_falsas;

-- ═══════════════════════════════════════════════════════════════════════════
-- PUBLICAÇÃO — o bundle imutável que o jogo consome
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.bundle (
  id           uuid primary key default gen_random_uuid(),
  versao       int not null unique,
  conteudo     jsonb not null,
  notas        text,
  publicado_em timestamptz not null default now(),
  publicado_por text
);
create index if not exists bundle_versao_idx on public.bundle(versao desc);

-- Qual versão o jogo deve baixar. Rollback = trocar este número.
create table if not exists public.publicacao_atual (
  id     int primary key default 1 check (id = 1),
  versao int references public.bundle(versao),
  atualizado_em timestamptz not null default now()
);
insert into public.publicacao_atual (id) values (1) on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS de atualizado_em
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'config','paleta','grupo_camada','peca','cenario','som','ambiente_sonoro',
    'vila','item_bolsa','marca','profissao','regra','cartaz','perfil_geracao',
    'missao','sombra','ajustes_jogo','tipo_documento','mapa_mundi',
    'raca','temperamento','clima','nivel','celebridade','protagonista'
  ] loop
    execute format(
      'drop trigger if exists trg_%1$s_atualizado on public.%1$s;
       create trigger trg_%1$s_atualizado before update on public.%1$s
       for each row execute function public.tocar_atualizado_em();', t);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS: ligado e sem policy nenhuma.
-- Consequência: a chave publicável NÃO alcança nada. Todo acesso é pelo
-- servidor do ERP com a secret key (que ignora RLS). O jogo nunca fala com as
-- tabelas — ele baixa o bundle JSON.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename not like 'pg_%'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;
