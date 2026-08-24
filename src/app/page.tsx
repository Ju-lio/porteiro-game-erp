import Link from 'next/link';
import { CircleCheck, CircleX, Rocket, TriangleAlert } from 'lucide-react';
import { Cabecalho, Caixa, Folha, SchemaFaltando } from '@/componentes/ui';
import { db, ehSchemaFaltando } from '@/lib/supabase';
import { conferir } from '@/lib/publicacao';

// Painel: o estado do conteúdo num relance. Responde as duas perguntas que
// aparecem toda vez que alguém abre o ERP: "tem coisa faltando?" e "o que está
// no ar?".

const CONTAGENS: { tabela: string; rotulo: string; href: string }[] = [
  { tabela: 'protagonista', rotulo: 'Protagonistas', href: '/personagens/protagonistas' },
  { tabela: 'raca', rotulo: 'Raças', href: '/personagens/racas' },
  { tabela: 'peca', rotulo: 'Peças de arte', href: '/personagens/pecas' },
  { tabela: 'grupo_camada', rotulo: 'Grupos de camada', href: '/config/camadas' },
  { tabela: 'paleta', rotulo: 'Paletas', href: '/personagens/paletas' },
  { tabela: 'vocabulario', rotulo: 'Nomes e falas', href: '/personagens/nomes' },
  { tabela: 'temperamento', rotulo: 'Temperamentos', href: '/gameplay/temperamentos' },
  { tabela: 'vila', rotulo: 'Vilas', href: '/mundo/vilas' },
  { tabela: 'nivel', rotulo: 'Níveis', href: '/mundo/vilas' },
  { tabela: 'lugar', rotulo: 'Lugares', href: '/mundo/lugares' },
  { tabela: 'clima', rotulo: 'Climas', href: '/mundo/climas' },
  { tabela: 'cenario', rotulo: 'Cenários', href: '/mundo/cenarios' },
  { tabela: 'som', rotulo: 'Sons', href: '/mundo/sons' },
  { tabela: 'profissao', rotulo: 'Profissões', href: '/gameplay/profissoes' },
  { tabela: 'item_bolsa', rotulo: 'Itens de bolsa', href: '/gameplay/itens' },
  { tabela: 'marca', rotulo: 'Marcas', href: '/gameplay/marcas' },
  { tabela: 'regra', rotulo: 'Regras', href: '/gameplay/regras' },
  { tabela: 'missao', rotulo: 'Missões', href: '/gameplay/missoes' },
];

export default async function Painel() {
  try {
    const contagens: Record<string, number> = {};
    for (const c of CONTAGENS) {
      const { count, error } = await db.from(c.tabela).select('*', { count: 'exact', head: true });
      if (error) throw error;
      contagens[c.tabela] = count ?? 0;
    }

    const { data: atual } = await db
      .from('publicacao_atual')
      .select('versao, atualizado_em')
      .eq('id', 1)
      .maybeSingle();

    const diagnostico = await conferir();

    return (
      <Folha>
        <Cabecalho
          titulo="Painel"
          descricao="O estado do conteúdo do Porteiro. Tudo aqui vira o bundle que o jogo baixa."
          acoes={
            <Link href="/publicar" className="botao botao-primario">
              <Rocket size={16} /> Publicar
            </Link>
          }
        />

        <div className="grid gap-5 p-8 lg:grid-cols-3">
          <Caixa titulo="No ar">
            <p className="font-display text-[38px] leading-none font-extrabold text-tinta">
              {atual?.versao != null ? `v${atual.versao}` : '—'}
            </p>
            <p className="mt-2 text-[12px] text-tinta-fraca">
              {atual?.atualizado_em
                ? new Date(atual.atualizado_em).toLocaleString('pt-BR')
                : 'Nada publicado ainda.'}
            </p>
          </Caixa>

          <Caixa titulo="Integridade">
            {diagnostico.erros.length === 0 ? (
              <p className="flex items-center gap-2 text-[15px] font-bold text-sucesso">
                <CircleCheck size={20} /> Pronto pra publicar
              </p>
            ) : (
              <p className="flex items-center gap-2 text-[15px] font-bold text-perigo">
                <CircleX size={20} /> {diagnostico.erros.length} erro(s)
              </p>
            )}
            {diagnostico.avisos.length > 0 && (
              <p className="mt-2 flex items-center gap-2 text-[12px] text-tinta-fraca">
                <TriangleAlert size={14} /> {diagnostico.avisos.length} aviso(s)
              </p>
            )}
            <Link
              href="/publicar"
              className="mt-3 inline-block text-[12px] font-bold text-oxido underline underline-offset-2"
            >
              ver detalhes
            </Link>
          </Caixa>

          <Caixa titulo="O jogo consome">
            <code className="block rounded border border-borda bg-pergaminho-3/50 px-3 py-2 text-[11px] break-all">
              GET /api/conteudo
            </code>
            <p className="mt-2 text-[12px] leading-relaxed text-tinta-fraca">
              Uma porta só. O jogo nunca fala com as tabelas — baixa este JSON no boot e mantém
              em memória.
            </p>
          </Caixa>
        </div>

        <div className="px-8 pb-8">
          <h2 className="titulo mb-4 text-[19px]">Conteúdo</h2>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {CONTAGENS.map((c) => (
              <Link
                key={c.tabela}
                href={c.href}
                className="caixa flex items-center justify-between px-4 py-3.5 transition-colors hover:border-borda-forte"
              >
                <span className="text-[13px]">{c.rotulo}</span>
                <span
                  className={`font-display text-[20px] font-extrabold ${
                    contagens[c.tabela] === 0 ? 'text-tinta-fraca/45' : 'text-tinta'
                  }`}
                >
                  {contagens[c.tabela]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Folha>
    );
  } catch (e) {
    if (ehSchemaFaltando(e)) return <SchemaFaltando />;
    throw e;
  }
}
