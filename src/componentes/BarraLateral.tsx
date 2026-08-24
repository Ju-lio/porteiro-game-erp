'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Castle, CircleHelp, Drama, LogOut, Map, Settings, UploadCloud, User } from 'lucide-react';
import { sair } from '@/lib/acoes-auth';

// O menu segue a divisão que combinamos: Personagens / Mundo / Gameplay /
// Publicação / Configurações. Cada seção é um pedaço do bundle que o jogo baixa.
//
// Decisões de ago/2026 estão desenhadas aqui:
//   · CAMADAS saiu de Personagens e foi para Configurações — a ordem de
//     empilhamento é geral do jogo, não de uma raça, então não pertence a uma
//     tela que filtra por raça.
//   · RAÇAS fecha a seção Personagens: é o que as outras telas filtram.
//   · TEMPERAMENTOS saiu de Personagens e foi para Gameplay — é vocabulário
//     GERAL (sem raça própria), consumido pela Aba Temperamento da Vila.
//   · PROTAGONISTAS abre a seção Personagens — é o elenco fixo do jogo, o
//     primeiro lugar onde alguém novo no time entende quem já existe.
//   · NOMES e FALAS eram uma tela só ("Nomes e falas"); viraram dois itens de
//     menu lado a lado — mesma tabela `vocabulario`, filtrada por tipo.

type Item = { href: string; rotulo: string };
type Secao = { rotulo: string; icone: React.ReactNode; itens: Item[] };

const SECOES: Secao[] = [
  {
    rotulo: 'Personagens',
    icone: <User size={17} />,
    itens: [
      { href: '/personagens/protagonistas', rotulo: 'Protagonistas' },
      { href: '/personagens/paletas', rotulo: 'Paletas de cor' },
      { href: '/personagens/pecas', rotulo: 'Peças' },
      { href: '/personagens/nomes', rotulo: 'Nomes' },
      { href: '/personagens/falas', rotulo: 'Falas' },
      { href: '/personagens/racas', rotulo: 'Raças' },
    ],
  },
  {
    rotulo: 'Mundo',
    icone: <Map size={17} />,
    itens: [
      { href: '/mundo/vilas', rotulo: 'Vilas' },
      { href: '/mundo/lugares', rotulo: 'Lugares' },
      { href: '/mundo/cenarios', rotulo: 'Cenários' },
      { href: '/mundo/sons', rotulo: 'Sons' },
      { href: '/mundo/climas', rotulo: 'Climas' },
    ],
  },
  {
    rotulo: 'Gameplay',
    icone: <Drama size={17} />,
    itens: [
      { href: '/gameplay/documentos', rotulo: 'Documentos' },
      { href: '/gameplay/profissoes', rotulo: 'Profissões' },
      { href: '/gameplay/itens', rotulo: 'Itens de bolsa' },
      { href: '/gameplay/marcas', rotulo: 'Marcas' },
      { href: '/gameplay/temperamentos', rotulo: 'Temperamentos' },
      { href: '/gameplay/regras', rotulo: 'Regras' },
      { href: '/gameplay/cartazes', rotulo: 'Cartazes' },
      { href: '/gameplay/perfis', rotulo: 'Perfis de geração' },
      { href: '/gameplay/missoes', rotulo: 'Missões' },
    ],
  },
  {
    rotulo: 'Publicação',
    icone: <UploadCloud size={17} />,
    itens: [
      { href: '/publicar', rotulo: 'Publicar' },
      { href: '/publicar/versoes', rotulo: 'Versões' },
    ],
  },
  {
    rotulo: 'Configurações',
    icone: <Settings size={17} />,
    itens: [
      { href: '/config', rotulo: 'Ajustes gerais' },
      { href: '/config/camadas', rotulo: 'Camadas' },
    ],
  },
];

export function BarraLateral({ email }: { email: string }) {
  const caminho = usePathname();

  return (
    <aside className="madeira flex w-[264px] shrink-0 flex-col border-r border-black/50">
      {/* ── marca ─────────────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-3 px-6 pt-6 pb-7">
        <span className="grid size-11 place-items-center rounded-lg border-2 border-ouro/70 bg-madeira-700 text-ouro">
          <Castle size={22} />
        </span>
        <span className="leading-tight">
          <span className="block font-display text-[19px] font-extrabold text-ouro">
            Porteiro
          </span>
          <span className="block font-display text-[19px] font-extrabold text-ouro">
            Medieval
          </span>
          <span className="mt-0.5 block text-[11px] text-pergaminho/35">Engine v1.0</span>
        </span>
      </Link>

      {/* ── seções ────────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {SECOES.map((secao) => (
          <div key={secao.rotulo} className="mb-5">
            <div className="mb-1.5 flex items-center gap-2.5 px-3 text-pergaminho/85">
              <span className="text-pergaminho/45">{secao.icone}</span>
              <span className="font-display text-[15px] font-bold">{secao.rotulo}</span>
            </div>
            <ul>
              {secao.itens.map((item) => {
                // `/publicar` e `/config` têm sub-rotas próprias no menu, então
                // só acendem no match exato — senão os dois ficariam ativos.
                const exato = item.href === '/publicar' || item.href === '/config';
                const ativo =
                  caminho === item.href || (!exato && caminho.startsWith(item.href + '/'));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        'ml-3 block rounded-md px-3 py-[7px] text-[13px] transition-colors',
                        ativo
                          ? 'bg-ouro font-bold text-madeira-900'
                          : 'text-pergaminho/55 hover:bg-white/6 hover:text-pergaminho/90',
                      ].join(' ')}
                    >
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── rodapé ────────────────────────────────────────────────────────── */}
      <div className="border-t border-white/8 px-3 py-4">
        <Rodape href="/ajuda" icone={<CircleHelp size={17} />} rotulo="Support" ativo={caminho === '/ajuda'} />

        <form action={sair} className="mt-3 border-t border-white/8 pt-3">
          <p className="truncate px-3 pb-1.5 text-[11px] text-pergaminho/35" title={email}>
            {email}
          </p>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] text-pergaminho/50 transition-colors hover:text-pergaminho/85"
          >
            <span className="opacity-60">
              <LogOut size={17} />
            </span>
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}

function Rodape({
  href,
  icone,
  rotulo,
  ativo,
}: {
  href: string;
  icone: React.ReactNode;
  rotulo: string;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
        ativo ? 'bg-white/8 text-pergaminho' : 'text-pergaminho/50 hover:text-pergaminho/85',
      ].join(' ')}
    >
      <span className="opacity-60">{icone}</span>
      {rotulo}
    </Link>
  );
}
