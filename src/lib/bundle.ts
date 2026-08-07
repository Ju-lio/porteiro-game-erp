import 'server-only';
import { db, urlPublica } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════
// O BUNDLE — o retrato imutável que o jogo baixa e mantém em memória.
//
// O jogo NUNCA fala com as tabelas. Ele baixa este JSON, e é só isso.
// Consequências que valem ouro:
//   - um amigo salvando bobagem às 2h não derruba o jogo publicado;
//   - rollback é apontar pra uma versão anterior;
//   - como os assets são imutáveis, um bundle antigo reproduz o jogo daquele
//     dia pixel a pixel.
//
// Tudo é referenciado por CHAVE, nunca por uuid: o JSON fica legível, e é a
// mesma identidade que o código do jogo já usa hoje.
// ═══════════════════════════════════════════════════════════════════════════

type Linha = Record<string, never> & Record<string, unknown>;

export type Problema = { onde: string; texto: string };
export type Diagnostico = { erros: Problema[]; avisos: Problema[] };

export type ConteudoBundle = ReturnType<typeof montar> extends Promise<infer T> ? T : never;

/** Lê tudo que vai para o bundle, de uma vez. */
async function carregarTudo() {
  const tabelas = [
    'paleta',
    'cor',
    'grupo_camada',
    'sub_camada',
    'peca',
    'peca_arquivo',
    'asset',
    'sombra',
    'regiao',
    'regiao_ligacao',
    'regiao_documento',
    'tipo_documento',
    'tipo_documento_campo',
    'cidade',
    'cenario',
    'som',
    'ambiente_sonoro',
    'item_bolsa',
    'marca',
    'profissao',
    'profissao_item',
    'profissao_marca',
    'profissao_fala',
    'vocabulario',
    'regra',
    'cartaz',
    'perfil_geracao',
    'perfil_profissao',
    'perfil_item_suspeito',
    'missao',
    'ajustes_jogo',
  ] as const;

  const dados: Record<string, Linha[]> = {};
  for (const t of tabelas) {
    const { data, error } = await db.from(t).select('*');
    if (error) throw new Error(`Falha lendo ${t}: ${error.message}`);
    dados[t] = (data ?? []) as Linha[];
  }
  return dados;
}

/** Índice id → chave, pra trocar uuid por chave legível no JSON final. */
function indexar(linhas: Linha[], campo = 'chave'): Map<string, string> {
  const m = new Map<string, string>();
  for (const l of linhas) m.set(String(l.id), String(l[campo]));
  return m;
}

export async function montar() {
  const d = await carregarTudo();

  const chavePaleta = indexar(d.paleta);
  const chaveGrupo = indexar(d.grupo_camada);
  const chaveSub = indexar(d.sub_camada);
  const chaveRegiao = indexar(d.regiao);
  const chaveCenario = indexar(d.cenario);
  const chaveSom = indexar(d.som);
  const chaveAmbiente = indexar(d.ambiente_sonoro);
  const chaveItem = indexar(d.item_bolsa);
  const chaveMarca = indexar(d.marca);
  const chaveProfissao = indexar(d.profissao);
  const chaveRegra = indexar(d.regra);
  const chavePerfil = indexar(d.perfil_geracao);
  const chaveDocumento = indexar(d.tipo_documento);

  const caminhoAsset = new Map<string, string>();
  for (const a of d.asset) caminhoAsset.set(String(a.id), String(a.caminho));
  const url = (assetId: unknown) => {
    const c = caminhoAsset.get(String(assetId));
    return c ? urlPublica(c) : null;
  };

  const ordenar = <T extends Linha>(l: T[]) =>
    [...l].sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0));

  // ── personagem modular ───────────────────────────────────────────────────
  const paletas = ordenar(d.paleta).map((p) => ({
    chave: p.chave,
    nome: p.nome,
    cores: ordenar(d.cor.filter((c) => c.paleta_id === p.id)).map((c) => ({
      nome: c.nome,
      hex: c.hex,
    })),
  }));

  const grupos = ordenar(d.grupo_camada).map((g) => ({
    chave: g.chave,
    nome: g.nome,
    opcional: g.opcional,
    chance: g.chance === null ? null : Number(g.chance),
    familia: g.familia,
    subCamadas: ordenar(d.sub_camada.filter((s) => s.grupo_id === g.id)).map((s) => ({
      chave: s.chave,
      nome: s.nome,
      tipo: s.tipo,
      paleta: s.paleta_id ? chavePaleta.get(String(s.paleta_id)) : null,
      opcional: s.opcional,
      chance: s.chance === null ? null : Number(s.chance),
    })),
  }));

  const pecas = d.peca
    .filter((p) => p.ativo)
    .map((p) => {
      const arquivos: Record<string, string> = {};
      for (const a of d.peca_arquivo.filter((x) => x.peca_id === p.id)) {
        const sub = chaveSub.get(String(a.sub_camada_id));
        const u = url(a.asset_id);
        if (sub && u) arquivos[sub] = u;
      }
      return {
        chave: p.chave,
        nome: p.nome,
        grupo: chaveGrupo.get(String(p.grupo_id)),
        genero: p.genero,
        arquetipos: p.arquetipos,
        conjunto: p.conjunto,
        arquivos,
      };
    });

  const linhaSombra = d.sombra[0];
  const sombra = linhaSombra
    ? { arquivo: url(linhaSombra.asset_id), opacidade: Number(linhaSombra.opacidade) }
    : null;

  // ── mundo ────────────────────────────────────────────────────────────────
  const regioes = ordenar(d.regiao).map((r) => ({
    chave: r.chave,
    nome: r.nome,
    descricao: r.descricao,
    cor: r.cor,
    clima: r.clima,
    posicao: r.pos_x === null || r.pos_y === null ? null : { x: r.pos_x, y: r.pos_y },
    cenario: r.cenario_id ? chaveCenario.get(String(r.cenario_id)) : null,
    ambienteSonoro: r.ambiente_sonoro_id ? chaveAmbiente.get(String(r.ambiente_sonoro_id)) : null,
    ligacoes: d.regiao_ligacao
      .filter((l) => l.regiao_id === r.id)
      .map((l) => chaveRegiao.get(String(l.destino_id)))
      .filter(Boolean),
    /* Que papéis este portão cobra — a variedade de documento por região. */
    documentos: d.regiao_documento
      .filter((x) => x.regiao_id === r.id)
      .map((x) => chaveDocumento.get(String(x.tipo_documento_id)))
      .filter(Boolean),
  }));

  // O selo do Rei virou um TIPO DE DOCUMENTO: cada papel traz a própria cor de
  // cera autêntica, e é ela que o cartaz da parede anuncia.
  const documentos = ordenar(d.tipo_documento).map((t) => ({
    chave: t.chave,
    nome: t.nome,
    descricao: t.descricao,
    corAutentica: t.cor_autentica,
    coresFalsas: t.cores_falsas,
    arte: url(t.arte_id),
    campos: ordenar(d.tipo_documento_campo.filter((c) => c.tipo_documento_id === t.id)).map(
      (c) => ({
        chave: c.chave,
        rotulo: c.rotulo,
        fonte: c.fonte,
        podeFaltar: c.pode_faltar,
      }),
    ),
  }));

  const cenarios = d.cenario.map((c) => ({
    chave: c.chave,
    nome: c.nome,
    dia: url(c.arte_dia_id),
    tarde: url(c.arte_tarde_id),
    noite: url(c.arte_noite_id),
  }));

  const sons = d.som.map((s) => ({
    chave: s.chave,
    nome: s.nome,
    arquivo: url(s.asset_id),
    volume: Number(s.volume),
    loop: s.loop,
    categoria: s.categoria,
  }));

  const ambientes = d.ambiente_sonoro.map((a) => ({
    chave: a.chave,
    nome: a.nome,
    tema: a.tema_id ? chaveSom.get(String(a.tema_id)) : null,
    ambiente: a.ambiente_id ? chaveSom.get(String(a.ambiente_id)) : null,
    portao: a.portao_id ? chaveSom.get(String(a.portao_id)) : null,
  }));

  // ── gameplay ─────────────────────────────────────────────────────────────
  const profissoes = d.profissao.map((p) => ({
    chave: p.chave,
    nome: p.nome,
    itensTipicos: d.profissao_item
      .filter((i) => i.profissao_id === p.id)
      .map((i) => ({ id: chaveItem.get(String(i.item_id)), chance: Number(i.chance) })),
    marcasTipicas: d.profissao_marca
      .filter((m) => m.profissao_id === p.id)
      .map((m) => ({ id: chaveMarca.get(String(m.marca_id)), chance: Number(m.chance) })),
    respostasTrabalho: ordenar(
      d.profissao_fala.filter((f) => f.profissao_id === p.id && f.tipo === 'trabalho'),
    ).map((f) => f.texto),
    respostasMotivo: ordenar(
      d.profissao_fala.filter((f) => f.profissao_id === p.id && f.tipo === 'motivo'),
    ).map((f) => f.texto),
  }));

  const perfis = d.perfil_geracao.map((p) => ({
    chave: p.chave,
    nome: p.nome,
    chanceSemSelo: Number(p.chance_sem_selo),
    chanceSeloForjado: Number(p.chance_selo_forjado),
    chanceFarsante: Number(p.chance_farsante),
    chanceFarsanteSeEntrega: Number(p.chance_farsante_se_entrega),
    chanceSemProfissao: Number(p.chance_sem_profissao),
    chanceCidadeDivergente: Number(p.chance_cidade_divergente),
    chanceItemSuspeito: Number(p.chance_item_suspeito),
    profissoes: d.perfil_profissao
      .filter((x) => x.perfil_id === p.id)
      .map((x) => chaveProfissao.get(String(x.profissao_id)))
      .filter(Boolean),
    itensSuspeitos: d.perfil_item_suspeito
      .filter((x) => x.perfil_id === p.id)
      .map((x) => chaveItem.get(String(x.item_id)))
      .filter(Boolean),
  }));

  const missoes = d.missao
    .filter((m) => m.ativo)
    .map((m) => ({
      chave: m.chave,
      nome: m.nome,
      regiao: m.regiao_id ? chaveRegiao.get(String(m.regiao_id)) : null,
      classe: m.classe,
      evento: m.evento,
      problemas: m.problemas,
      dificuldade: m.dificuldade,
      cenario: m.cenario_id ? chaveCenario.get(String(m.cenario_id)) : null,
      ambienteSonoro: m.ambiente_sonoro_id ? chaveAmbiente.get(String(m.ambiente_sonoro_id)) : null,
      regra: m.regra_id ? chaveRegra.get(String(m.regra_id)) : null,
      perfilGeracao: m.perfil_id ? chavePerfil.get(String(m.perfil_id)) : null,
      periodo: m.periodo,
      numVisitantes: m.num_visitantes,
      pagamentoPorAcerto: m.pagamento_por_acerto,
      multaPorErro: m.multa_por_erro,
      fracaoParaAprovar: Number(m.fracao_para_aprovar),
    }));

  const doTipo = (tipo: string) =>
    ordenar(d.vocabulario.filter((v) => v.tipo === tipo)).map((v) => String(v.texto));

  const ajustes = d.ajustes_jogo[0];

  return {
    geradoEm: new Date().toISOString(),
    personagem: { paletas, grupos, pecas, sombra },
    documentos,
    mundo: {
      regioes,
      cidades: d.cidade.map((c) => ({
        nome: c.nome,
        regiao: c.regiao_id ? chaveRegiao.get(String(c.regiao_id)) : null,
      })),
      cenarios,
      sons,
      ambientes,
    },
    gameplay: {
      itens: d.item_bolsa.map((i) => ({
        chave: i.chave,
        nome: i.nome,
        icone: i.icone,
        categoria: i.categoria,
        camada: i.camada,
      })),
      marcas: d.marca.map((m) => ({
        chave: m.chave,
        nome: m.nome,
        regiao: m.regiao,
        cor: m.cor,
        topo: Number(m.topo),
        esquerda: Number(m.esquerda),
        largura: Number(m.largura),
        altura: Number(m.altura),
        opacidade: Number(m.opacidade),
        desfoque: Number(m.desfoque),
        giro: Number(m.giro),
        raio: m.raio,
      })),
      profissoes,
      regras: d.regra.map((r) => ({
        chave: r.chave,
        nome: r.nome,
        texto: r.texto,
        condicao: r.condicao,
      })),
      cartazes: d.cartaz.map((c) => ({
        chave: c.chave,
        regra: c.regra_id ? chaveRegra.get(String(c.regra_id)) : null,
        titulo: c.titulo,
        texto: c.texto,
        amostra: c.amostra,
        itens: c.itens,
      })),
      perfis,
      missoes,
    },
    vocabulario: {
      nomesMasculinos: doTipo('nome_masculino'),
      nomesFemininos: doTipo('nome_feminino'),
      sobrenomes: doTipo('sobrenome'),
      falasNeutras: doTipo('fala_neutra'),
      respostasOrigem: doTipo('resposta_origem'),
    },
    ajustes: ajustes
      ? {
          timelapse: {
            segundosPorMomento: ajustes.timelapse_segundos_por_momento,
            segundosDeFade: ajustes.timelapse_segundos_de_fade,
            ativo: ajustes.timelapse_ativo,
          },
        }
      : null,
  };
}
