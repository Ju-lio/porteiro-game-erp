import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { Asset, Cenario } from '@/lib/tipos';
import { TelaCenarios } from './Tela';

export default async function Pagina() {
  const [cenarios, assets] = await Promise.all([
    buscar<Cenario>('cenario', { ordem: 'nome' }),
    buscar<Asset>('asset'),
  ]);
  if (cenarios.semSchema) return <SchemaFaltando />;

  // id → caminho, pra montar a URL sem depender de nome de foreign key.
  const caminhos: Record<string, string> = {};
  for (const a of assets.linhas) caminhos[a.id] = a.caminho;

  return <TelaCenarios cenarios={cenarios.linhas} caminhos={caminhos} />;
}
