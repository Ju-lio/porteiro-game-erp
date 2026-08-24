'use client';

import type { Raca } from '@/lib/tipos';

// ═══════════════════════════════════════════════════════════════════════════
// OS CARDS DE RAÇA — o filtro que abre toda tela da aba Personagens.
//
// Regra de leitura (a mesma nas quatro telas: Paletas, Peças, Nomes e falas,
// Temperamentos):
//   · `raca_id` preenchido → o registro é DAQUELA raça e só aparece nela;
//   · `raca_id` nulo       → o registro serve para TODAS as raças e aparece em
//     qualquer filtro, marcado com a etiqueta "todas".
//
// O card de raça já nasce selecionado no CÓDIGO 1 (Humano) — é o que o Julio
// pediu como padrão, e também o único povo que existe no jogo hoje.
// ═══════════════════════════════════════════════════════════════════════════

/** O valor especial do filtro "só o que é genérico". */
export const RACA_GENERICA = '__todas__';

/** A raça que as telas abrem selecionada: a de código 1, ou a primeira que houver. */
export function racaPadrao(racas: Raca[]): string {
  const humano = racas.find((r) => r.codigo === 1) ?? racas[0];
  return humano?.id ?? RACA_GENERICA;
}

/**
 * Um registro entra na lista quando é da raça escolhida OU quando é genérico.
 * Com o filtro em "Genéricas", só os sem raça aparecem.
 */
export function pertenceARaca(racaDoRegistro: string | null, filtro: string): boolean {
  if (filtro === RACA_GENERICA) return racaDoRegistro === null;
  return racaDoRegistro === filtro || racaDoRegistro === null;
}

export function FiltroRacas({
  racas,
  valor,
  aoMudar,
  contar,
}: {
  racas: Raca[];
  valor: string;
  aoMudar: (racaId: string) => void;
  /** Quantos registros aquele card representa. Opcional — some se não vier. */
  contar?: (racaId: string | null) => number;
}) {
  if (racas.length === 0) {
    return (
      <div className="border-b border-borda px-8 py-4">
        <p className="text-[12px] text-tinta-fraca">
          Nenhuma raça cadastrada ainda. O conteúdo abaixo fica valendo para todas até existir
          uma.
        </p>
      </div>
    );
  }

  const cards: { id: string; rotulo: string; codigo: number | null; cor: string | null }[] = [
    ...racas.map((r) => ({ id: r.id, rotulo: r.nome, codigo: r.codigo, cor: r.cor })),
    { id: RACA_GENERICA, rotulo: 'Genéricas', codigo: null, cor: null },
  ];

  return (
    <div className="border-b border-borda px-8 py-4">
      <span className="rotulo">Raça</span>
      <div className="flex flex-wrap gap-2">
        {cards.map((c) => {
          const ativo = valor === c.id;
          const n = contar?.(c.id === RACA_GENERICA ? null : c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => aoMudar(c.id)}
              className={[
                'flex min-w-[132px] items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors',
                ativo
                  ? 'border-ouro-escuro bg-ouro/28'
                  : 'border-borda hover:border-borda-forte hover:bg-borda/20',
              ].join(' ')}
            >
              <span
                className="size-7 shrink-0 rounded-md border border-borda-forte"
                style={{ background: c.cor ?? (c.codigo === null ? '#9c8f78' : '#c4a86e') }}
              />
              <span className="min-w-0">
                <span
                  className={`block truncate text-[13px] ${ativo ? 'font-bold text-tinta' : 'text-tinta-fraca'}`}
                >
                  {c.codigo !== null ? `${c.codigo} · ${c.rotulo}` : c.rotulo}
                </span>
                {n !== undefined && (
                  <span className="block text-[11px] text-tinta-fraca/75">
                    {n} {n === 1 ? 'registro' : 'registros'}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** O `<select>` de raça dos formulários — mesma semântica dos cards. */
export function SelecaoRaca({
  racas,
  valor,
  aoMudar,
}: {
  racas: Raca[];
  valor: string | null;
  aoMudar: (v: string | null) => void;
}) {
  return (
    <select
      className="campo"
      value={valor ?? ''}
      onChange={(e) => aoMudar(e.target.value || null)}
    >
      <option value="">— todas as raças —</option>
      {racas.map((r) => (
        <option key={r.id} value={r.id}>
          {r.codigo} · {r.nome}
        </option>
      ))}
    </select>
  );
}

/** Etiqueta de raça usada nas listagens. */
export function EtiquetaRaca({ raca }: { raca: Raca | undefined }) {
  return (
    <span className="etiqueta" title={raca ? undefined : 'Serve para todas as raças'}>
      {raca ? `${raca.codigo} · ${raca.nome}` : 'todas'}
    </span>
  );
}
