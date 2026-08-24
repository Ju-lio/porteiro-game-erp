'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura } from '@/componentes/campos';
import { Upload } from '@/componentes/Upload';
import { Aviso, Vazio } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import type { Nivel } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

// ═══════════════════════════════════════════════════════════════════════════
// ABA NÍVEIS (o que antes era "cidade" enquanto lugar jogável)
//
// A chave de verdade é VILA · NÍVEL · VARIAÇÃO. Normalmente são 3 níveis por
// vila, com quantas variações se quiser dentro de cada um — "Nível 1 variação
// 1", "Nível 1 variação 2"… O número da variação é sugerido sozinho: o próximo
// livre daquele nível.
//
// ⚠️ Esta aba salva NA HORA, diferente das outras. Um nível tem upload de
// arte; segurar isso num rascunho junto do resto da vila daria um botão
// "Salvar" que às vezes sobe arquivo e às vezes não.
//
// As OPINIÕES do nível saíram daqui — moraram no modal até virarem grandes
// demais pra ele, e agora têm aba própria (Opinião popular).
// ═══════════════════════════════════════════════════════════════════════════

const MOMENTOS = [
  { chave: 'arte_dia_id', rotulo: 'Dia' },
  { chave: 'arte_tarde_id', rotulo: 'Tarde' },
  { chave: 'arte_noite_id', rotulo: 'Noite' },
] as const;

type RascunhoNivel = {
  id?: string;
  nivel: number;
  variacao: number;
  nome: string;
  descricao: string;
  artes: Record<string, string | null>;
  urls: Record<string, string | null>;
};

export function AbaNiveis({
  vilaId,
  niveis,
  caminhos,
}: {
  vilaId: string;
  niveis: Nivel[];
  caminhos: Record<string, string>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<RascunhoNivel | null>(null);
  const [confirmando, setConfirmando] = useState<Nivel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const CAMINHO = `/mundo/vilas/${vilaId}`;

  function url(assetId: string | null | undefined) {
    return assetId ? urlAsset(caminhos[assetId]) : null;
  }

  /** A próxima variação livre daquele nível — evita colidir com a chave única. */
  function proximaVariacao(nivel: number) {
    const usadas = niveis.filter((n) => n.nivel === nivel).map((n) => n.variacao);
    let v = 1;
    while (usadas.includes(v)) v++;
    return v;
  }

  function abrir(n?: Nivel) {
    setErro(null);
    const artes: Record<string, string | null> = {};
    const urls: Record<string, string | null> = {};
    for (const m of MOMENTOS) {
      const id = n ? ((n[m.chave] as string | null) ?? null) : null;
      artes[m.chave] = id;
      urls[m.chave] = url(id);
    }
    const nivelPadrao = n?.nivel ?? 1;
    setEditando({
      id: n?.id,
      nivel: nivelPadrao,
      variacao: n?.variacao ?? proximaVariacao(nivelPadrao),
      nome: n?.nome ?? '',
      descricao: n?.descricao ?? '',
      artes,
      urls,
    });
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await salvarComLigacoes(
        'nivel',
        {
          id: editando.id,
          vila_id: vilaId,
          nivel: editando.nivel,
          variacao: editando.variacao,
          nome: editando.nome || null,
          descricao: editando.descricao || null,
          ...editando.artes,
        },
        [],
        CAMINHO,
      );
      if (resultado.ok) {
        setEditando(null);
        router.refresh();
      } else setErro(resultado.erro);
    });
  }

  return (
    <div className="space-y-6">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <div className="flex items-center justify-between gap-4">
        <p className="max-w-2xl text-[12px] leading-relaxed text-tinta-fraca">
          Cada nível é um lugar jogável dentro da vila — a chave é{' '}
          <strong>vila · nível · variação</strong>. Normalmente são 3 níveis, com quantas
          variações quiser em cada um. As opiniões do povo sobre cada nível moram na aba{' '}
          <strong>Opinião popular</strong>.
        </p>
        <button className="botao botao-primario shrink-0" onClick={() => abrir()}>
          <Plus size={16} /> Novo nível
        </button>
      </div>

      {niveis.length === 0 ? (
        <Vazio
          texto="Nenhum nível nesta vila ainda. Sem nível, não há onde jogar dentro dela."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar o primeiro
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {niveis.map((n) => (
            <div key={n.id} className="caixa overflow-hidden p-0">
              <div className="grid grid-cols-3 gap-px overflow-hidden bg-borda">
                {MOMENTOS.map((m) => {
                  const u = url(n[m.chave] as string | null);
                  return (
                    <div key={m.chave} className="xadrez aspect-4/3">
                      {u && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={u} alt={m.rotulo} className="h-full w-full object-cover" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-4">
                <h3 className="titulo flex items-center gap-2 text-[15px]">
                  <Layers size={14} className="opacity-60" />
                  Nível {n.nivel} · var. {n.variacao}
                </h3>
                {n.nome && <p className="text-[12px] font-bold text-tinta">{n.nome}</p>}
                {n.descricao && (
                  <p className="mt-1 line-clamp-2 text-[12px] text-tinta-fraca">{n.descricao}</p>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    className="botao botao-fantasma flex-1 text-[12px]"
                    onClick={() => abrir(n)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                    onClick={() => setConfirmando(n)}
                    aria-label="Apagar nível"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── o modal do nível ────────────────────────────────────────────── */}
      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar nível' : 'Novo nível'}
        descricao="A vila já vem preenchida. O que muda é o número do nível, o da variação e o que se vê pela janela."
        largura="lg"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className="botao botao-primario" onClick={submeter} disabled={pendente}>
              {pendente ? 'Salvando…' : 'Salvar Mudanças'}
            </button>
          </>
        }
      >
        {erro && (
          <div className="mb-5">
            <Aviso tom="erro">{erro}</Aviso>
          </div>
        )}

        {editando && (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-4">
              <Moldura rotulo="Nível" obrigatorio ajuda="1, 2, 3…">
                <input
                  type="number"
                  min={1}
                  className="campo"
                  value={editando.nivel}
                  onChange={(e) => {
                    const nivel = Math.max(1, Number(e.target.value) || 1);
                    setEditando({
                      ...editando,
                      nivel,
                      // Ao trocar de nível num registro NOVO, resugere a variação.
                      variacao: editando.id ? editando.variacao : proximaVariacao(nivel),
                    });
                  }}
                />
              </Moldura>
              <Moldura rotulo="Variação" obrigatorio ajuda="Sequencial dentro do nível.">
                <input
                  type="number"
                  min={1}
                  className="campo"
                  value={editando.variacao}
                  onChange={(e) =>
                    setEditando({ ...editando, variacao: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </Moldura>
              <div className="sm:col-span-2">
                <Moldura rotulo="Nome" ajuda="Opcional. Só pra você achar rápido na lista.">
                  <input
                    className="campo"
                    value={editando.nome}
                    placeholder="Muralha externa"
                    onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  />
                </Moldura>
              </div>
            </div>

            <Moldura rotulo="Descrição">
              <textarea
                className="campo"
                value={editando.descricao}
                placeholder="O que esse pedaço da vila é, e por que se guarda um portão aqui."
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              />
            </Moldura>

            <div>
              <span className="rotulo">Cenários — as três luzes do mesmo enquadramento</span>
              <div className="grid grid-cols-3 gap-4">
                {MOMENTOS.map((m) => (
                  <Upload
                    key={m.chave}
                    rotulo={m.rotulo}
                    perfil="cenario"
                    urlAtual={editando.urls[m.chave]}
                    aoEnviar={(assetId, u) =>
                      setEditando({
                        ...editando,
                        artes: { ...editando.artes, [m.chave]: assetId },
                        urls: { ...editando.urls, [m.chave]: u },
                      })
                    }
                    aoLimpar={() =>
                      setEditando({
                        ...editando,
                        artes: { ...editando.artes, [m.chave]: null },
                        urls: { ...editando.urls, [m.chave]: null },
                      })
                    }
                  />
                ))}
              </div>
              <span className="mt-1.5 block text-[11px] text-tinta-fraca">
                Mesmo enquadramento nas três, só a luz muda. Nível sem as três: aponte o mesmo
                arquivo nos três, ou deixe em branco pra herdar o cenário da vila.
              </span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar nível?"
        descricao="As opiniões dele vão junto. As artes continuam guardadas — bundles já publicados seguem intactos."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setConfirmando(null)}>
              Cancelar
            </button>
            <button
              className="botao botao-perigo"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  if (!confirmando) return;
                  const resultado = await apagar('nivel', confirmando.id, CAMINHO);
                  if (resultado.ok) {
                    setConfirmando(null);
                    router.refresh();
                  } else setErro(resultado.erro);
                })
              }
            >
              {pendente ? 'Apagando…' : 'Apagar'}
            </button>
          </>
        }
      >
        <p className="text-sm">
          <strong>
            Nível {confirmando?.nivel} · variação {confirmando?.variacao}
          </strong>
        </p>
      </Modal>
    </div>
  );
}
