import { NextResponse } from 'next/server';
import { BUCKET, db, urlPublica } from '@/lib/supabase';

// Fase 1 do upload direto (cenário/áudio/mapa): valida metadados — o arquivo
// em si ainda não subiu — e devolve um token de upload assinado pro navegador
// falar DIRETO com o Storage. Existe porque o Vercel recusa (413, texto puro,
// antes do nosso código rodar) qualquer requisição de função serverless
// acima de uns 4.5MB, e esses três perfis passam disso fácil. Ver
// `lib/imagem.ts` (fase 2 é `api/upload/concluir`).
//
// ⚠️ `peca` NÃO passa por aqui — continua em `api/upload/route.ts`: é pequena
// (400KB de teto) e ganha validação de canvas a partir dos bytes reais do
// PNG, que só dá pra fazer com o arquivo na mão.

type Perfil = 'cenario' | 'som' | 'livre';

type Corpo = {
  perfil: Perfil;
  hash: string;
  nomeOriginal: string;
  mime: string;
  bytes: number;
  largura: number | null;
  altura: number | null;
};

async function config(): Promise<Record<string, unknown>> {
  const { data } = await db.from('config').select('chave, valor');
  const c: Record<string, unknown> = {};
  for (const l of data ?? []) c[l.chave as string] = l.valor;
  return c;
}

export async function POST(req: Request) {
  const { perfil, hash, nomeOriginal, mime, bytes } = (await req.json()) as Corpo;
  const cfg = await config();
  const ehAudio = perfil === 'som';

  // ── formato ──────────────────────────────────────────────────────────────
  const formatos = (ehAudio ? cfg.formatos_audio : cfg.formatos_imagem) as string[] | undefined;
  if (formatos?.length && !formatos.includes(mime)) {
    return NextResponse.json(
      { erro: `Formato ${mime || 'desconhecido'} não aceito. Use: ${formatos.join(', ')}.` },
      { status: 400 },
    );
  }

  // ── tamanho ──────────────────────────────────────────────────────────────
  const maxKb = Number(
    ehAudio ? (cfg.max_kb_audio ?? 8192) : (cfg.max_kb_mapa ?? 20480),
  );
  if (bytes > maxKb * 1024) {
    return NextResponse.json(
      {
        erro: `Arquivo tem ${Math.round(bytes / 1024)} KB e o limite é ${maxKb} KB. Exporte mais leve (o limite está em Settings).`,
      },
      { status: 400 },
    );
  }

  // ── content-addressing: mesmo conteúdo ⇒ mesmo asset, sem subir de novo ──
  const { data: jaExiste } = await db
    .from('asset')
    .select('*')
    .eq('sha256', hash)
    .maybeSingle();

  if (jaExiste) {
    return NextResponse.json({ asset: jaExiste, url: urlPublica(jaExiste.caminho), reusado: true });
  }

  const extensao = (nomeOriginal.split('.').pop() ?? 'bin').toLowerCase();
  const caminho = `${hash.slice(0, 2)}/${hash}.${extensao}`;

  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(caminho, { upsert: true });
  if (error) {
    return NextResponse.json({ erro: `Falha ao preparar upload: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ reusado: false, caminho, token: data.token });
}
