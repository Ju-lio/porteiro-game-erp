'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Regiao } from '@/lib/tipos';
import { MapaCanvas, type Posicao } from './MapaCanvas';

/**
 * Só olhar: o mesmo `MapaCanvas` do editor, sem interatividade — é o que
 * garante que editor e visualizador nunca mais saem de proporção um do
 * outro. Passar o mouse numa região mostra o nome e um halo na cor dela.
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
  if (!mapaUrl) return null;

  const posicoes: Record<string, Posicao> = {};
  for (const r of regioes) {
    if (r.pos_x !== null && r.pos_y !== null) posicoes[r.id] = { x: r.pos_x, y: r.pos_y };
  }

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
            <MapaCanvas mapaUrl={mapaUrl} regioes={regioes} posicoes={posicoes} caminhos={caminhos} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
