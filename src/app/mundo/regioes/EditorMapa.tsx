'use client';

import { useRef, useState, useTransition } from 'react';
import { MapPin, X } from 'lucide-react';
import { Upload } from '@/componentes/Upload';
import { Aviso } from '@/componentes/ui';
import { salvar } from '@/lib/acoes';
import type { Regiao } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

const CAMINHO = '/mundo/regioes';

type Posicao = { x: number; y: number };

/**
 * Editor visual do mapa-múndi: a imagem base fica fixa, as regiões viram
 * pinos. Clicar numa região sem posição a "arma"; clicar no mapa a planta
 * ali. Pino já plantado se arrasta livremente — cada solta salva sozinha.
 */
export function EditorMapa({
  regioes,
  mapaUrl,
  caminhos,
}: {
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
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const mapaRef = useRef<HTMLDivElement>(null);

  const semPosicao = regioes.filter((r) => !posicoes[r.id]);
  const porNome = (r: Regiao) => r.nome;

  function coordenadaDoEvento(e: { clientX: number; clientY: number }): Posicao | null {
    const el = mapaRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
  }

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

  function aoClicarMapa(e: React.MouseEvent) {
    if (!armada) return;
    const pos = coordenadaDoEvento(e);
    if (!pos) return;
    setPosicoes((p) => ({ ...p, [armada]: pos }));
    persistirPosicao(armada, pos);
    setArmada(null);
  }

  function iniciarArraste(id: string, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setArrastando(id);
  }

  function moverArraste(id: string, e: React.PointerEvent) {
    if (arrastando !== id) return;
    const pos = coordenadaDoEvento(e);
    if (!pos) return;
    setPosicoes((p) => ({ ...p, [id]: pos }));
  }

  function soltarArraste(id: string, e: React.PointerEvent) {
    if (arrastando !== id) return;
    e.stopPropagation();
    setArrastando(null);
    const pos = posicoes[id];
    if (pos) persistirPosicao(id, pos);
  }

  function removerPosicao(id: string) {
    setPosicoes((p) => {
      const { [id]: _omitido, ...resto } = p;
      return resto;
    });
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

  return (
    <div className="space-y-5">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {!url ? (
        <Upload
          perfil="livre"
          rotulo="Imagem base do mapa"
          ajuda="Um PNG do mapa em branco, sem marcações. Depois é só arrastar cada região pro lugar certo."
          aoEnviar={aoEnviarMapa}
        />
      ) : (
        <>
          <div>
            <span className="rotulo mb-1.5 flex items-center justify-between">
              <span>Regiões sem posição</span>
              {semPosicao.length > 0 && (
                <span className="text-[11px] font-normal text-tinta-fraca">
                  {armada ? 'agora clique no mapa' : 'clique numa região e depois no mapa'}
                </span>
              )}
            </span>
            {semPosicao.length === 0 ? (
              <p className="text-[12px] text-tinta-fraca">Todas as regiões já estão no mapa.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {[...semPosicao].sort((a, b) => porNome(a).localeCompare(porNome(b))).map((r) => (
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
          </div>

          <div
            ref={mapaRef}
            onClick={aoClicarMapa}
            className={[
              'relative mx-auto w-fit max-w-full overflow-hidden rounded-md border border-borda select-none',
              armada ? 'cursor-crosshair' : '',
            ].join(' ')}
          >
            {/* Altura travada em vh: o mapa inteiro cabe na tela sem precisar dar zoom out,
                e a imagem escala mantendo proporção (largura segue o max-w-full). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Mapa-múndi"
              className="block max-h-[62vh] max-w-full"
              draggable={false}
            />

            {regioes.map((r) => {
              const pos = posicoes[r.id];
              if (!pos) return null;
              const iconeUrl = r.icone_mapa_id ? urlAsset(caminhos[r.icone_mapa_id]) : null;
              return (
                <div
                  key={r.id}
                  onPointerDown={(e) => iniciarArraste(r.id, e)}
                  onPointerMove={(e) => moverArraste(r.id, e)}
                  onPointerUp={(e) => soltarArraste(r.id, e)}
                  onPointerCancel={(e) => soltarArraste(r.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  className={[
                    'group absolute -translate-x-1/2 -translate-y-1/2 touch-none',
                    arrastando === r.id ? 'cursor-grabbing' : 'cursor-grab',
                  ].join(' ')}
                >
                  <span className="absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {r.nome}
                  </span>
                  {iconeUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={iconeUrl}
                      alt=""
                      className="block h-[150px] w-[150px] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                      draggable={false}
                    />
                  ) : (
                    <MapPin
                      size={39}
                      className="block drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                      style={{ color: r.cor ?? '#b3261e' }}
                      fill={r.cor ?? '#b3261e'}
                      strokeWidth={1.5}
                      stroke="#2a1a10"
                    />
                  )}
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removerPosicao(r.id);
                    }}
                    className="absolute -top-1 -right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-perigo"
                    aria-label={`Remover ${r.nome} do mapa`}
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>

          <button type="button" className="botao botao-secundario text-[12px]" onClick={removerMapa}>
            Trocar imagem do mapa
          </button>
        </>
      )}
    </div>
  );
}
