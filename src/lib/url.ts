/** URL pública de um asset. Funciona no servidor e no navegador. */
export function urlAsset(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/assets/${caminho}`;
}
