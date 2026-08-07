import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { Regra, TipoDocumento } from '@/lib/tipos';
import { TelaRegras } from './Tela';

export default async function Pagina() {
  const [regras, documentos] = await Promise.all([
    buscar<Regra>('regra', { ordem: 'nome' }),
    buscar<TipoDocumento>('tipo_documento', { ordem: 'ordem' }),
  ]);
  if (regras.semSchema) return <SchemaFaltando />;
  return <TelaRegras regras={regras.linhas} documentos={documentos.linhas} />;
}
