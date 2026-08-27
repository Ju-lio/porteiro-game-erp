// Utilitários de imagem que rodam NO NAVEGADOR (Canvas API).
// É o `scripts/organizar-personagens.py` do jogo, portado — quem desenha sobe a
// arte e vê o resultado na hora, sem rodar script nenhum.

import { sha256 } from './hash';
import { storageDireto } from './supabase-browser';

export type Dimensoes = { largura: number; altura: number };

export async function dimensoes(arquivo: File | Blob): Promise<Dimensoes> {
  const bitmap = await createImageBitmap(arquivo);
  const d = { largura: bitmap.width, altura: bitmap.height };
  bitmap.close();
  return d;
}

/**
 * Converte o arquivo de COR numa MÁSCARA: mantém só o alpha (a forma) e joga o
 * RGB pra branco. A cor de verdade vem da paleta, sorteada em tempo de jogo.
 *
 * É por isso que o artista pode desenhar o cabelo em qualquer cor — o que
 * importa é o recorte.
 */
export async function gerarMascara(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível neste navegador.');

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const dados = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = dados.data;
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 255;
    px[i + 1] = 255;
    px[i + 2] = 255;
    // px[i + 3] (alpha) fica como está — é a forma.
  }
  ctx.putImageData(dados, 0, 0);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a máscara.'))),
      'image/png',
    ),
  );
}

export type RespostaUpload = {
  asset: { id: string; caminho: string; largura: number | null; altura: number | null };
  url: string;
  reusado: boolean;
};

/** A resposta de uma rota nossa é sempre JSON. Se não for, a requisição foi
 * recusada ANTES do nosso código rodar — normalmente a hospedagem (Vercel)
 * barrando por tamanho, o que chega como texto puro (ex.: "Request Entity Too
 * Large"), não JSON. */
async function lerJson(r: Response): Promise<Record<string, unknown>> {
  const texto = await r.text();
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(
      r.status === 413
        ? 'Arquivo grande demais para o servidor aceitar. Exporte mais leve (comprima ou reduza a resolução).'
        : `Falha no upload (HTTP ${r.status}). Resposta inesperada do servidor.`,
    );
  }
}

/** Perfis grandes o bastante pra estourar o teto de ~4.5MB por requisição das
 * funções serverless (Vercel) sobem DIRETO pro Storage via signed URL — o
 * arquivo pesado nunca passa pela nossa função, só um token pequeno passa.
 * `peca` fica de fora de propósito: é pequena (400KB de teto) e ganha
 * validação de canvas a partir dos bytes reais do PNG, só possível no
 * caminho antigo (server recebe o arquivo inteiro). */
const PERFIS_UPLOAD_DIRETO = new Set(['cenario', 'som', 'livre']);

export async function enviar(
  arquivo: File | Blob,
  perfil: 'peca' | 'cenario' | 'som' | 'livre',
  nome: string,
): Promise<RespostaUpload> {
  const arquivoFinal =
    arquivo instanceof File ? arquivo : new File([arquivo], nome, { type: 'image/png' });

  if (!PERFIS_UPLOAD_DIRETO.has(perfil)) {
    const form = new FormData();
    form.append('arquivo', arquivoFinal);
    form.append('perfil', perfil);

    const r = await fetch('/api/upload', { method: 'POST', body: form });
    const json = await lerJson(r);
    if (!r.ok) throw new Error((json.erro as string) ?? 'Falha no upload.');
    return json as unknown as RespostaUpload;
  }

  const bytes = new Uint8Array(await arquivoFinal.arrayBuffer());
  const hash = await sha256(bytes);

  let largura: number | null = null;
  let altura: number | null = null;
  if (perfil !== 'som') {
    const d = await dimensoes(arquivoFinal);
    largura = d.largura;
    altura = d.altura;
  }

  const rAssinar = await fetch('/api/upload/assinar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      perfil,
      hash,
      nomeOriginal: arquivoFinal.name,
      mime: arquivoFinal.type,
      bytes: bytes.length,
      largura,
      altura,
    }),
  });
  const assinado = await lerJson(rAssinar);
  if (!rAssinar.ok) throw new Error((assinado.erro as string) ?? 'Falha ao preparar o upload.');
  if (assinado.reusado) return assinado as unknown as RespostaUpload;

  const { error: erroUpload } = await storageDireto.uploadToSignedUrl(
    assinado.caminho as string,
    assinado.token as string,
    bytes,
    { contentType: arquivoFinal.type || 'application/octet-stream', upsert: true },
  );
  if (erroUpload) throw new Error(`Falha ao subir pro Storage: ${erroUpload.message}`);

  const rConcluir = await fetch('/api/upload/concluir', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caminho: assinado.caminho,
      hash,
      nomeOriginal: arquivoFinal.name,
      mime: arquivoFinal.type,
      bytes: bytes.length,
      largura,
      altura,
    }),
  });
  const concluido = await lerJson(rConcluir);
  if (!rConcluir.ok) throw new Error((concluido.erro as string) ?? 'Falha ao concluir o upload.');
  return concluido as unknown as RespostaUpload;
}
