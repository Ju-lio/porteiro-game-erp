'use client';

import { useState, useTransition } from 'react';
import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Chance, Moldura } from '@/componentes/campos';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { ItemBolsa, PerfilGeracao, Profissao } from '@/lib/tipos';

// A DIFICULDADE DE UM NÍVEL MORA AQUI, em números de 0 a 1 — e todos são
// INDEPENDENTES entre si. É essa independência que impede o jogador de montar
// uma checklist do tipo "sem selo ⇒ também é farsante".

const CAMINHO = '/gameplay/perfis';

const CHANCES: { chave: keyof PerfilGeracao; rotulo: string; ajuda: string }[] = [
  {
    chave: 'chance_sem_selo',
    rotulo: 'Sem selo nenhum',
    ajuda: 'O passe chega sem lacre. A ausência é a pista — o campo fica visivelmente vazio.',
  },
  {
    chave: 'chance_selo_forjado',
    rotulo: 'Selo falsificado',
    ajuda: 'Dentre os que TÊM selo, quantos vêm com a cera na cor errada.',
  },
  {
    chave: 'chance_farsante',
    rotulo: 'Farsante',
    ajuda: 'Declara uma profissão e carrega a de outro. O eixo central da classe E em diante.',
  },
  {
    chave: 'chance_farsante_se_entrega',
    rotulo: 'Farsante que se entrega',
    ajuda:
      'Dentre os farsantes, quantos respondem com o ofício REAL. Sem os dois tipos, perguntar viraria um botão de veredito.',
  },
  {
    chave: 'chance_sem_profissao',
    rotulo: 'Profissão em branco',
    ajuda: '⚠️ Mantenha baixo (~10%). Passe em branco é atalho grátis que dispensa investigar.',
  },
  {
    chave: 'chance_cidade_divergente',
    rotulo: 'Cidade divergente',
    ajuda: 'A cidade do passe não bate com a resposta de “de onde você veio”.',
  },
  {
    chave: 'chance_item_suspeito',
    rotulo: 'Item suspeito na bolsa',
    ajuda: 'Enviesado pela culpa, mas nunca determinístico — senão a bolsa vira tell perfeito.',
  },
];

type Perfil = PerfilGeracao;

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  chances: Record<string, number>;
  profissoes: string[];
  itens: string[];
};

export function TelaPerfis({
  perfis,
  profissoes,
  itens,
}: {
  perfis: Perfil[];
  profissoes: Profissao[];
  itens: ItemBolsa[];
}) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Perfil | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(p?: Perfil) {
    setErro(null);
    const chances: Record<string, number> = {};
    for (const c of CHANCES) chances[c.chave] = p ? Number(p[c.chave] ?? 0) : 0;
    setEditando({
      id: p?.id,
      chave: p?.chave ?? '',
      nome: p?.nome ?? '',
      chances,
      profissoes: p?.profissoes ?? [],
      itens: p?.itens_suspeitos ?? [],
    });
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarComLigacoes(
        'perfil_geracao',
        {
          id: editando.id,
          chave: editando.chave,
          nome: editando.nome,
          ...editando.chances,
        },
        [
          {
            tabela: 'perfil_profissao',
            colunaDono: 'perfil_id',
            linhas: editando.profissoes.map((id) => ({ profissao_id: id })),
          },
          {
            tabela: 'perfil_item_suspeito',
            colunaDono: 'perfil_id',
            linhas: editando.itens.map((id) => ({ item_id: id })),
          },
        ],
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  function alternar(lista: string[], id: string): string[] {
    return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Perfis de geração"
        descricao="A dificuldade de cada nível, em probabilidades. Endurecer um trabalho é mexer num número daqui."
        acoes={
          <>
            <Contador n={perfis.length} singular="perfil" plural="perfis" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Novo
            </button>
          </>
        }
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          Ao criar um perfil novo, comece com <strong>tudo zerado</strong> e ligue só as
          armadilhas que aquele nível deve ensinar. Uma variável por vez é como o jogo ensina.
        </Aviso>
      </div>

      {perfis.length === 0 ? (
        <Vazio
          texto="Nenhum perfil ainda. O primeiro deve ser o mais simples possível: existe UMA variável no mundo — tem selo ou não tem."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar o primeiro
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 lg:grid-cols-2">
          {perfis.map((p) => (
            <button
              key={p.id}
              onClick={() => abrir(p)}
              className="caixa p-5 text-left transition-colors hover:border-borda-forte"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="titulo text-[17px]">{p.nome}</span>
                <SlidersHorizontal size={16} className="shrink-0 text-tinta-fraca opacity-50" />
              </div>
              <code className="text-[11px] text-tinta-fraca">{p.chave}</code>

              <div className="mt-4 space-y-1.5">
                {CHANCES.filter((c) => Number(p[c.chave] ?? 0) > 0).map((c) => (
                  <div key={c.chave} className="flex items-center gap-2">
                    <span className="w-[170px] shrink-0 text-[11px] text-tinta-fraca">
                      {c.rotulo}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-borda/60">
                      <span
                        className="block h-full rounded-full bg-oxido/70"
                        style={{ width: `${Number(p[c.chave]) * 100}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[11px] font-bold">
                      {Math.round(Number(p[c.chave]) * 100)}%
                    </span>
                  </div>
                ))}
                {CHANCES.every((c) => Number(p[c.chave] ?? 0) === 0) && (
                  <p className="text-[12px] text-tinta-fraca">
                    Nível limpo — nenhuma armadilha ligada.
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar perfil' : 'Novo perfil de geração'}
        descricao="Cada número é independente dos outros — é o que impede o jogador de decorar combinações."
        largura="lg"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const p = perfis.find((x) => x.id === editando.id);
                  if (p) setConfirmando(p);
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
            <div className="grid grid-cols-2 gap-5">
              <Moldura rotulo="Nome" obrigatorio>
                <input
                  className="campo"
                  value={editando.nome}
                  placeholder="Classe E — Recrutamento"
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
              <Moldura rotulo="Chave" obrigatorio>
                <input
                  className="campo font-mono"
                  value={editando.chave}
                  onChange={(e) => setEditando({ ...editando, chave: paraChave(e.target.value) })}
                />
              </Moldura>
            </div>

            <div className="caixa space-y-4 p-4">
              <h3 className="titulo text-[15px]">Armadilhas do nível</h3>
              {CHANCES.map((c) => (
                <Moldura key={c.chave} rotulo={c.rotulo} ajuda={c.ajuda}>
                  <Chance
                    valor={editando.chances[c.chave] ?? 0}
                    permiteUm
                    aoMudar={(v) =>
                      setEditando({
                        ...editando,
                        chances: { ...editando.chances, [c.chave]: v },
                      })
                    }
                  />
                </Moldura>
              ))}
            </div>

            <div className="caixa p-4">
              <h3 className="titulo text-[15px]">Profissões que aparecem</h3>
              <p className="mt-0.5 mb-3 text-[11px] text-tinta-fraca">
                É aqui que o “evento do dia” atua: restringir a um Festival da Colheita já muda
                quem aparece no portão, sem código novo. Vazio = todas.
              </p>
              <Fichas
                opcoes={profissoes.map((p) => ({ id: p.id, rotulo: p.nome }))}
                selecionados={editando.profissoes}
                aoAlternar={(id) =>
                  setEditando({ ...editando, profissoes: alternar(editando.profissoes, id) })
                }
                vazio="Nenhuma profissão cadastrada."
              />
            </div>

            <div className="caixa p-4">
              <h3 className="titulo text-[15px]">Itens suspeitos possíveis</h3>
              <p className="mt-0.5 mb-3 text-[11px] text-tinta-fraca">
                O que pode aparecer escondido na bolsa neste nível.
              </p>
              <Fichas
                opcoes={itens.map((i) => ({ id: i.id, rotulo: `${i.icone} ${i.nome}` }))}
                selecionados={editando.itens}
                aoAlternar={(id) => setEditando({ ...editando, itens: alternar(editando.itens, id) })}
                vazio="Nenhum item marcado como suspeito. Cadastre em Itens de bolsa."
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar perfil?"
        descricao="As missões que apontavam pra ele ficam sem geração."
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
                  const r = await apagar('perfil_geracao', confirmando.id, CAMINHO);
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
          <strong>{confirmando?.nome}</strong>
        </p>
      </Modal>
    </Folha>
  );
}

function Fichas({
  opcoes,
  selecionados,
  aoAlternar,
  vazio,
}: {
  opcoes: { id: string; rotulo: string }[];
  selecionados: string[];
  aoAlternar: (id: string) => void;
  vazio: string;
}) {
  if (!opcoes.length) return <p className="text-[12px] text-tinta-fraca">{vazio}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativo = selecionados.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => aoAlternar(o.id)}
            className={[
              'rounded-md border px-2.5 py-1.5 text-[12px] font-bold transition-colors',
              ativo
                ? 'border-ouro-escuro bg-ouro/28 text-tinta'
                : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
            ].join(' ')}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
