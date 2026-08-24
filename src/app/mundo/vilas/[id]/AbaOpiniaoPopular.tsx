'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save, Trash2 } from 'lucide-react';
import { GraficoDivergente } from '@/componentes/graficos';
import { Aviso, Caixa, Vazio } from '@/componentes/ui';
import { salvarComLigacoes } from '@/lib/acoes';
import type { Nivel, TipoOpiniao } from '@/lib/tipos';

// ═══════════════════════════════════════════════════════════════════════════
// OPINIÃO POPULAR — promovida de dentro do modal de Níveis pra uma aba própria
//
// As opiniões continuam pertencendo a um NÍVEL (`nivel_opiniao.nivel_id`), mas
// editá-las enterradas no modal de "Editar nível" (que já tem upload de arte e
// mais dois campos) ficava disputado. Aqui elas têm a tela inteira: escolhe o
// nível na faixa de cima, edita título/descrição nas duas colunas, ajusta o
// percentual no gráfico — tudo na mesma tela, sem modal.
//
// POPULARES viram o prompt POSITIVO daquele lugar; IMPOPULARES o NEGATIVO.
// ═══════════════════════════════════════════════════════════════════════════

type RascunhoOpiniao = {
  tipo: TipoOpiniao;
  titulo: string;
  descricao: string;
  percentual: number;
};

function mapear(n: Nivel | null): RascunhoOpiniao[] {
  return (n?.opinioes ?? []).map((o) => ({
    tipo: o.tipo,
    titulo: o.titulo,
    descricao: o.descricao ?? '',
    percentual: Number(o.percentual),
  }));
}

export function AbaOpiniaoPopular({ vilaId, niveis }: { vilaId: string; niveis: Nivel[] }) {
  const router = useRouter();
  const [nivelId, setNivelId] = useState<string | null>(niveis[0]?.id ?? null);
  const nivelAtual = niveis.find((n) => n.id === nivelId) ?? null;

  const [opinioes, setOpinioes] = useState<RascunhoOpiniao[]>(() => mapear(nivelAtual));
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();

  // Troca de nível (local) ou volta do servidor com dado fresco (router.refresh)
  // — os dois casos precisam recarregar o rascunho a partir do prop.
  useEffect(() => {
    setOpinioes(mapear(nivelAtual));
    setSalvo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivelId, nivelAtual]);

  function submeter() {
    if (!nivelId) return;
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const resultado = await salvarComLigacoes(
        'nivel',
        // `vila_id` vai junto só pra o UPDATE não sair com payload vazio.
        { id: nivelId, vila_id: vilaId },
        [
          {
            tabela: 'nivel_opiniao',
            colunaDono: 'nivel_id',
            linhas: opinioes
              .filter((o) => o.titulo.trim())
              .map((o, i) => ({
                tipo: o.tipo,
                titulo: o.titulo,
                descricao: o.descricao || null,
                percentual: o.percentual,
                ordem: i * 10,
              })),
          },
        ],
        `/mundo/vilas/${vilaId}`,
      );
      if (resultado.ok) {
        setSalvo(true);
        router.refresh();
      } else setErro(resultado.erro);
    });
  }

  if (niveis.length === 0)
    return (
      <Vazio texto="Nenhum nível nesta vila ainda. Crie um na aba Níveis antes de cadastrar opiniões — elas pertencem a um nível." />
    );

  const doTipo = (tipo: TipoOpiniao) =>
    opinioes.map((o, i) => ({ o, i })).filter(({ o }) => o.tipo === tipo);

  function mudar(indice: number, patch: Partial<RascunhoOpiniao>) {
    const novas = [...opinioes];
    novas[indice] = { ...novas[indice], ...patch };
    setOpinioes(novas);
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="rotulo">Nível</span>
        <div className="flex flex-wrap gap-1.5">
          {niveis.map((n) => {
            const ativo = n.id === nivelId;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setNivelId(n.id)}
                className={[
                  'rounded-md border px-3 py-1.5 text-[12px] font-bold transition-colors',
                  ativo
                    ? 'border-ouro-escuro bg-ouro/25 text-tinta'
                    : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                ].join(' ')}
              >
                Nível {n.nivel} · var. {n.variacao}
                {n.nome ? ` — ${n.nome}` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {salvo && !erro && (
        <div className="rounded-md border border-sucesso/40 bg-sucesso/10 px-4 py-2.5 text-[13px] font-bold text-sucesso">
          Salvo.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ListaOpinioes
          titulo="Opiniões populares"
          ajuda="Vai virar o prompt POSITIVO deste lugar."
          itens={doTipo('popular')}
          aoMudar={mudar}
          aoRemover={(i) => setOpinioes(opinioes.filter((_, j) => j !== i))}
          aoAdicionar={() =>
            setOpinioes([...opinioes, { tipo: 'popular', titulo: '', descricao: '', percentual: 50 }])
          }
        />
        <ListaOpinioes
          titulo="Opiniões impopulares"
          ajuda="Vai virar o prompt NEGATIVO deste lugar."
          itens={doTipo('impopular')}
          aoMudar={mudar}
          aoRemover={(i) => setOpinioes(opinioes.filter((_, j) => j !== i))}
          aoAdicionar={() =>
            setOpinioes([
              ...opinioes,
              { tipo: 'impopular', titulo: '', descricao: '', percentual: 50 },
            ])
          }
        />
      </div>

      <Caixa titulo="Quanto o povo sente cada uma">
        <GraficoDivergente
          rotuloPositivo="Popular (prompt positivo)"
          rotuloNegativo="Impopular (prompt negativo)"
          vazio="Adicione uma opinião acima para configurar o percentual."
          itens={opinioes.map((o, i) => ({
            id: String(i),
            rotulo: o.titulo || '(sem título)',
            detalhe: o.descricao,
            valor: o.percentual * (o.tipo === 'popular' ? 1 : -1),
          }))}
          aoMudar={(id, valor) => mudar(Number(id), { percentual: Math.abs(valor) })}
        />
      </Caixa>

      <div className="flex justify-end">
        <button className="botao botao-primario" onClick={submeter} disabled={pendente || !nivelId}>
          <Save size={16} /> {pendente ? 'Salvando…' : 'Salvar opiniões deste nível'}
        </button>
      </div>
    </div>
  );
}

function ListaOpinioes({
  titulo,
  ajuda,
  itens,
  aoMudar,
  aoRemover,
  aoAdicionar,
}: {
  titulo: string;
  ajuda: string;
  itens: { o: RascunhoOpiniao; i: number }[];
  aoMudar: (indice: number, patch: Partial<RascunhoOpiniao>) => void;
  aoRemover: (indice: number) => void;
  aoAdicionar: () => void;
}) {
  return (
    <div className="caixa p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h4 className="titulo text-[15px]">{titulo}</h4>
        <button className="botao botao-fantasma px-2.5 py-1 text-[12px]" onClick={aoAdicionar}>
          <Plus size={13} />
        </button>
      </div>
      <p className="mb-3 text-[11px] text-tinta-fraca">{ajuda}</p>

      {itens.length === 0 ? (
        <p className="rounded-md border border-dashed border-borda px-3 py-5 text-center text-[11px] text-tinta-fraca">
          nada ainda
        </p>
      ) : (
        <div className="space-y-3">
          {itens.map(({ o, i }) => (
            <div key={i} className="rounded-md border border-borda p-3">
              <div className="mb-2 flex gap-2">
                <input
                  className="campo"
                  value={o.titulo}
                  placeholder="Título"
                  onChange={(e) => aoMudar(i, { titulo: e.target.value })}
                />
                <button
                  type="button"
                  className="shrink-0 rounded-md p-2 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                  onClick={() => aoRemover(i)}
                  aria-label="Remover opinião"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <textarea
                className="campo min-h-20"
                value={o.descricao}
                placeholder="Descrição"
                onChange={(e) => aoMudar(i, { descricao: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
