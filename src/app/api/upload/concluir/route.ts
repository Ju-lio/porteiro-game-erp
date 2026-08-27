import { NextResponse } from 'next/server';
import { db, urlPublica } from '@/lib/supabase';

// Fase 2 do upload direto: o navegador já subiu os bytes pesados DIRETO pro
// Storage (fase 1 foi `api/upload/assinar`, que assinou o caminho). Aqui só
// registramos o asset — payload pequeno, sem o arquivo, então nunca esbarra
// no teto de tamanho do Vercel.

type Corpo = {
  caminho: string;
  hash: string;
  nomeOriginal: string;
  mime: string;
  bytes: number;
  largura: number | null;
  altura: number | null;
};

export async function POST(req: Request) {
  const { caminho, hash, nomeOriginal, mime, bytes, largura, altura } = (await req.json()) as Corpo;

  // Corrida rara (duas abas subindo o mesmo arquivo ao mesmo tempo): quem
  // chegar segundo aqui reaproveita o asset em vez de duplicar a linha.
  const { data: jaExiste } = await db.from('asset').select('*').eq('sha256', hash).maybeSingle();
  if (jaExiste) {
    return NextResponse.json({ asset: jaExiste, url: urlPublica(jaExiste.caminho), reusado: true });
  }

  const { data: asset, error } = await db
    .from('asset')
    .insert({ sha256: hash, caminho, nome_original: nomeOriginal, mime, bytes, largura, altura })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset, url: urlPublica(asset.caminho), reusado: false });
}
