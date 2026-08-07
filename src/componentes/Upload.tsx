'use client';

import { useRef, useState } from 'react';
import { CircleCheck, ImageUp, Loader2, Music, X } from 'lucide-react';
import { dimensoes, enviar, gerarMascara } from '@/lib/imagem';

/**
 * Campo de upload. Para sub-camada do tipo "cor", o arquivo vira MÁSCARA no
 * navegador antes de subir — é a conversão que o script python fazia.
 *
 * A validação de canvas acontece duas vezes de propósito: aqui (erro imediato,
 * antes de gastar rede) e no servidor (que é quem manda de verdade).
 */
export function Upload({
  perfil,
  paraMascara = false,
  canvasEsperado,
  urlAtual,
  aoEnviar,
  aoLimpar,
  rotulo,
  ajuda,
}: {
  perfil: 'peca' | 'cenario' | 'som' | 'livre';
  paraMascara?: boolean;
  canvasEsperado?: { largura: number; altura: number };
  urlAtual?: string | null;
  aoEnviar: (assetId: string, url: string) => void;
  aoLimpar?: () => void;
  rotulo: string;
  ajuda?: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const ehSom = perfil === 'som';

  async function processar(arquivo: File) {
    setErro(null);
    setOcupado(true);
    try {
      if (!ehSom && canvasEsperado) {
        const d = await dimensoes(arquivo);
        if (d.largura !== canvasEsperado.largura || d.altura !== canvasEsperado.altura) {
          throw new Error(
            `Esta arte veio ${d.largura}×${d.altura}px e precisa ser ${canvasEsperado.largura}×${canvasEsperado.altura}px. ` +
              `Confira se o "cortar transparência" está desligado ao exportar.`,
          );
        }
      }

      const conteudo = paraMascara ? await gerarMascara(arquivo) : arquivo;
      const r = await enviar(conteudo, perfil, arquivo.name);
      aoEnviar(r.asset.id, r.url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha no upload.');
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  return (
    <div>
      <span className="rotulo">{rotulo}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const f = e.dataTransfer.files?.[0];
          if (f) processar(f);
        }}
        onClick={() => !ocupado && entrada.current?.click()}
        className={[
          'relative grid cursor-pointer place-items-center overflow-hidden rounded-md border-2 border-dashed transition-colors',
          ehSom ? 'h-[70px]' : 'aspect-square',
          arrastando ? 'border-ouro-escuro bg-ouro/12' : 'border-borda hover:border-borda-forte',
          urlAtual && !ehSom ? 'xadrez border-solid' : 'bg-pergaminho-2/60',
        ].join(' ')}
      >
        {ocupado ? (
          <Loader2 size={22} className="animate-spin text-tinta-fraca" />
        ) : urlAtual ? (
          ehSom ? (
            <span className="flex items-center gap-2 px-3 text-[12px] text-tinta">
              <CircleCheck size={16} className="text-sucesso" /> áudio anexado
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={urlAtual} alt="" className="h-full w-full object-contain" />
          )
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-3 py-4 text-center text-[11px] text-tinta-fraca">
            {ehSom ? <Music size={20} /> : <ImageUp size={20} />}
            <span>arraste ou clique</span>
            {canvasEsperado && (
              <span className="font-bold">
                {canvasEsperado.largura}×{canvasEsperado.altura}
              </span>
            )}
          </span>
        )}

        {urlAtual && aoLimpar && !ocupado && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              aoLimpar();
            }}
            className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-perigo"
            aria-label="Remover"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <input
        ref={entrada}
        type="file"
        accept={ehSom ? 'audio/mpeg,audio/wav' : 'image/png'}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processar(f);
        }}
      />

      {paraMascara && !erro && (
        <span className="mt-1.5 block text-[11px] text-tinta-fraca">
          Vira máscara automaticamente — desenhe em qualquer cor.
        </span>
      )}
      {ajuda && !erro && (
        <span className="mt-1.5 block text-[11px] text-tinta-fraca">{ajuda}</span>
      )}
      {erro && (
        <span className="mt-1.5 block text-[11px] leading-relaxed font-bold text-perigo">
          {erro}
        </span>
      )}
    </div>
  );
}
