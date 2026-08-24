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
    'raca',
    'temperamento',
    'protagonista',
    'paleta',
    'cor',
    'grupo_camada',
    'sub_camada',
    'peca',
    'peca_arquivo',
    'asset',
    'sombra',
    'vila',
    'vila_ligacao',
    'vila_documento',
    'vila_clima',
    'vila_relacao',
    'vila_opiniao_externa',
    'vila_temperamento',
    'vila_raca',
    'celebridade',
    'clima',
    'nivel',
    'nivel_opiniao',
    'tipo_documento',
    'tipo_documento_campo',
    'lugar',
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
  const chaveVila = indexar(d.vila);
  const chaveRaca = indexar(d.raca);
  const chaveTemperamento = indexar(d.temperamento);
  const chaveClima = indexar(d.clima);
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

  // ── raças e temperamentos ────────────────────────────────────────────────
  // `raca` é o eixo novo do conteúdo de personagem. Em paleta, peça,
  // vocabulário e temperamento, `raca: null` quer dizer "serve pra TODAS" —
  // o motor do jogo tem que tratar nulo como curinga, não como ausência.
  const racas = ordenar(d.raca).map((r) => ({
    chave: r.chave,
    codigo: r.codigo,
    nome: r.nome,
    descricao: r.descricao,
    etnias: r.etnias,
    cor: r.cor,
  }));

  const temperamentos = ordenar(d.temperamento).map((t) => ({
    chave: t.chave,
    nome: t.nome,
    descricao: t.descricao,
    /** +1 sobe no gráfico, -1 desce. É a polaridade do sentimento. */
    sinal: Number(t.sinal),
    cor: t.cor,
  }));

  const protagonistas = ordenar(d.protagonista).map((p) => ({
    nome: p.nome,
    descricao: p.descricao,
  }));

  // ── personagem modular ───────────────────────────────────────────────────
  const paletas = ordenar(d.paleta).map((p) => ({
    chave: p.chave,
    nome: p.nome,
    raca: p.raca_id ? chaveRaca.get(String(p.raca_id)) : null,
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
        /** null = peça genérica, sorteável em qualquer raça. */
        raca: p.raca_id ? chaveRaca.get(String(p.raca_id)) : null,
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
  // A VILA (era "região") é a unidade do mundo. Tudo que uma tela da vila edita
  // sai aqui aninhado, na ordem das abas — é o que faz o JSON ser lido do mesmo
  // jeito que o ERP é preenchido.
  const climas = ordenar(d.clima).map((c) => ({
    chave: c.chave,
    nome: c.nome,
    descricao: c.descricao,
    icone: c.icone,
    cor: c.cor,
  }));

  /**
   * Os níveis de uma vila, com as três artes e as opiniões.
   *
   * ⚠️ HERANÇA DE CENÁRIO: nível sem arte própria cai no cenário da VILA. É o
   * que permite criar um nível só pra dizer "aqui se joga" antes de existir
   * arte dele — e é por isso que o jogo NUNCA precisa checar nulo aqui: ou o
   * nível tem arte, ou herdou, ou a validação já barrou a publicação.
   */
  const niveisDaVila = (vilaId: unknown, cenarioDaVila: Linha | undefined) =>
    d.nivel
      .filter((n) => n.vila_id === vilaId)
      .sort((a, b) => Number(a.nivel) - Number(b.nivel) || Number(a.variacao) - Number(b.variacao))
      .map((n) => ({
        nivel: Number(n.nivel),
        variacao: Number(n.variacao),
        nome: n.nome,
        descricao: n.descricao,
        cenario: {
          dia: url(n.arte_dia_id) ?? url(cenarioDaVila?.arte_dia_id),
          tarde: url(n.arte_tarde_id) ?? url(cenarioDaVila?.arte_tarde_id),
          noite: url(n.arte_noite_id) ?? url(cenarioDaVila?.arte_noite_id),
        },
        /** true = as três artes vieram da vila, o nível não tem as próprias. */
        cenarioHerdado: !n.arte_dia_id && !n.arte_tarde_id && !n.arte_noite_id,
        /* `tipo` decide o lado: popular vira prompt positivo, impopular negativo.
           O percentual guardado é sempre 0..100 — o sinal é leitura, não dado. */
        opinioes: ordenar(d.nivel_opiniao.filter((o) => o.nivel_id === n.id)).map((o) => ({
          tipo: o.tipo,
          titulo: o.titulo,
          descricao: o.descricao,
          percentual: Number(o.percentual),
        })),
      }));

  const vilas = ordenar(d.vila).map((v) => ({
    chave: v.chave,
    nome: v.nome,
    descricao: v.descricao,
    cor: v.cor,
    posicao: v.pos_x === null || v.pos_y === null ? null : { x: v.pos_x, y: v.pos_y },
    cenario: v.cenario_id ? chaveCenario.get(String(v.cenario_id)) : null,
    ambienteSonoro: v.ambiente_sonoro_id ? chaveAmbiente.get(String(v.ambiente_sonoro_id)) : null,
    ligacoes: d.vila_ligacao
      .filter((l) => l.vila_id === v.id)
      .map((l) => chaveVila.get(String(l.destino_id)))
      .filter(Boolean),
    /* Que papéis este portão cobra — a variedade de documento por vila. */
    documentos: d.vila_documento
      .filter((x) => x.vila_id === v.id)
      .map((x) => chaveDocumento.get(String(x.tipo_documento_id)))
      .filter(Boolean),

    // ── Aba 1 · a distribuição de clima. Some 100 no caso feliz; o jogo deve
    //    NORMALIZAR pela soma em vez de confiar, porque o ERP só avisa. ──────
    climas: d.vila_clima
      .filter((x) => x.vila_id === v.id)
      .map((x) => ({ clima: chaveClima.get(String(x.clima_id)), percentual: Number(x.percentual) }))
      .filter((x) => x.clima),

    // ── Aba 2 · o fato político. Vila AUSENTE desta lista é neutra. ─────────
    relacoes: d.vila_relacao
      .filter((x) => x.vila_id === v.id)
      .map((x) => ({ vila: chaveVila.get(String(x.alvo_id)), tipo: x.tipo }))
      .filter((x) => x.vila),

    // ── Aba 3 · cultura. As quatro faixas somam 100. ────────────────────────
    politicaInterna: v.politica_interna,
    costumes: v.costumes,
    educacao: {
      analfabeto: Number(v.educacao_analfabeto),
      media: Number(v.educacao_media),
      acima: Number(v.educacao_acima),
      alto: Number(v.educacao_alto),
    },

    // ── Aba 4 · os lugares jogáveis dentro da vila. ─────────────────────────
    niveis: niveisDaVila(
      v.id,
      d.cenario.find((c) => c.id === v.cenario_id),
    ),

    // ── Aba 5 · o que o POVO pensa das vizinhas (-100 a +100). Pode
    //    contradizer `relacoes` de propósito. ─────────────────────────────────
    opinioesExternas: ordenar(d.vila_opiniao_externa.filter((x) => x.vila_id === v.id))
      .map((x) => ({
        vila: chaveVila.get(String(x.alvo_id)),
        descricao: x.descricao,
        percentual: Number(x.percentual),
      }))
      .filter((x) => x.vila),

    // ── Aba Temperamento · por raça. O lado vem do `sinal` do temperamento
    //    (em `personagem.temperamentos`), não daqui. ─────────────────────────
    temperamentos: ordenar(d.vila_temperamento.filter((x) => x.vila_id === v.id))
      .map((x) => ({
        raca: chaveRaca.get(String(x.raca_id)),
        temperamento: chaveTemperamento.get(String(x.temperamento_id)),
        percentual: Number(x.percentual),
      }))
      .filter((x) => x.raca && x.temperamento),

    // ── Aba Raças · quais raças aparecem por aqui, em distribuição. Vila SEM
    //    NENHUMA linha aqui deve ser lida como "só Humano" pelo jogo. ────────
    racas: d.vila_raca
      .filter((x) => x.vila_id === v.id)
      .map((x) => ({ raca: chaveRaca.get(String(x.raca_id)), percentual: Number(x.percentual) }))
      .filter((x) => x.raca),

    // ── Aba Celebridades · gente famosa da vila. ────────────────────────────
    celebridades: ordenar(d.celebridade.filter((x) => x.vila_id === v.id)).map((x) => ({
      nome: x.nome,
      descricao: x.descricao,
    })),
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
      vila: m.vila_id ? chaveVila.get(String(m.vila_id)) : null,
      /* Em que nível da vila. Como o nível não tem chave própria, vai como a
         tripla que o identifica — é o que o jogo usa pra achar o cenário. */
      nivel: (() => {
        const n = d.nivel.find((x) => x.id === m.nivel_id);
        if (!n) return null;
        return {
          vila: chaveVila.get(String(n.vila_id)),
          nivel: Number(n.nivel),
          variacao: Number(n.variacao),
        };
      })(),
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

  // O vocabulário agora carrega a RAÇA em cada verbete (nulo = todas). Deixou
  // de ser `string[]` e virou `{texto, raca}[]` — a geração precisa filtrar por
  // raça antes de sortear o nome, senão sai um élfico chamado Bartolomeu.
  const doTipo = (tipo: string) =>
    ordenar(d.vocabulario.filter((v) => v.tipo === tipo)).map((v) => ({
      texto: String(v.texto),
      raca: v.raca_id ? (chaveRaca.get(String(v.raca_id)) ?? null) : null,
    }));

  const ajustes = d.ajustes_jogo[0];

  return {
    geradoEm: new Date().toISOString(),
    personagem: { racas, temperamentos, protagonistas, paletas, grupos, pecas, sombra },
    documentos,
    mundo: {
      vilas,
      /* LUGAR (era "cidade"): o topônimo que vai pro campo Cidade do passe e
         pra resposta de "de onde você veio". Continua sorteado — a novidade é
         que todo lugar pertence a uma vila. */
      lugares: d.lugar.map((l) => ({
        nome: l.nome,
        vila: l.vila_id ? chaveVila.get(String(l.vila_id)) : null,
      })),
      climas,
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
