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
    paletas: { chave: unknown; cores: unknown[] }[];
    grupos: {
      chave: unknown;
      nome: unknown;
      opcional: unknown;
      familia: unknown;
      subCamadas: { chave: unknown; nome: unknown; tipo: unknown; paleta: unknown; opcional: unknown }[];
    }[];
    pecas: { chave: unknown; nome: unknown; grupo: unknown; conjunto: unknown; arquivos: Record<string, string> }[];
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
    regioes: { nome: unknown; documentos: unknown[] }[];
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
      regra: unknown;
      perfilGeracao: unknown;
      fracaoParaAprovar: number;
    }[];
  };
  vocabulario: { nomesMasculinos: string[]; nomesFemininos: string[]; sobrenomes: string[]; falasNeutras: string[] };
};

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

  for (const r of b.mundo.regioes) {
    if (r.documentos.length === 0)
      aviso('Regiões', `“${r.nome}” não exige documento nenhum.`);
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
  const v = b.vocabulario;
  if (b.gameplay.missoes.length > 0) {
    if (v.nomesMasculinos.length === 0 && v.nomesFemininos.length === 0)
      erro('Nomes e falas', 'Nenhum primeiro nome cadastrado — os visitantes chegariam sem nome no passe.');
    if (v.sobrenomes.length === 0)
      erro('Nomes e falas', 'Nenhum sobrenome cadastrado.');
    if (v.falasNeutras.length === 0)
      aviso('Nomes e falas', 'Nenhuma fala de chegada. Os visitantes chegam mudos.');
    if (v.nomesMasculinos.length + v.nomesFemininos.length < 8)
      aviso('Nomes e falas', 'Menos de 8 primeiros nomes: o elenco vai se repetir rápido num expediente.');
  }

  return { erros, avisos };
}
