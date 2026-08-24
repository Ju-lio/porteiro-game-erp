'use client';

import { useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type { Vila } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

export type Posicao = { x: number; y: number };

/** Abaixo disso (em px na tela) um pointerdown+up ainda conta como clique, não arrasto. */
const LIMIAR_ARRASTO_PX = 5;

/** Hash estável só pra decidir de que lado a curva do caminho se desvia — sem isso, o desvio trocaria de lado a cada render. */
function ladoEstavel(chave: string): number {
  let h = 0;
  for (let i = 0; i < chave.length; i++) h = (h * 31 + chave.charCodeAt(i)) | 0;
  return h % 2 === 0 ? 1 : -1;
}

/** Ponto de controle da curva: desviado na perpendicular do segmento, pra parecer trilha e não régua. */
function pontoDeControle(p1: Posicao, p2: Posicao, chave: string): Posicao {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const desvio = Math.min(Math.max(dist * 0.18, 3), 10) * ladoEstavel(chave);
  return { x: (p1.x + p2.x) / 2 + nx * desvio, y: (p1.y + p2.y) / 2 + ny * desvio };
}

/**
 * O mapa em si: imagem + trilhas entre vilas ligadas + pinos. Usado tanto
 * pelo editor quanto pelo visualizador, sempre do mesmo jeito — é o que
 * garante que os dois nunca mais saem de proporção um do outro.
 */
export function MapaCanvas({
  mapaUrl,
  vilas,
  posicoes,
  caminhos,
  interativo = false,
  selecionada = null,
  armada = null,
  arrastando = null,
  aoClicarMapa,
  aoClicarVazio,
  aoClicarVila,
  aoIniciarArraste,
  aoMoverArraste,
  aoSoltarArraste,
  aoRemoverPosicao,
}: {
  mapaUrl: string;
  vilas: Vila[];
  posicoes: Record<string, Posicao>;
  caminhos: Record<string, string>;
  interativo?: boolean;
  selecionada?: string | null;
  armada?: string | null;
  arrastando?: string | null;
  aoClicarMapa?: (pos: Posicao) => void;
  aoClicarVazio?: () => void;
  aoClicarVila?: (id: string) => void;
  aoIniciarArraste?: (id: string) => void;
  aoMoverArraste?: (id: string, pos: Posicao) => void;
  aoSoltarArraste?: (id: string, pos: Posicao | null) => void;
  aoRemoverPosicao?: (id: string) => void;
}) {
  const [emFoco, setEmFoco] = useState<string | null>(null);
  const mapaRef = useRef<HTMLDivElement>(null);
  const arrasteRef = useRef<{ x: number; y: number; moveu: boolean } | null>(null);

  function coordenadaDoEvento(e: { clientX: number; clientY: number }): Posicao | null {
    const el = mapaRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
  }

  const posicionadas = vilas.filter((r) => posicoes[r.id]);
  const idsPosicionados = new Set(posicionadas.map((r) => r.id));

  const trilhas: { a: Vila; b: Vila }[] = [];
  const vistos = new Set<string>();
  for (const r of posicionadas) {
    for (const destinoId of r.ligacoes ?? []) {
      if (!idsPosicionados.has(destinoId)) continue;
      const chave = [r.id, destinoId].sort().join('|');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const destino = vilas.find((x) => x.id === destinoId);
      if (destino) trilhas.push({ a: r, b: destino });
    }
  }

  return (
    <div
      ref={mapaRef}
      onClick={(e) => {
        if (armada && aoClicarMapa) {
          const pos = coordenadaDoEvento(e);
          if (pos) aoClicarMapa(pos);
        } else {
          aoClicarVazio?.();
        }
      }}
      className={[
        'relative mx-auto w-fit max-w-full overflow-hidden rounded-md border border-borda select-none',
        armada ? 'cursor-crosshair' : '',
      ].join(' ')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mapaUrl}
        alt="Mapa-múndi"
        className="block max-h-[78vh] max-w-full"
        draggable={false}
      />

      {trilhas.length > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {trilhas.map(({ a, b }) => {
            const p1 = posicoes[a.id];
            const p2 = posicoes[b.id];
            const c = pontoDeControle(p1, p2, [a.id, b.id].sort().join('|'));
            const emEvidencia = selecionada === a.id || selecionada === b.id;
            return (
              <path
                key={`${a.id}-${b.id}`}
                d={`M ${p1.x} ${p1.y} Q ${c.x} ${c.y} ${p2.x} ${p2.y}`}
                fill="none"
                stroke={emEvidencia ? '#e0b23c' : '#3a2a1c'}
                strokeWidth={emEvidencia ? 0.6 : 0.4}
                strokeDasharray="2 1.6"
                strokeLinecap="round"
                opacity={emEvidencia ? 0.95 : 0.5}
              />
            );
          })}
        </svg>
      )}

      {posicionadas.map((r) => {
        const pos = posicoes[r.id];
        const iconeUrl = r.icone_mapa_id ? urlAsset(caminhos[r.icone_mapa_id]) : null;
        const cor = r.cor ?? '#b3261e';
        const foco = emFoco === r.id;
        const ativa = selecionada === r.id;
        return (
          <div
            key={r.id}
            onMouseEnter={() => setEmFoco(r.id)}
            onMouseLeave={() => setEmFoco(null)}
            onPointerDown={
              interativo
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    arrasteRef.current = { x: e.clientX, y: e.clientY, moveu: false };
                    aoIniciarArraste?.(r.id);
                  }
                : undefined
            }
            onPointerMove={
              interativo
                ? (e) => {
                    if (arrastando !== r.id || !arrasteRef.current) return;
                    if (!arrasteRef.current.moveu) {
                      const dx = e.clientX - arrasteRef.current.x;
                      const dy = e.clientY - arrasteRef.current.y;
                      if (Math.hypot(dx, dy) < LIMIAR_ARRASTO_PX) return;
                      arrasteRef.current.moveu = true;
                    }
                    const pos = coordenadaDoEvento(e);
                    if (pos) aoMoverArraste?.(r.id, pos);
                  }
                : undefined
            }
            onPointerUp={
              interativo
                ? (e) => {
                    if (arrastando !== r.id) return;
                    e.stopPropagation();
                    const moveu = arrasteRef.current?.moveu ?? false;
                    arrasteRef.current = null;
                    aoSoltarArraste?.(r.id, moveu ? coordenadaDoEvento(e) : null);
                  }
                : undefined
            }
            onPointerCancel={
              interativo
                ? (e) => {
                    if (arrastando !== r.id) return;
                    e.stopPropagation();
                    arrasteRef.current = null;
                    aoSoltarArraste?.(r.id, null);
                  }
                : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              if (interativo) aoClicarVila?.(r.id);
            }}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            className={[
              'group absolute -translate-x-1/2 -translate-y-1/2 touch-none',
              interativo ? (arrastando === r.id ? 'cursor-grabbing' : 'cursor-pointer') : 'cursor-default',
            ].join(' ')}
          >
            <span
              className={[
                'absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 rounded bg-black/75 px-2 py-1 text-[12px] font-bold whitespace-nowrap text-white transition-opacity duration-150',
                foco || ativa ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            >
              {r.nome}
            </span>

            {/* o hoverzinho: um halo na cor predominante da vila */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl transition-all duration-200"
              style={{
                background: cor,
                width: foco || ativa ? 220 : 0,
                height: foco || ativa ? 220 : 0,
                opacity: foco || ativa ? 0.6 : 0,
              }}
            />

            {ativa && (
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ouro"
                style={{ width: iconeUrl ? 10 : 56, height: iconeUrl ? 10 : 56 }}
              />
            )}

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

            {interativo && aoRemoverPosicao && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  aoRemoverPosicao(r.id);
                }}
                className="absolute -top-1 -right-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-perigo"
                aria-label={`Remover ${r.nome} do mapa`}
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
