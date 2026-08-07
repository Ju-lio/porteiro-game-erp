'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { DefCampo, Registro } from '@/lib/campos';
import { paraChave } from '@/lib/campos';

/** Moldura de um campo: rótulo em cima, ajuda embaixo. */
export function Moldura({
  rotulo,
  ajuda,
  obrigatorio,
  children,
}: {
  rotulo: string;
  ajuda?: string;
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="rotulo">
        {rotulo}
        {obrigatorio && <span className="ml-1 text-oxido">*</span>}
      </span>
      {children}
      {ajuda && <span className="mt-1.5 block text-[11px] leading-relaxed text-tinta-fraca">{ajuda}</span>}
    </label>
  );
}

/** Interruptor — usa botão nativo pra não trazer peso à toa. */
export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={() => aoMudar(!ligado)}
      className="flex w-full items-center justify-between gap-3 rounded-md border border-borda bg-pergaminho-2 px-3 py-2.5 text-left text-sm transition-colors hover:border-borda-forte"
    >
      <span>{rotulo}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          ligado ? 'bg-sucesso' : 'bg-borda-forte'
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-pergaminho transition-all ${
            ligado ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

/** Lista de textos livres (problemas, itens de cartaz, arquétipos). */
export function ListaTexto({
  valores,
  aoMudar,
  dica,
}: {
  valores: string[];
  aoMudar: (v: string[]) => void;
  dica?: string;
}) {
  const [rascunho, setRascunho] = useState('');

  function adicionar() {
    const t = rascunho.trim();
    if (!t || valores.includes(t)) return setRascunho('');
    aoMudar([...valores, t]);
    setRascunho('');
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {valores.map((v) => (
          <span key={v} className="etiqueta">
            {v}
            <button
              type="button"
              onClick={() => aoMudar(valores.filter((x) => x !== v))}
              className="-mr-1 ml-0.5 rounded-full p-0.5 hover:bg-black/10"
              aria-label={`Remover ${v}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {valores.length === 0 && (
          <span className="text-[11px] text-tinta-fraca">nada ainda</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="campo"
          value={rascunho}
          placeholder={dica}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <button type="button" onClick={adicionar} className="botao botao-fantasma px-3">
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

/** Chance 0..1 — slider + número. O passo de 0.05 desencoraja falsa precisão. */
export function Chance({
  valor,
  aoMudar,
  permiteUm = false,
}: {
  valor: number;
  aoMudar: (v: number) => void;
  permiteUm?: boolean;
}) {
  const teto = permiteUm ? 1 : 0.95;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={teto}
        step={0.05}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-borda accent-oxido"
      />
      <input
        type="number"
        min={0}
        max={teto}
        step={0.05}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="campo w-[86px] text-center"
      />
      <span className="w-11 shrink-0 text-right text-[12px] font-bold text-tinta-fraca">
        {Math.round(valor * 100)}%
      </span>
    </div>
  );
}

/** Seletor de cor: quadrado + hex digitável. */
export function SeletorCor({ valor, aoMudar }: { valor: string; aoMudar: (v: string) => void }) {
  const hexValido = /^#[0-9a-f]{6}$/i.test(valor);
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={hexValido ? valor : '#cccccc'}
        onChange={(e) => aoMudar(e.target.value)}
        className="h-[38px] w-12 shrink-0 cursor-pointer rounded-md border border-borda bg-pergaminho-2 p-1"
      />
      <input
        className="campo font-mono"
        value={valor}
        placeholder="#RRGGBB"
        onChange={(e) => aoMudar(e.target.value)}
      />
    </div>
  );
}

/** Renderiza UM campo a partir do descritor. */
export function CampoAuto({
  def,
  valor,
  aoMudar,
  registro,
  aoMudarRegistro,
}: {
  def: DefCampo;
  valor: unknown;
  aoMudar: (v: unknown) => void;
  registro?: Registro;
  aoMudarRegistro?: (r: Registro) => void;
}) {
  const comum = { rotulo: def.rotulo, ajuda: def.ajuda, obrigatorio: def.obrigatorio };

  switch (def.tipo) {
    case 'texto_longo':
      return (
        <Moldura {...comum}>
          <textarea
            className="campo"
            value={(valor as string) ?? ''}
            placeholder={def.dica}
            onChange={(e) => aoMudar(e.target.value)}
          />
        </Moldura>
      );

    case 'chave':
      return (
        <Moldura {...comum}>
          <input
            className="campo font-mono"
            value={(valor as string) ?? ''}
            placeholder={def.dica ?? 'chave_no_jogo'}
            onChange={(e) => aoMudar(paraChave(e.target.value))}
          />
        </Moldura>
      );

    case 'numero':
      return (
        <Moldura {...comum}>
          <input
            type="number"
            className="campo"
            min={def.min}
            max={def.max}
            step={def.passo ?? 1}
            value={(valor as number) ?? 0}
            onChange={(e) => aoMudar(e.target.value === '' ? null : Number(e.target.value))}
          />
        </Moldura>
      );

    case 'porcentagem':
      return (
        <Moldura {...comum}>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="campo"
              min={def.min ?? 0}
              max={def.max ?? 100}
              step={def.passo ?? 0.5}
              value={(valor as number) ?? 0}
              onChange={(e) => aoMudar(Number(e.target.value))}
            />
            <span className="text-sm text-tinta-fraca">%</span>
          </div>
        </Moldura>
      );

    case 'chance':
      return (
        <Moldura {...comum}>
          <Chance
            valor={(valor as number) ?? 0}
            aoMudar={(v) => aoMudar(v)}
            permiteUm={def.max === 1}
          />
        </Moldura>
      );

    case 'selecao':
      return (
        <Moldura {...comum}>
          <select
            className="campo"
            value={(valor as string) ?? ''}
            onChange={(e) => aoMudar(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">{def.obrigatorio ? '— escolha —' : '— nenhum —'}</option>
            {def.opcoes?.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
        </Moldura>
      );

    case 'cor':
      return (
        <Moldura {...comum}>
          <SeletorCor valor={(valor as string) ?? ''} aoMudar={aoMudar} />
        </Moldura>
      );

    case 'booleano':
      return (
        <div>
          <span className="rotulo">{def.rotulo}</span>
          <Interruptor
            ligado={Boolean(valor)}
            aoMudar={aoMudar}
            rotulo={valor ? 'sim' : 'não'}
          />
          {def.ajuda && (
            <span className="mt-1.5 block text-[11px] leading-relaxed text-tinta-fraca">
              {def.ajuda}
            </span>
          )}
        </div>
      );

    case 'lista_texto':
      return (
        <Moldura {...comum}>
          <ListaTexto
            valores={(valor as string[]) ?? []}
            aoMudar={aoMudar}
            dica={def.dica ?? 'digite e Enter'}
          />
        </Moldura>
      );

    case 'icone':
      return (
        <Moldura {...comum}>
          <input
            className="campo text-center text-xl"
            maxLength={4}
            value={(valor as string) ?? ''}
            placeholder="📦"
            onChange={(e) => aoMudar(e.target.value)}
          />
        </Moldura>
      );

    default:
      return (
        <Moldura {...comum}>
          <input
            className="campo"
            value={(valor as string) ?? ''}
            placeholder={def.dica}
            onChange={(e) => {
              const v = e.target.value;
              aoMudar(v);
              // Nome preenchido gera a chave sozinho, enquanto ela estiver vazia.
              if (def.chave === 'nome' && registro && aoMudarRegistro) {
                const temChave = 'chave' in registro;
                if (temChave && !registro.id && !registro.chave) {
                  aoMudarRegistro({ ...registro, nome: v, chave: paraChave(v) });
                }
              }
            }}
          />
        </Moldura>
      );
  }
}
