import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// Lista pública de versões publicadas — só metadado (número, notas, data), nunca
// o conteúdo inteiro (isso é `/api/conteudo?v=`). É o que alimenta o seletor de
// versões do jogo (`/versoes`): sem login, sem expor nada sensível.

export async function GET() {
  const [{ data: bundles, error: erroBundles }, { data: atual, error: erroAtual }] =
    await Promise.all([
      db
        .from('bundle')
        .select('versao, notas, publicado_em, publicado_por')
        .order('versao', { ascending: false }),
      db.from('publicacao_atual').select('versao').eq('id', 1).maybeSingle(),
    ]);

  if (erroBundles || erroAtual) {
    return NextResponse.json(
      { erro: (erroBundles ?? erroAtual)?.message },
      { status: 500, headers: { 'access-control-allow-origin': '*' } },
    );
  }

  return NextResponse.json(
    {
      atual: atual?.versao ?? null,
      versoes: (bundles ?? []).map((b) => ({
        versao: b.versao,
        notas: b.notas,
        publicadoEm: b.publicado_em,
        publicadoPor: b.publicado_por,
      })),
    },
    {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=30, stale-while-revalidate=120',
      },
    },
  );
}
