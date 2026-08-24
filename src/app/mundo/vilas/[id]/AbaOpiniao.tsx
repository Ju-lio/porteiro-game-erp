'use client';

import { Plus, Trash2 } from 'lucide-react';
import { GraficoDivergente } from '@/componentes/graficos';
import { Caixa } from '@/componentes/ui';
import type { Vila } from '@/lib/tipos';
import type { Rascunho } from './Tela';

// ABA 5 — OPINIÃO LOCAL SOBRE OUTROS REINOS
//
// Não confundir com a Aba 2. Lá é o FATO político (aliança/oposição); aqui é o
// que o POVO pensa — e os dois podem se contradizer de propósito: uma aliança
// que o povo detesta é matéria-prima boa de conteúdo.
//
// O percentual anda de -100 (ódio) a +100 (admiração) e é editado no gráfico,
// fora da tabela — a tabela guarda só o texto.

export function AbaOpiniao({
  r,
  mudar,
  outras,
}: {
  r: Rascunho;
  mudar: (patch: Partial<Rascunho>) => void;
  outras: Vila[];
}) {
  const disponiveis = outras.filter((o) => !r.opinioes.some((x) => x.alvo_id === o.id));

  return (
    <div className="space-y-6">
      <Caixa titulo="O que esta vila pensa das outras">
        {r.opinioes.length === 0 ? (
          <p className="rounded-md border border-dashed border-borda px-4 py-8 text-center text-[12px] text-tinta-fraca">
            {outras.length === 0
              ? 'Não há outras vilas cadastradas ainda.'
              : 'Nenhuma opinião registrada. Adicione uma vila abaixo.'}
          </p>
        ) : (
          <div className="space-y-4">
            {r.opinioes.map((o, i) => {
              const alvo = outras.find((x) => x.id === o.alvo_id);
              return (
                <div key={o.alvo_id} className="rounded-md border border-borda p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[14px] font-bold">
                      <span
                        className="size-3.5 rounded-sm border border-borda-forte"
                        style={{ background: alvo?.cor ?? '#8a6a45' }}
                      />
                      {alvo?.nome ?? '— vila removida —'}
                    </span>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                      onClick={() =>
                        mudar({ opinioes: r.opinioes.filter((x) => x.alvo_id !== o.alvo_id) })
                      }
                      aria-label={`Remover opinião sobre ${alvo?.nome ?? 'vila'}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <textarea
                    className="campo"
                    value={o.descricao}
                    placeholder={`Descreva o que ${r.nome || 'esta vila'} pensa sobre ${alvo?.nome ?? 'esse reino'} — o que se fala na taberna, não o que está no tratado.`}
                    onChange={(e) => {
                      const opinioes = [...r.opinioes];
                      opinioes[i] = { ...o, descricao: e.target.value };
                      mudar({ opinioes });
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {disponiveis.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {disponiveis.map((o) => (
              <button
                key={o.id}
                type="button"
                className="botao botao-fantasma px-2.5 py-1.5 text-[12px]"
                onClick={() =>
                  mudar({
                    opinioes: [...r.opinioes, { alvo_id: o.id, descricao: '', percentual: 0 }],
                  })
                }
              >
                <Plus size={13} /> {o.nome}
              </button>
            ))}
          </div>
        )}
      </Caixa>

      {/* O percentual mora AQUI, fora da tabela — é o gráfico que o controla. */}
      <Caixa titulo="Quanto se gosta de cada uma">
        <GraficoDivergente
          rotuloPositivo="Admiração / boa vontade"
          rotuloNegativo="Desprezo / rancor"
          vazio="Adicione uma vila acima para começar a graduar a opinião."
          itens={r.opinioes.map((o) => ({
            id: o.alvo_id,
            rotulo: outras.find((x) => x.id === o.alvo_id)?.nome ?? '— vila removida —',
            valor: o.percentual,
            detalhe: o.descricao,
          }))}
          aoMudar={(id, valor) =>
            mudar({
              opinioes: r.opinioes.map((o) =>
                o.alvo_id === id ? { ...o, percentual: valor } : o,
              ),
            })
          }
        />
      </Caixa>
    </div>
  );
}
