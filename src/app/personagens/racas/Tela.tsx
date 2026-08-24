'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { ListaTexto, Moldura, SeletorCor } from '@/componentes/campos';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvar } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { Raca } from '@/lib/tipos';

// O cadastro de raças. É pequeno de propósito — o que dá peso à raça não é o
// que se digita aqui, é o que as outras telas penduram nela.
//
// ⚠️ `codigo` é SEQUENCIAL e vem do banco (sequence `raca_codigo_seq`). A tela
// nunca deixa digitar: código escolhido à mão colide, e o código é o que o
// Julio usa pra falar da raça ("a 1 é humano").

const CAMINHO = '/personagens/racas';

type Uso = Record<string, { paletas: number; pecas: number; vocabulario: number; temperamentos: number }>;

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  descricao: string;
  etnias: string[];
  cor: string;
  ordem: number;
};

export function TelaRacas({ racas, uso }: { racas: Raca[]; uso: Uso }) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Raca | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(r?: Raca) {
    setErro(null);
    setEditando({
      id: r?.id,
      chave: r?.chave ?? '',
      nome: r?.nome ?? '',
      descricao: r?.descricao ?? '',
      etnias: r?.etnias ?? [],
      cor: r?.cor ?? '#c4a86e',
      ordem: r?.ordem ?? racas.length * 10,
    });
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      // `codigo` fica de fora do payload: quem dá o número é a sequence.
      const r = await salvar(
        'raca',
        {
          id: editando.id,
          chave: editando.chave,
          nome: editando.nome,
          descricao: editando.descricao || null,
          etnias: editando.etnias,
          cor: editando.cor || null,
          ordem: editando.ordem,
        },
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Raças"
        descricao="O povo a que um visitante pertence. Paletas, peças, nomes e temperamentos são cadastrados POR raça — e todas essas telas abrem filtrando pela raça de código 1."
        acoes={
          <>
            <Contador n={racas.length} singular="raça" plural="raças" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Nova
            </button>
          </>
        }
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          Conteúdo de personagem <strong>sem raça</strong> vale para todas elas — é assim que uma
          peça genérica (um cinto, uma marca de ofício) não precisa ser duplicada em cada povo.
        </Aviso>
      </div>

      {racas.length === 0 ? (
        <Vazio
          texto="Nenhuma raça ainda. Comece por Humano — é a única que o jogo usa hoje, e é a que todas as telas abrem selecionada."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar a primeira
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {racas.map((r) => {
            const u = uso[r.id] ?? { paletas: 0, pecas: 0, vocabulario: 0, temperamentos: 0 };
            return (
              <button
                key={r.id}
                onClick={() => abrir(r)}
                className="caixa overflow-hidden p-0 text-left transition-colors hover:border-borda-forte"
              >
                <div className="h-1.5 w-full" style={{ background: r.cor ?? '#c4a86e' }} />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="titulo text-[17px]">
                      <span className="text-tinta-fraca">{r.codigo} ·</span> {r.nome}
                    </span>
                    <Users size={16} className="shrink-0 text-tinta-fraca opacity-50" />
                  </div>
                  {r.descricao && (
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-tinta-fraca">
                      {r.descricao}
                    </p>
                  )}
                  {r.etnias.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.etnias.slice(0, 4).map((e) => (
                        <span key={e} className="etiqueta">
                          {e}
                        </span>
                      ))}
                      {r.etnias.length > 4 && (
                        <span className="etiqueta">+{r.etnias.length - 4}</span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-borda/60 pt-3 text-[11px] text-tinta-fraca">
                    <span>{u.pecas} peça(s)</span>
                    <span>{u.paletas} paleta(s)</span>
                    <span>{u.vocabulario} nome(s)/fala(s)</span>
                    <span>{u.temperamentos} temperamento(s)</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar raça' : 'Nova raça'}
        descricao="O código interno é sequencial e vem do banco — não dá pra escolher."
        largura="md"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const r = racas.find((x) => x.id === editando.id);
                  if (r) setConfirmando(r);
                }}
              >
                <Trash2 size={15} /> Apagar
              </button>
            )}
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
            <div className="grid gap-5 sm:grid-cols-3">
              <Moldura rotulo="Código interno" ajuda="Sequencial, dado pelo banco.">
                <input
                  className="campo font-mono"
                  disabled
                  value={
                    editando.id
                      ? String(racas.find((r) => r.id === editando.id)?.codigo ?? '')
                      : 'automático'
                  }
                  readOnly
                />
              </Moldura>
              <Moldura rotulo="Nome" obrigatorio>
                <input
                  className="campo"
                  value={editando.nome}
                  placeholder="Humano"
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      nome: e.target.value,
                      chave:
                        !editando.id && !editando.chave ? paraChave(e.target.value) : editando.chave,
                    })
                  }
                />
              </Moldura>
              <Moldura rotulo="Chave" obrigatorio ajuda="É por ela que o jogo referencia a raça.">
                <input
                  className="campo font-mono"
                  value={editando.chave}
                  onChange={(e) => setEditando({ ...editando, chave: paraChave(e.target.value) })}
                />
              </Moldura>
            </div>

            <Moldura
              rotulo="Descrição"
              ajuda="Lore. Não afeta o jogo — serve para quem escreve conteúdo saber com que povo está lidando."
            >
              <textarea
                className="campo"
                value={editando.descricao}
                placeholder="Quem são, de onde vêm, como o resto do mundo os enxerga."
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              />
            </Moldura>

            <Moldura
              rotulo="Etnias"
              ajuda="Quantas quiser. Digite e aperte Enter. São textos livres de lore — não viram tabela nem regra."
            >
              <ListaTexto
                valores={editando.etnias}
                aoMudar={(etnias) => setEditando({ ...editando, etnias })}
                dica="nórdico, ibérico, oriental…"
              />
            </Moldura>

            <Moldura rotulo="Cor do card" ajuda="Só identifica a raça nos cards de filtro.">
              <SeletorCor valor={editando.cor} aoMudar={(cor) => setEditando({ ...editando, cor })} />
            </Moldura>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar raça?"
        descricao="Paletas, peças e temperamentos ligados a ela viram conteúdo de TODAS as raças. Nomes e falas dela são apagados junto."
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
                  const r = await apagar('raca', confirmando.id, CAMINHO);
                  if (r.ok) {
                    setConfirmando(null);
                    setEditando(null);
                  } else setErro(r.erro);
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
            {confirmando?.codigo} · {confirmando?.nome}
          </strong>
        </p>
      </Modal>
    </Folha>
  );
}
