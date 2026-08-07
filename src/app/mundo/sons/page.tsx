import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { AmbienteSonoro, Asset, Som } from '@/lib/tipos';
import { TelaSons } from './Tela';

export default async function Pagina() {
  const [sons, ambientes, assets] = await Promise.all([
    buscar<Som>('som', { ordem: 'nome' }),
    buscar<AmbienteSonoro>('ambiente_sonoro', { ordem: 'nome' }),
    buscar<Asset>('asset'),
  ]);
  if (sons.semSchema) return <SchemaFaltando />;

  const caminhos: Record<string, string> = {};
  for (const a of assets.linhas) caminhos[a.id] = a.caminho;

  return <TelaSons sons={sons.linhas} ambientes={ambientes.linhas} caminhos={caminhos} />;
}
