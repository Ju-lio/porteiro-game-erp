'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { MapPin, X } from 'lucide-react';
import type { Regiao } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

/**
 * Só olhar: o mapa em tela cheia, sem upload nem arrasto. Passar o mouse
 * numa região mostra o nome e um halo na cor predominante dela.
 */
export function VisualizarMapa({
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
  const [emFoco, setEmFoco] = useState<string | null>(null);

  if (!mapaUrl) return null;
  const posicionadas = regioes.filter((r) => r.pos_x !== null && r.pos_y !== null);

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="escurecer fixed inset-0 z-40 bg-black/85" />
        <Dialog.Content className="surgir fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border border-borda-forte bg-breu outline-none">
          <Dialog.Title className="sr-only">Mapa do mundo</Dialog.Title>
          <Dialog.Description className="sr-only">
            Visualização do mapa com as regiões posicionadas.
          </Dialog.Description>

          <Dialog.Close
            className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-perigo"
            aria-label="Fechar"
          >
            <X size={20} />
          </Dialog.Close>

          <div className="flex flex-1 items-center justify-center overflow-hidden p-8">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mapaUrl}
                alt="Mapa-múndi"
                className="block max-h-[85vh] max-w-full rounded-md select-none"
                draggable={false}
              />

              {posicionadas.map((r) => {
                const iconeUrl = r.icone_mapa_id ? urlAsset(caminhos[r.icone_mapa_id]) : null;
                const cor = r.cor ?? '#b3261e';
                const foco = emFoco === r.id;
                return (
                  <div
                    key={r.id}
                    onMouseEnter={() => setEmFoco(r.id)}
                    onMouseLeave={() => setEmFoco(null)}
                    style={{ left: `${r.pos_x}%`, top: `${r.pos_y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-default"
                  >
                    <span
                      className={[
                        'absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded bg-black/75 px-2 py-1 text-[12px] font-bold whitespace-nowrap text-white transition-opacity duration-150',
                        foco ? 'opacity-100' : 'opacity-0',
                      ].join(' ')}
                    >
                      {r.nome}
                    </span>

                    {/* o hoverzinho: um halo na cor predominante da região */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-all duration-200"
                      style={{
                        background: cor,
                        width: foco ? 162 : 0,
                        height: foco ? 162 : 0,
                        opacity: foco ? 0.6 : 0,
                      }}
                    />

                    {iconeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={iconeUrl}
                        alt=""
                        className={[
                          'block h-[150px] w-[150px] object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-transform duration-150',
                          foco ? 'scale-110' : '',
                        ].join(' ')}
                        draggable={false}
                      />
                    ) : (
                      <MapPin
                        size={39}
                        className={[
                          'block drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-transform duration-150',
                          foco ? 'scale-110' : '',
                        ].join(' ')}
                        style={{ color: cor }}
                        fill={cor}
                        strokeWidth={1.5}
                        stroke="#2a1a10"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
