'use client';

import { Plus } from 'lucide-react';
import { BarraProporcao, redistribuir, type Fatia } from '@/componentes/graficos';
import { Caixa } from '@/componentes/ui';
import type { Raca } from '@/lib/tipos';
import type { Rascunho } from './Tela';

// ABA RAÇAS — quais povos costumam aparecer nesta vila
//
// Mesmo mecanismo da educação (Aba Cultura): sobe uma raça, as outras cedem
// espaço, soma sempre 100. A diferença é que a lista aqui é DINÂMICA — pode
// ter quantas raças o cadastro tiver — então cada linha ganha um "×" pra
// remover (zera a fatia redistribuindo o resto, só então tira da lista).
//
// Vila sem NENHUMA linha aqui é lida pelo jogo como "só Humano" — é o único
// povo que existe hoje, então essa leitura já é o comportamento correto sem
// precisar de dado nenhum.

export function AbaRacas({
  r,
  mudar,
  racas,
}: {
  r: Rascunho;
  mudar: (patch: Partial<Rascunho>) => void;
  racas: Raca[];
}) {
  const presentes = new Set(r.racas.map((x) => x.raca_id));
  const disponiveis = racas.filter((x) => !presentes.has(x.id));

  const fatias: Fatia[] = r.racas.map((rr) => {
    const raca = racas.find((x) => x.id === rr.raca_id);
    return {
      chave: rr.raca_id,
      rotulo: raca ? `${raca.codigo} · ${raca.nome}` : '— raça removida —',
      cor: raca?.cor ?? '#9c8f78',
      valor: rr.percentual,
    };
  });

  function aplicar(novas: Fatia[]) {
    mudar({ racas: novas.map((f) => ({ raca_id: f.chave, percentual: f.valor })) });
  }

  function remover(chave: string) {
    // Zera a fatia (redistribui o resto) e só então tira da lista — assim
    // quem ficar já sobe pro lugar de quem saiu, sem precisar mexer à mão.
    const zeradas = redistribuir(fatias, chave, 0);
    aplicar(zeradas.filter((f) => f.chave !== chave));
  }

  return (
    <div className="space-y-6">
      <Caixa titulo="Distribuição de raças">
        <p className="mb-4 text-[12px] leading-relaxed text-tinta-fraca">
          Quanto de cada povo aparece pelo portão desta vila. Sobe uma, as outras cedem espaço —
          a soma é sempre 100%.
        </p>

        <BarraProporcao
          fatias={fatias}
          aoMudar={aplicar}
          aoRemover={remover}
          vazio="Nenhuma raça aqui ainda — o jogo lê isso como “só Humano”. Adicione abaixo se quiser outros povos."
        />

        {disponiveis.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {disponiveis.map((x) => (
              <button
                key={x.id}
                type="button"
                className="botao botao-fantasma px-2.5 py-1.5 text-[12px]"
                onClick={() =>
                  mudar({ racas: [...r.racas, { raca_id: x.id, percentual: 0 }] })
                }
              >
                <Plus size={13} /> {x.codigo} · {x.nome}
              </button>
            ))}
          </div>
        )}
      </Caixa>
    </div>
  );
}
