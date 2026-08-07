'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/**
 * O modal de edição — é a peça visual que a referência define: folha de
 * pergaminho, faixa de título com borda embaixo, rodapé com Cancelar/Salvar.
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  largura = 'md',
  rodape,
  children,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  largura?: 'sm' | 'md' | 'lg' | 'xl';
  rodape?: React.ReactNode;
  children: React.ReactNode;
}) {
  const larguras = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  }[largura];

  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="escurecer fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px]" />
        <Dialog.Content
          className={`pergaminho surgir fixed top-1/2 left-1/2 z-50 flex max-h-[92vh] w-[calc(100vw-3rem)] ${larguras} -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-borda-forte`}
        >
          <div className="flex items-start justify-between gap-4 border-b border-borda px-7 py-5">
            <div className="min-w-0">
              <Dialog.Title className="titulo text-[24px] leading-tight">{titulo}</Dialog.Title>
              {descricao ? (
                <Dialog.Description className="mt-1 text-[13px] leading-relaxed text-tinta-fraca">
                  {descricao}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{titulo}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-1 shrink-0 rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-borda/40 hover:text-tinta"
              aria-label="Fechar"
            >
              <X size={22} />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>

          {rodape && (
            <div className="flex items-center justify-end gap-3 border-t border-borda bg-pergaminho-2/50 px-7 py-4">
              {rodape}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
