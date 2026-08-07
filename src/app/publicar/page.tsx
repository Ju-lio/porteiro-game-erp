import { SchemaFaltando } from '@/componentes/ui';
import { conferir } from '@/lib/publicacao';
import { buscar } from '@/lib/consultas';
import { ehSchemaFaltando } from '@/lib/supabase';
import { TelaPublicar } from './Tela';

type Atual = { versao: number | null; atualizado_em: string };

export default async function Pagina() {
  try {
    const [{ linhas: atuais, semSchema }, { linhas: bundles }] = await Promise.all([
      buscar<Atual>('publicacao_atual'),
      buscar<{ versao: number }>('bundle', { ordem: 'versao', asc: false }),
    ]);
    if (semSchema) return <SchemaFaltando />;

    const diagnostico = await conferir();

    return (
      <TelaPublicar
        diagnostico={diagnostico}
        versaoAtual={atuais[0]?.versao ?? null}
        ultimaVersao={bundles[0]?.versao ?? 0}
      />
    );
  } catch (e) {
    if (ehSchemaFaltando(e)) return <SchemaFaltando />;
    throw e;
  }
}
