'use client';

import { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import { urlAsset } from '@/lib/url';
import type { GrupoCamada, Paleta, Peca } from '@/lib/tipos';

/**
 * O personagem montado, ao vivo — a peça que faz o ERP valer a pena para quem
 * desenha: subiu um nariz, viu o boneco inteiro com ele em 5 segundos.
 *
 * Espelha o que o jogo faz: empilha grupo por grupo, sub-camada por sub-camada.
 * Sub-camada do tipo "cor" é uma máscara pintada com uma cor da paleta; as
 * outras são a arte como está.
 */
export function PreviewPersonagem({
  grupos,
  pecas,
  paletas,
  fixar,
  altura = 380,
}: {
  grupos: GrupoCamada[];
  pecas: Peca[];
  paletas: Paleta[];
  /** Trava uma peça específica no seu grupo — a que está sendo editada. */
  fixar?: { grupoId: string; peca: Peca } | null;
  altura?: number;
}) {
  const [semente, setSemente] = useState(0);

  const camadas = useMemo(() => {
    // Sorteio determinístico pela semente: o mesmo número dá o mesmo elenco.
    let n = semente * 7919 + 13;
    const aleatorio = () => {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      return n / 0x7fffffff;
    };
    const escolher = <T,>(lista: T[]): T | null =>
      lista.length ? lista[Math.floor(aleatorio() * lista.length)] : null;

    // 1) uma cor por paleta — é o que garante a coerência de tom
    const corDaPaleta = new Map<string, string>();
    for (const p of paletas) {
      const c = escolher(p.cores ?? []);
      if (c) corDaPaleta.set(p.id, c.hex);
    }

    // 2) um conjunto por família — variantes que só valem juntas
    const conjuntoDaFamilia = new Map<string, string>();
    for (const g of grupos) {
      if (!g.familia || conjuntoDaFamilia.has(g.familia)) continue;
      const conjuntos = [
        ...new Set(
          pecas
            .filter((p) => p.ativo && p.conjunto && grupos.some((x) => x.id === p.grupo_id && x.familia === g.familia))
            .map((p) => p.conjunto as string),
        ),
      ];
      const c = escolher(conjuntos);
      if (c) conjuntoDaFamilia.set(g.familia, c);
    }

    const saida: React.ReactNode[] = [];

    for (const grupo of grupos) {
      // 3) grupo opcional pode simplesmente não entrar
      const fixado = fixar?.grupoId === grupo.id ? fixar.peca : null;
      if (!fixado && grupo.opcional && aleatorio() > (grupo.chance ?? 0.5)) continue;

      let candidatas = pecas.filter((p) => p.grupo_id === grupo.id && p.ativo);
      const conjunto = grupo.familia ? conjuntoDaFamilia.get(grupo.familia) : null;
      if (conjunto) {
        const doConjunto = candidatas.filter((p) => p.conjunto === conjunto);
        if (doConjunto.length) candidatas = doConjunto;
      }

      const peca = fixado ?? escolher(candidatas);
      if (!peca) continue;

      for (const sub of grupo.sub_camadas ?? []) {
        const arq = peca.arquivos?.find((a) => a.sub_camada_id === sub.id);
        const url = urlAsset(arq?.asset?.caminho);
        if (!url) continue;

        const chave = `${grupo.id}-${sub.id}`;
        if (sub.tipo === 'cor') {
          saida.push(
            <div
              key={chave}
              className="absolute inset-0"
              style={{
                maskImage: `url(${url})`,
                WebkitMaskImage: `url(${url})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                backgroundColor: corDaPaleta.get(sub.paleta_id ?? '') ?? '#b9a68a',
              }}
            />,
          );
        } else {
          saida.push(
            /* eslint-disable-next-line @next/next/no-img-element */
            <img key={chave} src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />,
          );
        }
      }
    }

    return saida;
  }, [grupos, pecas, paletas, fixar, semente]);

  return (
    <div>
      <div
        className="xadrez relative mx-auto aspect-square w-full overflow-hidden rounded-lg border border-borda"
        style={{ maxHeight: altura, maxWidth: altura }}
      >
        {camadas.length ? (
          camadas
        ) : (
          <span className="absolute inset-0 grid place-items-center px-6 text-center text-[11px] text-tinta-fraca">
            Sem peças suficientes para montar. Suba pelo menos um corpo e um rosto.
          </span>
        )}
      </div>

      <button
        className="botao botao-fantasma mx-auto mt-3 flex text-[12px]"
        onClick={() => setSemente((s) => s + 1)}
        type="button"
      >
        <Dices size={14} /> Sortear outro
      </button>
    </div>
  );
}
