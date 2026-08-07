'use server';

import { revalidatePath } from 'next/cache';
import { montar } from './bundle';
import { db } from './supabase';
import { validar } from './validacao';

export type ResultadoPublicacao =
  | { ok: true; versao: number }
  | { ok: false; erro: string };

/** Roda a validação sem publicar — o botão "conferir" da tela. */
export async function conferir() {
  const conteudo = await montar();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return validar(conteudo as any);
}

/**
 * Publica: valida, tira o retrato e trava a versão.
 *
 * A versão é imutável. Corrigir algo depois de publicar não edita a v42 — cria
 * a v43. É o que permite voltar no tempo sem medo.
 */
export async function publicar(notas: string, autor: string): Promise<ResultadoPublicacao> {
  const conteudo = await montar();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diag = validar(conteudo as any);

  if (diag.erros.length) {
    return {
      ok: false,
      erro: `${diag.erros.length} erro(s) bloqueiam a publicação. Corrija antes de publicar.`,
    };
  }

  const { data: ultimo } = await db
    .from('bundle')
    .select('versao')
    .order('versao', { ascending: false })
    .limit(1)
    .maybeSingle();

  const versao = (ultimo?.versao ?? 0) + 1;

  const { error } = await db.from('bundle').insert({
    versao,
    conteudo,
    notas: notas || null,
    publicado_por: autor || null,
  });
  if (error) return { ok: false, erro: error.message };

  const { error: e2 } = await db
    .from('publicacao_atual')
    .update({ versao, atualizado_em: new Date().toISOString() })
    .eq('id', 1);
  if (e2) return { ok: false, erro: e2.message };

  revalidatePath('/publicar');
  revalidatePath('/publicar/versoes');
  revalidatePath('/');
  return { ok: true, versao };
}

/** Rollback: o jogo passa a baixar outra versão. Nada é reescrito. */
export async function apontarPara(versao: number): Promise<ResultadoPublicacao> {
  const { error } = await db
    .from('publicacao_atual')
    .update({ versao, atualizado_em: new Date().toISOString() })
    .eq('id', 1);
  if (error) return { ok: false, erro: error.message };

  revalidatePath('/publicar');
  revalidatePath('/publicar/versoes');
  revalidatePath('/');
  return { ok: true, versao };
}
