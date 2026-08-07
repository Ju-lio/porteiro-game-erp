'use client';

import { useState, useTransition } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { ListaTexto, Moldura } from '@/componentes/campos';
import { Upload } from '@/componentes/Upload';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import { FONTES_CAMPO, type CampoDocumento, type FonteCampo, type TipoDocumento } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

// ─────────────────────────────────────────────────────────────────────────────
// O selo do Rei deixou de ser um campo booleano do passe: agora ele é um TIPO
// DE DOCUMENTO como outro qualquer. É o que abre variedade de papel por região
// — carta da guilda, salvo-conduto, mandado — sem lógica nova no jogo.
//
// ⚠️ A falsificação tem que ser visível A OLHO NU. O documento declara a cor
// autêntica da cera e as cores que o falsificador erra; o cartaz da parede diz
// qual é a certa. Sem isso o jogador seria punido por algo que não dá pra ver.
// ─────────────────────────────────────────────────────────────────────────────

const CAMINHO = '/gameplay/documentos';

type RascunhoCampo = {
  id?: string;
  chave: string;
  rotulo: string;
  fonte: FonteCampo;
  pode_faltar: boolean;
};

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  descricao: string;
  cor_autentica: string;
  cores_falsas: string[];
  arte_id: string | null;
  arte_url: string | null;
  ordem: number;
  campos: RascunhoCampo[];
};

export function TelaDocumentos({
  documentos,
  caminhos,
}: {
  documentos: TipoDocumento[];
  caminhos: Record<string, string>;
}) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<TipoDocumento | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(d?: TipoDocumento) {
    setErro(null);
    setEditando({
      id: d?.id,
      chave: d?.chave ?? '',
      nome: d?.nome ?? '',
      descricao: d?.descricao ?? '',
      cor_autentica: d?.cor_autentica ?? '',
      cores_falsas: d?.cores_falsas ?? [],
      arte_id: d?.arte_id ?? null,
      arte_url: d?.arte_id ? urlAsset(caminhos[d.arte_id]) : null,
      ordem: d?.ordem ?? documentos.length * 10,
      campos: (d?.campos ?? []).map((c: CampoDocumento) => ({
        id: c.id,
        chave: c.chave,
        rotulo: c.rotulo,
        fonte: c.fonte,
        pode_faltar: c.pode_faltar,
      })),
    });
  }

  // A trava que mantém o jogo justo: se o falsificador pudesse acertar a cor,
  // não haveria como o jogador distinguir olhando.
  const conflito =
    editando && editando.cor_autentica
      ? editando.cores_falsas.some(
          (c) => c.trim().toLowerCase() === editando.cor_autentica.trim().toLowerCase(),
        )
      : false;

  function submeter() {
    if (!editando || conflito) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarComLigacoes(
        'tipo_documento',
        {
          id: editando.id,
          chave: editando.chave,
          nome: editando.nome,
          descricao: editando.descricao || null,
          cor_autentica: editando.cor_autentica.trim() || null,
          cores_falsas: editando.cores_falsas,
          arte_id: editando.arte_id,
          ordem: editando.ordem,
        },
        [
          {
            tabela: 'tipo_documento_campo',
            colunaDono: 'tipo_documento_id',
            linhas: editando.campos.map((c, i) => ({
              chave: c.chave || paraChave(c.rotulo),
              rotulo: c.rotulo,
              fonte: c.fonte,
              pode_faltar: c.pode_faltar,
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
        titulo="Documentos"
        descricao="Os papéis que o visitante apresenta. Cada região pode cobrar os seus."
        acoes={
          <>
            <Contador n={documentos.length} singular="documento" plural="documentos" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Novo
            </button>
          </>
        }
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          Campo vazio fica <strong>vazio</strong> na tela — nunca escreva “sem profissão”. A
          ausência é a pista, e percebê-la é trabalho do jogador.
        </Aviso>
      </div>

      {documentos.length === 0 ? (
        <Vazio
          texto="Nenhum documento ainda. Comece pelo Selo do Rei: cera vermelha, e o falsificador erra a cor."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar o primeiro
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {documentos.map((d) => (
            <button
              key={d.id}
              onClick={() => abrir(d)}
              className="caixa p-5 text-left transition-colors hover:border-borda-forte"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="titulo text-[17px]">{d.nome}</span>
                <FileText size={16} className="shrink-0 text-tinta-fraca opacity-50" />
              </div>
              <code className="text-[11px] text-tinta-fraca">{d.chave}</code>

              {d.cor_autentica ? (
                <p className="mt-3 text-[12px]">
                  Cera autêntica: <strong>{d.cor_autentica}</strong>
                  <span className="block text-tinta-fraca">
                    falsas: {d.cores_falsas.join(', ') || '—'}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-[12px] text-tinta-fraca">Sem lacre — só campos.</p>
              )}

              <div className="mt-3 flex flex-wrap gap-1">
                {(d.campos ?? []).map((c) => (
                  <span key={c.id} className="etiqueta">
                    {c.rotulo}
                  </span>
                ))}
                {!d.campos?.length && (
                  <span className="text-[11px] text-tinta-fraca">nenhum campo</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar documento' : 'Novo documento'}
        descricao="O que o visitante entrega pela janela quando o guarda pede."
        largura="lg"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const d = documentos.find((x) => x.id === editando.id);
                  if (d) setConfirmando(d);
                }}
              >
                <Trash2 size={15} /> Apagar
              </button>
            )}
            <button className="botao botao-secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button
              className="botao botao-primario"
              onClick={submeter}
              disabled={pendente || conflito}
            >
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
                  placeholder="Selo do Rei"
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

            <Moldura rotulo="Descrição">
              <input
                className="campo"
                value={editando.descricao}
                placeholder="O passe que autoriza a entrada no reino."
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              />
            </Moldura>

            {/* ── o lacre ──────────────────────────────────────────────── */}
            <div className="caixa p-4">
              <h3 className="titulo text-[15px]">Lacre</h3>
              <p className="mt-0.5 mb-4 text-[11px] leading-relaxed text-tinta-fraca">
                Deixe a cor autêntica em branco se este papel não leva selo. Com selo, o
                falsificador erra a cor — e é assim que o jogador pega a falsificação sem
                nenhum botão que consulte a verdade.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                <Moldura rotulo="Cor autêntica da cera">
                  <input
                    className="campo"
                    value={editando.cor_autentica}
                    placeholder="vermelho"
                    onChange={(e) => setEditando({ ...editando, cor_autentica: e.target.value })}
                  />
                </Moldura>

                <Moldura rotulo="Cores falsas">
                  <ListaTexto
                    valores={editando.cores_falsas}
                    aoMudar={(cores_falsas) => setEditando({ ...editando, cores_falsas })}
                    dica="azul"
                  />
                </Moldura>
              </div>

              {conflito && (
                <div className="mt-4">
                  <Aviso tom="erro">
                    A cor autêntica está na lista de falsas. Se o falsificador pudesse acertar a
                    cor, não haveria como o jogador distinguir olhando.
                  </Aviso>
                </div>
              )}
            </div>

            {/* ── campos ───────────────────────────────────────────────── */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="rotulo mb-0">Campos do documento</span>
                <button
                  className="botao botao-fantasma px-3 py-1.5 text-[12px]"
                  onClick={() =>
                    setEditando({
                      ...editando,
                      campos: [
                        ...editando.campos,
                        { chave: '', rotulo: '', fonte: 'texto_livre', pode_faltar: false },
                      ],
                    })
                  }
                >
                  <Plus size={14} /> Campo
                </button>
              </div>

              <div className="space-y-2">
                {editando.campos.map((c, i) => (
                  <div key={i} className="caixa p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className="campo min-w-[140px] flex-1"
                        placeholder="Rótulo (Nome, Cidade…)"
                        value={c.rotulo}
                        onChange={(e) => {
                          const campos = [...editando.campos];
                          campos[i] = {
                            ...campos[i],
                            rotulo: e.target.value,
                            chave: campos[i].id ? campos[i].chave : paraChave(e.target.value),
                          };
                          setEditando({ ...editando, campos });
                        }}
                      />
                      <select
                        className="campo w-[200px] shrink-0"
                        value={c.fonte}
                        onChange={(e) => {
                          const campos = [...editando.campos];
                          campos[i] = { ...campos[i], fonte: e.target.value as FonteCampo };
                          setEditando({ ...editando, campos });
                        }}
                      >
                        {FONTES_CAMPO.map((f) => (
                          <option key={f.valor} value={f.valor}>
                            {f.rotulo}
                          </option>
                        ))}
                      </select>
                      <button
                        className="shrink-0 rounded-md p-2 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                        onClick={() =>
                          setEditando({
                            ...editando,
                            campos: editando.campos.filter((_, j) => j !== i),
                          })
                        }
                        aria-label="Remover campo"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold">
                        <input
                          type="checkbox"
                          checked={c.pode_faltar}
                          onChange={(e) => {
                            const campos = [...editando.campos];
                            campos[i] = { ...campos[i], pode_faltar: e.target.checked };
                            setEditando({ ...editando, campos });
                          }}
                          className="size-3.5 accent-oxido"
                        />
                        pode vir em branco
                      </label>
                      <span className="text-[11px] text-tinta-fraca">
                        {FONTES_CAMPO.find((f) => f.valor === c.fonte)?.ajuda}
                      </span>
                    </div>
                  </div>
                ))}
                {editando.campos.length === 0 && (
                  <p className="rounded-md border border-dashed border-borda px-4 py-6 text-center text-[12px] text-tinta-fraca">
                    Documento sem campo nenhum não mostra nada ao jogador.
                  </p>
                )}
              </div>
            </div>

            <Upload
              rotulo="Arte do documento"
              perfil="cenario"
              urlAtual={editando.arte_url}
              aoEnviar={(arte_id, arte_url) => setEditando({ ...editando, arte_id, arte_url })}
              aoLimpar={() => setEditando({ ...editando, arte_id: null, arte_url: null })}
              ajuda="O papel de fundo. Sem arte, o jogo desenha um placeholder."
            />
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar documento?"
        descricao="As regras que o exigiam param de funcionar, e as regiões perdem a ligação."
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
                  const r = await apagar('tipo_documento', confirmando.id, CAMINHO);
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
