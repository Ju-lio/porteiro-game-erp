'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronUp, Layers, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Chance, Moldura } from '@/componentes/campos';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, reordenar, salvarComLigacoes } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { GrupoCamada, Paleta, SubCamada, TipoSubCamada } from '@/lib/tipos';

// ─────────────────────────────────────────────────────────────────────────────
// A ORDEM DE EMPILHAMENTO do personagem, em grupos e sub-camadas:
//
//   1 cabelo-traseiro       2 corpo            3 roupa
//     1.1 cor                 2.1 cor            3.1 cor 1 (tecido)
//     1.2 traço               2.2 traço          3.2 cor 2 (couro)
//                                                3.3 traço
//
// O `z` numérico é DERIVADO desta ordem — ninguém digita número. Grupo novo
// (uma bolsa, um chapéu) entra arrastando, sem renumerar nada.
// ─────────────────────────────────────────────────────────────────────────────

const CAMINHO = '/personagens/camadas';

const TIPOS: { valor: TipoSubCamada; rotulo: string; ajuda: string }[] = [
  {
    valor: 'cor',
    rotulo: 'Cor (máscara)',
    ajuda: 'O arquivo vira máscara e é pintado por uma paleta. Desenhe em qualquer cor.',
  },
  {
    valor: 'traco',
    rotulo: 'Traço',
    ajuda: 'A arte de linha, por cima do preenchimento.',
  },
  {
    valor: 'arte_pronta',
    rotulo: 'Arte pronta',
    ajuda: 'Arquivo único com a cor já embutida — blush, rugas, e afins.',
  },
];

type RascunhoSub = {
  id?: string;
  chave: string;
  nome: string;
  tipo: TipoSubCamada;
  paleta_id: string | null;
  opcional: boolean;
  chance: number;
};

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  ordem: number;
  opcional: boolean;
  chance: number;
  familia: string;
  descricao: string;
  subs: RascunhoSub[];
};

export function TelaCamadas({ grupos, paletas }: { grupos: GrupoCamada[]; paletas: Paleta[] }) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<GrupoCamada | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(g?: GrupoCamada) {
    setErro(null);
    setEditando(
      g
        ? {
            id: g.id,
            chave: g.chave,
            nome: g.nome,
            ordem: g.ordem,
            opcional: g.opcional,
            chance: g.chance ?? 0.5,
            familia: g.familia ?? '',
            descricao: g.descricao ?? '',
            subs: (g.sub_camadas ?? []).map((s: SubCamada) => ({
              id: s.id,
              chave: s.chave,
              nome: s.nome,
              tipo: s.tipo,
              paleta_id: s.paleta_id,
              opcional: s.opcional,
              chance: s.chance ?? 0.3,
            })),
          }
        : {
            chave: '',
            nome: '',
            ordem: grupos.length * 10,
            opcional: false,
            chance: 0.5,
            familia: '',
            descricao: '',
            // O par que quase todo grupo tem: preenchimento embaixo, traço em cima.
            subs: [
              { chave: 'cor', nome: 'Cor', tipo: 'cor', paleta_id: null, opcional: false, chance: 0.3 },
              { chave: 'traco', nome: 'Traço', tipo: 'traco', paleta_id: null, opcional: false, chance: 0.3 },
            ],
          },
    );
  }

  function mover(indice: number, direcao: -1 | 1) {
    const alvo = indice + direcao;
    if (alvo < 0 || alvo >= grupos.length) return;
    const ids = grupos.map((g) => g.id);
    [ids[indice], ids[alvo]] = [ids[alvo], ids[indice]];
    iniciar(async () => {
      const r = await reordenar('grupo_camada', ids, CAMINHO);
      if (!r.ok) setErro(r.erro);
    });
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarComLigacoes(
        'grupo_camada',
        {
          id: editando.id,
          chave: editando.chave,
          nome: editando.nome,
          ordem: editando.ordem,
          opcional: editando.opcional,
          chance: editando.opcional ? editando.chance : null,
          familia: editando.familia || null,
          descricao: editando.descricao || null,
        },
        [
          {
            tabela: 'sub_camada',
            colunaDono: 'grupo_id',
            linhas: editando.subs.map((s, i) => ({
              chave: s.chave,
              nome: s.nome,
              tipo: s.tipo,
              paleta_id: s.tipo === 'cor' ? s.paleta_id : null,
              opcional: s.opcional,
              chance: s.opcional ? s.chance : null,
              ordem: i * 10,
            })),
          },
        ],
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Camadas"
        descricao="A ordem de empilhamento do personagem. O de cima aparece na frente."
        acoes={
          <>
            <Contador n={grupos.length} singular="grupo" plural="grupos" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Novo grupo
            </button>
          </>
        }
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          Grupo novo entra arrastando e <strong>não quebra nada</strong> — o número de
          empilhamento é derivado desta ordem, ninguém digita. Sub-camadas opcionais no meio
          (blush, rugas) ficam entre o preenchimento e o traço do mesmo grupo.
        </Aviso>
      </div>

      {erro && (
        <div className="border-b border-borda px-8 py-4">
          <Aviso tom="erro">{erro}</Aviso>
        </div>
      )}

      {grupos.length === 0 ? (
        <Vazio
          texto="Nenhum grupo de camada ainda. Comece pelo cabelo de trás, que fica atrás de tudo, e vá subindo até o cabelo da frente."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar o primeiro
            </button>
          }
        />
      ) : (
        <ol className="p-8">
          {grupos.map((g, i) => (
            <li key={g.id} className="caixa mb-2.5 flex items-stretch overflow-hidden">
              {/* posição + setas */}
              <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-borda bg-pergaminho-3/40 py-2">
                <button
                  onClick={() => mover(i, -1)}
                  disabled={i === 0 || pendente}
                  className="rounded p-0.5 text-tinta-fraca transition-colors hover:bg-borda/60 hover:text-tinta disabled:opacity-25"
                  aria-label="Subir"
                >
                  <ChevronUp size={16} />
                </button>
                <span className="font-display text-[15px] font-bold text-tinta">{i + 1}</span>
                <button
                  onClick={() => mover(i, 1)}
                  disabled={i === grupos.length - 1 || pendente}
                  className="rounded p-0.5 text-tinta-fraca transition-colors hover:bg-borda/60 hover:text-tinta disabled:opacity-25"
                  aria-label="Descer"
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              <button onClick={() => abrir(g)} className="flex-1 px-5 py-3.5 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="titulo text-[16px]">{g.nome}</span>
                  <code className="text-[11px] text-tinta-fraca">{g.chave}</code>
                  {g.opcional && (
                    <span className="etiqueta">opcional · {Math.round((g.chance ?? 0) * 100)}%</span>
                  )}
                  {g.familia && <span className="etiqueta">família: {g.familia}</span>}
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(g.sub_camadas ?? []).map((s: SubCamada, j: number) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded border border-borda bg-pergaminho-2/70 px-2 py-1 text-[11px]"
                    >
                      <span className="font-bold text-tinta-fraca">
                        {i + 1}.{j + 1}
                      </span>
                      {s.nome}
                      <span className="text-tinta-fraca">
                        {s.tipo === 'cor'
                          ? `· ${paletas.find((p) => p.id === s.paleta_id)?.chave ?? 'sem paleta'}`
                          : s.tipo === 'traco'
                            ? '· traço'
                            : '· arte pronta'}
                      </span>
                    </span>
                  ))}
                  {!g.sub_camadas?.length && (
                    <span className="text-[11px] text-tinta-fraca">sem sub-camadas</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* ── editor do grupo ─────────────────────────────────────────────── */}
      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar grupo de camada' : 'Novo grupo de camada'}
        descricao="As sub-camadas empilham de cima pra baixo nesta lista: a primeira fica embaixo."
        largura="lg"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const g = grupos.find((x) => x.id === editando.id);
                  if (g) setConfirmando(g);
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
              <Moldura rotulo="Nome" obrigatorio>
                <input
                  className="campo"
                  value={editando.nome}
                  placeholder="Cabelo traseiro"
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
                  placeholder="cabelo_traseiro"
                  onChange={(e) => setEditando({ ...editando, chave: paraChave(e.target.value) })}
                />
              </Moldura>
            </div>

            <Moldura
              rotulo="Família"
              ajuda="Grupos com a MESMA família sorteiam peças em conjunto — a franja e a massa de trás do mesmo penteado, o blush desenhado pra aquele nariz. Deixe vazio se o grupo sorteia sozinho."
            >
              <input
                className="campo"
                value={editando.familia}
                placeholder="cabelo"
                onChange={(e) => setEditando({ ...editando, familia: e.target.value })}
              />
            </Moldura>

            <div className="caixa space-y-4 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={editando.opcional}
                  onChange={(e) => setEditando({ ...editando, opcional: e.target.checked })}
                  className="size-4 accent-oxido"
                />
                <span className="text-sm font-bold">Grupo opcional (entra ou não entra)</span>
              </label>

              {editando.opcional && (
                <Moldura
                  rotulo="Chance de entrar"
                  ajuda="É o botão de “quantos velhos / quantos corados” tem no elenco."
                >
                  <Chance
                    valor={editando.chance}
                    aoMudar={(v) => setEditando({ ...editando, chance: v })}
                  />
                </Moldura>
              )}
            </div>

            {/* ── sub-camadas ──────────────────────────────────────────── */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="rotulo mb-0 flex items-center gap-2">
                  <Layers size={14} /> Sub-camadas (de baixo para cima)
                </span>
                <button
                  className="botao botao-fantasma px-3 py-1.5 text-[12px]"
                  onClick={() =>
                    setEditando({
                      ...editando,
                      subs: [
                        ...editando.subs,
                        {
                          chave: '',
                          nome: '',
                          tipo: 'traco',
                          paleta_id: null,
                          opcional: false,
                          chance: 0.3,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={14} /> Sub-camada
                </button>
              </div>

              <div className="space-y-2">
                {editando.subs.map((s, i) => (
                  <div key={i} className="caixa p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-9 shrink-0 text-center font-display text-[13px] font-bold text-tinta-fraca">
                        {i + 1}
                      </span>
                      <input
                        className="campo"
                        placeholder="Nome (Cor 1, Traço…)"
                        value={s.nome}
                        onChange={(e) => {
                          const subs = [...editando.subs];
                          subs[i] = {
                            ...subs[i],
                            nome: e.target.value,
                            chave: subs[i].id ? subs[i].chave : paraChave(e.target.value),
                          };
                          setEditando({ ...editando, subs });
                        }}
                      />
                      <select
                        className="campo w-[170px] shrink-0"
                        value={s.tipo}
                        onChange={(e) => {
                          const subs = [...editando.subs];
                          const tipo = e.target.value as TipoSubCamada;
                          subs[i] = { ...subs[i], tipo, paleta_id: tipo === 'cor' ? subs[i].paleta_id : null };
                          setEditando({ ...editando, subs });
                        }}
                      >
                        {TIPOS.map((t) => (
                          <option key={t.valor} value={t.valor}>
                            {t.rotulo}
                          </option>
                        ))}
                      </select>
                      {s.tipo === 'cor' && (
                        <select
                          className="campo w-[150px] shrink-0"
                          value={s.paleta_id ?? ''}
                          onChange={(e) => {
                            const subs = [...editando.subs];
                            subs[i] = { ...subs[i], paleta_id: e.target.value || null };
                            setEditando({ ...editando, subs });
                          }}
                        >
                          <option value="">— paleta —</option>
                          {paletas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        className="shrink-0 rounded-md p-2 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                        onClick={() =>
                          setEditando({
                            ...editando,
                            subs: editando.subs.filter((_, j) => j !== i),
                          })
                        }
                        aria-label="Remover sub-camada"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 pl-11">
                      <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold">
                        <input
                          type="checkbox"
                          checked={s.opcional}
                          onChange={(e) => {
                            const subs = [...editando.subs];
                            subs[i] = { ...subs[i], opcional: e.target.checked };
                            setEditando({ ...editando, subs });
                          }}
                          className="size-3.5 accent-oxido"
                        />
                        opcional
                      </label>
                      {s.opcional && (
                        <div className="min-w-[220px] flex-1">
                          <Chance
                            valor={s.chance}
                            aoMudar={(chance) => {
                              const subs = [...editando.subs];
                              subs[i] = { ...subs[i], chance };
                              setEditando({ ...editando, subs });
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 pl-11 text-[11px] text-tinta-fraca">
                      {TIPOS.find((t) => t.valor === s.tipo)?.ajuda}
                      {s.opcional && ' Entra pela chance acima, no meio do grupo.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar grupo de camada?"
        descricao="Todas as peças e sub-camadas deste grupo vão junto."
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
                  const r = await apagar('grupo_camada', confirmando.id, CAMINHO);
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
