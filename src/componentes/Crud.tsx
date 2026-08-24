'use client';

import { useState, useTransition } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { apagar, salvar } from '@/lib/acoes';
import type { DefCampo, Registro } from '@/lib/campos';
import { registroVazio } from '@/lib/campos';
import type { Raca } from '@/lib/tipos';
import { CampoAuto } from './campos';
import {
  EtiquetaRaca,
  FiltroRacas,
  RACA_GENERICA,
  SelecaoRaca,
  pertenceARaca,
  racaPadrao,
} from './FiltroRacas';
import { Modal } from './Modal';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from './ui';

/**
 * CRUD genérico: uma tela inteira a partir de um descritor de campos.
 * As telas ricas (peças, camadas, publicação) têm componente próprio; tudo o
 * mais cai aqui, o que mantém a consistência visual de graça.
 *
 * Passando `racas`, a tela ganha os cards de filtro por raça no topo, a coluna
 * "Raça" na tabela e o seletor no formulário — é como Nomes e falas e
 * Temperamentos herdam o comportamento da aba Personagens sem código próprio.
 */
export function Crud({
  titulo,
  descricao,
  tabela,
  caminho,
  campos,
  linhas,
  singular,
  plural,
  nota,
  racas,
}: {
  titulo: string;
  descricao?: string;
  tabela: string;
  caminho: string;
  campos: DefCampo[];
  linhas: Registro[];
  singular: string;
  plural: string;
  /** Aviso fixo no topo — use pra explicar a regra de design da tela. */
  nota?: string;
  /** Presente = a tela filtra por raça (coluna `raca_id` na tabela do banco). */
  racas?: Raca[];
}) {
  const [editando, setEditando] = useState<Registro | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<Registro | null>(null);
  const [pendente, iniciar] = useTransition();
  const [racaFiltro, setRacaFiltro] = useState(() => (racas ? racaPadrao(racas) : RACA_GENERICA));

  const colunas = campos.filter((c) => c.naTabela);

  const visiveis = racas
    ? linhas.filter((l) => pertenceARaca((l.raca_id as string | null) ?? null, racaFiltro))
    : linhas;

  /** O registro novo já nasce na raça que está filtrada — menos um clique. */
  function novo(): Registro {
    const base = registroVazio(campos);
    if (racas) base.raca_id = racaFiltro === RACA_GENERICA ? null : racaFiltro;
    return base;
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const limpo: Registro = { ...editando };
      // Campo vazio de select vira null, não string vazia.
      for (const c of campos) {
        if (c.tipo === 'selecao' && limpo[c.chave] === '') limpo[c.chave] = null;
      }
      const r = await salvar(tabela, limpo, caminho);
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  function remover(linha: Registro) {
    setErro(null);
    iniciar(async () => {
      const r = await apagar(tabela, linha.id as string, caminho);
      if (r.ok) setConfirmando(null);
      else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo={titulo}
        descricao={descricao}
        acoes={
          <>
            <Contador n={visiveis.length} singular={singular} plural={plural} />
            <button className="botao botao-primario" onClick={() => setEditando(novo())}>
              <Plus size={16} /> Novo
            </button>
          </>
        }
      />

      {racas && (
        <FiltroRacas
          racas={racas}
          valor={racaFiltro}
          aoMudar={setRacaFiltro}
          contar={(id) =>
            linhas.filter((l) => ((l.raca_id as string | null) ?? null) === id).length
          }
        />
      )}

      {nota && (
        <div className="border-b border-borda px-8 py-4">
          <Aviso>{nota}</Aviso>
        </div>
      )}

      {visiveis.length === 0 ? (
        <Vazio
          texto={
            racas && linhas.length > 0
              ? `Nenhum registro de ${plural} nesta raça. Registros sem raça aparecem em todas elas.`
              : `Nenhum registro de ${plural} ainda. O jogo funciona com a lista vazia, mas o conteúdo é o que dá vida a ele.`
          }
          acao={
            <button className="botao botao-primario" onClick={() => setEditando(novo())}>
              <Plus size={16} /> Criar o primeiro
            </button>
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                {colunas.map((c) => (
                  <th key={c.chave}>{c.rotulo}</th>
                ))}
                {racas && <th>Raça</th>}
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((linha) => (
                <tr key={String(linha.id)}>
                  {colunas.map((c) => (
                    <td key={c.chave}>
                      <Celula def={c} valor={linha[c.chave]} />
                    </td>
                  ))}
                  {racas && (
                    <td>
                      <EtiquetaRaca raca={racas.find((r) => r.id === linha.raca_id)} />
                    </td>
                  )}
                  <td>
                    <div className="flex justify-end gap-1">
                      <button
                        className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-borda/50 hover:text-tinta"
                        onClick={() => setEditando({ ...linha })}
                        aria-label="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                        onClick={() => setConfirmando(linha)}
                        aria-label="Apagar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── formulário ──────────────────────────────────────────────────── */}
      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? `Editar ${singular}` : `Novo ${singular}`}
        largura="md"
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
          <div className="grid grid-cols-2 gap-x-5 gap-y-5">
            {campos.map((c) => (
              <div key={c.chave} className={c.largo ? 'col-span-2' : 'col-span-2 sm:col-span-1'}>
                <CampoAuto
                  def={c}
                  valor={editando[c.chave]}
                  registro={editando}
                  aoMudarRegistro={setEditando}
                  aoMudar={(v) => setEditando({ ...editando, [c.chave]: v })}
                />
              </div>
            ))}
            {racas && (
              <div className="col-span-2 sm:col-span-1">
                <label className="block">
                  <span className="rotulo">Raça</span>
                  <SelecaoRaca
                    racas={racas}
                    valor={(editando.raca_id as string | null) ?? null}
                    aoMudar={(raca_id) => setEditando({ ...editando, raca_id })}
                  />
                  <span className="mt-1.5 block text-[11px] leading-relaxed text-tinta-fraca">
                    Sem raça = aparece em todas elas. Escolha uma quando o registro só fizer
                    sentido naquele povo.
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── confirmação de remoção ──────────────────────────────────────── */}
      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo={`Apagar ${singular}?`}
        descricao="Some do próximo bundle publicado. Versões já publicadas continuam intactas."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setConfirmando(null)}>
              Cancelar
            </button>
            <button
              className="botao botao-perigo"
              onClick={() => confirmando && remover(confirmando)}
              disabled={pendente}
            >
              {pendente ? 'Apagando…' : 'Apagar'}
            </button>
          </>
        }
      >
        {erro && <Aviso tom="erro">{erro}</Aviso>}
        <p className="text-sm text-tinta">
          <strong>{String(confirmando?.nome ?? confirmando?.chave ?? '')}</strong>
        </p>
      </Modal>
    </Folha>
  );
}

function Celula({ def, valor }: { def: DefCampo; valor: unknown }) {
  if (valor === null || valor === undefined || valor === '')
    return <span className="text-tinta-fraca/60">—</span>;

  switch (def.tipo) {
    case 'chave':
      return <code className="rounded bg-borda/35 px-1.5 py-0.5 text-[12px]">{String(valor)}</code>;
    case 'cor':
      return (
        <span className="flex items-center gap-2">
          <span
            className="size-4 rounded border border-borda-forte"
            style={{ background: String(valor) }}
          />
          <code className="text-[12px]">{String(valor)}</code>
        </span>
      );
    case 'booleano':
      return (
        <span className={`etiqueta ${valor ? '' : 'opacity-50'}`}>{valor ? 'sim' : 'não'}</span>
      );
    case 'chance':
      return <span>{Math.round(Number(valor) * 100)}%</span>;
    case 'porcentagem':
      return <span>{Number(valor)}%</span>;
    case 'lista_texto': {
      const lista = valor as string[];
      if (!lista.length) return <span className="text-tinta-fraca/60">—</span>;
      return (
        <span className="flex flex-wrap gap-1">
          {lista.slice(0, 3).map((v) => (
            <span key={v} className="etiqueta">
              {v}
            </span>
          ))}
          {lista.length > 3 && <span className="etiqueta">+{lista.length - 3}</span>}
        </span>
      );
    }
    case 'selecao': {
      const op = def.opcoes?.find((o) => o.valor === String(valor));
      return <span>{op?.rotulo ?? String(valor)}</span>;
    }
    case 'icone':
      return <span className="text-lg">{String(valor)}</span>;
    case 'texto_longo': {
      const t = String(valor);
      return <span className="text-tinta-fraca">{t.length > 70 ? t.slice(0, 70) + '…' : t}</span>;
    }
    default:
      return <span>{String(valor)}</span>;
  }
}
