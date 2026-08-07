import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { Paleta } from '@/lib/tipos';
import { TelaPaletas } from './Tela';

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Paleta>('paleta', {
    select: '*, cores:cor(*)',
    ordem: 'ordem',
  });
  if (semSchema) return <SchemaFaltando />;

  // As cores vêm sem ordem garantida do Postgres; ordena aqui.
  const paletas = linhas.map((p) => ({
    ...p,
    cores: [...(p.cores ?? [])].sort((a, b) => a.ordem - b.ordem),
  }));

  return <TelaPaletas paletas={paletas} />;
}
