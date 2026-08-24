import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { Raca } from '@/lib/tipos';
import { TelaRacas } from './Tela';

// A raça é o cadastro-raiz da aba Personagens: paletas, peças, nomes/falas e
// temperamentos todos apontam pra cá, e todas essas telas abrem filtrando pela
// raça de código 1 (Humano).

export default async function Pagina() {
  const [racas, paletas, pecas, vocabulario, temperamentos] = await Promise.all([
    buscar<Raca>('raca', { ordem: 'codigo' }),
    buscar<{ raca_id: string | null }>('paleta', { select: 'raca_id' }),
    buscar<{ raca_id: string | null }>('peca', { select: 'raca_id' }),
    buscar<{ raca_id: string | null }>('vocabulario', { select: 'raca_id' }),
    buscar<{ raca_id: string | null }>('temperamento', { select: 'raca_id' }),
  ]);
  if (racas.semSchema) return <SchemaFaltando />;

  // Quanto conteúdo já pendura em cada raça — é o número que diz se ela está
  // pronta pra virar visitante ou se ainda é só um nome.
  const uso: Record<string, { paletas: number; pecas: number; vocabulario: number; temperamentos: number }> = {};
  for (const r of racas.linhas)
    uso[r.id] = { paletas: 0, pecas: 0, vocabulario: 0, temperamentos: 0 };

  const contar = (linhas: { raca_id: string | null }[], campo: keyof (typeof uso)[string]) => {
    for (const l of linhas) if (l.raca_id && uso[l.raca_id]) uso[l.raca_id][campo]++;
  };
  contar(paletas.linhas, 'paletas');
  contar(pecas.linhas, 'pecas');
  contar(vocabulario.linhas, 'vocabulario');
  contar(temperamentos.linhas, 'temperamentos');

  return <TelaRacas racas={racas.linhas} uso={uso} />;
}
