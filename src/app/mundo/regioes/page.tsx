import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { AmbienteSonoro, Cenario, Regiao, TipoDocumento } from '@/lib/tipos';
import { TelaRegioes } from './Tela';

type ComLigacoes = Regiao & {
  regiao_ligacao?: { destino_id: string }[];
  regiao_documento?: { tipo_documento_id: string }[];
};

export default async function Pagina() {
  const [regioes, cenarios, ambientes, documentos] = await Promise.all([
    buscar<ComLigacoes>('regiao', {
      select:
        '*, regiao_ligacao!regiao_ligacao_regiao_id_fkey(destino_id), regiao_documento(tipo_documento_id)',
      ordem: 'ordem',
    }),
    buscar<Cenario>('cenario', { ordem: 'nome' }),
    buscar<AmbienteSonoro>('ambiente_sonoro', { ordem: 'nome' }),
    buscar<TipoDocumento>('tipo_documento', { ordem: 'ordem' }),
  ]);
  if (regioes.semSchema) return <SchemaFaltando />;

  return (
    <TelaRegioes
      regioes={regioes.linhas.map((r) => ({
        ...r,
        ligacoes: (r.regiao_ligacao ?? []).map((l) => l.destino_id),
        documentos: (r.regiao_documento ?? []).map((d) => d.tipo_documento_id),
      }))}
      cenarios={cenarios.linhas}
      ambientes={ambientes.linhas}
      documentos={documentos.linhas}
    />
  );
}
