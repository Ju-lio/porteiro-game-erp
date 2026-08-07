'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura } from '@/componentes/campos';
import { Upload } from '@/componentes/Upload';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvar } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { Cenario } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

// Um LUGAR, três artes: dia, tarde e noite. O expediente vira sozinho em
// cross-fade — e da noite volta DIRETO pro dia, sem madrugada no meio.
//
// Lugar sem as três artes: aponte o mesmo arquivo nos três. O relógio continua
// andando, só a luz é que não muda.

const CAMINHO = '/mundo/cenarios';

const MOMENTOS = [
  { chave: 'arte_dia_id', rotulo: 'Dia' },
  { chave: 'arte_tarde_id', rotulo: 'Tarde' },
  { chave: 'arte_noite_id', rotulo: 'Noite' },
] as const;

type Rascunho = {
  id?: string;
  chave: string;
  nome: string;
  artes: Record<string, string | null>;
  urls: Record<string, string | null>;
};

export function TelaCenarios({
  cenarios,
  caminhos,
}: {
  cenarios: Cenario[];
  caminhos: Record<string, string>;
}) {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [confirmando, setConfirmando] = useState<Cenario | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function url(assetId: string | null | undefined) {
    return assetId ? urlAsset(caminhos[assetId]) : null;
  }

  function abrir(c?: Cenario) {
    setErro(null);
    const artes: Record<string, string | null> = {};
    const urls: Record<string, string | null> = {};
    for (const m of MOMENTOS) {
      const id = c ? ((c[m.chave] as string | null) ?? null) : null;
      artes[m.chave] = id;
      urls[m.chave] = url(id);
    }
    setEditando({ id: c?.id, chave: c?.chave ?? '', nome: c?.nome ?? '', artes, urls });
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvar(
        'cenario',
        { id: editando.id, chave: editando.chave, nome: editando.nome, ...editando.artes },
        CAMINHO,
      );
      if (r.ok) setEditando(null);
      else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Cenários"
        descricao="O que se vê pela janela da cabine. Um lugar, três artes — o dia passa durante o expediente."
        acoes={
          <>
            <Contador n={cenarios.length} singular="cenário" plural="cenários" />
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Novo
            </button>
          </>
        }
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          As três artes precisam ser do <strong>mesmo enquadramento</strong> — só a luz muda. O
          jogo pré-carrega as três antes de abrir o portão, senão a virada apareceria em pedaços.
        </Aviso>
      </div>

      {cenarios.length === 0 ? (
        <Vazio
          texto="Nenhum cenário ainda. Enquanto um lugar não tiver as três luzes, aponte o mesmo arquivo nos três momentos."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar o primeiro
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {cenarios.map((c) => (
            <button
              key={c.id}
              onClick={() => abrir(c)}
              className="caixa overflow-hidden p-0 text-left transition-colors hover:border-borda-forte"
            >
              <div className="grid grid-cols-3 gap-px bg-borda">
                {MOMENTOS.map((m) => {
                  const u = url(c[m.chave] as string | null);
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
              <div className="px-4 py-3">
                <p className="titulo text-[16px]">{c.nome}</p>
                <code className="text-[11px] text-tinta-fraca">{c.chave}</code>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar cenário' : 'Novo cenário'}
        descricao="O mesmo lugar em três luzes. O ciclo é dia → tarde → noite → dia."
        largura="md"
        rodape={
          <>
            {editando?.id && (
              <button
                className="botao botao-perigo mr-auto"
                onClick={() => {
                  const c = cenarios.find((x) => x.id === editando.id);
                  if (c) setConfirmando(c);
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
                  placeholder="Portão do Castelo"
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
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar cenário?"
        descricao="As missões que o usavam caem no cenário padrão em vez de ficar com a janela preta."
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
                  const r = await apagar('cenario', confirmando.id, CAMINHO);
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
