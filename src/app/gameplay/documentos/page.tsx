import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { Asset, TipoDocumento } from '@/lib/tipos';
import { TelaDocumentos } from './Tela';

export default async function Pagina() {
  const [docs, assets] = await Promise.all([
    buscar<TipoDocumento>('tipo_documento', {
      select: '*, campos:tipo_documento_campo(*)',
      ordem: 'ordem',
    }),
    buscar<Asset>('asset'),
  ]);
  if (docs.semSchema) return <SchemaFaltando />;

  const caminhos: Record<string, string> = {};
  for (const a of assets.linhas) caminhos[a.id] = a.caminho;

  return (
    <TelaDocumentos
      documentos={docs.linhas.map((d) => ({
        ...d,
        campos: [...(d.campos ?? [])].sort((a, b) => a.ordem - b.ordem),
      }))}
      caminhos={caminhos}
    />
  );
}
