'use client';

import { Moldura } from '@/componentes/campos';
import { BarraEducacao, type FatiaEducacao } from '@/componentes/graficos';
import { Caixa } from '@/componentes/ui';
import { FAIXAS_EDUCACAO } from '@/lib/tipos';
import type { Rascunho } from './Tela';

// ABA 3 — DETALHES CULTURAIS
//
// O nível educacional é uma DISTRIBUIÇÃO de população em quatro faixas
// ordenadas que somam 100 — não são quatro notas soltas. Subir uma abaixa as
// outras proporcionalmente (a regra vive em `redistribuir`, em graficos.tsx).
// O padrão é 100% na média, como combinado.
//
// A rampa de cor é sequencial (um hue só, claro → escuro) porque as faixas SÃO
// ordenadas: mais escuro = mais instruído. Uma paleta categórica aqui
// esconderia a ordem que é justamente a informação.

export function AbaCultura({
  r,
  mudar,
}: {
  r: Rascunho;
  mudar: (patch: Partial<Rascunho>) => void;
}) {
  const fatias: FatiaEducacao[] = FAIXAS_EDUCACAO.map((f) => ({
    chave: f.chave,
    rotulo: f.rotulo,
    faixa: f.faixa,
    valor: r[f.chave],
  }));

  return (
    <div className="space-y-6">
      <Moldura
        rotulo="Costumes internos"
        ajuda="O que é normal aqui e estranho lá fora. Alimenta a escrita de falas e de eventos — ainda não vira regra sozinho."
      >
        <textarea
          className="campo min-h-40"
          value={r.costumes}
          placeholder="DESCRIÇÃO DE COSTUMES"
          onChange={(e) => mudar({ costumes: e.target.value })}
        />
      </Moldura>

      <Caixa titulo="Nível educacional">
        <p className="mb-5 text-[12px] leading-relaxed text-tinta-fraca">
          Como a população se distribui entre as quatro faixas. Sempre soma 100%: mexer numa
          barra reequilibra as outras na proporção que elas já tinham.
        </p>

        <BarraEducacao
          fatias={fatias}
          aoMudar={(novas) =>
            mudar(
              Object.fromEntries(novas.map((f) => [f.chave, f.valor])) as Partial<Rascunho>,
            )
          }
        />

        <div className="mt-6 space-y-2 border-t border-borda/70 pt-4">
          <span className="rotulo">Os termos de cada faixa</span>
          {FAIXAS_EDUCACAO.map((f) => (
            <p key={f.chave} className="text-[11px] leading-relaxed text-tinta-fraca">
              <strong className="text-tinta">{f.rotulo}</strong>{' '}
              <span className="opacity-70">({f.faixa})</span> — {f.termos}
            </p>
          ))}
        </div>
      </Caixa>
    </div>
  );
}
