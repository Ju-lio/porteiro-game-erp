'use client';

import { useState, useTransition } from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura, SeletorCor } from '@/componentes/campos';
import {
  EtiquetaRaca,
  FiltroRacas,
  RACA_GENERICA,
  SelecaoRaca,
  pertenceARaca,
  racaPadrao,
} from '@/componentes/FiltroRacas';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { Cor, Paleta, Raca } from '@/lib/tipos';

const CAMINHO = '/personagens/paletas';

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  descricao: string;
  raca_id: string | null;
  ordem: number;
  cores: { nome: string; hex: string }[];
};

const VAZIA: Rascunho = {
  chave: '',
  nome: '',
  descricao: '',
  raca_id: null,
  ordem: 0,
  cores: [],
};

export function TelaPaletas({ paletas, racas }: { paletas: Paleta[]; racas: Raca[] }) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Paleta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [racaFiltro, setRacaFiltro] = useState(() => racaPadrao(racas));

  // Uma paleta de pele élfica não deve aparecer no filtro de humano; uma paleta
  // sem raça (couro, metal) aparece em todos.
  const visiveis = paletas.filter((p) => pertenceARaca(p.raca_id ?? null, racaFiltro));

  function abrir(p?: Paleta) {
    setErro(null);
    setEditando(
      p
        ? {
            id: p.id,
            chave: p.chave,
            nome: p.nome,
            descricao: p.descricao ?? '',
            raca_id: p.raca_id ?? null,
            ordem: p.ordem,
            cores: (p.cores ?? []).map((c: Cor) => ({ nome: c.nome, hex: c.hex })),
          }
        : {
            ...VAZIA,
            raca_id: racaFiltro === RACA_GENERICA ? null : racaFiltro,
            ordem: paletas.length * 10,
          },
    );
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarComLigacoes(
        'paleta',
        {
          id: editando.id,
          chave: editando.chave,
          nome: editando.nome,
          descricao: editando.descricao || null,
          raca_id: editando.raca_id,
          ordem: editando.ordem,
        },
        [
          {
            tabela: 'cor',
            colunaDono: 'paleta_id',
            linhas: editando.cores.map((c, i) => ({ nome: c.nome, hex: c.hex, ordem: i * 10 })),
          },
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
        titulo="Paletas de cor"
        descricao="As cores sorteáveis de cada parte do personagem. Uma cor é sorteada POR PALETA e pintada em todas as peças que apontam pra ela."
        acoes={
          <>
            <Contador n={visiveis.length} singular="paleta" plural="paletas" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Nova
            </button>
          </>
        }
      />

      <FiltroRacas
        racas={racas}
        valor={racaFiltro}
        aoMudar={setRacaFiltro}
        contar={(id) => paletas.filter((p) => (p.raca_id ?? null) === id).length}
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          É a paleta que garante a coerência: tudo que aponta para <strong>pele</strong>{' '}
          (corpo, orelha, rosto, nariz) sai no mesmo tom, sempre. Cor nova é uma linha a mais —
          nunca código.
        </Aviso>
      </div>

      {visiveis.length === 0 ? (
        <Vazio
          texto={
            paletas.length > 0
              ? 'Nenhuma paleta nesta raça. Paletas sem raça (couro, metal) aparecem em todas elas.'
              : 'Nenhuma paleta ainda. Comece por pele, cabelo, olho e roupa — são as quatro que o personagem modular precisa.'
          }
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar a primeira
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((p) => (
            <button
              key={p.id}
              onClick={() => abrir(p)}
              className="caixa group p-5 text-left transition-colors hover:border-borda-forte"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="titulo text-[17px]">{p.nome}</span>
                <Palette size={16} className="text-tinta-fraca opacity-50" />
              </div>
              <div className="flex items-center gap-2">
                <code className="text-[11px] text-tinta-fraca">{p.chave}</code>
                <EtiquetaRaca raca={racas.find((r) => r.id === p.raca_id)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {(p.cores ?? []).map((c: Cor) => (
                  <span
                    key={c.id}
                    title={`${c.nome} — ${c.hex}`}
                    className="size-7 rounded-md border border-borda-forte shadow-sm"
                    style={{ background: c.hex }}
                  />
                ))}
                {!p.cores?.length && (
                  <span className="text-[11px] text-tinta-fraca">sem cores ainda</span>
                )}
              </div>

              <p className="mt-3 text-[11px] text-tinta-fraca">
                {p.cores?.length ?? 0} cor{(p.cores?.length ?? 0) === 1 ? '' : 'es'} sorteáveis
              </p>
            </button>
          ))}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar paleta' : 'Nova paleta'}
        descricao="Uma cor desta lista é sorteada por personagem e pintada em todas as peças ligadas a esta paleta."
        largura="md"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const p = paletas.find((x) => x.id === editando.id);
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
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Moldura rotulo="Nome" obrigatorio>
                <input
                  className="campo"
                  value={editando.nome}
                  placeholder="Pele"
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
                  placeholder="pele"
                  onChange={(e) => setEditando({ ...editando, chave: paraChave(e.target.value) })}
                />
              </Moldura>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <Moldura
                rotulo="Descrição"
                ajuda="Anote o que esta paleta pinta — é o que evita alguém ligar a peça errada nela."
              >
                <input
                  className="campo"
                  value={editando.descricao}
                  placeholder="Corpo, orelhas, rosto e nariz — sempre no mesmo tom."
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                />
              </Moldura>
              <Moldura
                rotulo="Raça"
                ajuda="Sem raça = serve a todas (couro, metal). Escolha uma quando o tom for do povo — pele élfica não sai num humano."
              >
                <SelecaoRaca
                  racas={racas}
                  valor={editando.raca_id}
                  aoMudar={(raca_id) => setEditando({ ...editando, raca_id })}
                />
              </Moldura>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="rotulo mb-0">Cores sorteáveis</span>
                <button
                  className="botao botao-fantasma px-3 py-1.5 text-[12px]"
                  onClick={() =>
                    setEditando({
                      ...editando,
                      cores: [...editando.cores, { nome: '', hex: '#cccccc' }],
                    })
                  }
                >
                  <Plus size={14} /> Cor
                </button>
              </div>

              <div className="space-y-2">
                {editando.cores.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-[190px] shrink-0">
                      <SeletorCor
                        valor={c.hex}
                        aoMudar={(hex) => {
                          const cores = [...editando.cores];
                          cores[i] = { ...cores[i], hex };
                          setEditando({ ...editando, cores });
                        }}
                      />
                    </div>
                    <input
                      className="campo"
                      placeholder="nome da cor (parda, loiro, linho…)"
                      value={c.nome}
                      onChange={(e) => {
                        const cores = [...editando.cores];
                        cores[i] = { ...cores[i], nome: e.target.value };
                        setEditando({ ...editando, cores });
                      }}
                    />
                    <button
                      className="shrink-0 rounded-md p-2 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                      onClick={() =>
                        setEditando({
                          ...editando,
                          cores: editando.cores.filter((_, j) => j !== i),
                        })
                      }
                      aria-label="Remover cor"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {editando.cores.length === 0 && (
                  <p className="rounded-md border border-dashed border-borda px-4 py-6 text-center text-[12px] text-tinta-fraca">
                    Nenhuma cor. Uma paleta vazia deixa a peça sem preenchimento no jogo.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar paleta?"
        descricao="As sub-camadas que apontavam pra ela ficam sem paleta e param de ser pintadas."
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
                  const r = await apagar('paleta', confirmando.id, CAMINHO);
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
