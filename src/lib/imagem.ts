// Utilitários de imagem que rodam NO NAVEGADOR (Canvas API).
// É o `scripts/organizar-personagens.py` do jogo, portado — quem desenha sobe a
// arte e vê o resultado na hora, sem rodar script nenhum.

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

export async function enviar(
  arquivo: File | Blob,
  perfil: 'peca' | 'cenario' | 'som' | 'livre',
  nome: string,
): Promise<RespostaUpload> {
  const form = new FormData();
  form.append('arquivo', arquivo instanceof File ? arquivo : new File([arquivo], nome, { type: 'image/png' }));
  form.append('perfil', perfil);

  const r = await fetch('/api/upload', { method: 'POST', body: form });
  const json = await r.json();
  if (!r.ok) throw new Error(json.erro ?? 'Falha no upload.');
  return json as RespostaUpload;
}
