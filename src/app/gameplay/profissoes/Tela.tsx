'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Chance, Moldura } from '@/componentes/campos';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { ItemBolsa, Marca, Profissao } from '@/lib/tipos';

// ⚠️ Este é o arquivo de BALANCEAMENTO do jogo. Tudo aqui é probabilidade,
// nunca regra dura: "80% dos fazendeiros têm lama" quer dizer que 20% NÃO têm,
// e é essa margem que impede o jogador de decorar uma tabela.
//
// Nenhum detalhe sozinho identifica a profissão. O jogador não procura UM item —
// ele procura o CONJUNTO bater.

const CAMINHO = '/gameplay/profissoes';

type Tipico = { id: string; chance: number };

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  itens: Tipico[];
  marcas: Tipico[];
  falasTrabalho: string[];
  falasMotivo: string[];
};

export function TelaProfissoes({
  profissoes,
  itens,
  marcas,
}: {
  profissoes: Profissao[];
  itens: ItemBolsa[];
  marcas: Marca[];
}) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Profissao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrir(p?: Profissao) {
    setErro(null);
    setEditando(
      p
        ? {
            id: p.id,
            chave: p.chave,
            nome: p.nome,
            itens: (p.itens ?? []).map((i) => ({ id: i.item_id, chance: Number(i.chance) })),
            marcas: (p.marcas ?? []).map((m) => ({ id: m.marca_id, chance: Number(m.chance) })),
            falasTrabalho: (p.falas ?? []).filter((f) => f.tipo === 'trabalho').map((f) => f.texto),
            falasMotivo: (p.falas ?? []).filter((f) => f.tipo === 'motivo').map((f) => f.texto),
          }
        : {
            chave: '',
            nome: '',
            itens: [],
            marcas: [],
            falasTrabalho: [''],
            falasMotivo: [''],
          },
    );
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const falas = [
        ...editando.falasTrabalho
          .filter((t) => t.trim())
          .map((texto, i) => ({ tipo: 'trabalho', texto: texto.trim(), ordem: i })),
        ...editando.falasMotivo
          .filter((t) => t.trim())
          .map((texto, i) => ({ tipo: 'motivo', texto: texto.trim(), ordem: i })),
      ];

      const r = await salvarComLigacoes(
        'profissao',
        { id: editando.id, chave: editando.chave, nome: editando.nome },
        [
          {
            tabela: 'profissao_item',
            colunaDono: 'profissao_id',
            linhas: editando.itens.map((i) => ({ item_id: i.id, chance: i.chance })),
          },
          {
            tabela: 'profissao_marca',
            colunaDono: 'profissao_id',
            linhas: editando.marcas.map((m) => ({ marca_id: m.id, chance: m.chance })),
          },
          { tabela: 'profissao_fala', colunaDono: 'profissao_id', linhas: falas },
        ],
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Profissões"
        descricao="O eixo central do jogo. Cada ofício tem ferramentas e marcas típicas — em probabilidade, nunca em regra."
        acoes={
          <>
            <Contador n={profissoes.length} singular="ofício" plural="ofícios" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Nova
            </button>
          </>
        }
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          A chance nunca pode ser 100%. Certeza vira checklist, e checklist mata o jogo — o
          jogador precisa procurar o <strong>conjunto</strong> bater, não um item.
        </Aviso>
      </div>

      {profissoes.length === 0 ? (
        <Vazio
          texto="Nenhuma profissão ainda. Cadastre os itens de ofício e as marcas antes — é deles que a profissão é feita."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar a primeira
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {profissoes.map((p) => (
            <button
              key={p.id}
              onClick={() => abrir(p)}
              className="caixa p-5 text-left transition-colors hover:border-borda-forte"
            >
              <span className="titulo text-[17px]">{p.nome}</span>
              <code className="ml-2 text-[11px] text-tinta-fraca">{p.chave}</code>

              <dl className="mt-3 space-y-1 text-[12px] text-tinta-fraca">
                <div className="flex justify-between">
                  <dt>Ferramentas</dt>
                  <dd className="font-bold text-tinta">{p.itens?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Marcas no corpo</dt>
                  <dd className="font-bold text-tinta">{p.marcas?.length ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Falas</dt>
                  <dd className="font-bold text-tinta">{p.falas?.length ?? 0}</dd>
                </div>
              </dl>
            </button>
          ))}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar profissão' : 'Nova profissão'}
        descricao="Quem diz ser ferreiro e carrega rede de pesca está mentindo — mas essa conclusão é do JOGADOR, nunca do jogo."
        largura="lg"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const p = profissoes.find((x) => x.id === editando.id);
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
              <Moldura rotulo="Nome" ajuda="É assim que aparece escrito no passe." obrigatorio>
                <input
                  className="campo"
                  value={editando.nome}
                  placeholder="Ferreiro"
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

            <Tipicos
              titulo="Ferramentas na bolsa"
              ajuda="É o que revela a profissão REAL de quem chega."
              opcoes={itens.map((i) => ({ id: i.id, rotulo: `${i.icone} ${i.nome}` }))}
              valores={editando.itens}
              aoMudar={(itens) => setEditando({ ...editando, itens })}
              vazio="Nenhum item de ofício cadastrado. Crie em Itens de bolsa com a categoria “de ofício”."
            />

            <Tipicos
              titulo="Marcas no corpo"
              ajuda="O que o trabalho deixou nele — visível desde que chega, sem clicar em nada."
              opcoes={marcas.map((m) => ({ id: m.id, rotulo: m.nome }))}
              valores={editando.marcas}
              aoMudar={(marcas) => setEditando({ ...editando, marcas })}
              vazio="Nenhuma marca cadastrada ainda."
            />

            <Falas
              titulo="Respostas a “do que você trabalha?”"
              valores={editando.falasTrabalho}
              aoMudar={(falasTrabalho) => setEditando({ ...editando, falasTrabalho })}
              dica="Trabalho na forja desde menino, guarda."
            />

            <Falas
              titulo="Respostas a “o que veio fazer aqui?”"
              valores={editando.falasMotivo}
              aoMudar={(falasMotivo) => setEditando({ ...editando, falasMotivo })}
              dica="Vim entregar ferramenta encomendada."
            />
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar profissão?"
        descricao="Os perfis de geração que a usavam param de sortear este ofício."
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
                  const r = await apagar('profissao', confirmando.id, CAMINHO);
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

/** Lista de "coisa + chance" — o padrão que se repete em itens e marcas. */
function Tipicos({
  titulo,
  ajuda,
  opcoes,
  valores,
  aoMudar,
  vazio,
}: {
  titulo: string;
  ajuda: string;
  opcoes: { id: string; rotulo: string }[];
  valores: { id: string; chance: number }[];
  aoMudar: (v: { id: string; chance: number }[]) => void;
  vazio: string;
}) {
  const disponiveis = opcoes.filter((o) => !valores.some((v) => v.id === o.id));

  return (
    <div className="caixa p-4">
      <h3 className="titulo text-[15px]">{titulo}</h3>
      <p className="mt-0.5 mb-3 text-[11px] text-tinta-fraca">{ajuda}</p>

      {opcoes.length === 0 ? (
        <p className="text-[12px] text-tinta-fraca">{vazio}</p>
      ) : (
        <>
          <div className="space-y-2">
            {valores.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3">
                <span className="w-[190px] shrink-0 truncate text-[13px]">
                  {opcoes.find((o) => o.id === v.id)?.rotulo ?? '—'}
                </span>
                <div className="flex-1">
                  <Chance
                    valor={v.chance}
                    aoMudar={(chance) => {
                      const novos = [...valores];
                      novos[i] = { ...novos[i], chance };
                      aoMudar(novos);
                    }}
                  />
                </div>
                <button
                  className="shrink-0 rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                  onClick={() => aoMudar(valores.filter((x) => x.id !== v.id))}
                  aria-label="Remover"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {disponiveis.length > 0 && (
            <select
              className="campo mt-3"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                aoMudar([...valores, { id: e.target.value, chance: 0.5 }]);
              }}
            >
              <option value="">+ adicionar…</option>
              {disponiveis.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          )}
        </>
      )}
    </div>
  );
}

function Falas({
  titulo,
  valores,
  aoMudar,
  dica,
}: {
  titulo: string;
  valores: string[];
  aoMudar: (v: string[]) => void;
  dica: string;
}) {
  return (
    <div className="caixa p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="titulo text-[15px]">{titulo}</h3>
        <button
          className="botao botao-fantasma px-3 py-1.5 text-[12px]"
          onClick={() => aoMudar([...valores, ''])}
        >
          <Plus size={14} /> Fala
        </button>
      </div>

      <div className="space-y-2">
        {valores.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="campo"
              value={f}
              placeholder={dica}
              onChange={(e) => {
                const novos = [...valores];
                novos[i] = e.target.value;
                aoMudar(novos);
              }}
            />
            <button
              className="shrink-0 rounded-md p-2 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
              onClick={() => aoMudar(valores.filter((_, j) => j !== i))}
              aria-label="Remover fala"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {valores.length === 0 && (
          <p className="text-[12px] text-tinta-fraca">Sem falas — o visitante fica mudo.</p>
        )}
      </div>
    </div>
  );
}
