import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Renova a sessão a cada navegação e barra quem não entrou.
//
// `/api/conteudo` e `/api/versoes` ficam FORA da proteção de propósito: são as
// portas que o jogo consome, e o jogo não tem login. Só metadado de versão e
// conteúdo já publicado — a proteção que importa está no que ninguém alcança
// sem sessão: as telas de edição.

const LIVRE = ['/entrar', '/api/conteudo', '/api/versoes'];

export async function middleware(req: NextRequest) {
  const resposta = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (novos) => {
          for (const { name, value, options } of novos) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser (e não getSession) força a validação do token no servidor.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = req.nextUrl.pathname;
  const ehLivre = LIVRE.some((p) => caminho === p || caminho.startsWith(p + '/'));

  if (!user && !ehLivre) {
    const destino = req.nextUrl.clone();
    destino.pathname = '/entrar';
    return NextResponse.redirect(destino);
  }

  if (user && caminho === '/entrar') {
    const destino = req.nextUrl.clone();
    destino.pathname = '/';
    return NextResponse.redirect(destino);
  }

  return resposta;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|mp3|wav)$).*)'],
};
