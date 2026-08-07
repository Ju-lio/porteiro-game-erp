'use server';

import { revalidatePath } from 'next/cache';
import { db } from './supabase';

// CRUD genérico. As telas simples (itens, marcas, sons, cidades...) todas caem
// aqui; só as telas ricas (peças, camadas, publicação) têm ação própria.

export type Resultado = { ok: true } | { ok: false; erro: string };

function humanizar(erro: { message: string; code?: string }): string {
  const m = erro.message;
  if (erro.code === '23505') return 'Já existe um registro com essa chave.';
  if (erro.code === '23503') return 'Existe outro registro dependendo deste — remova a ligação antes.';
  if (/marca_cabe_na_janela/.test(m))
    return 'Topo + altura passa de 74% — a marca ficaria escondida atrás da arte da cabine.';
  if (/chance/.test(m) && /check/.test(m))
    return 'Chance precisa ficar entre 0 e 1, e nunca pode ser exatamente 1 (certeza vira checklist).';
  if (/hex/.test(m)) return 'Cor precisa ser um hex no formato #RRGGBB.';
  if (/paleta_so_em_cor/.test(m))
    return 'Sub-camada do tipo "cor" precisa de uma paleta; os outros tipos não levam paleta.';
  return m;
}

export async function salvar(
  tabela: string,
  registro: Record<string, unknown>,
  caminho = '/',
): Promise<Resultado> {
  const { id, ...campos } = registro;
  const q = id
    ? db.from(tabela).update(campos).eq('id', id)
    : db.from(tabela).insert(campos);
  const { error } = await q;
  if (error) return { ok: false, erro: humanizar(error) };
  revalidatePath(caminho);
  return { ok: true };
}

export async function apagar(tabela: string, id: string, caminho = '/'): Promise<Resultado> {
  const { error } = await db.from(tabela).delete().eq('id', id);
  if (error) return { ok: false, erro: humanizar(error) };
  revalidatePath(caminho);
  return { ok: true };
}

/** Reordena uma lista inteira de uma vez (usado no arrasta-e-solta das camadas). */
export async function reordenar(
  tabela: string,
  ids: string[],
  caminho = '/',
): Promise<Resultado> {
  for (let i = 0; i < ids.length; i++) {
    const { error } = await db.from(tabela).update({ ordem: i * 10 }).eq('id', ids[i]);
    if (error) return { ok: false, erro: humanizar(error) };
  }
  revalidatePath(caminho);
  return { ok: true };
}

/** Substitui todas as linhas de uma tabela de ligação para um dono. */
export async function trocarLigacoes(
  tabela: string,
  colunaDono: string,
  donoId: string,
  linhas: Record<string, unknown>[],
  caminho = '/',
): Promise<Resultado> {
  const { error: e1 } = await db.from(tabela).delete().eq(colunaDono, donoId);
  if (e1) return { ok: false, erro: humanizar(e1) };
  if (linhas.length) {
    const { error: e2 } = await db
      .from(tabela)
      .insert(linhas.map((l) => ({ ...l, [colunaDono]: donoId })));
    if (e2) return { ok: false, erro: humanizar(e2) };
  }
  revalidatePath(caminho);
  return { ok: true };
}

/** Salva um registro e, junto, suas ligações — numa ação só, pra tela não piscar. */
export async function salvarComLigacoes(
  tabela: string,
  registro: Record<string, unknown>,
  ligacoes: {
    tabela: string;
    colunaDono: string;
    linhas: Record<string, unknown>[];
  }[],
  caminho = '/',
): Promise<Resultado> {
  const { id, ...campos } = registro;
  let donoId = id as string | undefined;

  if (donoId) {
    const { error } = await db.from(tabela).update(campos).eq('id', donoId);
    if (error) return { ok: false, erro: humanizar(error) };
  } else {
    const { data, error } = await db.from(tabela).insert(campos).select('id').single();
    if (error) return { ok: false, erro: humanizar(error) };
    donoId = data.id as string;
  }

  for (const lig of ligacoes) {
    const r = await trocarLigacoes(lig.tabela, lig.colunaDono, donoId, lig.linhas, caminho);
    if (!r.ok) return r;
  }
  revalidatePath(caminho);
  return { ok: true };
}
