import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { GrupoCamada, Paleta } from '@/lib/tipos';
import { TelaCamadas } from './Tela';

export default async function Pagina() {
  const [grupos, paletas] = await Promise.all([
    buscar<GrupoCamada>('grupo_camada', { select: '*, sub_camadas:sub_camada(*)', ordem: 'ordem' }),
    buscar<Paleta>('paleta', { ordem: 'ordem' }),
  ]);
  if (grupos.semSchema) return <SchemaFaltando />;

  const ordenados = grupos.linhas.map((g) => ({
    ...g,
    sub_camadas: [...(g.sub_camadas ?? [])].sort((a, b) => a.ordem - b.ordem),
  }));

  return <TelaCamadas grupos={ordenados} paletas={paletas.linhas} />;
}
