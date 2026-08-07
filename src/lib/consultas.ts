import 'server-only';
import { db, ehSchemaFaltando } from './supabase';

/**
 * Leitura padrão das telas. Devolve `semSchema` em vez de explodir, pra página
 * poder mostrar a tela de setup quando o SQL ainda não foi aplicado.
 */
export async function buscar<T>(
  tabela: string,
  opcoes: { select?: string; ordem?: string; asc?: boolean } = {},
): Promise<{ linhas: T[]; semSchema: boolean }> {
  const { select = '*', ordem, asc = true } = opcoes;
  let q = db.from(tabela).select(select);
  if (ordem) q = q.order(ordem, { ascending: asc });
  const { data, error } = await q;

  if (error) {
    if (ehSchemaFaltando(error)) return { linhas: [], semSchema: true };
    throw error;
  }
  return { linhas: (data ?? []) as T[], semSchema: false };
}

/** Opções de um <select> a partir de uma tabela com id + nome. */
export async function opcoesDe(
  tabela: string,
  campoRotulo = 'nome',
): Promise<{ valor: string; rotulo: string }[]> {
  const { data, error } = await db.from(tabela).select(`id, ${campoRotulo}`).order(campoRotulo);
  if (error) return [];
  const linhas = (data ?? []) as unknown as Record<string, unknown>[];
  return linhas.map((l) => ({ valor: String(l.id), rotulo: String(l[campoRotulo]) }));
}

/** Lê um registro único de tabela-de-linha-só (sombra, ajustes_jogo). */
export async function buscarUnico<T>(tabela: string): Promise<T | null> {
  const { data, error } = await db.from(tabela).select('*').eq('id', 1).maybeSingle();
  if (error) return null;
  return (data as T) ?? null;
}
