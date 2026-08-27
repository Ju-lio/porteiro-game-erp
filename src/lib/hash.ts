// SHA-256 em hex via Web Crypto — a mesma API existe em Node (rotas) e no
// navegador, então o hash bate mesmo calculado nos dois lados. É a base do
// content-addressing dos assets (ver `api/upload/*/route.ts`).
export async function sha256(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
