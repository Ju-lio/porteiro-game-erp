# Porteiro — ERP de conteúdo

O painel onde o time cria o conteúdo do jogo sem programar: arte modular, profissões,
regras, missões, som. O jogo nunca fala com o banco — ele baixa um **bundle JSON** publicado
daqui.

```
  ERP (o time edita)            PUBLICAR              JOGO
  ──────────────────            ────────              ────
  Postgres + Storage   ─────▶  bundle v42   ─────▶   GET /api/conteudo
  (rascunho, histórico)        (imutável,             → memória
                                validado)             → engine/ não muda
```

## Começando

```bash
# 1. Aplique o schema: cole supabase/schema.sql no SQL Editor do Supabase e rode.
#    É idempotente — pode rodar de novo sem quebrar nada.

npm install
npm run dev              # http://localhost:3000

# 2. (opcional) traga o conteúdo que já existe no jogo
npm run semear -- --arte
```

O `.env.local` já tem as chaves do projeto Supabase.

## O que cada tela é

| Tela | Para quê |
|---|---|
| **Protagonistas** | O elenco fixo do jogo — quem NÃO é sorteado. Primeiro item do menu de propósito. |
| **Paletas** | As cores sorteáveis. Uma cor por paleta, aplicada a todas as peças ligadas a ela — é o que garante que corpo, orelha, rosto e nariz nunca saiam em tons diferentes. |
| **Peças** | A arte. Upload com validação de canvas, conversão automática de cor → máscara e preview do personagem montado ao vivo. |
| **Nomes** / **Falas** | Dois menus, mesma tabela `vocabulario`. Nomes (masc./fem./sobrenome) vêm com raça; falas (chegada, resposta de origem) ficam sem, de propósito — são atmosfera neutra. |
| **Raças** | O povo a que um visitante pertence. Atravessa Paletas, Peças e Nomes. |
| **Vilas** | O centro do mundo — uma página com nove abas: identidade, política, cultura, níveis, opinião popular, opinião externa, raças, temperamento e celebridades. |
| **Lugares / Cenários / Sons / Climas** | Consulta geral. O lugar é o topônimo do passe; o cenário e o som são a cena. |
| **Camadas** (em Configurações) | A ordem de empilhamento, em grupos e sub-camadas. O `z` é derivado da ordem: grupo novo entra arrastando, sem renumerar nada. Fica em Configurações porque é geral do jogo, não de uma raça. |
| **Documentos** | Os papéis que o visitante apresenta. Cada um traz seus campos e a cor de cera autêntica — o falsificador erra a cor. |
| **Profissões** | O arquivo de balanceamento: ferramentas e marcas típicas, sempre em probabilidade. |
| **Itens / Marcas** | O que aparece na bolsa e o que fica no corpo. |
| **Temperamentos** (em Gameplay) | Como um povo sente por outro (hostilidade, desconfiança…). Geral, sem raça própria — a raça entra só na Aba Temperamento da Vila. |
| **Regras** | A ordem do Rei, montada como condição em dado. Regra nova sem programar. |
| **Cartazes** | A cola que fica pregada na parede da cabine. |
| **Perfis de geração** | A dificuldade de cada nível, em números de 0 a 1. |
| **Missões** | O catálogo do quadro da guilda. |
| **Publicar / Versões** | Tira o retrato, valida, e volta atrás quando precisa. |

## Raça, Vila, Nível: o vocabulário de ago/2026

Coisas que mudaram de nome ou nasceram, e o resto do ERP se reorganizou em volta:

- **RAÇA** é o eixo do conteúdo de personagem. Paletas, peças e nomes são
  cadastrados por raça, e essas telas abrem filtrando pela raça de código 1
  (Humano). **Conteúdo sem raça serve a TODAS** — é assim que uma peça
  genérica não precisa ser duplicada em cada povo. **Temperamento é a
  exceção**: é geral (mora em Gameplay), sem raça própria — a raça só entra
  na ligação, dentro da Aba Temperamento da Vila.
- **REGIÃO virou VILA**, no banco, no bundle e na tela. E deixou de ser um modal:
  virou uma página com nove abas, porque tudo pendura nela.
- **CIDADE virou LUGAR** (o topônimo que vai no passe, agora sempre ligado a uma
  vila) e o *lugar jogável* passou a ser o **NÍVEL** — a tripla vila · nível ·
  variação, com as três artes de cenário. As opiniões do povo sobre um nível
  ganharam aba própria (**Opinião popular**), separada do cadastro do nível.
- **RAÇAS**, **PROTAGONISTAS** e **CELEBRIDADES** são cadastros novos: quais
  povos aparecem em cada vila (distribuição, mesmo mecanismo da educação), o
  elenco fixo do jogo, e a gente famosa de cada vila.

O mapa completo de tabela → campo do bundle → tipo no jogo está em
[`docs/modelo-de-dados.md`](docs/modelo-de-dados.md). **É de lá que se lê na hora
de ligar o jogo no bundle.**

## As quatro decisões que sustentam tudo

**1. Arquivo é imutável.** O upload calcula o sha256 e guarda em `assets/<hash>.png`. Trocar
a arte de uma peça não sobrescreve nada — sobe outro blob e a peça passa a apontar pra ele.
É o que faz um bundle antigo reproduzir o jogo daquele dia **pixel a pixel**.

**2. O canvas é uma trava, não uma sugestão.** Toda peça precisa ter exatamente o tamanho
configurado em Settings. O alinhamento das camadas é de quem desenha; o ERP só recusa o que
está fora. O erro nº 1 é exportar com *trim* ligado, e a mensagem de erro diz isso com todas
as letras.

**3. A validação é a peça mais importante.** Dar CRUD para não-programadores sem ela é dar um
pé de cabra. `src/lib/validacao.ts` são os testes do jogo virados linter: erro bloqueia a
publicação, aviso não. Regra em uso sem cartaz é erro. Chance de 100% é erro. Marca fora da
faixa visível é erro — e o banco também recusa, por baixo.

**4. Nada aqui julga o visitante.** Não existe coluna `culpado`: o gabarito é derivado da
regra pelo motor do jogo. Se alguém pudesse marcá-lo à mão, o gabarito descolaria da regra e
o jogo ficaria injusto.

## Documentos

O selo do Rei não é mais um booleano no passe: é um **tipo de documento**. Cada documento
declara os campos que mostra e a cor autêntica do lacre; a vila diz quais papéis aquele
portão cobra. Carta da guilda, salvo-conduto e mandado entram como linhas novas, sem lógica
nova no jogo.

As regras deixaram de falar em "selo" e passaram a falar em documento: `documentoPresente` e
`documentoAutentico` recebem a chave do papel. O validador recusa uma regra que exija um
documento inexistente — seria uma regra impossível de cumprir.

## Como o jogo consome

```
GET /api/conteudo        → a versão publicada agora
GET /api/conteudo?v=41   → uma versão específica (pra testar antes de trocar)
```

Uma porta só. O jogo baixa no boot, guarda em memória, e não conhece o banco.

## Segurança

RLS está ligado em todas as tabelas e **sem policy nenhuma**: a chave publicável não alcança
nada. Todo acesso passa pelo servidor do ERP com a secret key.

O acesso é por **e-mail e senha, sem tela de cadastro** — as contas nascem por convite no
painel do Supabase (Authentication → Users → Invite). O middleware barra qualquer rota sem
sessão; a única exceção é `/api/conteudo`, que é a porta do jogo e não tem login.

## Estrutura

```
src/
  app/          # uma pasta por tela (page.tsx lê o banco, Tela.tsx é a interface)
    mundo/vilas/[id]/   # a página da vila: Tela.tsx (casca) + uma Aba*.tsx por aba
  componentes/  # Crud genérico, Upload, PreviewPersonagem, Modal, campos,
                # FiltroRacas (os cards de raça), graficos (as barras e colunas)
  lib/          # supabase, bundle, validacao, publicacao, acoes
supabase/
  schema.sql    # o schema completo, idempotente (com a migração no topo)
docs/
  modelo-de-dados.md   # tabela → bundle → tipo do jogo
scripts/
  semear.mts    # traz o conteúdo de src/data/*.ts do jogo pra cá
```

Telas simples caem no `Crud` genérico (um descritor de campos e pronto); as ricas — peças,
camadas, regras, publicação — têm componente próprio.
