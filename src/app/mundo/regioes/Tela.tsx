'use client';

import { useState, useTransition } from 'react';
import { BookOpen, Eye, Map, MapPin, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Upload } from '@/componentes/Upload';
import { Moldura, SeletorCor } from '@/componentes/campos';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { AmbienteSonoro, Cenario, Regiao, TipoDocumento } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';
import { EditorMapa } from './EditorMapa';
import { VisualizarMapa } from './VisualizarMapa';

// A região é o gargalo do mundo: hoje ela é só um nome no jogo, e tudo que vem
// depois (facções, leis locais, procurados, clima) pendura aqui.

const CAMINHO = '/mundo/regioes';

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  descricao: string;
  cor: string;
  clima: string;
  pos_x: number | null;
  pos_y: number | null;
  icone_mapa_id: string | null;
  icone_mapa_url: string | null;
  cenario_id: string | null;
  ambiente_sonoro_id: string | null;
  regras_especificas: string;
  ordem: number;
  ligacoes: string[];
  documentos: string[];
};

export function TelaRegioes({
  regioes,
  cenarios,
  ambientes,
  documentos,
  mapaUrl,
  caminhos,
}: {
  regioes: Regiao[];
  cenarios: Cenario[];
  ambientes: AmbienteSonoro[];
  documentos: TipoDocumento[];
  mapaUrl: string | null;
  caminhos: Record<string, string>;
}) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Regiao | null>(null);
  const [mapaAberto, setMapaAberto] = useState(false);
  const [visualizarAberto, setVisualizarAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(r?: Regiao) {
    setErro(null);
    setEditando({
      id: r?.id,
      chave: r?.chave ?? '',
      nome: r?.nome ?? '',
      descricao: r?.descricao ?? '',
      cor: r?.cor ?? '#8a6a45',
      clima: r?.clima ?? '',
      pos_x: r?.pos_x ?? null,
      pos_y: r?.pos_y ?? null,
      icone_mapa_id: r?.icone_mapa_id ?? null,
      icone_mapa_url: r?.icone_mapa_id ? urlAsset(caminhos[r.icone_mapa_id]) : null,
      cenario_id: r?.cenario_id ?? null,
      ambiente_sonoro_id: r?.ambiente_sonoro_id ?? null,
      regras_especificas: r?.regras_especificas ?? '',
      ordem: r?.ordem ?? regioes.length * 10,
      ligacoes: r?.ligacoes ?? [],
      documentos: r?.documentos ?? [],
    });
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarComLigacoes(
        'regiao',
        {
          id: editando.id,
          chave: editando.chave,
          nome: editando.nome,
          descricao: editando.descricao || null,
          cor: editando.cor || null,
          clima: editando.clima || null,
          pos_x: editando.pos_x,
          pos_y: editando.pos_y,
          icone_mapa_id: editando.icone_mapa_id,
          cenario_id: editando.cenario_id,
          ambiente_sonoro_id: editando.ambiente_sonoro_id,
          regras_especificas: editando.regras_especificas || null,
          ordem: editando.ordem,
        },
        [
          {
            tabela: 'regiao_ligacao',
            colunaDono: 'regiao_id',
            linhas: editando.ligacoes.map((destino_id) => ({ destino_id })),
          },
          {
            tabela: 'regiao_documento',
            colunaDono: 'regiao_id',
            linhas: editando.documentos.map((tipo_documento_id) => ({ tipo_documento_id })),
          },
        ],
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  const outras = regioes.filter((r) => r.id !== editando?.id);

  return (
    <Folha>
      <Cabecalho
        titulo="Regiões"
        descricao="Os lugares do reino. Cada portão que o jogador guarda pertence a uma região."
        acoes={
          <>
            <Contador n={regioes.length} singular="região" plural="regiões" />
            <button className="botao botao-secundario" onClick={() => setMapaAberto(true)}>
              <Map size={16} /> Editar mapa
            </button>
            <button
              className="botao botao-secundario"
              disabled={!mapaUrl}
              onClick={() => setVisualizarAberto(true)}
            >
              <Eye size={16} /> Visualizar mapa
            </button>
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Nova
            </button>
          </>
        }
      />

      {regioes.length === 0 ? (
        <Vazio
          texto="Nenhuma região ainda. Comece pela vila onde o jogador faz o treino — é o primeiro portão que ele guarda."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar a primeira
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {regioes.map((r) => (
            <button
              key={r.id}
              onClick={() => abrir(r)}
              className="caixa overflow-hidden p-0 text-left transition-colors hover:border-borda-forte"
            >
              <div className="h-1.5 w-full" style={{ background: r.cor ?? '#8a6a45' }} />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="titulo text-[17px]">{r.nome}</span>
                  <MapPin size={16} className="shrink-0 text-tinta-fraca opacity-50" />
                </div>
                {r.descricao && (
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-tinta-fraca">
                    {r.descricao}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.clima && <span className="etiqueta">{r.clima}</span>}
                  {(r.ligacoes?.length ?? 0) > 0 && (
                    <span className="etiqueta">{r.ligacoes?.length} caminho(s)</span>
                  )}
                  {(r.documentos?.length ?? 0) > 0 && (
                    <span className="etiqueta">{r.documentos?.length} documento(s)</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        aberto={mapaAberto}
        aoFechar={() => setMapaAberto(false)}
        titulo="Mapa do mundo"
        descricao="A imagem base do mapa e a posição de cada região sobre ela."
        largura="xl"
      >
        <EditorMapa regioes={regioes} mapaUrl={mapaUrl} caminhos={caminhos} />
      </Modal>

      <VisualizarMapa
        aberto={visualizarAberto}
        aoFechar={() => setVisualizarAberto(false)}
        regioes={regioes}
        mapaUrl={mapaUrl}
        caminhos={caminhos}
      />

      {/* ── o modal segue o layout da referência: Mapa | Gameplay ────────── */}
      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo="Configurações da Região"
        largura="lg"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const r = regioes.find((x) => x.id === editando.id);
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
            <Moldura rotulo="Nome da região" obrigatorio>
              <input
                className="campo"
                value={editando.nome}
                placeholder="Vale das Sombras"
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

            <div className="grid gap-5 md:grid-cols-2">
              {/* ── MAPA ────────────────────────────────────────────────── */}
              <section className="caixa p-5">
                <h3 className="titulo mb-4 border-b border-borda pb-2 text-[17px]">Mapa</h3>

                <div className="mb-4">
                  <Upload
                    rotulo="Ícone no mapa"
                    perfil="livre"
                    urlAtual={editando.icone_mapa_url}
                    aoEnviar={(id, url) =>
                      setEditando({ ...editando, icone_mapa_id: id, icone_mapa_url: url })
                    }
                    aoLimpar={() =>
                      setEditando({ ...editando, icone_mapa_id: null, icone_mapa_url: null })
                    }
                    ajuda="O pino da região em Regiões → Editar mapa. Sem ícone, usa um pino na cor da região."
                  />
                </div>

                <span className="rotulo">Caminhos possíveis</span>
                {outras.length === 0 ? (
                  <p className="text-[12px] text-tinta-fraca">
                    Nenhuma outra região para ligar ainda.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {outras.map((o) => {
                      const ativo = editando.ligacoes.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() =>
                            setEditando({
                              ...editando,
                              ligacoes: ativo
                                ? editando.ligacoes.filter((x) => x !== o.id)
                                : [...editando.ligacoes, o.id],
                            })
                          }
                          className={[
                            'rounded-md border px-2.5 py-1.5 text-[12px] transition-colors',
                            ativo
                              ? 'border-ouro-escuro bg-ouro/28 font-bold text-tinta'
                              : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                          ].join(' ')}
                        >
                          {o.nome}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── GAMEPLAY ────────────────────────────────────────────── */}
              <section className="caixa p-5">
                <h3 className="titulo mb-4 border-b border-borda pb-2 text-[17px]">Gameplay</h3>

                <div className="space-y-4">
                  <Moldura rotulo="Cenário visto pela janela">
                    <select
                      className="campo"
                      value={editando.cenario_id ?? ''}
                      onChange={(e) =>
                        setEditando({ ...editando, cenario_id: e.target.value || null })
                      }
                    >
                      <option value="">— nenhum —</option>
                      {cenarios.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </Moldura>

                  <Moldura rotulo="Ambiente sonoro">
                    <select
                      className="campo"
                      value={editando.ambiente_sonoro_id ?? ''}
                      onChange={(e) =>
                        setEditando({ ...editando, ambiente_sonoro_id: e.target.value || null })
                      }
                    >
                      <option value="">— nenhum —</option>
                      {ambientes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </Moldura>

                  <Moldura rotulo="Clima">
                    <input
                      className="campo"
                      value={editando.clima}
                      placeholder="Frio cortante, névoa constante…"
                      onChange={(e) => setEditando({ ...editando, clima: e.target.value })}
                    />
                  </Moldura>

                  <Moldura rotulo="Cor predominante">
                    <SeletorCor
                      valor={editando.cor}
                      aoMudar={(cor) => setEditando({ ...editando, cor })}
                    />
                  </Moldura>

                  <div>
                    <span className="rotulo">Documentos exigidos</span>
                    {documentos.length === 0 ? (
                      <p className="text-[12px] text-tinta-fraca">
                        Nenhum documento cadastrado ainda.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {documentos.map((d) => {
                          const ativo = editando.documentos.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() =>
                                setEditando({
                                  ...editando,
                                  documentos: ativo
                                    ? editando.documentos.filter((x) => x !== d.id)
                                    : [...editando.documentos, d.id],
                                })
                              }
                              className={[
                                'rounded-md border px-2.5 py-1.5 text-[12px] transition-colors',
                                ativo
                                  ? 'border-ouro-escuro bg-ouro/28 font-bold text-tinta'
                                  : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                              ].join(' ')}
                            >
                              {d.nome}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <span className="mt-1.5 block text-[11px] text-tinta-fraca">
                      Que papéis o guarda cobra neste portão. É aqui que a variedade por região
                      acontece.
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <Moldura rotulo="Descrição">
              <textarea
                className="campo"
                value={editando.descricao}
                placeholder="O que essa região é, quem vive nela, por que alguém passaria por aqui."
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              />
            </Moldura>

            <div>
              <span className="rotulo flex items-center gap-2">
                <BookOpen size={14} /> Regras específicas
              </span>
              <textarea
                className="campo"
                value={editando.regras_especificas}
                placeholder="Anotações de lore e de regra local. Ainda não afetam o jogo — leis por região entram na Fase 3."
                onChange={(e) => setEditando({ ...editando, regras_especificas: e.target.value })}
              />
              <span className="mt-1.5 block text-[11px] text-tinta-fraca">
                Campo de anotação por enquanto. Quando as leis por região existirem de verdade, é
                daqui que elas saem.
              </span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar região?"
        descricao="Missões e cidades ligadas a ela ficam sem região."
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
                  const r = await apagar('regiao', confirmando.id, CAMINHO);
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
