'use client';

import { Handshake, Plus, Swords, X } from 'lucide-react';
import { Moldura } from '@/componentes/campos';
import { Caixa } from '@/componentes/ui';
import type { TipoRelacao, Vila } from '@/lib/tipos';
import type { Rascunho } from './Tela';

// ABA 2 — POLÍTICA
//
// ⚠️ NÃO EXISTE LINHA "NEUTRO". Vila que não aparece na tabela é neutra por
// omissão — é por isso que o tipo é obrigatório e "tirar a relação" quer dizer
// apagar a linha no X da direita. Uma terceira opção "neutro" criaria dois
// jeitos de dizer a mesma coisa, e alguém acabaria mantendo linhas mortas.

const TIPOS: { valor: TipoRelacao; rotulo: string; icone: React.ReactNode }[] = [
  { valor: 'oposicao', rotulo: 'Oposição', icone: <Swords size={13} /> },
  { valor: 'alianca', rotulo: 'Aliança', icone: <Handshake size={13} /> },
];

export function AbaPolitica({
  r,
  mudar,
  outras,
}: {
  r: Rascunho;
  mudar: (patch: Partial<Rascunho>) => void;
  outras: Vila[];
}) {
  const disponiveis = outras.filter((o) => !r.relacoes.some((x) => x.alvo_id === o.id));

  return (
    <div className="space-y-6">
      <Caixa titulo="Relações entre reinos">
        <p className="mb-4 text-[12px] leading-relaxed text-tinta-fraca">
          Toda vila que <strong>não</strong> estiver nesta tabela é neutra. Selecionar o tipo é
          obrigatório — pra desfazer uma relação, remova a linha no <strong>×</strong>.
        </p>

        {r.relacoes.length === 0 ? (
          <p className="rounded-md border border-dashed border-borda px-4 py-8 text-center text-[12px] text-tinta-fraca">
            {outras.length === 0
              ? 'Não há outras vilas cadastradas ainda.'
              : 'Nenhuma relação declarada — esta vila é neutra com todo mundo.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Vila</th>
                  <th>Relação</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {r.relacoes.map((rel, i) => {
                  const alvo = outras.find((o) => o.id === rel.alvo_id);
                  return (
                    <tr key={rel.alvo_id}>
                      <td>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-sm border border-borda-forte"
                            style={{ background: alvo?.cor ?? '#8a6a45' }}
                          />
                          {alvo?.nome ?? '— vila removida —'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1.5">
                          {TIPOS.map((t) => {
                            const ativo = rel.tipo === t.valor;
                            return (
                              <button
                                key={t.valor}
                                type="button"
                                onClick={() => {
                                  const relacoes = [...r.relacoes];
                                  relacoes[i] = { ...rel, tipo: t.valor };
                                  mudar({ relacoes });
                                }}
                                className={[
                                  'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors',
                                  ativo
                                    ? 'border-ouro-escuro bg-ouro/28 font-bold text-tinta'
                                    : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                                ].join(' ')}
                              >
                                {t.icone} {t.rotulo}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                            onClick={() =>
                              mudar({ relacoes: r.relacoes.filter((x) => x.alvo_id !== rel.alvo_id) })
                            }
                            aria-label={`Remover relação com ${alvo?.nome ?? 'vila'}`}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                  mudar({ relacoes: [...r.relacoes, { alvo_id: o.id, tipo: 'oposicao' }] })
                }
              >
                <Plus size={13} /> {o.nome}
              </button>
            ))}
          </div>
        )}
      </Caixa>

      <Moldura
        rotulo="Política interna"
        ajuda="Quem manda, como manda e o que acontece com quem não obedece. É lore de apoio — ainda não vira regra sozinha."
      >
        <textarea
          className="campo min-h-40"
          value={r.politica_interna}
          placeholder="DESCRIÇÃO DO FUNCIONAMENTO INTERNO DO REINO"
          onChange={(e) => mudar({ politica_interna: e.target.value })}
        />
      </Moldura>
    </div>
  );
}
