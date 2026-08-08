'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MapPin, Route, X } from 'lucide-react';
import { Upload } from '@/componentes/Upload';
import { Aviso } from '@/componentes/ui';
import { salvar, trocarLigacoes } from '@/lib/acoes';
import type { Regiao } from '@/lib/tipos';
import { MapaCanvas, type Posicao } from './MapaCanvas';

const CAMINHO = '/mundo/regioes';

/**
 * Editor visual do mapa-múndi, tela cheia — mesmo palco do visualizador
 * (`MapaCanvas`), só que interativo: clicar numa região sem posição a
 * "arma"; clicar no mapa a planta ali. Pino já plantado se arrasta
 * livremente. Clicar num pino plantado (sem arrastar) o seleciona e abre,
 * na lateral, os caminhos possíveis a partir dele.
 */
export function EditorMapa({
  aberto,
  aoFechar,
  regioes,
  mapaUrl,
  caminhos,
}: {
  aberto: boolean;
  aoFechar: () => void;
  regioes: Regiao[];
  mapaUrl: string | null;
  caminhos: Record<string, string>;
}) {
  const [url, setUrl] = useState(mapaUrl);
  const [posicoes, setPosicoes] = useState<Record<string, Posicao>>(() => {
    const p: Record<string, Posicao> = {};
    for (const r of regioes) {
      if (r.pos_x !== null && r.pos_y !== null) p[r.id] = { x: r.pos_x, y: r.pos_y };
    }
    return p;
  });
  const [armada, setArmada] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  const semPosicao = regioes.filter((r) => !posicoes[r.id]);
  const regiaoSelecionada = regioes.find((r) => r.id === selecionada) ?? null;
  const outrasDaSelecionada = regioes.filter((r) => r.id !== selecionada);

  function persistirPosicao(id: string, pos: Posicao | null) {
    iniciar(async () => {
      const r = await salvar(
        'regiao',
        {
          id,
          pos_x: pos ? Math.round(pos.x) : null,
          pos_y: pos ? Math.round(pos.y) : null,
        },
        CAMINHO,
      );
      if (!r.ok) setErro(r.erro);
    });
  }

  function aoClicarMapa(pos: Posicao) {
    if (!armada) return;
    setPosicoes((p) => ({ ...p, [armada]: pos }));
    persistirPosicao(armada, pos);
    setArmada(null);
  }

  function iniciarArraste(id: string) {
    setArrastando(id);
  }

  function moverArraste(id: string, pos: Posicao) {
    setPosicoes((p) => ({ ...p, [id]: pos }));
  }

  function soltarArraste(id: string, pos: Posicao | null) {
    setArrastando(null);
    // null = foi só um clique (não passou do limiar de arrasto) — nada mudou, nada pra salvar
    if (!pos) return;
    setPosicoes((p) => ({ ...p, [id]: pos }));
    persistirPosicao(id, pos);
  }

  function removerPosicao(id: string) {
    setPosicoes((p) => {
      const { [id]: _omitido, ...resto } = p;
      return resto;
    });
    if (selecionada === id) setSelecionada(null);
    persistirPosicao(id, null);
  }

  function aoEnviarMapa(novoAssetId: string, novaUrl: string) {
    setUrl(novaUrl);
    iniciar(async () => {
      const r = await salvar('mapa_mundi', { id: 1, asset_id: novoAssetId }, CAMINHO);
      if (!r.ok) setErro(r.erro);
    });
  }

  function removerMapa() {
    setUrl(null);
    iniciar(async () => {
      const r = await salvar('mapa_mundi', { id: 1, asset_id: null }, CAMINHO);
      if (!r.ok) setErro(r.erro);
    });
  }

  function alternarCaminho(destinoId: string) {
    if (!regiaoSelecionada) return;
    const atuais = regiaoSelecionada.ligacoes ?? [];
    const novas = atuais.includes(destinoId)
      ? atuais.filter((x) => x !== destinoId)
      : [...atuais, destinoId];
    iniciar(async () => {
      const r = await trocarLigacoes(
        'regiao_ligacao',
        'regiao_id',
        regiaoSelecionada.id,
        novas.map((destino_id) => ({ destino_id })),
        CAMINHO,
      );
      if (!r.ok) setErro(r.erro);
    });
  }

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="escurecer fixed inset-0 z-40 bg-black/85" />
        <Dialog.Content className="surgir fixed inset-4 z-50 flex overflow-hidden rounded-xl border border-borda-forte outline-none">
          <Dialog.Title className="sr-only">Mapa do mundo</Dialog.Title>
          <Dialog.Description className="sr-only">
            Editor visual do mapa: posicione as regiões e os caminhos entre elas.
          </Dialog.Description>

          <Dialog.Close
            className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-perigo"
            aria-label="Fechar"
          >
            <X size={20} />
          </Dialog.Close>

          {!url ? (
            <div className="pergaminho flex flex-1 flex-col items-center justify-center gap-4 p-10">
              {erro && (
                <div className="w-full max-w-md">
                  <Aviso tom="erro">{erro}</Aviso>
                </div>
              )}
              <div className="w-full max-w-md">
                <Upload
                  perfil="livre"
                  rotulo="Imagem base do mapa"
                  ajuda="Um PNG do mapa em branco, sem marcações. Depois é só arrastar cada região pro lugar certo."
                  aoEnviar={aoEnviarMapa}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center overflow-hidden bg-breu p-8">
                <MapaCanvas
                  mapaUrl={url}
                  regioes={regioes}
                  posicoes={posicoes}
                  caminhos={caminhos}
                  interativo
                  selecionada={selecionada}
                  armada={armada}
                  arrastando={arrastando}
                  aoClicarMapa={aoClicarMapa}
                  aoClicarVazio={() => setSelecionada(null)}
                  aoClicarRegiao={(id) => setSelecionada(selecionada === id ? null : id)}
                  aoIniciarArraste={iniciarArraste}
                  aoMoverArraste={moverArraste}
                  aoSoltarArraste={soltarArraste}
                  aoRemoverPosicao={removerPosicao}
                />
              </div>

              <div className="pergaminho flex w-80 shrink-0 flex-col overflow-y-auto border-l border-borda-forte p-6 md:w-96">
                <h2 className="titulo text-oxido mb-1 text-[22px]">Mapa do mundo</h2>
                <p className="mb-5 text-[12px] leading-relaxed text-tinta-fraca">
                  Clique numa região sem posição e depois no mapa pra plantar. Pino já plantado
                  se arrasta. Clique num pino pra ver e editar os caminhos dele.
                </p>

                {erro && (
                  <div className="mb-4">
                    <Aviso tom="erro">{erro}</Aviso>
                  </div>
                )}

                {regiaoSelecionada ? (
                  <div className="mb-5 rounded-md border border-ouro-escuro/50 bg-ouro/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-tinta">
                        <Route size={14} /> Caminhos de {regiaoSelecionada.nome}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelecionada(null)}
                        className="text-[11px] text-tinta-fraca hover:text-tinta"
                      >
                        fechar
                      </button>
                    </div>
                    {outrasDaSelecionada.length === 0 ? (
                      <p className="text-[12px] text-tinta-fraca">Nenhuma outra região ainda.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {outrasDaSelecionada.map((o) => {
                          const ativo = (regiaoSelecionada.ligacoes ?? []).includes(o.id);
                          return (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => alternarCaminho(o.id)}
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
                  </div>
                ) : (
                  <div className="mb-5">
                    <span className="rotulo mb-1.5 block">Regiões sem posição</span>
                    {semPosicao.length === 0 ? (
                      <p className="text-[12px] text-tinta-fraca">
                        Todas as regiões já estão no mapa.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {[...semPosicao]
                          .sort((a, b) => a.nome.localeCompare(b.nome))
                          .map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setArmada(armada === r.id ? null : r.id)}
                              className={[
                                'rounded-md border px-2.5 py-1.5 text-[12px] transition-colors',
                                armada === r.id
                                  ? 'border-ouro-escuro bg-ouro/28 font-bold text-tinta'
                                  : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                              ].join(' ')}
                            >
                              <MapPin size={12} className="mr-1 inline" />
                              {r.nome}
                            </button>
                          ))}
                      </div>
                    )}
                    {armada && (
                      <p className="mt-2 text-[11px] font-bold text-ouro-escuro">
                        agora clique no mapa
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="botao botao-secundario mt-auto text-[12px]"
                  onClick={removerMapa}
                >
                  Trocar imagem do mapa
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
