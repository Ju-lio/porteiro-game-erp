/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMEAR — leva o conteúdo que hoje mora em `src/data/*.ts` do jogo para o ERP.
 * É a Fase 0.2 rodando de uma vez.
 *
 *   npm run semear             → conteúdo (documentos, profissões, regras, missões…)
 *   npm run semear -- --arte   → junto, sobe cenários e sons de `public/`
 *   npm run semear -- --pecas  → junto, converte e sobe a arte de personagem
 *
 * Pode rodar quantas vezes quiser: o conteúdo é esvaziado antes, então o
 * resultado é sempre o mesmo. Assets e bundles já publicados não são tocados.
 *
 * O script LÊ os arquivos reais do jogo em vez de repetir os valores aqui, então
 * não existe risco de a cópia divergir do original.
 *
 * Com `--pecas`, a arte de personagem é convertida de 1080×1117 para o padrão
 * 1080×1080 (corte no rodapé, que fica atrás da cabine) antes de subir. Daí em
 * diante quem desenha já entrega no tamanho certo, pela tela de Peças.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';

// ── conteúdo do jogo, importado direto da fonte ────────────────────────────
const JOGO = path.resolve(import.meta.dirname, '../..');
const src = (p: string) => path.join(JOGO, 'src/data', p);

const { PALETAS, CHANCES_GRUPO } = await import(src('paletas.ts'));
const { itensBolsaComuns, itensDeOficio, itensBolsaSuspeitos } = await import(src('itensBolsa.ts'));
const { MARCAS } = await import(src('marcas.ts'));
const { PROFISSOES } = await import(src('profissoes.ts'));
const geracao = await import(src('geracao.ts'));
const { CATALOGO_MISSOES } = await import(src('missoes.ts'));
const { cartazesPorRegra } = await import(src('cartazes.ts'));
const { CENARIOS } = await import(src('cenarios.ts'));
const { SONS, AMBIENTES } = await import(src('sons.ts'));
const { TIMELAPSE } = await import(src('timelapse.ts'));
const { COR_SELO_AUTENTICA, CORES_SELO_FALSAS } = await import(
  path.join(JOGO, 'src/engine/selo.ts')
);

// ── conexão ────────────────────────────────────────────────────────────────
const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) throw new Error('Faltam SUPABASE_URL / SUPABASE_SECRET_KEY (veja .env.local).');
const db = createClient(url, chave, { auth: { persistSession: false } });

const argumentos = process.argv.slice(2);
const comArte = argumentos.includes('--arte');
const comPecas = argumentos.includes('--pecas');
// Sempre esvazia o conteúdo antes de semear: assim rodar de novo é seguro e o
// resultado é o mesmo toda vez (assets e bundles publicados ficam intactos).

const passo = (t: string) => console.log(`\n\x1b[1m${t}\x1b[0m`);
const ok = (t: string) => console.log(`  \x1b[32m✓\x1b[0m ${t}`);
const pular = (t: string) => console.log(`  \x1b[33m–\x1b[0m ${t}`);

/**
 * Insert que NUNCA falha em silêncio. O primeiro seed passou batido num erro de
 * coluna e a tabela ficou vazia com o script dizendo "ok" — não de novo.
 */
async function inserirLigacoes(tabela: string, linhas: object[]): Promise<void> {
  if (!linhas.length) return;
  const { error } = await db.from(tabela).insert(linhas);
  if (error) throw new Error(`${tabela}: ${error.message}`);
}

async function inserir<T extends object>(tabela: string, linhas: T[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (!linhas.length) return mapa;
  const { data, error } = await db.from(tabela).insert(linhas).select('id, chave');
  if (error) {
    if (/schema cache|does not exist/i.test(error.message)) {
      console.error(
        `\n\x1b[31mO banco ainda não tem as tabelas.\x1b[0m\n` +
          `Cole \x1b[1merp/supabase/schema.sql\x1b[0m no SQL Editor do Supabase, rode, e tente de novo.\n`,
      );
      process.exit(1);
    }
    throw new Error(`${tabela}: ${error.message}`);
  }
  for (const l of data ?? []) mapa.set(String(l.chave), String(l.id));
  return mapa;
}

// ═══════════════════════════════════════════════════════════════════════════
{
  passo('Limpando o conteúdo anterior');
  // Ordem inversa das dependências; o cascade cobre o resto.
  for (const t of [
    'missao', 'cartaz', 'regra', 'perfil_geracao', 'profissao', 'marca', 'item_bolsa',
    'vocabulario', 'cidade', 'regiao', 'tipo_documento', 'ambiente_sonoro', 'som', 'cenario',
    'peca', 'grupo_camada', 'paleta',
  ]) {
    await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
  ok('tabelas de conteúdo esvaziadas (assets e bundles ficam)');
}

// ── 1. PALETAS ─────────────────────────────────────────────────────────────
passo('Paletas de cor');
const NOMES_PALETA: Record<string, string> = {
  pele: 'Pele', olho: 'Olho', cabelo: 'Cabelo', roupa: 'Roupa',
};
const paletas = await inserir(
  'paleta',
  Object.keys(PALETAS).map((chave, i) => ({
    chave,
    nome: NOMES_PALETA[chave] ?? chave,
    ordem: i * 10,
  })),
);
for (const [chave, cores] of Object.entries(PALETAS as Record<string, string[]>)) {
  const id = paletas.get(chave);
  if (!id) continue;
  await inserirLigacoes(
    'cor',
    cores.map((hex, i) => ({ paleta_id: id, nome: `${chave} ${i + 1}`, hex, ordem: i * 10 })),
  );
}
ok(`${paletas.size} paletas`);

// ── 2. GRUPOS DE CAMADA ────────────────────────────────────────────────────
// Aqui o modelo novo entra em cena: blush, rugas e cinto deixam de ser "tipos"
// soltos e viram SUB-CAMADAS opcionais dentro do grupo a que pertencem — que é
// exatamente onde eles empilham hoje (blush 100 e rugas 110 ficam entre a pele
// do rosto, 90, e o traço do rosto, 120).
passo('Grupos de camada');

type DefSub = {
  chave: string; nome: string; tipo: 'cor' | 'traco' | 'arte_pronta';
  paleta?: string; opcional?: boolean; chance?: number;
};
type DefGrupo = { chave: string; nome: string; familia?: string; subs: DefSub[] };

const cor = (paleta: string): DefSub => ({ chave: 'cor', nome: 'Cor', tipo: 'cor', paleta });
const traco: DefSub = { chave: 'traco', nome: 'Traço', tipo: 'traco' };

const GRUPOS: DefGrupo[] = [
  { chave: 'cabelo_atras', nome: 'Cabelo traseiro', familia: 'cabelo', subs: [cor('cabelo'), traco] },
  { chave: 'corpo', nome: 'Corpo', subs: [cor('pele'), traco] },
  {
    chave: 'roupa',
    nome: 'Roupa',
    // O "cor 1 / cor 2": tecido tingível e couro fixo, cada um na sua camada.
    subs: [
      cor('roupa'),
      { chave: 'couro', nome: 'Cinto e fivela', tipo: 'arte_pronta' },
      traco,
    ],
  },
  { chave: 'orelha', nome: 'Orelhas', subs: [cor('pele'), traco] },
  {
    chave: 'rosto',
    nome: 'Rosto',
    subs: [
      cor('pele'),
      { chave: 'blush', nome: 'Blush', tipo: 'arte_pronta', opcional: true, chance: CHANCES_GRUPO['blush-rosto'] ?? 0.3 },
      { chave: 'rugas', nome: 'Rugas', tipo: 'arte_pronta', opcional: true, chance: CHANCES_GRUPO['rugas'] ?? 0.25 },
      traco,
    ],
  },
  { chave: 'olho', nome: 'Olhos', subs: [cor('olho'), traco] },
  {
    chave: 'nariz',
    nome: 'Nariz',
    subs: [
      cor('pele'),
      { chave: 'blush', nome: 'Blush do nariz', tipo: 'arte_pronta', opcional: true, chance: CHANCES_GRUPO['blush-nariz'] ?? 0.25 },
      traco,
    ],
  },
  { chave: 'boca', nome: 'Boca', subs: [traco] },
  { chave: 'sobrancelha', nome: 'Sobrancelha', subs: [cor('cabelo'), traco] },
  { chave: 'cabelo_frente', nome: 'Cabelo frontal', familia: 'cabelo', subs: [cor('cabelo'), traco] },
];

const grupos = await inserir(
  'grupo_camada',
  GRUPOS.map((g, i) => ({
    chave: g.chave,
    nome: g.nome,
    ordem: i * 10,
    opcional: false,
    chance: null,
    familia: g.familia ?? null,
  })),
);
for (const g of GRUPOS) {
  const id = grupos.get(g.chave);
  if (!id) continue;
  await inserirLigacoes(
    'sub_camada',
    g.subs.map((s, i) => ({
      grupo_id: id,
      chave: s.chave,
      nome: s.nome,
      tipo: s.tipo,
      paleta_id: s.paleta ? paletas.get(s.paleta) : null,
      opcional: s.opcional ?? false,
      chance: s.opcional ? (s.chance ?? 0.3) : null,
      ordem: i * 10,
    })),
  );
}
ok(`${grupos.size} grupos (blush, rugas e cinto viraram sub-camadas)`);

// ── 2.5 PEÇAS DE PERSONAGEM ────────────────────────────────────────────────
// A arte organizada do jogo está em 1080×1117; o padrão decidido é 1080×1080.
// Os 37px cortados ficam ATRÁS da arte da cabine, então nada visível se perde —
// e daqui pra frente quem desenha já entrega no tamanho certo.
//
// Repare no que a conversão para o modelo novo faz: o cinto vira a "cor 2" da
// roupa, e blush e rugas viram sub-camadas OPCIONAIS do rosto/nariz, no lugar
// exato onde empilhavam antes.

type DefPeca = {
  grupo: string;
  chave: string;
  nome: string;
  conjunto?: string;
  /** chave da sub-camada → arquivo relativo a `public/personagens/` */
  arquivos: Record<string, string>;
};

const PECAS: DefPeca[] = [
  // cabelo traseiro e frontal casam pelo CONJUNTO (mesma família)
  ...[1, 2].map((n) => ({
    grupo: 'cabelo_atras',
    chave: `cabelo${n}`,
    nome: `Cabelo ${n} (trás)`,
    conjunto: `cabelo${n}`,
    arquivos: {
      cor: `cabelo-atras/MF_cabelo${n}_mascara.png`,
      traco: `cabelo-atras/MF_cabelo${n}_contorno.png`,
    },
  })),
  ...[1, 2].map((n) => ({
    grupo: 'cabelo_frente',
    chave: `cabelo${n}`,
    nome: `Cabelo ${n} (frente)`,
    conjunto: `cabelo${n}`,
    arquivos: {
      cor: `cabelo-frente/MF_cabelo${n}_mascara.png`,
      traco: `cabelo-frente/MF_cabelo${n}_contorno.png`,
    },
  })),

  {
    grupo: 'corpo',
    chave: 'corpo1',
    nome: 'Corpo 1',
    arquivos: {
      cor: 'corpo/MF_corpo1_mascara.png',
      traco: 'corpo/MF_corpo1_contorno.png',
    },
  },
  {
    grupo: 'roupa',
    chave: 'roupa1',
    nome: 'Túnica 1',
    arquivos: {
      cor: 'roupa/MF_roupa1_mascara.png',
      couro: 'roupa-cinto/MF_roupa1_cinto.png',
      traco: 'roupa/MF_roupa1_contorno.png',
    },
  },
  {
    grupo: 'orelha',
    chave: 'orelha1',
    nome: 'Orelhas 1',
    arquivos: {
      cor: 'orelha/MF_orelha1_mascara.png',
      traco: 'orelha/MF_orelha1_contorno.png',
    },
  },

  // Só existe um blush de rosto; as duas rugas foram distribuídas entre os dois
  // rostos. Trocar isso é um clique na tela de Peças.
  ...[1, 2].map((n) => ({
    grupo: 'rosto',
    chave: `rosto${n}`,
    nome: `Rosto ${n}`,
    arquivos: {
      cor: `rosto/MF_rosto${n}_mascara.png`,
      blush: 'rosto-blush/MF_blush1.png',
      rugas: `rugas/MF_rugas${n}.png`,
      traco: `rosto/MF_rosto${n}_contorno.png`,
    },
  })),

  ...[1, 2, 3].map((n) => ({
    grupo: 'olho',
    chave: `olho${n}`,
    nome: `Olhos ${n}`,
    arquivos: {
      cor: `olho/MF_olho${n}_mascara.png`,
      traco: `olho/MF_olho${n}_contorno.png`,
    },
  })),

  // O blush do nariz é desenhado PARA aquele nariz — por isso vem na mesma peça.
  ...[1, 2, 3].map((n) => ({
    grupo: 'nariz',
    chave: `nariz${n}`,
    nome: `Nariz ${n}`,
    arquivos: {
      cor: `nariz/MF_nariz${n}_mascara.png`,
      blush: `nariz-blush/MF_nariz${n}.png`,
      traco: `nariz/MF_nariz${n}_contorno.png`,
    },
  })),

  ...[1, 2, 3].map((n) => ({
    grupo: 'boca',
    chave: `boca${n}`,
    nome: `Boca ${n}`,
    arquivos: { traco: `boca/MF_boca${n}.png` },
  })),

  {
    grupo: 'sobrancelha',
    chave: 'sobrancelha1',
    nome: 'Sobrancelha 1',
    arquivos: {
      cor: 'sobrancelha/MF_sobrancelha1_mascara.png',
      traco: 'sobrancelha/MF_sobrancelha1_contorno.png',
    },
  },
];

if (comPecas) {
  passo('Peças de personagem');

  // 1) converte a arte para o canvas padrão, num diretório temporário
  const convertida = path.join(os.tmpdir(), 'porteiro-arte-1080');
  const executar = promisify(execFile);
  const { stdout } = await executar('python3', [
    path.join(import.meta.dirname, 'converter-arte.py'),
    path.join(JOGO, 'public/personagens'),
    convertida,
    '1080',
    '1080',
  ]);
  process.stdout.write(stdout);

  // 2) descobre o id de cada sub-camada (grupo.sub → id)
  const { data: subs, error: erroSubs } = await db
    .from('sub_camada')
    .select('id, chave, grupo_id');
  if (erroSubs) throw new Error(`sub_camada: ${erroSubs.message}`);

  const idPorGrupo = new Map([...grupos].map(([chave, id]) => [id, chave]));
  const idSub = new Map<string, string>();
  for (const s of subs ?? []) {
    const grupoChave = idPorGrupo.get(String(s.grupo_id));
    if (grupoChave) idSub.set(`${grupoChave}.${s.chave}`, String(s.id));
  }

  // 3) sobe cada arquivo e cria as peças
  let arquivosSubidos = 0;
  for (const def of PECAS) {
    const grupoId = grupos.get(def.grupo);
    if (!grupoId) {
      pular(`grupo desconhecido: ${def.grupo}`);
      continue;
    }

    const { data: peca, error } = await db
      .from('peca')
      .insert({
        grupo_id: grupoId,
        chave: def.chave,
        nome: def.nome,
        genero: null,
        arquetipos: ['generico'],
        conjunto: def.conjunto ?? null,
        ativo: true,
      })
      .select('id')
      .single();
    if (error) throw new Error(`peca ${def.chave}: ${error.message}`);

    const ligacoes: object[] = [];
    for (const [subChave, relativo] of Object.entries(def.arquivos)) {
      const subId = idSub.get(`${def.grupo}.${subChave}`);
      if (!subId) {
        pular(`sub-camada desconhecida: ${def.grupo}.${subChave}`);
        continue;
      }
      const assetId = await subirAbsoluto(path.join(convertida, relativo), 'image/png');
      if (!assetId) continue;
      ligacoes.push({ peca_id: peca.id, sub_camada_id: subId, asset_id: assetId });
      arquivosSubidos++;
    }
    await inserirLigacoes('peca_arquivo', ligacoes);
  }
  ok(`${PECAS.length} peças, ${arquivosSubidos} arquivos`);

  // 4) a sombra — não é peça sorteável, entra sempre por cima de tudo
  const sombraId = await subirAbsoluto(
    path.join(convertida, 'sombra/MF_sombra1.png'),
    'image/png',
  );
  if (sombraId) {
    const { error } = await db.from('sombra').update({ asset_id: sombraId }).eq('id', 1);
    if (error) throw new Error(`sombra: ${error.message}`);
    ok('sombra do visitante');
  }
} else {
  pular('peças não semeadas (rode com --pecas para converter e subir a arte)');
}

// ── 3. ITENS DE BOLSA ──────────────────────────────────────────────────────
passo('Itens de bolsa');
type Item = { id: string; nome: string; icone?: string; camada?: string };
const itens = await inserir('item_bolsa', [
  ...(itensBolsaComuns as Item[]).map((i) => ({
    chave: i.id, nome: i.nome, icone: i.icone ?? '📦', categoria: 'comum', camada: null,
  })),
  ...Object.values(itensDeOficio as Record<string, Item>).map((i) => ({
    chave: i.id, nome: i.nome, icone: i.icone ?? '🔧', categoria: 'oficio', camada: null,
  })),
  ...Object.values(itensBolsaSuspeitos as Record<string, Item>).map((i) => ({
    chave: i.id, nome: i.nome, icone: i.icone ?? '🗡️', categoria: 'suspeito', camada: i.camada ?? null,
  })),
]);
ok(`${itens.size} itens`);

// ── 4. MARCAS ──────────────────────────────────────────────────────────────
passo('Marcas do ofício');
// ⚠️ `rotacao`, `desfoque` e `raio` são OPCIONAIS no jogo (hematoma_olho não
// declara rotação, por exemplo) — as colunas aqui são NOT NULL, então cada uma
// precisa do seu padrão.
type MarcaJogo = {
  id: string; nome: string; regiao: string; cor: string;
  topo: number; esquerda: number; largura: number; altura: number;
  opacidade: number; desfoque?: number; rotacao?: number; raio?: string;
};
const marcas = await inserir(
  'marca',
  (MARCAS as MarcaJogo[]).map((m) => ({
    chave: m.id, nome: m.nome, regiao: m.regiao, cor: m.cor,
    topo: m.topo, esquerda: m.esquerda, largura: m.largura, altura: m.altura,
    opacidade: m.opacidade,
    desfoque: m.desfoque ?? 0,
    giro: m.rotacao ?? 0,
    raio: m.raio ?? '50%',
  })),
);
ok(`${marcas.size} marcas`);

// ── 5. PROFISSÕES ──────────────────────────────────────────────────────────
passo('Profissões');
type Tipico = { id: string; chance: number };
type ProfJogo = {
  id: string; nome: string; itensTipicos: Tipico[]; marcasTipicas: Tipico[];
  respostasTrabalho: string[]; respostasMotivo: string[];
};
const profissoes = await inserir(
  'profissao',
  (PROFISSOES as ProfJogo[]).map((p) => ({ chave: p.id, nome: p.nome })),
);
for (const p of PROFISSOES as ProfJogo[]) {
  const id = profissoes.get(p.id);
  if (!id) continue;
  const itensLigados = p.itensTipicos
    .filter((t) => itens.get(t.id))
    .map((t) => ({ profissao_id: id, item_id: itens.get(t.id)!, chance: t.chance }));
  const marcasLigadas = p.marcasTipicas
    .filter((t) => marcas.get(t.id))
    .map((t) => ({ profissao_id: id, marca_id: marcas.get(t.id)!, chance: t.chance }));
  await inserirLigacoes('profissao_item', itensLigados);
  await inserirLigacoes('profissao_marca', marcasLigadas);
  await inserirLigacoes('profissao_fala', [
    ...p.respostasTrabalho.map((texto, i) => ({ profissao_id: id, tipo: 'trabalho', texto, ordem: i })),
    ...p.respostasMotivo.map((texto, i) => ({ profissao_id: id, tipo: 'motivo', texto, ordem: i })),
  ]);
}
ok(`${profissoes.size} profissões, com itens, marcas e falas`);

// ── 6. VOCABULÁRIO E CIDADES ───────────────────────────────────────────────
passo('Nomes, falas e cidades');
const vocabulario = [
  ...geracao.NOMES_MASCULINOS.map((t: string) => ({ tipo: 'nome_masculino', texto: t })),
  ...geracao.NOMES_FEMININOS.map((t: string) => ({ tipo: 'nome_feminino', texto: t })),
  ...geracao.SOBRENOMES_MEDIEVAIS.map((t: string) => ({ tipo: 'sobrenome', texto: t })),
  ...geracao.FALAS_NEUTRAS.map((t: string) => ({ tipo: 'fala_neutra', texto: t })),
  ...geracao.MODELOS_RESPOSTA_ORIGEM.map((t: string) => ({ tipo: 'resposta_origem', texto: t })),
].map((v, i) => ({ ...v, ordem: i }));
await inserirLigacoes('vocabulario', vocabulario);
await inserirLigacoes('cidade', geracao.CIDADES.map((nome: string) => ({ nome })));
ok(`${vocabulario.length} verbetes e ${geracao.CIDADES.length} cidades`);

// ── 6.5 DOCUMENTOS ─────────────────────────────────────────────────────────
// O selo do Rei era um booleano no passe; agora é um TIPO DE DOCUMENTO. A cor
// autêntica e as falsas saem do próprio motor do jogo (`engine/selo.ts`), então
// continuam sendo exatamente as mesmas.
passo('Documentos');
const documentos = await inserir('tipo_documento', [
  {
    chave: 'selo_do_rei',
    nome: 'Selo do Rei',
    descricao: 'O passe que autoriza a entrada no reino. Lacre em cera vermelha, com a coroa.',
    cor_autentica: COR_SELO_AUTENTICA,
    cores_falsas: CORES_SELO_FALSAS,
    ordem: 0,
  },
]);
const seloDoRei = documentos.get('selo_do_rei')!;
// ⚠️ Num insert em LOTE, o PostgREST usa as chaves da primeira linha como
// gabarito e manda `null` no que faltar nas outras — o default da coluna NÃO
// entra. Por isso todas as linhas declaram os mesmos campos aqui.
await inserirLigacoes('tipo_documento_campo', [
  {
    tipo_documento_id: seloDoRei,
    chave: 'nome',
    rotulo: 'Nome',
    fonte: 'nome',
    pode_faltar: false,
    ordem: 0,
  },
  {
    tipo_documento_id: seloDoRei,
    chave: 'cidade',
    rotulo: 'Cidade',
    fonte: 'cidade',
    pode_faltar: false,
    ordem: 10,
  },
  {
    tipo_documento_id: seloDoRei,
    chave: 'profissao',
    rotulo: 'Profissão',
    fonte: 'profissao',
    // Passe em branco existe, mas é raro de propósito: é um atalho grátis que
    // dispensa investigar.
    pode_faltar: true,
    ordem: 20,
  },
]);
ok('1 documento (Selo do Rei) com 3 campos');

// ── 7. REGRAS ──────────────────────────────────────────────────────────────
// As únicas coisas que NÃO puderam ser lidas do jogo: no código elas são
// funções (`permiteEntrada`), e função não vira JSON. Aqui elas nascem como
// DADO — é a mudança que permite criar uma regra nova sem programar.
passo('Regras (funções viraram condição em dado)');
const REGRAS = [
  {
    chave: 'selo_presente',
    nome: 'Só com selo',
    texto: 'Só entra quem apresentar o selo do Rei.',
    condicao: { e: [{ documentoPresente: 'selo_do_rei' }] },
  },
  {
    chave: 'selo_autentico',
    nome: 'Selo autêntico',
    texto: 'Só entra com selo do Rei — e a cera do selo verdadeiro é VERMELHA.',
    condicao: { e: [{ documentoAutentico: 'selo_do_rei' }] },
  },
  {
    chave: 'selo_e_profissao',
    nome: 'Selo e profissão',
    texto:
      'Selo do Rei VERMELHO — e a profissão do passe tem que ser a verdadeira. Passe sem profissão não entra.',
    condicao: {
      e: [
        { documentoAutentico: 'selo_do_rei' },
        { campoPreenchido: 'profissao' },
        { profissaoConfere: true },
      ],
    },
  },
];
const regras = await inserir('regra', REGRAS);
ok(`${regras.size} regras`);

// ── 8. CARTAZES ────────────────────────────────────────────────────────────
passo('Cartazes da parede');
type CartazJogo = { id: string; titulo: string; texto: string; amostra?: unknown; itens?: string[] };
const cartazes: Record<string, unknown>[] = [];
for (const r of REGRAS) {
  for (const c of cartazesPorRegra(r.chave) as CartazJogo[]) {
    cartazes.push({
      // O mesmo cartaz aparece em regras diferentes: a chave carrega as duas.
      chave: `${r.chave}__${c.id}`,
      regra_id: regras.get(r.chave),
      titulo: c.titulo,
      texto: c.texto,
      amostra: c.amostra ?? null,
      itens: c.itens ?? [],
    });
  }
}
await inserirLigacoes('cartaz', cartazes);
ok(`${cartazes.length} cartazes`);

// ── 9. PERFIS DE GERAÇÃO ───────────────────────────────────────────────────
passo('Perfis de geração');
type PerfilJogo = {
  id: string; chanceSemSelo: number; chanceSeloForjado: number; chanceFarsante: number;
  chanceFarsanteSeEntrega: number; chanceSemProfissao: number; chanceCidadeDivergente: number;
  chanceItemSuspeito: number; profissoes: string[]; itensSuspeitos: string[];
};
const listaPerfis = geracao.PERFIS_GERACAO as PerfilJogo[];
const perfis = await inserir(
  'perfil_geracao',
  listaPerfis.map((p) => ({
    chave: p.id,
    nome: p.id.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
    chance_sem_selo: p.chanceSemSelo,
    chance_selo_forjado: p.chanceSeloForjado,
    chance_farsante: p.chanceFarsante,
    chance_farsante_se_entrega: p.chanceFarsanteSeEntrega,
    chance_sem_profissao: p.chanceSemProfissao,
    chance_cidade_divergente: p.chanceCidadeDivergente,
    chance_item_suspeito: p.chanceItemSuspeito,
  })),
);
for (const p of listaPerfis) {
  const id = perfis.get(p.id);
  if (!id) continue;
  const prof = p.profissoes.filter((x) => profissoes.get(x)).map((x) => ({ perfil_id: id, profissao_id: profissoes.get(x)! }));
  const susp = p.itensSuspeitos.filter((x) => itens.get(x)).map((x) => ({ perfil_id: id, item_id: itens.get(x)! }));
  await inserirLigacoes('perfil_profissao', prof);
  await inserirLigacoes('perfil_item_suspeito', susp);
}
ok(`${perfis.size} perfis`);

// ── 10. CENÁRIOS, SONS E AMBIENTES ─────────────────────────────────────────
passo('Cenários, sons e ambientes');

/** Sobe um arquivo de `public/` e devolve o id do asset (content-addressed). */
async function subir(caminhoRelativo: string, mime: string): Promise<string | null> {
  return subirAbsoluto(path.join(JOGO, 'public', caminhoRelativo), mime);
}

/**
 * Content-addressed: o mesmo conteúdo sempre vira o MESMO asset, e nenhum
 * arquivo é sobrescrito. É o que faz um bundle antigo continuar reproduzindo o
 * jogo daquele dia pixel a pixel.
 */
async function subirAbsoluto(caminho: string, mime: string): Promise<string | null> {
  let bytes: Buffer;
  try {
    bytes = await readFile(caminho);
  } catch {
    // Arquivo que falta é só um aviso — o resto do conteúdo continua valendo.
    // Qualquer OUTRO erro estoura, porque insert silencioso já custou caro aqui.
    pular(`arquivo não encontrado: ${path.relative(JOGO, caminho)}`);
    return null;
  }

  const hash = createHash('sha256').update(bytes).digest('hex');

  const { data: existente, error: erroBusca } = await db
    .from('asset')
    .select('id')
    .eq('sha256', hash)
    .maybeSingle();
  if (erroBusca) throw new Error(`asset: ${erroBusca.message}`);
  if (existente) return existente.id;

  const ext = caminho.split('.').pop() ?? 'bin';
  const destino = `${hash.slice(0, 2)}/${hash}.${ext}`;
  const { error: erroUpload } = await db.storage
    .from('assets')
    .upload(destino, bytes, { contentType: mime, upsert: true });
  if (erroUpload) throw new Error(`storage ${destino}: ${erroUpload.message}`);

  const { data, error } = await db
    .from('asset')
    .insert({
      sha256: hash,
      caminho: destino,
      nome_original: path.basename(caminho),
      mime,
      bytes: bytes.length,
    })
    .select('id')
    .single();
  if (error) throw new Error(`asset ${destino}: ${error.message}`);
  return data.id;
}

const NOMES_CENARIO: Record<string, string> = { castelo: 'Portão do Castelo', catedral: 'Catedral' };
const linhasCenario: Record<string, unknown>[] = [];
for (const [chave, artes] of Object.entries(CENARIOS as Record<string, Record<string, string>>)) {
  const pegar = async (m: string) =>
    comArte ? await subir(artes[m].replace(/^\//, ''), 'image/png') : null;
  linhasCenario.push({
    chave,
    nome: NOMES_CENARIO[chave] ?? chave,
    arte_dia_id: await pegar('dia'),
    arte_tarde_id: await pegar('tarde'),
    arte_noite_id: await pegar('noite'),
  });
}
const cenarios = await inserir('cenario', linhasCenario);
ok(`${cenarios.size} cenários${comArte ? ' com arte' : ' (sem arte — rode com --arte)'}`);

type SomJogo = { id: string; arquivo: string; volume: number; loop?: boolean };
const linhasSom: Record<string, unknown>[] = [];
for (const s of Object.values(SONS as Record<string, SomJogo>)) {
  linhasSom.push({
    chave: s.id,
    nome: s.id.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
    asset_id: comArte ? await subir(s.arquivo.replace(/^\//, ''), 'audio/mpeg') : null,
    volume: s.volume,
    loop: s.loop ?? false,
    categoria: s.loop ? 'musica' : 'efeito',
  });
}
const sons = await inserir('som', linhasSom);
ok(`${sons.size} sons${comArte ? ' com arquivo' : ' (sem arquivo — rode com --arte)'}`);

type AmbJogo = { id: string; tema?: string; ambiente?: string; portao?: string };
const ambientes = await inserir(
  'ambiente_sonoro',
  Object.values(AMBIENTES as Record<string, AmbJogo>).map((a) => ({
    chave: a.id,
    nome: a.id.replace(/^\w/, (c: string) => c.toUpperCase()),
    tema_id: a.tema ? (sons.get(a.tema) ?? null) : null,
    ambiente_id: a.ambiente ? (sons.get(a.ambiente) ?? null) : null,
    portao_id: a.portao ? (sons.get(a.portao) ?? null) : null,
  })),
);
ok(`${ambientes.size} ambientes sonoros`);

// ── 11. REGIÕES (a partir das que as missões citam) ────────────────────────
passo('Regiões');
type MissaoJogo = {
  modeloId: string; nome: string; regiao: string; classe: string; evento?: string;
  problemas: string[]; dificuldade: number; cenarioId: string; ambienteSonoroId?: string;
  regraId: string; perfilGeracaoId: string; periodo: string; numVisitantes: number;
  pagamentoPorAcerto: number; multaPorErro: number; fracaoParaAprovar: number;
};
const missoesJogo = CATALOGO_MISSOES as MissaoJogo[];
const nomesRegiao = [...new Set(missoesJogo.map((m) => m.regiao))];
const chaveDe = (n: string) =>
  n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const regioes = await inserir(
  'regiao',
  nomesRegiao.map((nome, i) => ({
    chave: chaveDe(nome),
    nome,
    ordem: i * 10,
    cenario_id: cenarios.get('castelo') ?? null,
    ambiente_sonoro_id: ambientes.get('vila') ?? null,
  })),
);
await inserirLigacoes(
  'regiao_documento',
  [...regioes.values()].map((regiao_id) => ({ regiao_id, tipo_documento_id: seloDoRei })),
);
ok(`${regioes.size} regiões (criadas a partir das missões), todas exigindo o Selo do Rei`);

// ── 12. MISSÕES ────────────────────────────────────────────────────────────
passo('Missões');
const missoes = await inserir(
  'missao',
  missoesJogo.map((m) => ({
    chave: m.modeloId,
    nome: m.nome,
    regiao_id: regioes.get(chaveDe(m.regiao)) ?? null,
    classe: m.classe,
    evento: m.evento ?? null,
    problemas: m.problemas,
    dificuldade: m.dificuldade,
    cenario_id: cenarios.get(m.cenarioId) ?? null,
    ambiente_sonoro_id: ambientes.get(m.ambienteSonoroId ?? 'vila') ?? null,
    regra_id: regras.get(m.regraId) ?? null,
    perfil_id: perfis.get(m.perfilGeracaoId) ?? null,
    periodo: m.periodo,
    num_visitantes: m.numVisitantes,
    pagamento_por_acerto: m.pagamentoPorAcerto,
    multa_por_erro: m.multaPorErro,
    fracao_para_aprovar: m.fracaoParaAprovar,
    ativo: true,
  })),
);
ok(`${missoes.size} missões`);

// ── 13. AJUSTES GLOBAIS ────────────────────────────────────────────────────
passo('Ajustes do jogo');
await db.from('ajustes_jogo').update({
  timelapse_segundos_por_momento: TIMELAPSE.segundosPorMomento,
  timelapse_segundos_de_fade: TIMELAPSE.segundosDeFade,
  timelapse_ativo: TIMELAPSE.ativo,
}).eq('id', 1);
ok('timelapse');

console.log(
  `\n\x1b[1m\x1b[32mPronto.\x1b[0m Abra o ERP e confira o Painel.\n` +
    (comPecas
      ? `\nA arte de personagem foi convertida de 1080×1117 para o padrão \x1b[1m1080×1080\x1b[0m\n` +
        `(o rodapé cortado fica atrás da cabine). Daqui pra frente quem desenha já\n` +
        `entrega nesse tamanho, pela tela de Peças.\n`
      : `\nAs peças de personagem \x1b[1mnão\x1b[0m entraram — rode com \x1b[1m--pecas\x1b[0m para\n` +
        `converter a arte e subir junto.\n`),
);
