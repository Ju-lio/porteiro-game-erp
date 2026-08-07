'use client';

import { useState, useTransition } from 'react';
import { Music, Plus, Speaker, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Chance, Moldura } from '@/componentes/campos';
import { Upload } from '@/componentes/Upload';
import { Aviso, Cabecalho, Folha, Vazio } from '@/componentes/ui';
import { apagar, salvar } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { AmbienteSonoro, Som } from '@/lib/tipos';
import { urlAsset } from '@/lib/url';

// Dois cadastros na mesma tela porque um só faz sentido com o outro:
//  - SONS: o catálogo de arquivos, com o volume de mixagem de cada um.
//  - AMBIENTES: o conjunto sonoro de um LOCAL (tema + ruído de fundo + portão).
// Mapa novo = um ambiente novo apontando sons existentes. Nenhum código muda.

const CAMINHO = '/mundo/sons';

type RascunhoSom = {
  id?: string;
  chave: string;
  nome: string;
  asset_id: string | null;
  url: string | null;
  volume: number;
  loop: boolean;
  categoria: 'musica' | 'efeito';
};

type RascunhoAmbiente = {
  id?: string;
  chave: string;
  nome: string;
  tema_id: string | null;
  ambiente_id: string | null;
  portao_id: string | null;
};

export function TelaSons({
  sons,
  ambientes,
  caminhos,
}: {
  sons: Som[];
  ambientes: AmbienteSonoro[];
  caminhos: Record<string, string>;
}) {
  const [som, setSom] = useState<RascunhoSom | null>(null);
  const [ambiente, setAmbiente] = useState<RascunhoAmbiente | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function abrirSom(s?: Som) {
    setErro(null);
    setSom({
      id: s?.id,
      chave: s?.chave ?? '',
      nome: s?.nome ?? '',
      asset_id: s?.asset_id ?? null,
      url: s?.asset_id ? urlAsset(caminhos[s.asset_id]) : null,
      volume: s ? Number(s.volume) : 0.5,
      loop: s?.loop ?? false,
      categoria: s?.categoria ?? 'efeito',
    });
  }

  function salvarSom() {
    if (!som) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvar(
        'som',
        {
          id: som.id,
          chave: som.chave,
          nome: som.nome,
          asset_id: som.asset_id,
          volume: som.volume,
          loop: som.loop,
          categoria: som.categoria,
        },
        CAMINHO,
      );
      if (r.ok) setSom(null);
      else setErro(r.erro);
    });
  }

  function salvarAmbiente() {
    if (!ambiente) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvar('ambiente_sonoro', { ...ambiente }, CAMINHO);
      if (r.ok) setAmbiente(null);
      else setErro(r.erro);
    });
  }

  const opcoesSom = sons.map((s) => ({ id: s.id, rotulo: s.nome }));

  return (
    <Folha>
      <Cabecalho
        titulo="Sons"
        descricao="O catálogo de arquivos e o conjunto sonoro de cada local."
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          Volume aqui é <strong>mixagem</strong> — equilibra arquivos gravados em níveis
          diferentes. Ele é multiplicado pelo volume que o jogador escolhe nas configurações do
          jogo.
        </Aviso>
      </div>

      {/* ── catálogo ─────────────────────────────────────────────────────── */}
      <section className="border-b border-borda p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="titulo flex items-center gap-2 text-[19px]">
            <Music size={18} /> Catálogo de sons
          </h2>
          <button className="botao botao-primario" onClick={() => abrirSom()}>
            <Plus size={16} /> Novo som
          </button>
        </div>

        {sons.length === 0 ? (
          <Vazio texto="Nenhum som ainda. Comece pelo tema do menu e pelo ruído de fundo da vila." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Chave</th>
                  <th>Categoria</th>
                  <th>Volume</th>
                  <th>Loop</th>
                  <th>Arquivo</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {sons.map((s) => (
                  <tr key={s.id}>
                    <td className="font-bold">{s.nome}</td>
                    <td>
                      <code className="rounded bg-borda/35 px-1.5 py-0.5 text-[12px]">
                        {s.chave}
                      </code>
                    </td>
                    <td>
                      <span className="etiqueta">
                        {s.categoria === 'musica' ? 'música / ambiente' : 'efeito'}
                      </span>
                    </td>
                    <td>{Math.round(Number(s.volume) * 100)}%</td>
                    <td>{s.loop ? 'sim' : '—'}</td>
                    <td>
                      {s.asset_id ? (
                        <audio
                          controls
                          preload="none"
                          src={urlAsset(caminhos[s.asset_id]) ?? undefined}
                          className="h-8 max-w-[190px]"
                        />
                      ) : (
                        <span className="text-tinta-fraca/60">sem arquivo</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-borda/50 hover:text-tinta"
                        onClick={() => abrirSom(s)}
                      >
                        editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── ambientes ────────────────────────────────────────────────────── */}
      <section className="p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="titulo flex items-center gap-2 text-[19px]">
            <Speaker size={18} /> Ambientes sonoros
          </h2>
          <button
            className="botao botao-primario"
            onClick={() =>
              setAmbiente({
                chave: '',
                nome: '',
                tema_id: null,
                ambiente_id: null,
                portao_id: null,
              })
            }
          >
            <Plus size={16} /> Novo ambiente
          </button>
        </div>

        {ambientes.length === 0 ? (
          <Vazio texto="Nenhum ambiente ainda. Um ambiente é o pacote sonoro de um LOCAL — trocá-lo é o que dá identidade a um mapa novo." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ambientes.map((a) => (
              <button
                key={a.id}
                onClick={() =>
                  setAmbiente({
                    id: a.id,
                    chave: a.chave,
                    nome: a.nome,
                    tema_id: a.tema_id,
                    ambiente_id: a.ambiente_id,
                    portao_id: a.portao_id,
                  })
                }
                className="caixa p-5 text-left transition-colors hover:border-borda-forte"
              >
                <span className="titulo text-[17px]">{a.nome}</span>
                <dl className="mt-3 space-y-1 text-[12px]">
                  {(
                    [
                      ['Tema', a.tema_id],
                      ['Ruído de fundo', a.ambiente_id],
                      ['Portão', a.portao_id],
                    ] as const
                  ).map(([rotulo, id]) => (
                    <div key={rotulo} className="flex justify-between gap-3">
                      <dt className="text-tinta-fraca">{rotulo}</dt>
                      <dd className="truncate font-bold">
                        {sons.find((s) => s.id === id)?.nome ?? '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── modal de som ─────────────────────────────────────────────────── */}
      <Modal
        aberto={som !== null}
        aoFechar={() => setSom(null)}
        titulo={som?.id ? 'Editar som' : 'Novo som'}
        largura="md"
        rodape={
          <>
            {som?.id && (
              <button
                className="botao botao-perigo mr-auto"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await apagar('som', som.id as string, CAMINHO);
                    if (r.ok) setSom(null);
                    else setErro(r.erro);
                  })
                }
              >
                <Trash2 size={15} /> Apagar
              </button>
            )}
            <button className="botao botao-secundario" onClick={() => setSom(null)}>
              Cancelar
            </button>
            <button className="botao botao-primario" onClick={salvarSom} disabled={pendente}>
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

        {som && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Moldura rotulo="Nome" obrigatorio>
                <input
                  className="campo"
                  value={som.nome}
                  placeholder="Tema da vila"
                  onChange={(e) =>
                    setSom({
                      ...som,
                      nome: e.target.value,
                      chave: !som.id && !som.chave ? paraChave(e.target.value) : som.chave,
                    })
                  }
                />
              </Moldura>
              <Moldura rotulo="Chave" obrigatorio>
                <input
                  className="campo font-mono"
                  value={som.chave}
                  onChange={(e) => setSom({ ...som, chave: paraChave(e.target.value) })}
                />
              </Moldura>
            </div>

            <Upload
              rotulo="Arquivo de áudio"
              perfil="som"
              urlAtual={som.url}
              aoEnviar={(assetId, url) => setSom({ ...som, asset_id: assetId, url })}
              aoLimpar={() => setSom({ ...som, asset_id: null, url: null })}
              ajuda="MP3 ou WAV."
            />

            {som.url && <audio controls src={som.url} className="w-full" />}

            <div className="grid grid-cols-2 gap-5">
              <Moldura
                rotulo="Categoria"
                ajuda="Decide qual controle de volume do jogador rege este som."
              >
                <select
                  className="campo"
                  value={som.categoria}
                  onChange={(e) =>
                    setSom({ ...som, categoria: e.target.value as 'musica' | 'efeito' })
                  }
                >
                  <option value="musica">Música e ambiente</option>
                  <option value="efeito">Efeito</option>
                </select>
              </Moldura>

              <Moldura rotulo="Toca em loop?">
                <select
                  className="campo"
                  value={som.loop ? '1' : '0'}
                  onChange={(e) => setSom({ ...som, loop: e.target.value === '1' })}
                >
                  <option value="0">Não — toca uma vez</option>
                  <option value="1">Sim — em loop</option>
                </select>
              </Moldura>
            </div>

            <Moldura rotulo="Volume de mixagem">
              <Chance valor={som.volume} permiteUm aoMudar={(volume) => setSom({ ...som, volume })} />
            </Moldura>
          </div>
        )}
      </Modal>

      {/* ── modal de ambiente ────────────────────────────────────────────── */}
      <Modal
        aberto={ambiente !== null}
        aoFechar={() => setAmbiente(null)}
        titulo={ambiente?.id ? 'Editar ambiente sonoro' : 'Novo ambiente sonoro'}
        descricao="O pacote sonoro de um local. É o que cada mapa novo troca."
        largura="md"
        rodape={
          <>
            {ambiente?.id && (
              <button
                className="botao botao-perigo mr-auto"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await apagar('ambiente_sonoro', ambiente.id as string, CAMINHO);
                    if (r.ok) setAmbiente(null);
                    else setErro(r.erro);
                  })
                }
              >
                <Trash2 size={15} /> Apagar
              </button>
            )}
            <button className="botao botao-secundario" onClick={() => setAmbiente(null)}>
              Cancelar
            </button>
            <button className="botao botao-primario" onClick={salvarAmbiente} disabled={pendente}>
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

        {ambiente && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <Moldura rotulo="Nome" obrigatorio>
                <input
                  className="campo"
                  value={ambiente.nome}
                  placeholder="Vila"
                  onChange={(e) =>
                    setAmbiente({
                      ...ambiente,
                      nome: e.target.value,
                      chave:
                        !ambiente.id && !ambiente.chave ? paraChave(e.target.value) : ambiente.chave,
                    })
                  }
                />
              </Moldura>
              <Moldura rotulo="Chave" obrigatorio>
                <input
                  className="campo font-mono"
                  value={ambiente.chave}
                  onChange={(e) => setAmbiente({ ...ambiente, chave: paraChave(e.target.value) })}
                />
              </Moldura>
            </div>

            {(
              [
                ['tema_id', 'Tema (música do local)'],
                ['ambiente_id', 'Ruído de fundo'],
                ['portao_id', 'Som do portão'],
              ] as const
            ).map(([campo, rotulo]) => (
              <Moldura key={campo} rotulo={rotulo}>
                <select
                  className="campo"
                  value={ambiente[campo] ?? ''}
                  onChange={(e) => setAmbiente({ ...ambiente, [campo]: e.target.value || null })}
                >
                  <option value="">— nenhum —</option>
                  {opcoesSom.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.rotulo}
                    </option>
                  ))}
                </select>
              </Moldura>
            ))}
          </div>
        )}
      </Modal>
    </Folha>
  );
}
