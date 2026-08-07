import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// O ENDPOINT QUE O JOGO CONSOME. É a única porta.
//
// O jogo baixa isto uma vez no boot, guarda em memória e joga. Nunca fala com
// as tabelas. Trocar a versão publicada (rollback) muda o que sai daqui sem
// que o jogo saiba de nada.
//
//   GET /api/conteudo         → a versão publicada agora
//   GET /api/conteudo?v=41    → uma versão específica (pra testar antes)
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(req: Request) {
  const pedida = new URL(req.url).searchParams.get('v');

  let versao: number | null = pedida ? Number(pedida) : null;

  if (versao === null) {
    const { data } = await db.from('publicacao_atual').select('versao').eq('id', 1).maybeSingle();
    versao = data?.versao ?? null;
  }

  if (versao === null) {
    return NextResponse.json(
      { erro: 'Nenhuma versão publicada ainda.' },
      { status: 404, headers: { 'access-control-allow-origin': '*' } },
    );
  }

  const { data, error } = await db
    .from('bundle')
    .select('versao, conteudo, publicado_em')
    .eq('versao', versao)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { erro: `Versão ${versao} não encontrada.` },
      { status: 404, headers: { 'access-control-allow-origin': '*' } },
    );
  }

  return NextResponse.json(
    { versao: data.versao, publicadoEm: data.publicado_em, ...(data.conteudo as object) },
    {
      headers: {
        'access-control-allow-origin': '*',
        // Bundle é imutável: quando pedido por versão, pode cachear pra sempre.
        'cache-control': pedida
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=60, stale-while-revalidate=300',
      },
    },
  );
}
