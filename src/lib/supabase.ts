import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { BUCKET } from './bucket';

// ⚠️ SERVER-ONLY. A secret key ignora RLS — ela nunca pode vazar pro browser.
// O ERP inteiro acessa o banco por aqui; o navegador só fala com o ERP.
// (É a mesma fronteira que o jogo respeita: ele nunca toca nas tabelas, só no bundle.)

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error(
    'Faltam SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local — copie do painel do Supabase.',
  );
}

export const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export { BUCKET };

/** URL pública de um arquivo do bucket. O bundle guarda estas URLs. */
export function urlPublica(caminho: string): string {
  return `${url}/storage/v1/object/public/${BUCKET}/${caminho}`;
}

/**
 * Erro de "tabela não existe" (schema ainda não aplicado). Serve pra mostrar a
 * tela de setup em vez de um stack trace na cara do editor.
 */
export function ehSchemaFaltando(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string } | null;
  const msg = e?.message ?? String(erro ?? '');
  return (
    e?.code === '42P01' || // Postgres: relation does not exist
    e?.code === 'PGRST205' || // PostgREST: tabela fora do schema cache
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg)
  );
}
