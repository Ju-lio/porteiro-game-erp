import { SchemaFaltando } from '@/componentes/ui';
import { buscar, buscarUnico } from '@/lib/consultas';
import type { Asset } from '@/lib/tipos';
import { TelaConfig } from './Tela';

type Config = { chave: string; valor: unknown; descricao: string | null };
type Ajustes = {
  timelapse_segundos_por_momento: number;
  timelapse_segundos_de_fade: number;
  timelapse_ativo: boolean;
  cor_selo_autentica: string;
  cores_selo_falsas: string[];
};
type Sombra = { asset_id: string | null; opacidade: number };

export default async function Pagina() {
  const { linhas: config, semSchema } = await buscar<Config>('config');
  if (semSchema) return <SchemaFaltando />;

  const [ajustes, sombra, { linhas: assets }] = await Promise.all([
    buscarUnico<Ajustes>('ajustes_jogo'),
    buscarUnico<Sombra>('sombra'),
    buscar<Asset>('asset'),
  ]);

  const caminhos: Record<string, string> = {};
  for (const a of assets) caminhos[a.id] = a.caminho;

  return (
    <TelaConfig config={config} ajustes={ajustes} sombra={sombra} caminhos={caminhos} />
  );
}
