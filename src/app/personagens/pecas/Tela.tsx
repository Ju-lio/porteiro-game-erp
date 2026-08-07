'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura } from '@/componentes/campos';
import { PreviewPersonagem } from '@/componentes/PreviewPersonagem';
import { Upload } from '@/componentes/Upload';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { GrupoCamada, Paleta, Peca, SubCamada } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

const CAMINHO = '/personagens/pecas';

type Rascunho = {
  id?: string;
  grupo_id: string;
  chave: string;
  nome: string;
  genero: string;
  conjunto: string;
  arquetipos: string[];
  ativo: boolean;
  /** sub_camada_id → asset_id */
  arquivos: Record<string, string>;
  /** sub_camada_id → url, só pra mostrar na tela */
  urls: Record<string, string>;
};

export function TelaPecas({
  grupos,
  pecas,
  paletas,
  canvas,
}: {
  grupos: GrupoCamada[];
  pecas: Peca[];
  paletas: Paleta[];
  canvas: { largura: number; altura: number };
}) {
  const [grupoAtivo, setGrupoAtivo] = useState<string>(grupos[0]?.id ?? '');
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Peca | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const grupo = grupos.find((g) => g.id === grupoAtivo) ?? null;
  const daLista = pecas.filter((p) => p.grupo_id === grupoAtivo);
  const grupoDoRascunho = grupos.find((g) => g.id === editando?.grupo_id) ?? null;

  function abrir(p?: Peca) {
    setErro(null);
    if (!grupo && !p) return;
    if (p) {
      const urls: Record<string, string> = {};
      const arquivos: Record<string, string> = {};
      for (const a of p.arquivos ?? []) {
        arquivos[a.sub_camada_id] = a.asset_id;
        const u = urlAsset(a.asset?.caminho);
        if (u) urls[a.sub_camada_id] = u;
      }
      setEditando({
        id: p.id,
        grupo_id: p.grupo_id,
        chave: p.chave,
        nome: p.nome,
        genero: p.genero ?? '',
        conjunto: p.conjunto ?? '',
        arquetipos: p.arquetipos ?? [],
        ativo: p.ativo,
        arquivos,
        urls,
      });
    } else {
      setEditando({
        grupo_id: grupoAtivo,
        chave: '',
        nome: '',
        genero: '',
        conjunto: '',
        arquetipos: ['generico'],
        ativo: true,
        arquivos: {},
        urls: {},
      });
    }
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarComLigacoes(
        'peca',
        {
          id: editando.id,
          grupo_id: editando.grupo_id,
          chave: editando.chave,
          nome: editando.nome,
          genero: editando.genero || null,
          conjunto: editando.conjunto || null,
          arquetipos: editando.arquetipos.length ? editando.arquetipos : ['generico'],
          ativo: editando.ativo,
        },
        [
          {
            tabela: 'peca_arquivo',
            colunaDono: 'peca_id',
            linhas: Object.entries(editando.arquivos).map(([sub, asset]) => ({
              sub_camada_id: sub,
              asset_id: asset,
            })),
          },
        ],
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  // A peça sendo editada, no formato que o preview entende.
  const pecaFixada: Peca | null = editando
    ? {
        id: editando.id ?? 'rascunho',
        grupo_id: editando.grupo_id,
        chave: editando.chave,
        nome: editando.nome,
        genero: null,
        arquetipos: editando.arquetipos,
        conjunto: editando.conjunto || null,
        ativo: true,
        arquivos: Object.entries(editando.arquivos).map(([sub, asset]) => ({
          id: sub,
          peca_id: editando.id ?? 'rascunho',
          sub_camada_id: sub,
          asset_id: asset,
          asset: {
            id: asset,
            sha256: '',
            // O preview usa a URL; o caminho real vem do que acabou de subir.
            caminho: (editando.urls[sub] ?? '').split('/public/assets/')[1] ?? '',
            nome_original: null,
            mime: 'image/png',
            bytes: 0,
            largura: canvas.largura,
            altura: canvas.altura,
            criado_em: '',
          },
        })),
      }
    : null;

  return (
    <Folha>
      <Cabecalho
        titulo="Peças"
        descricao="A arte modular do personagem. Cada peça é uma variante do grupo — cabelo 1, cabelo 2, nariz 3."
        acoes={
          <>
            <Contador n={pecas.length} singular="peça" plural="peças" />
            <button className="botao botao-primario" onClick={() => abrir()} disabled={!grupo}>
              <Plus size={16} /> Nova peça
            </button>
          </>
        }
      />

      {grupos.length === 0 ? (
        <Vazio texto="Crie os grupos de camada primeiro — é a ordem de empilhamento que diz onde cada peça entra." />
      ) : (
        <>
          {/* ── abas por grupo ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-1.5 border-b border-borda px-8 py-4">
            {grupos.map((g) => {
              const n = pecas.filter((p) => p.grupo_id === g.id).length;
              const ativo = g.id === grupoAtivo;
              return (
                <button
                  key={g.id}
                  onClick={() => setGrupoAtivo(g.id)}
                  className={[
                    'rounded-md border px-3 py-1.5 text-[12px] font-bold transition-colors',
                    ativo
                      ? 'border-ouro-escuro bg-ouro/25 text-tinta'
                      : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                  ].join(' ')}
                >
                  {g.nome}
                  <span className="ml-1.5 opacity-55">{n}</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-8 p-8 lg:grid-cols-[1fr_340px]">
            {/* ── as peças do grupo ────────────────────────────────────── */}
            <div>
              {daLista.length === 0 ? (
                <div className="rounded-lg border border-dashed border-borda px-8 py-14 text-center">
                  <p className="text-sm text-tinta-fraca">
                    Nenhuma peça em <strong>{grupo?.nome}</strong> ainda.
                  </p>
                  <button className="botao botao-primario mx-auto mt-4" onClick={() => abrir()}>
                    <Plus size={16} /> Criar a primeira
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {daLista.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => abrir(p)}
                      className="caixa overflow-hidden p-0 text-left transition-colors hover:border-borda-forte"
                    >
                      <div className="xadrez relative aspect-square">
                        {(grupo?.sub_camadas ?? []).map((s: SubCamada) => {
                          const arq = p.arquivos?.find((a) => a.sub_camada_id === s.id);
                          const url = urlAsset(arq?.asset?.caminho);
                          if (!url) return null;
                          return (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              key={s.id}
                              src={url}
                              alt=""
                              className="absolute inset-0 h-full w-full object-contain"
                              style={s.tipo === 'cor' ? { opacity: 0.35 } : undefined}
                            />
                          );
                        })}
                        {!p.arquivos?.length && (
                          <span className="absolute inset-0 grid place-items-center text-[11px] text-tinta-fraca">
                            sem arte
                          </span>
                        )}
                      </div>
                      <div className="px-3 py-2">
                        <p className="truncate text-[13px] font-bold">{p.nome}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {!p.ativo && <span className="etiqueta opacity-60">inativa</span>}
                          {p.conjunto && <span className="etiqueta">conj. {p.conjunto}</span>}
                          {p.genero && <span className="etiqueta">{p.genero}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── preview do elenco ───────────────────────────────────── */}
            <aside>
              <div className="caixa p-4">
                <h2 className="titulo mb-3 text-[15px]">Personagem montado</h2>
                <PreviewPersonagem grupos={grupos} pecas={pecas} paletas={paletas} altura={300} />
                <p className="mt-3 text-[11px] leading-relaxed text-tinta-fraca">
                  Uma cor por paleta, um conjunto por família, grupos opcionais entrando pela
                  chance deles — é o mesmo sorteio que o jogo faz.
                </p>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* ── editor da peça ──────────────────────────────────────────────── */}
      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar peça' : 'Nova peça'}
        descricao={`Um arquivo por sub-camada de ${grupoDoRascunho?.nome ?? ''}. Canvas obrigatório: ${canvas.largura}×${canvas.altura}px.`}
        largura="xl"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const p = pecas.find((x) => x.id === editando.id);
                  if (p) setConfirmando(p);
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
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <Moldura rotulo="Nome" obrigatorio>
                  <input
                    className="campo"
                    value={editando.nome}
                    placeholder="Cabelo 1"
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        nome: e.target.value,
                        chave:
                          !editando.id && !editando.chave
                            ? paraChave(e.target.value)
                            : editando.chave,
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

              <div className="grid grid-cols-2 gap-5">
                <Moldura
                  rotulo="Gênero"
                  ajuda="Vazio = serve pra qualquer um. Só marque quando a arte for mesmo de um gênero."
                >
                  <select
                    className="campo"
                    value={editando.genero}
                    onChange={(e) => setEditando({ ...editando, genero: e.target.value })}
                  >
                    <option value="">Qualquer</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </Moldura>

                <Moldura
                  rotulo="Conjunto"
                  ajuda={
                    grupoDoRascunho?.familia
                      ? `Família "${grupoDoRascunho.familia}": peças com o mesmo conjunto entram JUNTAS.`
                      : 'Só vale se o grupo tiver família. Sem família, deixe vazio.'
                  }
                >
                  <input
                    className="campo"
                    value={editando.conjunto}
                    placeholder="1"
                    onChange={(e) => setEditando({ ...editando, conjunto: e.target.value })}
                  />
                </Moldura>
              </div>

              {/* ── um upload por sub-camada ─────────────────────────── */}
              <div>
                <span className="rotulo">Arquivos</span>
                {(grupoDoRascunho?.sub_camadas ?? []).length === 0 ? (
                  <p className="rounded-md border border-dashed border-borda px-4 py-5 text-center text-[12px] text-tinta-fraca">
                    Este grupo não tem sub-camadas. Configure em Camadas primeiro.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {(grupoDoRascunho?.sub_camadas ?? []).map((s: SubCamada) => (
                      <Upload
                        key={s.id}
                        rotulo={s.opcional ? `${s.nome} (opcional)` : s.nome}
                        perfil="peca"
                        paraMascara={s.tipo === 'cor'}
                        canvasEsperado={canvas}
                        urlAtual={editando.urls[s.id] ?? null}
                        aoEnviar={(assetId, url) =>
                          setEditando({
                            ...editando,
                            arquivos: { ...editando.arquivos, [s.id]: assetId },
                            urls: { ...editando.urls, [s.id]: url },
                          })
                        }
                        aoLimpar={() => {
                          const arquivos = { ...editando.arquivos };
                          const urls = { ...editando.urls };
                          delete arquivos[s.id];
                          delete urls[s.id];
                          setEditando({ ...editando, arquivos, urls });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                  className="size-4 accent-oxido"
                />
                <span className="text-sm font-bold">Ativa no sorteio</span>
              </label>

              <Aviso>
                Categorias sem sinal de arquétipo (corpo, nariz, boca) são <strong>ruído puro</strong> —
                qualquer papel pode ter qualquer uma. Ligar uma peça a um arquétipo cria um{' '}
                <em>tell visual</em>, e aparência não deveria ser prova.
              </Aviso>
            </div>

            <aside>
              <div className="caixa p-4">
                <h3 className="titulo mb-3 text-[14px]">Como fica no personagem</h3>
                <PreviewPersonagem
                  grupos={grupos}
                  pecas={pecas}
                  paletas={paletas}
                  fixar={pecaFixada ? { grupoId: editando.grupo_id, peca: pecaFixada } : null}
                  altura={250}
                />
              </div>
            </aside>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar peça?"
        descricao="Os arquivos continuam guardados — bundles já publicados seguem intactos."
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
                  const r = await apagar('peca', confirmando.id, CAMINHO);
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
