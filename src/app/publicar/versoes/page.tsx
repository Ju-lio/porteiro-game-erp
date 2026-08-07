import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import { TelaVersoes } from './Tela';

type Bundle = {
  id: string;
  versao: number;
  notas: string | null;
  publicado_em: string;
  publicado_por: string | null;
};

export default async function Pagina() {
  const [{ linhas: bundles, semSchema }, { linhas: atuais }] = await Promise.all([
    buscar<Bundle>('bundle', { select: 'id, versao, notas, publicado_em, publicado_por', ordem: 'versao', asc: false }),
    buscar<{ versao: number | null }>('publicacao_atual'),
  ]);
  if (semSchema) return <SchemaFaltando />;

  return <TelaVersoes bundles={bundles} versaoAtual={atuais[0]?.versao ?? null} />;
}
