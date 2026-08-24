import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { Paleta, Raca } from '@/lib/tipos';
import { TelaPaletas } from './Tela';

export default async function Pagina() {
  const [{ linhas, semSchema }, racas] = await Promise.all([
    buscar<Paleta>('paleta', { select: '*, cores:cor(*)', ordem: 'ordem' }),
    buscar<Raca>('raca', { ordem: 'codigo' }),
  ]);
  if (semSchema) return <SchemaFaltando />;

  // As cores vêm sem ordem garantida do Postgres; ordena aqui.
  const paletas = linhas.map((p) => ({
    ...p,
    cores: [...(p.cores ?? [])].sort((a, b) => a.ordem - b.ordem),
  }));

  return <TelaPaletas paletas={paletas} racas={racas.linhas} />;
}
