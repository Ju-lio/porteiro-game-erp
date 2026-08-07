import type { Metadata } from 'next';
import { Bitter, JetBrains_Mono } from 'next/font/google';
import { BarraLateral } from '@/componentes/BarraLateral';
import { usuarioAtual } from '@/lib/auth';
import './globals.css';

const display = Bitter({
  variable: '--fonte-display',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

const mono = JetBrains_Mono({
  variable: '--fonte-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Porteiro — Engine',
  description: 'ERP de conteúdo do jogo Porteiro.',
};

// É um painel de administração: toda tela lê o banco a cada visita. Pré-render
// não faria sentido (e falharia no build, quando o banco ainda não existe).
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Sem sessão o único destino possível é a tela de entrada (o middleware
  // garante isso) — e lá a barra lateral não faz sentido.
  const usuario = await usuarioAtual();

  return (
    <html lang="pt-BR" className={`${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {usuario ? (
          <div className="flex h-screen overflow-hidden">
            <BarraLateral email={usuario.email ?? ''} />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
