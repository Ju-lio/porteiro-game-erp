'use client';

import { useState, useTransition } from 'react';
import { Info, Plus, Scale, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura } from '@/componentes/campos';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvar } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import { PREDICADOS, type Regra, type TipoDocumento } from '@/lib/tipos';

// ─────────────────────────────────────────────────────────────────────────────
// A REGRA É DADO, NÃO CÓDIGO. É o que permite criar uma regra nova sem
// programar — e é a peça da Fase 0 que mais muda o projeto.
//
// ⚠️ Toda regra tem que ser verificável A OLHO NU: o que está no passe, o que
// está no corpo, o que está na bolsa e o que o visitante responde. Uma regra
// que o jogador não consegue checar olhando pune ele por algo invisível.
// ─────────────────────────────────────────────────────────────────────────────

const CAMINHO = '/gameplay/regras';

const CAMPOS_PASSE = [
  { valor: 'nome', rotulo: 'Nome' },
  { valor: 'cidade', rotulo: 'Cidade' },
  { valor: 'profissao', rotulo: 'Profissão' },
];

type Clausula = { predicado: string; negado: boolean; campo?: string; documento?: string };

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  texto: string;
  juncao: 'e' | 'ou';
  clausulas: Clausula[];
};

/** Árvore JSON → o que o formulário mostra. */
function paraRascunho(r: Regra): Rascunho {
  const c = r.condicao as Record<string, unknown>;
  const juncao: 'e' | 'ou' = Array.isArray(c?.ou) ? 'ou' : 'e';
  const lista = (c?.[juncao] as Record<string, unknown>[]) ?? [c];

  const clausulas: Clausula[] = lista.filter(Boolean).map((item) => {
    const negado = 'nao' in item;
    const alvo = (negado ? (item.nao as Record<string, unknown>) : item) ?? {};
    const predicado = Object.keys(alvo)[0] ?? 'documentoAutentico';
    const bruto = alvo[predicado];
    const ehDocumento = predicado.startsWith('documento');
    return {
      predicado,
      negado,
      campo: !ehDocumento && typeof bruto === 'string' ? bruto : undefined,
      documento: ehDocumento && typeof bruto === 'string' ? bruto : undefined,
    };
  });

  return {
    id: r.id,
    chave: r.chave,
    nome: r.nome,
    texto: r.texto,
    juncao,
    clausulas: clausulas.length ? clausulas : [{ predicado: 'documentoAutentico', negado: false }],
  };
}

/** O que o formulário mostra → árvore JSON que o jogo avalia. */
function paraCondicao(r: Rascunho): unknown {
  const itens = r.clausulas.map((c) => {
    const def = PREDICADOS.find((p) => p.chave === c.predicado);
    const valor =
      def?.argumento === 'campo'
        ? (c.campo ?? 'profissao')
        : def?.argumento === 'documento'
          ? (c.documento ?? '')
          : true;
    const base = { [c.predicado]: valor };
    return c.negado ? { nao: base } : base;
  });
  // Sempre embrulhado na junção, mesmo com uma cláusula só: o interpretador do
  // jogo lê um formato único, e acrescentar a segunda condição não muda a forma.
  return { [r.juncao]: itens };
}

export function TelaRegras({
  regras,
  documentos,
}: {
  regras: Regra[];
  documentos: TipoDocumento[];
}) {
  const documentoPadrao = documentos[0]?.chave ?? '';
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Regra | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(r?: Regra) {
    setErro(null);
    setEditando(
      r
        ? paraRascunho(r)
        : {
            chave: '',
            nome: '',
            texto: '',
            juncao: 'e',
            clausulas: [
              { predicado: 'documentoAutentico', negado: false, documento: documentoPadrao },
            ],
          },
    );
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvar(
        'regra',
        {
          id: editando.id,
          chave: editando.chave,
          nome: editando.nome,
          texto: editando.texto,
          condicao: paraCondicao(editando),
        },
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Regras"
        descricao="A ordem do Rei para cada portão. É dela que sai o gabarito — ninguém marca “culpado” à mão."
        acoes={
          <>
            <GuiaRegras />
            <Contador n={regras.length} singular="regra" plural="regras" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Nova
            </button>
          </>
        }
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          Antes de salvar, responda: <strong>“como o jogador descobre isso só observando?”</strong>{' '}
          Se a resposta for “não descobre”, a regra pune por algo invisível — e o jogo deixa de
          ser justo.
        </Aviso>
      </div>

      {regras.length === 0 ? (
        <Vazio
          texto="Nenhuma regra ainda. Comece pela mais crua que existe: “só entra quem apresentar o selo do Rei”."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar a primeira
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 lg:grid-cols-2">
          {regras.map((r) => {
            const resumo = paraRascunho(r);
            return (
              <button
                key={r.id}
                onClick={() => abrir(r)}
                className="caixa p-5 text-left transition-colors hover:border-borda-forte"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="titulo text-[17px]">{r.nome}</span>
                  <Scale size={16} className="shrink-0 text-tinta-fraca opacity-50" />
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-tinta">“{r.texto}”</p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {resumo.clausulas.map((c, i) => (
                    <span key={i} className="etiqueta">
                      {c.negado && <span className="text-perigo">não</span>}
                      {PREDICADOS.find((p) => p.chave === c.predicado)?.rotulo ?? c.predicado}
                      {c.campo && <span className="opacity-60">· {c.campo}</span>}
                      {c.documento && (
                        <span className="opacity-60">
                          · {documentos.find((d) => d.chave === c.documento)?.nome ?? c.documento}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar regra' : 'Nova regra'}
        descricao="Monte a condição juntando verificações. O jogo avalia esta árvore — não existe código escondido por trás."
        largura="lg"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const r = regras.find((x) => x.id === editando.id);
                  if (r) setConfirmando(r);
                }}
              >
                <Trash2 size={15} /> Apagar
              </button>
            )}
            <button className="botao botao-secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className="botao botao-primario" onClick={submeter} disabled={pendente}>
              {pendente ? 'Salvando…' : 'Salvar Mudanças'}
            </button>
          </>
        }
      >
        {erro && (
          <div className="mb-5">
            <Aviso tom="erro">{erro}</Aviso>
          </div>
        )}

        {editando && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <Moldura rotulo="Nome interno" obrigatorio>
                <input
                  className="campo"
                  value={editando.nome}
                  placeholder="Selo e profissão"
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      nome: e.target.value,
                      chave:
                        !editando.id && !editando.chave ? paraChave(e.target.value) : editando.chave,
                    })
                  }
                />
              </Moldura>
              <Moldura rotulo="Chave" obrigatorio>
                <input
                  className="campo font-mono"
                  value={editando.chave}
                  onChange={(e) => setEditando({ ...editando, chave: paraChave(e.target.value) })}
                />
              </Moldura>
            </div>

            <Moldura
              rotulo="Texto que o jogador lê"
              ajuda="Aparece no cartaz da parede. Curto e imperativo — é uma ordem do Rei, não um manual."
              obrigatorio
            >
              <textarea
                className="campo"
                value={editando.texto}
                placeholder="Só entra com selo do Rei — e a cera do selo verdadeiro é VERMELHA."
                onChange={(e) => setEditando({ ...editando, texto: e.target.value })}
              />
            </Moldura>

            {/* ── construtor da condição ───────────────────────────────── */}
            <div className="caixa p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="titulo text-[15px]">O visitante pode entrar quando…</h3>
                <div className="flex overflow-hidden rounded-md border border-borda">
                  {(['e', 'ou'] as const).map((j) => (
                    <button
                      key={j}
                      onClick={() => setEditando({ ...editando, juncao: j })}
                      className={`px-3 py-1.5 text-[12px] font-bold transition-colors ${
                        editando.juncao === j
                          ? 'bg-ouro/30 text-tinta'
                          : 'text-tinta-fraca hover:bg-borda/30'
                      }`}
                    >
                      {j === 'e' ? 'TODAS valem' : 'QUALQUER uma vale'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {editando.clausulas.map((c, i) => {
                  const def = PREDICADOS.find((p) => p.chave === c.predicado);
                  return (
                    <div key={i} className="rounded-md border border-borda bg-pergaminho-2/60 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            const cl = [...editando.clausulas];
                            cl[i] = { ...cl[i], negado: !cl[i].negado };
                            setEditando({ ...editando, clausulas: cl });
                          }}
                          className={`shrink-0 rounded border px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
                            c.negado
                              ? 'border-perigo/50 bg-perigo/12 text-perigo'
                              : 'border-borda text-tinta-fraca hover:text-tinta'
                          }`}
                        >
                          {c.negado ? 'NÃO' : 'É'}
                        </button>

                        <select
                          className="campo flex-1"
                          value={c.predicado}
                          onChange={(e) => {
                            const cl = [...editando.clausulas];
                            cl[i] = {
                              ...cl[i],
                              predicado: e.target.value,
                              campo: cl[i].campo ?? 'profissao',
                              documento: cl[i].documento ?? documentoPadrao,
                            };
                            setEditando({ ...editando, clausulas: cl });
                          }}
                        >
                          {PREDICADOS.map((p) => (
                            <option key={p.chave} value={p.chave}>
                              {p.rotulo}
                            </option>
                          ))}
                        </select>

                        {PREDICADOS.find((p) => p.chave === c.predicado)?.argumento ===
                          'documento' && (
                          <select
                            className="campo w-[190px] shrink-0"
                            value={c.documento ?? ''}
                            onChange={(e) => {
                              const cl = [...editando.clausulas];
                              cl[i] = { ...cl[i], documento: e.target.value };
                              setEditando({ ...editando, clausulas: cl });
                            }}
                          >
                            <option value="">— documento —</option>
                            {documentos.map((d) => (
                              <option key={d.id} value={d.chave}>
                                {d.nome}
                              </option>
                            ))}
                          </select>
                        )}

                        {c.predicado === 'campoPreenchido' && (
                          <select
                            className="campo w-[140px] shrink-0"
                            value={c.campo ?? 'profissao'}
                            onChange={(e) => {
                              const cl = [...editando.clausulas];
                              cl[i] = { ...cl[i], campo: e.target.value };
                              setEditando({ ...editando, clausulas: cl });
                            }}
                          >
                            {CAMPOS_PASSE.map((f) => (
                              <option key={f.valor} value={f.valor}>
                                {f.rotulo}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          className="shrink-0 rounded-md p-2 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo disabled:opacity-30"
                          disabled={editando.clausulas.length === 1}
                          onClick={() =>
                            setEditando({
                              ...editando,
                              clausulas: editando.clausulas.filter((_, j) => j !== i),
                            })
                          }
                          aria-label="Remover condição"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      {def && <p className="mt-2 text-[11px] text-tinta-fraca">{def.ajuda}</p>}
                    </div>
                  );
                })}
              </div>

              <button
                className="botao botao-fantasma mt-3 text-[12px]"
                onClick={() =>
                  setEditando({
                    ...editando,
                    clausulas: [
                      ...editando.clausulas,
                      {
                        predicado: 'documentoAutentico',
                        negado: false,
                        documento: documentoPadrao,
                      },
                    ],
                  })
                }
              >
                <Plus size={14} /> Condição
              </button>
            </div>

            <details className="text-[12px]">
              <summary className="cursor-pointer text-tinta-fraca hover:text-tinta">
                Ver o JSON que vai para o jogo
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-md border border-borda bg-pergaminho-3/50 p-3 text-[11px]">
                {JSON.stringify(paraCondicao(editando), null, 2)}
              </pre>
            </details>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar regra?"
        descricao="As missões que a usavam ficam sem regra e não conseguem gerar o gabarito."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setConfirmando(null)}>
              Cancelar
            </button>
            <button
              className="botao botao-perigo"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  if (!confirmando) return;
                  const r = await apagar('regra', confirmando.id, CAMINHO);
                  if (r.ok) {
                    setConfirmando(null);
                    setEditando(null);
                  } else setErro(r.erro);
                })
              }
            >
              {pendente ? 'Apagando…' : 'Apagar'}
            </button>
          </>
        }
      >
        <p className="text-sm">
          <strong>{confirmando?.nome}</strong>
        </p>
      </Modal>
    </Folha>
  );
}

/**
 * O botão (i): explica o mecanismo pra quem nunca compôs uma regra — o caminho
 * de "cliquei em umas coisas" até "virou mecânica no jogo", com exemplos reais
 * dos predicados que existem hoje.
 */
function GuiaRegras() {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-borda-forte text-tinta-fraca transition-colors hover:border-ouro-escuro hover:text-tinta"
        aria-label="Como as regras funcionam"
        title="Como as regras funcionam"
      >
        <Info size={17} />
      </button>

      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo="Como uma regra vira mecânica"
        descricao="O caminho de “montei clicando” até “o jogo decide o gabarito por isso”."
        largura="lg"
        rodape={
          <button className="botao botao-primario" onClick={() => setAberto(false)}>
            Entendi
          </button>
        }
      >
        <div className="space-y-6 text-[13px] leading-relaxed">
          <section>
            <h3 className="titulo mb-2 text-[16px]">Quem cria a regra não é quem joga</h3>
            <p>
              O jogador nunca escreve regra nenhuma — ele só vive dentro da que{' '}
              <strong>você</strong> montou aqui. “Editor” é quem cria conteúdo (você, seus
              amigos); “jogador” é quem abre o jogo e decide aceitar ou recusar.
            </p>
          </section>

          <section>
            <h3 className="titulo mb-2 text-[16px]">O caminho em três passos</h3>
            <ol className="space-y-2">
              <li className="caixa flex gap-3 p-3">
                <span className="etiqueta shrink-0">1</span>
                <span>
                  Você compõe a condição clicando: <strong>É / NÃO</strong>, escolhe um
                  predicado, escolhe <strong>TODAS valem</strong> ou{' '}
                  <strong>QUALQUER uma vale</strong>.
                </span>
              </li>
              <li className="caixa flex gap-3 p-3">
                <span className="etiqueta shrink-0">2</span>
                <span>
                  Isso vira uma árvore de <strong>dado</strong> (o JSON que aparece no fim do
                  formulário) — não existe código escondido por trás.
                </span>
              </li>
              <li className="caixa flex gap-3 p-3">
                <span className="etiqueta shrink-0">3</span>
                <span>
                  O motor do jogo <strong>interpreta</strong> essa árvore contra cada
                  visitante: o resultado vira o gabarito (quem deveria ser recusado) e o texto
                  vira o cartaz pregado na parede da cabine.
                </span>
              </li>
            </ol>
          </section>

          <section>
            <h3 className="titulo mb-2 text-[16px]">Exemplos com os predicados de hoje</h3>
            <div className="space-y-3">
              <div className="caixa p-3">
                <p className="mb-1.5 font-bold">“Só entra com o selo autêntico”</p>
                <p className="text-tinta-fraca">
                  Uma condição só: <span className="etiqueta">É Documento autêntico</span> →
                  Selo do Rei.
                </p>
              </div>
              <div className="caixa p-3">
                <p className="mb-1.5 font-bold">
                  “Selo autêntico E a profissão do passe é a verdadeira”
                </p>
                <p className="text-tinta-fraca">
                  <strong>TODAS valem</strong>:{' '}
                  <span className="etiqueta">Documento autêntico</span> +{' '}
                  <span className="etiqueta">Campo preenchido · Profissão</span> +{' '}
                  <span className="etiqueta">Profissão é a verdadeira</span>.
                </p>
              </div>
              <div className="caixa p-3">
                <p className="mb-1.5 font-bold">
                  “Aceita com o selo OU a carta da guilda, mas nunca com item suspeito”
                </p>
                <p className="text-tinta-fraca">
                  <strong>TODAS valem</strong> por fora, com um{' '}
                  <strong>QUALQUER uma vale</strong> por dentro:{' '}
                  <span className="etiqueta">
                    (Selo autêntico <em>ou</em> Carta da guilda autêntica)
                  </span>{' '}
                  + <span className="etiqueta">Sem item suspeito</span>. Precisa dos dois
                  documentos já cadastrados em Documentos.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="titulo mb-2 text-[16px]">O limite: compor, não inventar</h3>
            <p>
              Você pode <strong>combinar</strong> os predicados existentes de qualquer jeito,
              à vontade. Você não pode inventar um predicado novo (ex.: “chegou depois do
              anoitecer”) — isso exige alguém programando os dois lados, ERP e jogo. É de
              propósito: um editor livre pra escrever qualquer condição vira uma linguagem de
              programação disfarçada, e alguém acabaria criando uma regra impossível de
              verificar olhando.
            </p>
          </section>

          <Aviso>
            Antes de salvar, pergunte: <strong>“como o jogador descobre isso só
            observando?”</strong> Se a resposta for “não descobre”, a regra pune por algo
            invisível — o cartaz da parede precisa conseguir explicar a condição em uma
            frase.
          </Aviso>
        </div>
      </Modal>
    </>
  );
}
