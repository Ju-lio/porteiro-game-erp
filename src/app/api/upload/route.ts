import { NextResponse } from 'next/server';
import { BUCKET, db, urlPublica } from '@/lib/supabase';

// Upload de asset: valida, calcula o sha256 e guarda com o hash no nome.
//
// ⚠️ O arquivo é IMUTÁVEL. Subir a mesma arte de novo devolve o MESMO asset;
// "trocar a arte de uma peça" é a peça passar a apontar pra outro asset, nunca
// um arquivo ser sobrescrito. É isso que faz um bundle antigo continuar
// reproduzindo o jogo daquele dia pixel a pixel.

type Perfil = 'peca' | 'cenario' | 'som' | 'livre';

/** Lê largura/altura direto do chunk IHDR do PNG — sem dependência nativa. */
function dimensoesPng(bytes: Uint8Array): { largura: number; altura: number } | null {
  const assinatura = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24) return null;
  for (let i = 0; i < 8; i++) if (bytes[i] !== assinatura[i]) return null;
  const ler = (o: number) =>
    (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3];
  return { largura: ler(16) >>> 0, altura: ler(20) >>> 0 };
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function config(): Promise<Record<string, unknown>> {
  const { data } = await db.from('config').select('chave, valor');
  const c: Record<string, unknown> = {};
  for (const l of data ?? []) c[l.chave as string] = l.valor;
  return c;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const arquivo = form.get('arquivo');
  const perfil = (form.get('perfil') as Perfil) ?? 'livre';

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: 'Nenhum arquivo enviado.' }, { status: 400 });
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const cfg = await config();
  const ehAudio = perfil === 'som';

  // ── formato ──────────────────────────────────────────────────────────────
  const formatos = (ehAudio ? cfg.formatos_audio : cfg.formatos_imagem) as string[] | undefined;
  if (formatos?.length && !formatos.includes(arquivo.type)) {
    return NextResponse.json(
      { erro: `Formato ${arquivo.type || 'desconhecido'} não aceito. Use: ${formatos.join(', ')}.` },
      { status: 400 },
    );
  }

  // ── tamanho ──────────────────────────────────────────────────────────────
  // Peça de personagem é apertada de propósito; cenário é uma tela inteira e
  // áudio é áudio — cada um com seu teto.
  const maxKb = Number(
    ehAudio
      ? (cfg.max_kb_audio ?? 8192)
      : perfil === 'cenario'
        ? (cfg.max_kb_cenario ?? 4096)
        : (cfg.max_kb ?? 400),
  );
  if (bytes.length > maxKb * 1024) {
    return NextResponse.json(
      {
        erro: `Arquivo tem ${Math.round(bytes.length / 1024)} KB e o limite é ${maxKb} KB. Exporte mais leve (o limite está em Settings).`,
      },
      { status: 400 },
    );
  }

  // ── canvas: a trava que mantém as camadas alinhadas ──────────────────────
  let largura: number | null = null;
  let altura: number | null = null;

  if (!ehAudio) {
    const dim = dimensoesPng(bytes);
    if (!dim) {
      return NextResponse.json({ erro: 'Não parece um PNG válido.' }, { status: 400 });
    }
    largura = dim.largura;
    altura = dim.altura;

    if (perfil === 'peca') {
      const lEsperada = Number(cfg.canvas_largura ?? 1080);
      const aEsperada = Number(cfg.canvas_altura ?? 1080);
      if (dim.largura !== lEsperada || dim.altura !== aEsperada) {
        return NextResponse.json(
          {
            erro:
              `A peça precisa ter exatamente ${lEsperada}×${aEsperada}px — esta veio ${dim.largura}×${dim.altura}px. ` +
              `Quase sempre é o "trim"/"cortar transparência" ligado na hora de exportar: ` +
              `desligue e exporte a tela inteira, senão a camada sai do lugar no jogo.`,
          },
          { status: 400 },
        );
      }
    }
  }

  // ── content-addressing: mesmo conteúdo ⇒ mesmo asset ─────────────────────
  const hash = await sha256(bytes);
  const { data: jaExiste } = await db
    .from('asset')
    .select('*')
    .eq('sha256', hash)
    .maybeSingle();

  if (jaExiste) {
    return NextResponse.json({ asset: jaExiste, url: urlPublica(jaExiste.caminho), reusado: true });
  }

  const extensao = (arquivo.name.split('.').pop() ?? 'bin').toLowerCase();
  const caminho = `${hash.slice(0, 2)}/${hash}.${extensao}`;

  const { error: erroUpload } = await db.storage
    .from(BUCKET)
    .upload(caminho, bytes, { contentType: arquivo.type, upsert: true });

  if (erroUpload) {
    return NextResponse.json({ erro: `Falha ao subir: ${erroUpload.message}` }, { status: 500 });
  }

  const { data: asset, error } = await db
    .from('asset')
    .insert({
      sha256: hash,
      caminho,
      nome_original: arquivo.name,
      mime: arquivo.type,
      bytes: bytes.length,
      largura,
      altura,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ asset, url: urlPublica(asset.caminho), reusado: false });
}
