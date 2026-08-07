-- ═══════════════════════════════════════════════════════════════════════════
-- PORTEIRO ERP — schema completo (Fase 0)
--
-- Cole isto inteiro no SQL Editor do Supabase e rode. É idempotente: pode
-- rodar de novo sem quebrar nada.
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
  ordem  int  not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

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
  arquetipos text[] not null default '{generico}',
  -- Conjunto: dentro de uma família, o que casa com o quê. Duas peças de
  -- grupos diferentes com a mesma família+conjunto entram sempre juntas.
  conjunto text,
  ativo    boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (grupo_id, chave)
);
create index if not exists peca_grupo_idx on public.peca(grupo_id);

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

create table if not exists public.regiao (
  id        uuid primary key default gen_random_uuid(),
  chave     text not null unique,
  nome      text not null,
  descricao text,
  cor       text check (cor is null or cor ~* '^#[0-9a-f]{6}$'),
  clima     text,
  -- posição no mapa-múndi do jogo
  pos_x     int,
  pos_y     int,
  cenario_id        uuid references public.cenario(id) on delete set null,
  ambiente_sonoro_id uuid references public.ambiente_sonoro(id) on delete set null,
  regras_especificas text,
  ordem     int not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Estradas: caminhos possíveis entre regiões.
create table if not exists public.regiao_ligacao (
  regiao_id  uuid not null references public.regiao(id) on delete cascade,
  destino_id uuid not null references public.regiao(id) on delete cascade,
  primary key (regiao_id, destino_id),
  check (regiao_id <> destino_id)
);

create table if not exists public.cidade (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  regiao_id uuid references public.regiao(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOCUMENTOS
--
-- O "selo do Rei" deixou de ser um campo booleano do passe e virou um TIPO DE
-- DOCUMENTO como outro qualquer. Consequência: cada região pode exigir papéis
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

-- Quais papéis cada região cobra. É aqui que "variedade de documento por
-- região" acontece, sem tocar em código.
create table if not exists public.regiao_documento (
  regiao_id uuid not null references public.regiao(id) on delete cascade,
  tipo_documento_id uuid not null references public.tipo_documento(id) on delete cascade,
  exigido   boolean not null default true,
  primary key (regiao_id, tipo_documento_id)
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

-- Vocabulário solto que a geração sorteia.
create table if not exists public.vocabulario (
  id    uuid primary key default gen_random_uuid(),
  tipo  text not null check (tipo in (
    'nome_masculino','nome_feminino','sobrenome','fala_neutra','resposta_origem'
  )),
  texto text not null,
  ordem int not null default 0,
  unique (tipo, texto)
);
create index if not exists vocabulario_tipo_idx on public.vocabulario(tipo, ordem);

-- ── REGRAS: a condição é DADO, não código ──────────────────────────────────
-- `condicao` é uma árvore JSON avaliada por um interpretador puro no jogo.
-- Ex.: {"e":[{"seloAutentico":true},{"campoPreenchido":"profissao"}]}
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
  regiao_id uuid references public.regiao(id) on delete set null,
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

-- ═══════════════════════════════════════════════════════════════════════════
-- AJUSTES GLOBAIS DO JOGO (o que hoje é data/timelapse.ts etc.)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.ajustes_jogo (
  id int primary key default 1 check (id = 1),
  timelapse_segundos_por_momento int not null default 20 check (timelapse_segundos_por_momento > 0),
  timelapse_segundos_de_fade     int not null default 4  check (timelapse_segundos_de_fade >= 0),
  timelapse_ativo                boolean not null default true,
  cor_selo_autentica  text not null default 'vermelho',
  cores_selo_falsas   text[] not null default '{azul,verde,roxo,laranja,preto}',
  atualizado_em timestamptz not null default now()
);
insert into public.ajustes_jogo (id) values (1) on conflict (id) do nothing;

-- A cor do selo saiu daqui e foi para o TIPO DE DOCUMENTO: cada papel declara a
-- própria cera autêntica, e é isso que permite variedade de documento por
-- região. (Migração de bancos que já rodaram a versão anterior.)
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
    'regiao','item_bolsa','marca','profissao','regra','cartaz','perfil_geracao',
    'missao','sombra','ajustes_jogo','tipo_documento'
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
