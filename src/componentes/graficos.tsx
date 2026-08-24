'use client';

import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// OS GRÁFICOS DA PÁGINA DA VILA
//
// São dois, e cada um tem um trabalho diferente:
//
//   · BarraEducacao  — PARTE-DE-UM-TODO em categorias ORDENADAS. Quatro faixas
//     que somam 100: subir uma abaixa as outras. Forma: barra 100% empilhada,
//     rampa SEQUENCIAL de um hue só (claro → escuro), porque a ordem das faixas
//     é a própria magnitude.
//
//   · GraficoDivergente — POLARIDADE. Colunas que sobem do zero (positivo) ou
//     descem dele (negativo). Forma: par DIVERGENTE de dois hues com cinza
//     neutro na linha do zero.
//
// ⚠️ As cores foram validadas contra o fundo de pergaminho (#ece0c6) nos seis
// checks (faixa de luminosidade, piso de croma, separação para daltonismo,
// piso de visão normal e contraste). Não troque um hex daqui no olho — o par
// divergente passou com ΔE 20.5 em protanopia justamente por ser azul×laranja,
// e um par verde×vermelho (o palpite óbvio) REPROVA.
// ═══════════════════════════════════════════════════════════════════════════

/** Par divergente: frio = positivo, quente = negativo, cinza no zero. */
export const COR_POSITIVA = '#1d6fa8';
export const COR_NEGATIVA = '#b3401a';
export const COR_EIXO = '#8a7c62';

/** Rampa sequencial das faixas de educação — claro (menos) → escuro (mais). */
export const RAMPA_EDUCACAO = ['#9d7b46', '#7d5a26', '#5c3d14', '#3a2409'];

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE EDUCAÇÃO — quatro faixas que somam 100
// ═══════════════════════════════════════════════════════════════════════════

export type FatiaEducacao = { chave: string; rotulo: string; faixa: string; valor: number };

/**
 * Redistribui o restante entre as OUTRAS fatias, proporcional ao que cada uma
 * já tinha — é o que faz "subir uma abaixar as outras" sem zerar ninguém de
 * repente. Quando as outras estão todas em zero, divide igualmente.
 *
 * Pura de propósito, e GENÉRICA: serve tanto pra `FatiaEducacao` (4 faixas
 * fixas) quanto pra `Fatia` (N itens, usada em BarraProporcao) — a regra de
 * "sobe um, cede o resto" não muda com o número de fatias.
 */
export function redistribuir<T extends { chave: string; valor: number }>(
  fatias: T[],
  chave: string,
  novoValor: number,
): T[] {
  const alvo = Math.max(0, Math.min(100, Math.round(novoValor)));
  const outras = fatias.filter((f) => f.chave !== chave);
  const sobra = 100 - alvo;
  const somaOutras = outras.reduce((s, f) => s + f.valor, 0);

  const distribuidas = outras.map((f) => ({
    ...f,
    valor: somaOutras > 0 ? (f.valor / somaOutras) * sobra : sobra / outras.length,
  }));

  // Arredonda e joga a diferença de 1 na maior fatia, pra soma fechar 100 exato.
  const arredondadas = distribuidas.map((f) => ({ ...f, valor: Math.round(f.valor) }));
  const total = arredondadas.reduce((s, f) => s + f.valor, 0) + alvo;
  if (total !== 100 && arredondadas.length) {
    const maior = arredondadas.reduce((a, b) => (a.valor >= b.valor ? a : b));
    maior.valor += 100 - total;
  }

  return fatias.map((f) =>
    f.chave === chave ? { ...f, valor: alvo } : (arredondadas.find((o) => o.chave === f.chave) ?? f),
  );
}

export function BarraEducacao({
  fatias,
  aoMudar,
}: {
  fatias: FatiaEducacao[];
  aoMudar: (fatias: FatiaEducacao[]) => void;
}) {
  return (
    <div>
      {/* ── a barra 100% empilhada ─────────────────────────────────────── */}
      <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-md">
        {fatias.map((f, i) => (
          <div
            key={f.chave}
            title={`${f.rotulo} — ${f.valor}%`}
            className="grid place-items-center transition-[flex-grow] duration-150"
            style={{
              flexGrow: f.valor,
              flexBasis: 0,
              background: RAMPA_EDUCACAO[i],
              minWidth: f.valor > 0 ? 2 : 0,
              borderRadius:
                i === 0 ? '4px 0 0 4px' : i === fatias.length - 1 ? '0 4px 4px 0' : undefined,
            }}
          >
            {/* Rótulo direto só onde cabe — nunca um número em cima de tudo. */}
            {f.valor >= 12 && (
              <span className="text-[11px] font-bold text-[#f2e8d2]">{f.valor}%</span>
            )}
          </div>
        ))}
        {fatias.every((f) => f.valor === 0) && (
          <div className="flex-1 rounded-md border border-dashed border-borda" />
        )}
      </div>

      {/* ── um controle por faixa; a legenda mora aqui, colada na cor ──── */}
      <div className="mt-4 space-y-3">
        {fatias.map((f, i) => (
          <div key={f.chave} className="flex items-center gap-3">
            <span
              className="size-3.5 shrink-0 rounded-sm"
              style={{ background: RAMPA_EDUCACAO[i] }}
              aria-hidden
            />
            <span className="w-[190px] shrink-0 text-[12px] leading-tight">
              <span className="block font-bold text-tinta">{f.rotulo}</span>
              <span className="block text-[11px] text-tinta-fraca">{f.faixa}</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={f.valor}
              onChange={(e) => aoMudar(redistribuir(fatias, f.chave, Number(e.target.value)))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-borda accent-oxido"
              aria-label={f.rotulo}
            />
            <span className="w-11 shrink-0 text-right text-[12px] font-bold text-tinta">
              {f.valor}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BARRA DE PROPORÇÃO — como BarraEducacao, mas para N itens com cor própria
//
// Usada na Aba Raças da vila: quantas raças existirem, a barra tem essa
// quantidade de fatias, cada uma na cor daquela raça (não uma rampa
// sequencial — aqui a ordem das fatias não é a magnitude, é só a lista de
// raças cadastradas). Mesma mecânica de redistribuição da educação.
//
// Identidade nunca é só a cor: cada linha abaixo da barra tem o nome por
// extenso ao lado do quadrado colorido, então duas raças com cores parecidas
// continuam distinguíveis.
// ═══════════════════════════════════════════════════════════════════════════

export type Fatia = { chave: string; rotulo: string; cor: string; valor: number };

export function BarraProporcao({
  fatias,
  aoMudar,
  aoRemover,
  vazio,
}: {
  fatias: Fatia[];
  aoMudar: (fatias: Fatia[]) => void;
  /** Presente = a lista é dinâmica (raças) e cada linha ganha um botão de remover.
   *  Some antes de retirar: zera a fatia (redistribuindo o resto) e só então tira da lista. */
  aoRemover?: (chave: string) => void;
  vazio: string;
}) {
  if (fatias.length === 0)
    return (
      <p className="rounded-md border border-dashed border-borda px-4 py-8 text-center text-[12px] text-tinta-fraca">
        {vazio}
      </p>
    );

  return (
    <div>
      <div className="flex h-9 w-full gap-[2px] overflow-hidden rounded-md">
        {fatias.map((f, i) => (
          <div
            key={f.chave}
            title={`${f.rotulo} — ${f.valor}%`}
            className="grid place-items-center transition-[flex-grow] duration-150"
            style={{
              flexGrow: f.valor,
              flexBasis: 0,
              background: f.cor,
              minWidth: f.valor > 0 ? 2 : 0,
              borderRadius:
                i === 0 ? '4px 0 0 4px' : i === fatias.length - 1 ? '0 4px 4px 0' : undefined,
            }}
          >
            {f.valor >= 12 && (
              <span className="text-[11px] font-bold text-[#f2e8d2]">{f.valor}%</span>
            )}
          </div>
        ))}
        {fatias.every((f) => f.valor === 0) && (
          <div className="flex-1 rounded-md border border-dashed border-borda" />
        )}
      </div>

      <div className="mt-4 space-y-3">
        {fatias.map((f) => (
          <div key={f.chave} className="flex items-center gap-3">
            <span
              className="size-3.5 shrink-0 rounded-sm border border-borda-forte"
              style={{ background: f.cor }}
              aria-hidden
            />
            <span className="w-[190px] shrink-0 truncate text-[12px] font-bold text-tinta">
              {f.rotulo}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={f.valor}
              onChange={(e) => aoMudar(redistribuir(fatias, f.chave, Number(e.target.value)))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-borda accent-oxido"
              aria-label={f.rotulo}
            />
            <span className="w-11 shrink-0 text-right text-[12px] font-bold text-tinta">
              {f.valor}%
            </span>
            {aoRemover && (
              <button
                type="button"
                className="shrink-0 rounded-md p-1 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                onClick={() => aoRemover(f.chave)}
                aria-label={`Remover ${f.rotulo}`}
              >
                <span aria-hidden>×</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GRÁFICO DIVERGENTE — colunas que sobem (positivo) e descem (negativo)
//
// Usado em três lugares, sempre com a mesma leitura:
//   Aba 4 · opiniões do nível     — popular sobe, impopular desce
//   Aba 5 · opinião sobre vilas   — admiração sobe, desprezo desce
//   Aba 6 · temperamento por raça — o `sinal` do temperamento decide o lado
//
// A polaridade NÃO está só na cor: está na direção da coluna em relação à
// linha do zero. É a codificação secundária que mantém o gráfico legível para
// quem não distingue os dois hues.
// ═══════════════════════════════════════════════════════════════════════════

export type ItemDivergente = {
  id: string;
  rotulo: string;
  /** -100 a 100. O sinal decide o lado; o módulo, a altura. */
  valor: number;
  /** Texto de apoio no tooltip (a descrição da opinião, por exemplo). */
  detalhe?: string | null;
  /** Sub-rótulo da coluna — a raça, no caso da Aba 6. */
  grupo?: string | null;
};

const ALTURA_METADE = 84;

export function GraficoDivergente({
  itens,
  aoMudar,
  rotuloPositivo,
  rotuloNegativo,
  vazio,
}: {
  itens: ItemDivergente[];
  /** Sem isto o gráfico é só leitura. Com isto, aparecem os controles embaixo. */
  aoMudar?: (id: string, valor: number) => void;
  rotuloPositivo: string;
  rotuloNegativo: string;
  vazio: string;
}) {
  const [sobre, setSobre] = useState<string | null>(null);

  if (itens.length === 0)
    return (
      <p className="rounded-md border border-dashed border-borda px-4 py-10 text-center text-[12px] text-tinta-fraca">
        {vazio}
      </p>
    );

  return (
    <div>
      {/* ── legenda: sempre presente, porque são duas séries ───────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-tinta-fraca">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: COR_POSITIVA }} aria-hidden />
          {rotuloPositivo}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ background: COR_NEGATIVA }} aria-hidden />
          {rotuloNegativo}
        </span>
      </div>

      {/* ── o plot ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-x-auto pb-1">
        <div
          className="relative flex min-w-fit items-stretch gap-2"
          style={{ height: ALTURA_METADE * 2 }}
        >
          {/* linha do zero, cinza neutro e recessiva */}
          <div
            className="pointer-events-none absolute right-0 left-0 border-t"
            style={{ top: ALTURA_METADE, borderColor: COR_EIXO, opacity: 0.55 }}
            aria-hidden
          />

          {itens.map((it) => {
            const positivo = it.valor >= 0;
            const altura = (Math.min(100, Math.abs(it.valor)) / 100) * ALTURA_METADE;
            const cor = positivo ? COR_POSITIVA : COR_NEGATIVA;
            return (
              <div
                key={it.id}
                /* O tooltip é o `title` nativo mesmo: a área do gráfico é
                   apertada e um balão posicionado à mão sairia da caixa. */
                title={[
                  it.grupo ? `${it.grupo} · ${it.rotulo}` : it.rotulo,
                  `${it.valor > 0 ? '+' : ''}${it.valor}%`,
                  it.detalhe || null,
                ]
                  .filter(Boolean)
                  .join('\n')}
                className="relative flex w-[54px] shrink-0 cursor-default flex-col"
                onMouseEnter={() => setSobre(it.id)}
                onMouseLeave={() => setSobre(null)}
              >
                {/* metade de cima */}
                <div className="flex flex-1 items-end justify-center">
                  {positivo && (
                    <span
                      className="w-7 transition-[height] duration-150"
                      style={{
                        height: altura,
                        background: cor,
                        borderRadius: '4px 4px 0 0',
                        boxShadow: sobre === it.id ? '0 0 0 2px #ece0c6' : undefined,
                      }}
                    />
                  )}
                </div>
                {/* metade de baixo */}
                <div className="flex flex-1 items-start justify-center">
                  {!positivo && (
                    <span
                      className="w-7 transition-[height] duration-150"
                      style={{
                        height: altura,
                        background: cor,
                        borderRadius: '0 0 4px 4px',
                        boxShadow: sobre === it.id ? '0 0 0 2px #ece0c6' : undefined,
                      }}
                    />
                  )}
                </div>

                {/* valor: tinta de texto, nunca a cor da série */}
                <span
                  className="absolute left-0 w-full text-center text-[10px] font-bold text-tinta-fraca"
                  style={positivo ? { top: 0 } : { bottom: 0 }}
                >
                  {it.valor > 0 ? `+${it.valor}` : it.valor}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── rótulos + controles: a tabela do gráfico, e onde se edita ──── */}
      <div className="mt-4 space-y-2 border-t border-borda/70 pt-4">
        {itens.map((it) => {
          const positivo = it.valor >= 0;
          return (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-md px-1 py-0.5 transition-colors"
              style={{ background: sobre === it.id ? 'rgba(189,168,121,0.28)' : undefined }}
              onMouseEnter={() => setSobre(it.id)}
              onMouseLeave={() => setSobre(null)}
            >
              <span
                className="size-3 shrink-0 rounded-sm"
                style={{ background: positivo ? COR_POSITIVA : COR_NEGATIVA }}
                aria-hidden
              />
              <span className="w-[210px] shrink-0 text-[12px] leading-tight">
                <span
                  className="block truncate font-bold text-tinta"
                  title={it.detalhe ? `${it.rotulo}\n${it.detalhe}` : it.rotulo}
                >
                  {it.rotulo}
                </span>
                {it.grupo && (
                  <span className="block truncate text-[11px] text-tinta-fraca">{it.grupo}</span>
                )}
              </span>
              {aoMudar ? (
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={5}
                  value={it.valor}
                  onChange={(e) => aoMudar(it.id, Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-borda accent-oxido"
                  aria-label={it.rotulo}
                />
              ) : (
                <span className="flex-1" />
              )}
              <span className="w-12 shrink-0 text-right text-[12px] font-bold text-tinta">
                {it.valor > 0 ? `+${it.valor}` : it.valor}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
