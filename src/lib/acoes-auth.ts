'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { clienteAuth } from './auth';

export async function entrar(
  _anterior: { erro?: string } | null,
  form: FormData,
): Promise<{ erro?: string }> {
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');

  if (!email || !senha) return { erro: 'Preencha e-mail e senha.' };

  const supabase = await clienteAuth();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    // Mensagem genérica de propósito: dizer "este e-mail não existe" entrega
    // quem tem conta pra quem não deveria saber.
    return { erro: 'E-mail ou senha incorretos.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function sair() {
  const supabase = await clienteAuth();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/entrar');
}
