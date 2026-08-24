import { SchemaFaltando } from '@/componentes/ui';
import { buscar, buscarUnico } from '@/lib/consultas';
import type { Asset, MapaMundi, Vila } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';
import { TelaVilas } from './Tela';

// A LISTA de vilas. Clicar numa vila leva para `/mundo/vilas/[id]`, que é uma
// PÁGINA com abas — não um modal. A vila cresceu demais pra caber num modal:
// são níveis, documentos, clima, relações, opiniões e temperamento.

type ComLigacoes = Vila & {
  vila_ligacao?: { destino_id: string }[];
  vila_documento?: { tipo_documento_id: string }[];
  nivel?: { id: string }[];
};

export default async function Pagina() {
  const [vilas, mapa, assets, climas] = await Promise.all([
    buscar<ComLigacoes>('vila', {
      select:
        '*, vila_ligacao!vila_ligacao_vila_id_fkey(destino_id), vila_documento(tipo_documento_id), nivel(id)',
      ordem: 'ordem',
    }),
    buscarUnico<MapaMundi>('mapa_mundi'),
    buscar<Asset>('asset'),
    buscar<{ vila_id: string }>('vila_clima', { select: 'vila_id' }),
  ]);
  if (vilas.semSchema) return <SchemaFaltando />;

  const mapaAsset = assets.linhas.find((a) => a.id === mapa?.asset_id) ?? null;

  const caminhos: Record<string, string> = {};
  for (const a of assets.linhas) caminhos[a.id] = a.caminho;

  return (
    <TelaVilas
      vilas={vilas.linhas.map((v) => ({
        ...v,
        ligacoes: (v.vila_ligacao ?? []).map((l) => l.destino_id),
        documentos: (v.vila_documento ?? []).map((d) => d.tipo_documento_id),
      }))}
      niveisPorVila={Object.fromEntries(
        vilas.linhas.map((v) => [v.id, (v.nivel ?? []).length]),
      )}
      climasPorVila={climas.linhas.reduce<Record<string, number>>((acc, c) => {
        acc[c.vila_id] = (acc[c.vila_id] ?? 0) + 1;
        return acc;
      }, {})}
      mapaUrl={mapaAsset ? urlAsset(mapaAsset.caminho) : null}
      caminhos={caminhos}
    />
  );
}
