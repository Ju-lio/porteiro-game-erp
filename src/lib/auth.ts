import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Autenticação pela chave PUBLICÁVEL, com a sessão em cookie.
//
// Repare que é uma chave diferente da que o resto do ERP usa: a secret key
// ignora RLS e serve pra ler/escrever conteúdo; esta aqui só sabe fazer login.
// Não existe tela de cadastro — as contas são criadas por convite no Supabase.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publicavel = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export async function clienteAuth() {
  const armazem = await cookies();
  return createServerClient(url, publicavel, {
    cookies: {
      getAll: () => armazem.getAll(),
      setAll: (novos) => {
        try {
          for (const { name, value, options } of novos) armazem.set(name, value, options);
        } catch {
          // Server Component não pode escrever cookie — o middleware já cuidou
          // de renovar a sessão antes de chegar aqui.
        }
      },
    },
  });
}

export async function usuarioAtual() {
  const supabase = await clienteAuth();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
