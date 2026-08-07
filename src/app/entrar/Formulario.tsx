'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { LogIn } from 'lucide-react';
import { Aviso } from '@/componentes/ui';
import { Moldura } from '@/componentes/campos';
import { entrar } from '@/lib/acoes-auth';

export function Formulario() {
  const [estado, acao] = useActionState(entrar, null);

  return (
    <form action={acao} className="space-y-5 px-8 py-7">
      {estado?.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <Moldura rotulo="E-mail">
        <input
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          className="campo"
          placeholder="voce@exemplo.com"
        />
      </Moldura>

      <Moldura rotulo="Senha">
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          className="campo"
          placeholder="••••••••"
        />
      </Moldura>

      <Botao />

      <p className="text-center text-[11px] leading-relaxed text-tinta-fraca">
        Não existe cadastro aqui. Peça um convite para quem administra o projeto.
      </p>
    </form>
  );
}

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="botao botao-primario w-full" disabled={pending}>
      <LogIn size={16} /> {pending ? 'Entrando…' : 'Entrar'}
    </button>
  );
}
