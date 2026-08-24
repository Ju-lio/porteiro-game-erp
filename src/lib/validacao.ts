import type { Diagnostico, Problema } from './bundle';

// ═══════════════════════════════════════════════════════════════════════════
// O VALIDADOR — os testes do jogo virados linter de conteúdo.
//
// É a peça mais importante do ERP. Dar CRUD para não-programadores sem isto é
// dar um pé de cabra: as regras abaixo não são preciosismo, são invariantes de
// DESIGN que já quebraram o jogo antes.
//
//   ERRO  → bloqueia a publicação. O jogo quebraria ou ficaria injusto.
//   AVISO → publica assim mesmo, mas alguém devia olhar.
// ═══════════════════════════════════════════════════════════════════════════

type Bundle = {
  personagem: {
    racas: { chave: unknown; nome: unknown; codigo: unknown }[];
    temperamentos: { chave: unknown; nome: unknown; sinal: number }[];
    protagonistas: { nome: unknown }[];
    paletas: { chave: unknown; cores: unknown[]; raca: unknown }[];
    grupos: {
      chave: unknown;
      nome: unknown;
      opcional: unknown;
      familia: unknown;
      subCamadas: { chave: unknown; nome: unknown; tipo: unknown; paleta: unknown; opcional: unknown }[];
    }[];
    pecas: {
      chave: unknown;
      nome: unknown;
      grupo: unknown;
      conjunto: unknown;
      raca: unknown;
      arquivos: Record<string, string>;
    }[];
    sombra: { arquivo: string | null } | null;
  };
  documentos: {
    chave: unknown;
    nome: unknown;
    corAutentica: string | null;
    coresFalsas: string[];
    campos: { chave: unknown; rotulo: unknown; fonte: unknown }[];
  }[];
  mundo: {
    cenarios: { chave: unknown; nome: unknown; dia: unknown; tarde: unknown; noite: unknown }[];
    vilas: {
      chave: unknown;
      nome: unknown;
      documentos: unknown[];
      climas: { clima: unknown; percentual: number }[];
      relacoes: { vila: unknown; tipo: unknown }[];
      educacao: { analfabeto: number; media: number; acima: number; alto: number };
      niveis: {
        nivel: number;
        variacao: number;
        nome: unknown;
        cenario: { dia: unknown; tarde: unknown; noite: unknown };
        opinioes: { tipo: unknown; titulo: unknown; percentual: number }[];
      }[];
      temperamentos: { raca: unknown; temperamento: unknown; percentual: number }[];
      racas: { raca: unknown; percentual: number }[];
      celebridades: { nome: unknown }[];
    }[];
    lugares: { nome: unknown; vila: unknown }[];
  };
  gameplay: {
    marcas: { chave: unknown; nome: unknown; topo: number; altura: number }[];
    profissoes: {
      chave: unknown;
      nome: unknown;
      itensTipicos: { id: unknown; chance: number }[];
      marcasTipicas: { id: unknown; chance: number }[];
      respostasTrabalho: unknown[];
    }[];
    regras: { chave: unknown; nome: unknown; condicao: unknown }[];
    cartazes: { regra: unknown }[];
    perfis: { chave: unknown; nome: unknown; profissoes: unknown[]; chanceSemProfissao: number }[];
    missoes: {
      chave: unknown;
      nome: unknown;
      classe: unknown;
      vila: unknown;
      regra: unknown;
      perfilGeracao: unknown;
      fracaoParaAprovar: number;
    }[];
  };
  vocabulario: {
    nomesMasculinos: Verbete[];
    nomesFemininos: Verbete[];
    sobrenomes: Verbete[];
    falasNeutras: Verbete[];
  };
};

/** Um verbete do vocabulário: o texto e a raça a que ele pertence (nulo = todas). */
type Verbete = { texto: string; raca: string | null };

/** A faixa visível do personagem: a cabine cobre daqui pra baixo. */
const LIMITE_JANELA = 74;

export function validar(b: Bundle): Diagnostico {
  const erros: Problema[] = [];
  const avisos: Problema[] = [];
  const erro = (onde: string, texto: string) => erros.push({ onde, texto });
  const aviso = (onde: string, texto: string) => avisos.push({ onde, texto });

  // ── missões ────────────────────────────────────────────────────────────
  for (const m of b.gameplay.missoes) {
    if (!m.regra)
      erro('Missões', `“${m.nome}” não tem regra. Sem regra não existe gabarito — o jogo não sabe quem é culpado.`);
    if (!m.perfilGeracao)
      erro('Missões', `“${m.nome}” não tem perfil de geração. A fila de visitantes sairia vazia.`);
    if (m.classe === 'tutorial' && m.fracaoParaAprovar < 1)
      aviso('Missões', `“${m.nome}” é treino mas não exige gabaritar. O treino existe pra ensinar — considere 100%.`);
  }
  if (b.gameplay.missoes.length === 0)
    aviso('Missões', 'Nenhuma missão ativa. O quadro da guilda ficaria vazio.');

  // ── documentos ─────────────────────────────────────────────────────────
  const chavesDocumento = new Set(b.documentos.map((d) => d.chave));

  for (const doc of b.documentos) {
    if (doc.campos.length === 0)
      aviso('Documentos', `“${doc.nome}” não tem campo nenhum — não mostraria nada ao jogador.`);

    if (doc.corAutentica) {
      const conflito = doc.coresFalsas.some(
        (c) => c.trim().toLowerCase() === doc.corAutentica!.trim().toLowerCase(),
      );
      if (conflito)
        erro(
          'Documentos',
          `“${doc.nome}” tem a cor autêntica também na lista de falsas. O jogador não teria como distinguir a falsificação olhando.`,
        );
      if (doc.coresFalsas.length === 0)
        aviso(
          'Documentos',
          `“${doc.nome}” tem cera autêntica mas nenhuma cor falsa — nenhuma falsificação chegaria ao portão.`,
        );
    }
  }
  if (b.documentos.length === 0)
    aviso('Documentos', 'Nenhum documento cadastrado. O guarda não teria o que pedir.');

  for (const v of b.mundo.vilas) {
    if (v.documentos.length === 0) aviso('Vilas', `“${v.nome}” não exige documento nenhum.`);
  }

  // ── regras precisam de cartaz ──────────────────────────────────────────
  const regrasComCartaz = new Set(b.gameplay.cartazes.map((c) => c.regra));
  const regrasEmUso = new Set(b.gameplay.missoes.map((m) => m.regra).filter(Boolean));
  for (const r of b.gameplay.regras) {
    if (regrasEmUso.has(r.chave) && !regrasComCartaz.has(r.chave))
      erro(
        'Cartazes',
        `A regra “${r.nome}” está em uso e não tem cartaz. O jogador entraria no portão sem saber o que procurar — e o jogo deixa de ser justo.`,
      );
    const c = r.condicao as Record<string, unknown> | null;
    const itens = (c?.e ?? c?.ou) as Record<string, unknown>[] | undefined;
    if (!itens?.length) erro('Regras', `A regra “${r.nome}” está sem nenhuma condição.`);

    // Predicado que cita um documento inexistente vira regra impossível de cumprir.
    for (const item of itens ?? []) {
      const alvo = ('nao' in item ? item.nao : item) as Record<string, unknown>;
      for (const [predicado, valor] of Object.entries(alvo ?? {})) {
        if (!predicado.startsWith('documento')) continue;
        if (!valor || !chavesDocumento.has(valor))
          erro(
            'Regras',
            `A regra “${r.nome}” exige um documento que não existe${valor ? ` (“${valor}”)` : ''}. Nenhum visitante conseguiria passar.`,
          );
      }
    }
  }

  // ── profissões: probabilidade, nunca checklist ─────────────────────────
  for (const p of b.gameplay.profissoes) {
    for (const i of [...p.itensTipicos, ...p.marcasTipicas]) {
      if (i.chance >= 1)
        erro(
          'Profissões',
          `“${p.nome}” tem algo com 100% de chance. Certeza vira checklist, e checklist mata a dedução.`,
        );
      if (!i.id)
        erro('Profissões', `“${p.nome}” aponta para um item ou marca que não existe mais.`);
    }
    if (p.itensTipicos.length === 0 && p.marcasTipicas.length === 0)
      aviso(
        'Profissões',
        `“${p.nome}” não tem ferramenta nem marca. Nada denuncia um farsante que finge ser este ofício.`,
      );
    if (p.respostasTrabalho.length === 0)
      aviso('Profissões', `“${p.nome}” não tem resposta para “do que você trabalha?”.`);
  }

  // ── marcas: a faixa visível ────────────────────────────────────────────
  for (const m of b.gameplay.marcas) {
    if (m.topo + m.altura > LIMITE_JANELA)
      erro(
        'Marcas',
        `“${m.nome}” termina em ${(m.topo + m.altura).toFixed(1)}% e a cabine cobre a partir de ${LIMITE_JANELA}%. O jogador nunca veria essa marca.`,
      );
  }

  // ── perfis ─────────────────────────────────────────────────────────────
  for (const p of b.gameplay.perfis) {
    if (p.profissoes.length === 0)
      aviso('Perfis', `“${p.nome}” não restringe profissões — todas podem aparecer.`);
    if (p.chanceSemProfissao > 0.2)
      aviso(
        'Perfis',
        `“${p.nome}” tem ${Math.round(p.chanceSemProfissao * 100)}% de passe em branco. Passe em branco é atalho grátis que dispensa investigar — o recomendado é ficar perto de 10%.`,
      );
  }

  // ── personagem modular ─────────────────────────────────────────────────
  const paletasComCor = new Set(
    b.personagem.paletas.filter((p) => p.cores.length > 0).map((p) => p.chave),
  );

  for (const g of b.personagem.grupos) {
    for (const s of g.subCamadas) {
      if (s.tipo === 'cor' && !s.paleta)
        erro('Camadas', `“${g.nome} › ${s.nome}” é do tipo cor mas não aponta paleta nenhuma.`);
      if (s.tipo === 'cor' && s.paleta && !paletasComCor.has(s.paleta))
        erro(
          'Camadas',
          `“${g.nome} › ${s.nome}” usa uma paleta sem nenhuma cor cadastrada — a peça sairia sem preenchimento.`,
        );
    }
    if (g.subCamadas.length === 0)
      aviso('Camadas', `O grupo “${g.nome}” não tem sub-camada nenhuma e nunca desenha nada.`);

    const pecasDoGrupo = b.personagem.pecas.filter((p) => p.grupo === g.chave);
    if (pecasDoGrupo.length === 0 && !g.opcional)
      erro(
        'Peças',
        `O grupo obrigatório “${g.nome}” não tem nenhuma peça ativa. O personagem sairia incompleto.`,
      );

    // toda peça precisa dos arquivos das sub-camadas obrigatórias
    for (const p of pecasDoGrupo) {
      for (const s of g.subCamadas) {
        if (!s.opcional && !p.arquivos[String(s.chave)])
          erro('Peças', `“${p.nome}” (${g.nome}) está sem o arquivo de “${s.nome}”.`);
      }
    }

    // família exige conjunto: sem ele, o sorteio não sabe o que casa com o quê
    if (g.familia) {
      for (const p of pecasDoGrupo) {
        if (!p.conjunto)
          erro(
            'Peças',
            `“${p.nome}” está num grupo com família (“${g.familia}”) mas não declara conjunto. Sem conjunto, o sorteio pode juntar a franja de um penteado com a massa de outro.`,
          );
      }
    }
  }

  if (!b.personagem.sombra?.arquivo)
    aviso('Personagem', 'Sem arte de sombra. O visitante fica parecendo recortado do cenário.');

  // ── cenários ───────────────────────────────────────────────────────────
  for (const c of b.mundo.cenarios) {
    const faltando = [
      !c.dia && 'dia',
      !c.tarde && 'tarde',
      !c.noite && 'noite',
    ].filter(Boolean);
    if (faltando.length === 3) erro('Cenários', `“${c.nome}” não tem arte nenhuma — a janela ficaria preta.`);
    else if (faltando.length)
      aviso('Cenários', `“${c.nome}” está sem a arte de ${faltando.join(' e ')}.`);
  }

  // ── vocabulário ────────────────────────────────────────────────────────
  // "Nomes e falas" viraram DOIS menus na tela (mesma tabela `vocabulario`,
  // filtrada por tipo) — as mensagens de erro já refletem essa separação.
  const v = b.vocabulario;
  if (b.gameplay.missoes.length > 0) {
    if (v.nomesMasculinos.length === 0 && v.nomesFemininos.length === 0)
      erro('Nomes', 'Nenhum primeiro nome cadastrado — os visitantes chegariam sem nome no passe.');
    if (v.sobrenomes.length === 0) erro('Nomes', 'Nenhum sobrenome cadastrado.');
    if (v.falasNeutras.length === 0)
      aviso('Falas', 'Nenhuma fala de chegada. Os visitantes chegam mudos.');
    if (v.nomesMasculinos.length + v.nomesFemininos.length < 8)
      aviso('Nomes', 'Menos de 8 primeiros nomes: o elenco vai se repetir rápido num expediente.');
  }

  // ── raças ──────────────────────────────────────────────────────────────
  // A regra que sustenta o filtro das telas: conteúdo com raça nula serve a
  // TODAS. Uma raça só é jogável se, somando o dela com o genérico, dá pra
  // montar um visitante e dar um nome a ele.
  const racas = b.personagem.racas;
  if (racas.length === 0)
    erro('Raças', 'Nenhuma raça cadastrada. Todo conteúdo de personagem é filtrado por raça — sem nenhuma, as telas não têm o que mostrar.');
  if (racas.length > 0 && !racas.some((r) => r.codigo === 1))
    aviso('Raças', 'Nenhuma raça tem o código 1. As telas de Personagem abrem filtrando por ele e vão cair na primeira raça da lista.');

  const nomesPorRaca = (lista: Verbete[], raca: unknown) =>
    lista.filter((x) => x.raca === null || x.raca === raca).length;

  for (const r of racas) {
    const pecasDaRaca = b.personagem.pecas.filter((p) => p.raca === null || p.raca === r.chave);
    if (pecasDaRaca.length === 0)
      aviso('Raças', `“${r.nome}” não alcança peça de arte nenhuma — nem própria, nem genérica. Nenhum visitante dessa raça conseguiria ser montado.`);

    const primeirosNomes =
      nomesPorRaca(v.nomesMasculinos, r.chave) + nomesPorRaca(v.nomesFemininos, r.chave);
    if (b.gameplay.missoes.length > 0 && primeirosNomes === 0)
      aviso('Raças', `“${r.nome}” não tem primeiro nome nenhum (nem genérico). Um visitante dessa raça chegaria sem nome no passe.`);
  }

  // ── temperamentos ──────────────────────────────────────────────────────
  for (const t of b.personagem.temperamentos) {
    if (t.sinal !== 1 && t.sinal !== -1)
      erro('Temperamentos', `“${t.nome}” tem um sinal inválido (${t.sinal}). O gráfico não saberia de que lado desenhar a coluna.`);
  }

  // ── vilas ──────────────────────────────────────────────────────────────
  const chavesVila = new Set(b.mundo.vilas.map((x) => x.chave));

  for (const vila of b.mundo.vilas) {
    // Educação é distribuição: sem somar 100, "60% na média" não quer dizer nada.
    const e = vila.educacao;
    const somaEducacao = e.analfabeto + e.media + e.acima + e.alto;
    if (Math.round(somaEducacao) !== 100)
      erro('Vilas', `As faixas de educação de “${vila.nome}” somam ${Math.round(somaEducacao)}% — precisam somar 100, senão a distribuição não significa nada.`);

    // Clima também é distribuição, mas aqui o jogo normaliza pela soma: dá pra
    // publicar torto, só não é o que a pessoa quis dizer.
    const somaClima = vila.climas.reduce((s, c) => s + c.percentual, 0);
    if (vila.climas.length === 0) aviso('Vilas', `“${vila.nome}” não tem clima nenhum.`);
    else if (Math.round(somaClima) !== 100)
      aviso('Vilas', `Os climas de “${vila.nome}” somam ${Math.round(somaClima)}% em vez de 100. O jogo normaliza pela soma, então o que vale é a proporção.`);

    // Uma vila sem nível não tem onde ser jogada.
    if (vila.niveis.length === 0)
      aviso('Vilas', `“${vila.nome}” não tem nível nenhum — não existe lugar jogável dentro dela.`);

    for (const n of vila.niveis) {
      const onde = `“${vila.nome}” nível ${n.nivel} · variação ${n.variacao}`;
      // O cenário já vem resolvido: arte do nível ou, na falta, a da vila.
      // Chegar aqui sem nada quer dizer que nem o nível nem a vila têm arte.
      const faltando = [
        !n.cenario.dia && 'dia',
        !n.cenario.tarde && 'tarde',
        !n.cenario.noite && 'noite',
      ].filter(Boolean);
      if (faltando.length === 3)
        erro(
          'Níveis',
          `${onde} não tem arte nenhuma, e a vila também não tem cenário pra emprestar — a janela ficaria preta.`,
        );
      else if (faltando.length)
        aviso('Níveis', `${onde} está sem a arte de ${faltando.join(' e ')}.`);

      for (const o of n.opinioes) {
        if (!String(o.titulo).trim())
          erro('Níveis', `${onde} tem uma opinião sem título. Ela viraria um prompt vazio.`);
      }
    }

    // Relação apontando pra vila que não existe mais (ou pra si mesma).
    for (const rel of vila.relacoes) {
      if (!rel.vila || !chavesVila.has(rel.vila))
        erro('Vilas', `“${vila.nome}” tem uma relação com uma vila que não existe mais.`);
      if (rel.tipo !== 'oposicao' && rel.tipo !== 'alianca')
        erro('Vilas', `“${vila.nome}” tem uma relação sem tipo. Vila neutra é a que NÃO aparece na tabela — não existe linha "neutro".`);
    }

    for (const t of vila.temperamentos) {
      if (!t.raca)
        erro('Vilas', `“${vila.nome}” tem um temperamento apontando pra uma raça que não existe mais.`);
      if (!t.temperamento)
        erro('Vilas', `“${vila.nome}” tem uma linha de temperamento que não existe mais no cadastro.`);
    }

    // Raças é distribuição, igual clima: vila sem linha nenhuma é lida como
    // "só Humano" pelo jogo, então não é erro — só clima e educação são
    // obrigatórios de existir.
    if (vila.racas.length > 0) {
      const somaRacas = vila.racas.reduce((s, x) => s + x.percentual, 0);
      if (Math.round(somaRacas) !== 100)
        aviso('Vilas', `As raças de “${vila.nome}” somam ${Math.round(somaRacas)}% em vez de 100. O jogo normaliza pela soma, então o que vale é a proporção.`);
    }
    for (const r of vila.racas) {
      if (!r.raca) erro('Vilas', `“${vila.nome}” tem uma linha de raça apontando pra uma raça que não existe mais.`);
    }

    for (const c of vila.celebridades) {
      if (!String(c.nome).trim())
        erro('Vilas', `“${vila.nome}” tem uma celebridade sem nome.`);
    }
  }

  // ── lugares ────────────────────────────────────────────────────────────
  // O lugar é o que preenche o campo "Cidade" do passe. Sem nenhum, o campo
  // sairia vazio em todo visitante e a pista de cidade divergente sumiria.
  if (b.gameplay.missoes.length > 0 && b.mundo.lugares.length === 0)
    erro('Lugares', 'Nenhum lugar cadastrado — o campo Cidade do passe sairia vazio em todos os visitantes.');
  for (const l of b.mundo.lugares) {
    if (!l.vila) aviso('Lugares', `“${l.nome}” não pertence a nenhuma vila.`);
  }

  return { erros, avisos };
}
