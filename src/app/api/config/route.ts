import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// `config` tem `chave` como chave primária (não `id`), então não passa pelo
// CRUD genérico — upsert por chave.

export async function POST(req: Request) {
  const pares = (await req.json()) as { chave: string; valor: unknown }[];

  for (const { chave, valor } of pares) {
    const { error } = await db
      .from('config')
      .upsert({ chave, valor, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
