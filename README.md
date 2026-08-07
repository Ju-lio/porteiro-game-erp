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
| **Paletas** | As cores sorteáveis. Uma cor por paleta, aplicada a todas as peças ligadas a ela — é o que garante que corpo, orelha, rosto e nariz nunca saiam em tons diferentes. |
| **Camadas** | A ordem de empilhamento, em grupos e sub-camadas. O `z` é derivado da ordem: grupo novo entra arrastando, sem renumerar nada. |
| **Peças** | A arte. Upload com validação de canvas, conversão automática de cor → máscara e preview do personagem montado ao vivo. |
| **Nomes e falas** | Vocabulário solto que a geração sorteia. A tela mais fácil de encher — provavelmente a primeira que o time vai usar. |
| **Regiões / Cidades / Cenários / Sons** | O mundo e sua trilha. A região escolhe quais documentos aquele portão cobra. |
| **Documentos** | Os papéis que o visitante apresenta. Cada um traz seus campos e a cor de cera autêntica — o falsificador erra a cor. |
| **Profissões** | O arquivo de balanceamento: ferramentas e marcas típicas, sempre em probabilidade. |
| **Itens / Marcas** | O que aparece na bolsa e o que fica no corpo. |
| **Regras** | A ordem do Rei, montada como condição em dado. Regra nova sem programar. |
| **Cartazes** | A cola que fica pregada na parede da cabine. |
| **Perfis de geração** | A dificuldade de cada nível, em números de 0 a 1. |
| **Missões** | O catálogo do quadro da guilda. |
| **Publicar / Versões** | Tira o retrato, valida, e volta atrás quando precisa. |

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
declara os campos que mostra e a cor autêntica do lacre; a região diz quais papéis aquele
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
  componentes/  # Crud genérico, Upload, PreviewPersonagem, Modal, campos
  lib/          # supabase, bundle, validacao, publicacao, acoes
supabase/
  schema.sql    # o schema completo, idempotente
scripts/
  semear.mts    # traz o conteúdo de src/data/*.ts do jogo pra cá
```

Telas simples caem no `Crud` genérico (um descritor de campos e pronto); as ricas — peças,
camadas, regras, publicação — têm componente próprio.
