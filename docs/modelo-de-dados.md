# Modelo de dados do ERP → bundle → jogo

Este documento é o **mapa de tradução** entre as três formas que o mesmo conteúdo
assume: a tabela no Postgres, o campo no JSON publicado, e o tipo que o jogo
importa. Quando for hora de ligar o jogo no bundle, é daqui que se lê.

Três arquivos precisam concordar entre si. Quando um muda, os outros mudam junto:

| Arquivo | Papel |
|---|---|
| `erp/supabase/schema.sql` | a verdade no banco |
| `erp/src/lib/bundle.ts` (`montar`) | o retrato que vira JSON |
| `game/src/conteudo/tipos.ts` | o espelho do JSON no jogo |

E um quarto que decide o que pode ser publicado: `erp/src/lib/validacao.ts`.

---

## As quatro regras que atravessam tudo

Antes das tabelas, os invariantes. Quebrar qualquer um deles quebra o jogo de um
jeito que não aparece num teste de tipo.

**1. Tudo é referenciado por CHAVE no bundle, nunca por uuid.** O uuid só existe
dentro do Postgres. O JSON publicado é legível e usa a mesma identidade que o
código do jogo já usa (`humano`, `vale_das_sombras`, `passe_do_rei`).

**2. `raca: null` quer dizer TODAS as raças, não "sem raça".** Vale em paleta,
peça e vocabulário (nomes e falas). Ao filtrar conteúdo por raça, o motor
precisa aceitar os dois conjuntos: os daquela raça **mais** os de raça nula.
Tratar nulo como ausência esvazia toda a arte genérica de uma vez.
⚠️ **`temperamento` é a exceção**: não tem raça própria (é geral, tipo
"desconfiança" vale pra qualquer povo). A raça só entra na ligação
`vila_temperamento`, dizendo QUAL raça sente aquele temperamento naquela vila.

**3. Vila ausente de `relacoes` é NEUTRA.** Não existe linha `tipo: 'neutro'`.
Desfazer uma relação é apagar a linha. Um terceiro valor criaria dois jeitos de
dizer a mesma coisa e alguém acabaria mantendo linhas mortas.

**4. Percentual de opinião e de temperamento é sempre 0..100; quem dá o sinal é
outro campo.** Em `nivel.opinioes` o sinal vem do `tipo` (popular sobe,
impopular desce). Em `vila.temperamentos` vem do `sinal` do temperamento
correspondente em `personagem.temperamentos`. A única exceção é
`vila.opinioesExternas.percentual`, que é signed de -100 a +100 porque ali não há
um "tipo" pra carregar a polaridade.

> Consequência prática do item 4: trocar um temperamento de lado no cadastro
> reinterpreta todas as vilas de uma vez, sem migração de dados.

---

## Vocabulário: o que mudou de nome (ago/2026, em duas rodadas)

| Antes | Agora | Por quê |
|---|---|---|
| `regiao` | **`vila`** | O termo oficial passou a ser vila, sempre no singular. |
| `regiao_ligacao` | `vila_ligacao` | idem (a constraint FK também foi renomeada — o PostgREST embute pelo nome dela) |
| `regiao_documento` | `vila_documento` | idem |
| `missao.regiao_id` | `missao.vila_id` | idem |
| `cidade` | **`lugar`** | Virou só o topônimo do passe. Quem é "lugar jogável" agora é o nível. |
| `cidade.regiao_id` | `lugar.vila_id` (**not null**) | Todo lugar pertence a uma vila; nada fica solto. |
| — | **`nivel`** | O lugar jogável dentro da vila. Chave: vila · nível · variação. |
| — | **`raca`**, **`temperamento`**, **`clima`** | Cadastros novos. |
| — | **`protagonista`**, **`vila_raca`**, **`celebridade`** | Segunda rodada (ver abaixo). |

No bundle: `mundo.regioes` → `mundo.vilas`, `mundo.cidades` → `mundo.lugares`.

A migração é feita pela seção **MIGRAÇÃO** no topo de `schema.sql`, que renomeia
antes de qualquer `create table` — se viesse depois, o `create table if not
exists vila` criaria uma tabela vazia ao lado da `regiao` cheia de dados.

**Segunda rodada** (o mesmo dia, depois de usar a primeira versão):

| Mudança | Onde | Por quê |
|---|---|---|
| `temperamento` perdeu `raca_id` | schema, tela | É geral — vive em **Gameplay › Temperamentos**, não em Personagens. |
| Tela "Nomes e falas" virou dois menus | `personagens/nomes`, `personagens/falas` | Mesma tabela `vocabulario`, filtrada por tipo — só a navegação mudou. |
| `nivel_opiniao` ganhou aba própria | `mundo/vilas/[id]/AbaOpiniaoPopular.tsx` | Morava dentro do modal de "Editar nível"; virou aba **Opinião popular**, logo antes de Opinião externa. |
| `protagonista` (nova tabela) | **Personagens › Protagonistas** (primeiro item) | O elenco fixo — não sorteado. |
| `vila_raca` (nova tabela) | Aba **Raças** da vila | Distribuição de quais povos aparecem ali — mesmo mecanismo da educação. |
| `celebridade` (nova tabela) | Aba **Celebridades** da vila | nome + descrição, FK pra vila. |
| Conteúdo de personagem sem raça | migração em `schema.sql` | Paletas/peças/nomes (não falas) que estavam sem raça foram jogados pro Humano — ver a nota de ⚠️ na seção de Personagens. |

---

## Personagens

### `raca`

O cadastro-raiz da aba Personagens. Tela: **Personagens › Raças**.

| Coluna | Tipo | Observação |
|---|---|---|
| `codigo` | `int unique` | **Sequencial**, dado pela sequence `raca_codigo_seq`. A tela não deixa digitar. Humano nasce como 1. |
| `chave` | `text unique` | A identidade no bundle. |
| `nome` | `text` | |
| `descricao` | `text` | Lore. Não vira regra. |
| `etnias` | `text[]` | Lista de textos livres. Sem tabela própria de propósito: é vocabulário, não entidade com comportamento. |
| `cor` | `#RRGGBB` | Só pinta o card de filtro. |

> **Código 1 é o padrão de filtro** de todas as telas de Personagem. Se nenhuma
> raça tiver código 1, o filtro cai na primeira da lista e o validador avisa.

```jsonc
// bundle → personagem.racas[]
{ "chave": "humano", "codigo": 1, "nome": "Humano",
  "descricao": "…", "etnias": ["nórdico"], "cor": "#c4a86e" }
```

### `protagonista`

O elenco fixo do jogo — quem NÃO é sorteado. Tela: **Personagens ›
Protagonistas**, primeiro item do menu de propósito (é o lugar onde alguém
novo no time entende quem já existe antes de mexer em conteúdo gerado).
Nasce simples: `nome`, `descricao`, `ordem`. Sem `chave` — nada mais referencia
um protagonista ainda, então (como `lugar`) não precisou de uma.

```jsonc
// bundle → personagem.protagonistas[]
{ "nome": "O Porteiro", "descricao": "…" }
```

### `temperamento` — GERAL, sem raça própria

Como um povo sente em relação a outro. Tela: **Gameplay › Temperamentos** (não
Personagens — é vocabulário geral, não filtrado por raça); também criável pelo
botão `+` dentro da Aba Temperamento da Vila.

| Coluna | Tipo | Observação |
|---|---|---|
| `sinal` | `int (-1 \| 1)` | **+1 sobe no gráfico, -1 desce.** É a polaridade do sentimento, e mora só aqui. |
| `cor` | `#RRGGBB` | |

A raça só entra na ligação `vila_temperamento` (ver Aba Temperamento, abaixo) —
"desconfiança" continua sendo a mesma coisa não importa de quem.

### `paleta`, `peca`, `vocabulario` (nomes) — têm `raca_id`

Nenhuma outra mudança estrutural. O que muda no bundle:

```jsonc
personagem.paletas[]  → { …, "raca": "humano" | null }
personagem.pecas[]    → { …, "raca": "humano" | null }
```

**`vocabulario` mudou de forma**, e essa é a mudança que mais afeta o jogo:

```jsonc
// ANTES                          // AGORA
"nomesMasculinos": ["Aldo"]       "nomesMasculinos": [{ "texto": "Aldo", "raca": "humano" }]
```

Vale para os cinco: `nomesMasculinos`, `nomesFemininos`, `sobrenomes`,
`falasNeutras`, `respostasOrigem`. A geração precisa filtrar por raça **antes**
de sortear, senão sai um élfico chamado Bartolomeu.

⚠️ **Nomes vêm com raça; falas ficam sem, de propósito.** `nome_masculino`,
`nome_feminino` e `sobrenome` nascem ligados ao Humano (é o único povo que o
jogo tem — `raca_id` some quando existir um segundo). `fala_neutra` e
`resposta_origem` ficam com `raca_id` nulo: são atmosfera neutra, não fazem
sentido presas a um povo. Na tela, isso virou dois menus lado a lado —
**Personagens › Nomes** e **Personagens › Falas** — mesma tabela
`vocabulario`, cada um filtrando um grupo de `tipo`.

> **A migração de backfill** (na seção MIGRAÇÃO de `schema.sql`, depois que
> `vocabulario` é criada) empurra pro Humano qualquer paleta/peça/nome que
> ficou sem raça — é o conteúdo antigo do MVP, criado antes de raça existir.
> ⚠️ Ela roda **toda vez** que o schema.sql é colado: uma peça genérica que
> você deixar sem raça de propósito DEPOIS de aplicar essa migração também
> seria puxada pro Humano na próxima colada. Cole `schema.sql` só quando for
> aplicar uma mudança nova, não como rotina.

### `grupo_camada` / `sub_camada` — **não** têm raça

A ordem de empilhamento é geral do jogo, não de um povo. Por isso a tela de
Camadas saiu de Personagens e foi para **Configurações › Camadas**.

---

## Mundo

### `vila` — a unidade do mundo

Tela: **Mundo › Vilas**, e a página `/mundo/vilas/[id]` com **nove abas**. Os
campos do bundle saem **na ordem das abas**, de propósito: quem preencheu lá
reconhece a mesma sequência aqui.

| Aba na tela | Colunas / tabelas | Campo no bundle |
|---|---|---|
| Identidade | `nome`, `chave`, `descricao`, `cor`, `icone_mapa_id`, `pos_x/y`, `cenario_id`, `ambiente_sonoro_id`, `vila_ligacao`, `vila_documento`, `vila_clima` | `nome`, `chave`, `descricao`, `cor`, `posicao`, `cenario`, `ambienteSonoro`, `ligacoes[]`, `documentos[]`, `climas[]` |
| Política | `vila_relacao`, `politica_interna` | `relacoes[]`, `politicaInterna` |
| Cultura | `costumes`, `educacao_*` | `costumes`, `educacao{}` |
| Níveis | `nivel` | `niveis[]` (menos `opinioes`, que sai daqui) |
| Opinião popular | `nivel_opiniao` — mas editada por FORA do nível, escolhendo-o na própria aba | `niveis[].opinioes[]` |
| Opinião externa | `vila_opiniao_externa` | `opinioesExternas[]` |
| Raças | `vila_raca` | `racas[]` |
| Temperamento | `vila_temperamento` | `temperamentos[]` |
| Celebridades | `celebridade` | `celebridades[]` |

Onde salva o quê: **Identidade, Política, Cultura, Opinião externa, Raças e
Temperamento editam um rascunho em memória** e vão para o banco juntas no botão
"Salvar" do topo (`salvarComLigacoes`). **Níveis, Opinião popular e
Celebridades salvam na hora**, cada uma por um motivo diferente:
- Nível tem upload de arte — segurá-lo no rascunho geral daria um botão que às
  vezes sobe arquivo e às vezes não;
- Opinião popular pertence a um NÍVEL específico (escolhido dentro da própria
  aba, não é "da vila" direto);
- Celebridade é uma tabela simples com FK, sem motivo pra entrar no rascunho.

#### Aba 1 · clima é distribuição

`vila_clima(vila_id, clima_id, percentual)`. A soma **deveria** dar 100, mas o
validador só **avisa** quando não dá:

> ⚠️ **O jogo deve normalizar pela soma**, não confiar no 100. O que vale é a
> proporção entre os climas.

#### Aba 2 · relações entre reinos

`vila_relacao(vila_id, alvo_id, tipo)`, `tipo in ('oposicao','alianca')`.
Ver a **regra 3** lá em cima: ausência = neutro.

#### Aba 3 · nível educacional

Quatro colunas `numeric` que **somam 100**, com um CHECK no banco
(`vila_educacao_soma_100`). Não são quatro notas independentes — é a
distribuição da população. Subir uma abaixa as outras proporcionalmente (a regra
é a função pura `redistribuir`, em `componentes/graficos.tsx`). Padrão: 100% na
média.

| Coluna | Bundle | Faixa | Termos de lore |
|---|---|---|---|
| `educacao_analfabeto` | `educacao.analfabeto` | 0–20% | Analfabeto, Inculto, Ignorante, Rústico |
| `educacao_media` | `educacao.media` | 21–50% | Letrado básico, Instruído, Sábio de aldeia, Paroquiano |
| `educacao_acima` | `educacao.acima` | 51–80% | Erudito, Estudioso, Clérigo menor, Escrivão |
| `educacao_alto` | `educacao.alto` | 81–100% | Sábio magistral, Filósofo real, Mestre arcano, Polímata |

Os termos vivem em `FAIXAS_EDUCACAO`, em `erp/src/lib/tipos.ts`.

#### Aba Níveis · `nivel` — o lugar jogável

`unique (vila_id, nivel, variacao)`. **O nível não tem chave própria**: a
identidade é a tripla. Normalmente 3 níveis por vila, com quantas variações
quiser em cada.

```jsonc
// bundle → mundo.vilas[].niveis[]
{
  "nivel": 1, "variacao": 2, "nome": "Muralha externa", "descricao": null,
  "cenario": { "dia": "https://…", "tarde": "…", "noite": "…" },
  "cenarioHerdado": true,
  "opinioes": [
    { "tipo": "popular",   "titulo": "Adoram o ferreiro", "descricao": "…", "percentual": 70 },
    { "tipo": "impopular", "titulo": "Odeiam a taxa",     "descricao": "…", "percentual": 40 }
  ]
}
```

> **`cenario` já vem RESOLVIDO.** Nível sem arte própria herda o cenário da vila,
> e `cenarioHerdado: true` diz que foi isso que aconteceu. O jogo nunca precisa
> tratar nulo aqui: ou o nível tem arte, ou herdou, ou a validação barrou a
> publicação.

#### Aba Opinião popular · `nivel_opiniao`

Morava dentro do modal de "Editar nível" — virou aba própria (posicionada
**antes de Opinião externa**) porque disputava espaço com upload de arte e
mais dois campos. A tabela não mudou: continua presa a um `nivel_id`, então a
aba abre com um seletor de nível no topo (uma vila com vários níveis edita as
opiniões de cada um separadamente).

**As opiniões viram prompt**: `popular` é o prompt positivo daquele lugar,
`impopular` o negativo. O `percentual` é editado direto no gráfico divergente,
na mesma tela que os títulos/descrições — sem modal.

#### Aba Opinião externa · o que esta vila pensa das outras

`vila_opiniao_externa(vila_id, alvo_id, descricao, percentual)`, percentual de
**-100 a +100**. Não confundir com a Aba Política: lá é o fato político, aqui é
o que o povo pensa — **e os dois podem se contradizer de propósito**. Uma
aliança que o povo detesta é matéria-prima boa de conteúdo.

#### Aba Raças · `vila_raca` — quais povos aparecem aqui

```sql
create table vila_raca (
  vila_id uuid, raca_id uuid,
  percentual numeric(5,2) check (percentual >= 0 and percentual <= 100),
  primary key (vila_id, raca_id)
);
```

Mesmo mecanismo da educação (Aba Cultura): sobe uma raça, as outras cedem
espaço — a função `redistribuir` em `componentes/graficos.tsx` é genérica e
serve às duas telas (`BarraEducacao` tem 4 fatias fixas; `BarraProporcao` tem
N fatias dinâmicas, cor tirada da própria raça). Diferente da educação, aqui dá
pra **remover** uma raça da lista (o "×" zera a fatia redistribuindo o resto e
só então tira da lista — reaproveita `redistribuir(fatias, chave, 0)`).

> ⚠️ **Vila com `racas: []` (lista vazia) é lida como "só Humano"** — é o único
> povo que o jogo tem hoje, então a ausência de qualquer linha já É o
> comportamento correto. Não é erro nem precisa de dado nenhum.

#### Aba Temperamento · `vila_temperamento` — por raça

`vila_temperamento(vila_id, raca_id, temperamento_id, percentual)`, 0..100.
"Nesta vila, os élficos são vistos com 60% de desconfiança." A raça entra
**aqui**, na ligação — o cadastro de `temperamento` em si não tem raça (ver a
seção de Personagens).

#### Aba Celebridades · `celebridade`

```sql
create table celebridade (
  id uuid, vila_id uuid not null, nome text not null, descricao text, ordem int
);
```

Simples de propósito: nome + descrição, FK pra vila. Salva na hora (CRUD
próprio, como Níveis). "Depois vira menu separado" é a intenção declarada —
por ora nasce presa à vila.

### `nivel_opiniao`

| Coluna | Observação |
|---|---|
| `tipo` | `popular` \| `impopular` — é ele que dá o sinal no gráfico |
| `titulo` | obrigatório; o validador barra opinião sem título (viraria prompt vazio) |
| `percentual` | 0..100, editado no gráfico |

### `lugar` (era `cidade`)

O topônimo que vai para o campo **Cidade** do passe e para a resposta de "de onde
você veio". Continua **sorteado aleatoriamente**. A mudança é `vila_id` **not
null**: nenhum nome fica solto no mundo.

```jsonc
mundo.lugares[] → { "nome": "Pedra Branca", "vila": "vale_das_sombras" }
```

> ⚠️ **Não confundir com nível.** O nível é onde se joga (tem arte de cenário); o
> lugar é só um nome que aparece no papel.

### `clima`

Cadastro geral (**Mundo › Climas**): `chave`, `nome`, `descricao`, `icone`,
`cor`. Sai em `mundo.climas[]`. Ainda não muda nenhuma regra do jogo — é
distribuição de ambientação.

---

## Missões

Duas colunas novas/renomeadas:

```jsonc
gameplay.missoes[] → {
  …,
  "vila": "vale_das_sombras",
  "nivel": { "vila": "vale_das_sombras", "nivel": 1, "variacao": 2 } | null
}
```

`nivel: null` quer dizer "a vila inteira decide o cenário". Como o nível não tem
chave própria, ele viaja como a tripla que o identifica.

---

## O que o validador barra (erro) e o que só avisa

Erro **bloqueia a publicação**; aviso publica assim mesmo.

| Onde | Nível | Regra |
|---|---|---|
| Raças | erro | Nenhuma raça cadastrada |
| Raças | aviso | Nenhuma raça com código 1 |
| Raças | aviso | Raça não alcança peça nenhuma (nem própria, nem genérica) |
| Raças | aviso | Raça sem nenhum primeiro nome disponível |
| Temperamentos | erro | `sinal` diferente de +1/-1 |
| Vilas | **erro** | Faixas de educação não somam 100 |
| Vilas | aviso | Climas não somam 100 (o jogo normaliza) |
| Vilas | aviso | Vila sem clima nenhum / sem nível nenhum / sem documento exigido |
| Vilas | erro | Relação apontando pra vila inexistente, ou sem tipo |
| Vilas | erro | Temperamento apontando pra raça/temperamento que sumiu |
| Vilas | aviso | Raças cadastradas não somam 100 (o jogo normaliza; lista vazia é OK, vira "só Humano") |
| Vilas | erro | Linha de raça apontando pra uma raça que sumiu |
| Vilas | erro | Celebridade sem nome |
| Níveis | erro | Nenhuma arte, e a vila também não tem cenário pra emprestar |
| Níveis | aviso | Falta a arte de um ou dois momentos |
| Níveis | erro | Opinião sem título |
| Lugares | erro | Nenhum lugar cadastrado (com missões ativas) |
| Lugares | aviso | Lugar sem vila |

As travas antigas continuam todas valendo: chance nunca é 1, marca dentro da
faixa visível, regra em uso precisa de cartaz, missão precisa de regra e perfil.

---

## Checklist para ligar o jogo no bundle

Na ordem em que dói menos:

1. **`vocabulario`** — é a mudança de forma mais invasiva (`string[]` →
   `{texto, raca}[]`). Filtre por raça antes de sortear, aceitando `raca: null`.
2. **`mundo.regioes` → `mundo.vilas`** e **`mundo.cidades` → `mundo.lugares`**.
3. **Cenário do expediente** — hoje vem de `Contrato.cenarioId`. Com níveis, a
   missão pode apontar `nivel`, e aí o cenário sai de
   `vila.niveis[n].cenario` (já resolvido, com herança).
4. **Peças e paletas por raça** — `montarPersonagem` precisa receber a raça na
   `RestricaoMontagem` e filtrar aceitando nulo, do mesmo jeito que já filtra
   por gênero (`generoCompativel`).
5. **Clima, educação, política, costumes, opiniões, temperamento, distribuição
   de raças, celebridades e protagonistas** — ainda não alimentam nenhuma
   regra. Entram quando houver mecânica pra eles; até lá são dados que o
   bundle já carrega.

> O jogo continua rodando com os arquivos locais de `src/data/` enquanto isso.
> Ver o aviso em `src/conteudo/carregar.ts`.
