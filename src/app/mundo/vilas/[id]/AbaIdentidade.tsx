'use client';

import Link from 'next/link';
import { Map, Plus, Trash2 } from 'lucide-react';
import { Moldura, SeletorCor } from '@/componentes/campos';
import { Upload } from '@/componentes/Upload';
import { Aviso, Caixa } from '@/componentes/ui';
import { paraChave } from '@/lib/campos';
import type { AmbienteSonoro, Cenario, Clima, TipoDocumento, Vila } from '@/lib/tipos';
import type { Rascunho } from './Tela';

// ABA 1 — IDENTIDADE
// O que a vila É: nome, como ela aparece no mapa, para onde dá pra ir a partir
// dela, a cor que a representa, os papéis que o portão cobra e o clima que faz.
//
// ⚠️ A tabela de climas é uma DISTRIBUIÇÃO, não uma lista: os percentuais são
// a chance de cada clima aparecer por lá, e por isso o total deveria fechar
// 100. O aviso abaixo da tabela mostra o quanto falta ou sobra — não trava,
// porque durante a edição passar de 100 no meio do caminho é normal.

export function AbaIdentidade({
  r,
  mudar,
  outras,
  documentos,
  cenarios,
  ambientes,
  climas,
}: {
  r: Rascunho;
  mudar: (patch: Partial<Rascunho>) => void;
  outras: Vila[];
  documentos: TipoDocumento[];
  cenarios: Cenario[];
  ambientes: AmbienteSonoro[];
  climas: Clima[];
}) {
  const somaClima = r.climas.reduce((s, c) => s + c.percentual, 0);
  const disponiveis = climas.filter((c) => !r.climas.some((x) => x.clima_id === c.id));

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Moldura rotulo="Nome da vila" obrigatorio>
          <input
            className="campo"
            value={r.nome}
            placeholder="Vale das Sombras"
            onChange={(e) => mudar({ nome: e.target.value })}
          />
        </Moldura>
        <Moldura rotulo="Chave" ajuda="É por ela que o jogo referencia a vila. Mudar quebra bundles antigos? Não — bundles são retratos imutáveis.">
          <input
            className="campo font-mono"
            value={r.chave}
            onChange={(e) => mudar({ chave: paraChave(e.target.value) })}
          />
        </Moldura>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── MAPA ───────────────────────────────────────────────────────── */}
        <Caixa titulo="Mapa">
          {/* O editor do mapa é um só, e mostra TODAS as vilas de uma vez —
              posicionar uma sozinha não faria sentido. Daqui, vai-se pra ele
              já aberto (`?mapa=1`), e o que se arrasta lá salva na hora. */}
          <Link
            href="/mundo/vilas?mapa=1"
            className="botao botao-secundario mb-4 w-full text-[12px]"
          >
            <Map size={15} /> Abrir mapa do mundo
          </Link>

          <div className="mb-4">
            <Upload
              rotulo="Ícone no mapa"
              perfil="livre"
              urlAtual={r.icone_mapa_url}
              aoEnviar={(id, url) => mudar({ icone_mapa_id: id, icone_mapa_url: url })}
              aoLimpar={() => mudar({ icone_mapa_id: null, icone_mapa_url: null })}
              ajuda="O pino da vila em Vilas → Editar mapa. Sem ícone, usa um pino na cor da vila."
            />
          </div>

          <span className="rotulo">Caminhos possíveis</span>
          {outras.length === 0 ? (
            <p className="text-[12px] text-tinta-fraca">Nenhuma outra vila para ligar ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {outras.map((o) => {
                const ativo = r.ligacoes.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() =>
                      mudar({
                        ligacoes: ativo
                          ? r.ligacoes.filter((x) => x !== o.id)
                          : [...r.ligacoes, o.id],
                      })
                    }
                    className={[
                      'rounded-md border px-2.5 py-1.5 text-[12px] transition-colors',
                      ativo
                        ? 'border-ouro-escuro bg-ouro/28 font-bold text-tinta'
                        : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                    ].join(' ')}
                  >
                    {o.nome}
                  </button>
                );
              })}
            </div>
          )}
          <span className="mt-1.5 block text-[11px] text-tinta-fraca">
            O mesmo que se edita arrastando em <strong>Vilas → Editar mapa</strong>. Aqui o
            caminho já fica salvo junto do resto da aba.
          </span>
        </Caixa>

        {/* ── PORTÃO ─────────────────────────────────────────────────────── */}
        <Caixa titulo="No portão">
          <div className="space-y-4">
            <Moldura rotulo="Cor predominante" ajuda="Pinta o card, o pino do mapa e o halo dele.">
              <SeletorCor valor={r.cor} aoMudar={(cor) => mudar({ cor })} />
            </Moldura>

            <Moldura rotulo="Cenário visto pela janela">
              <select
                className="campo"
                value={r.cenario_id ?? ''}
                onChange={(e) => mudar({ cenario_id: e.target.value || null })}
              >
                <option value="">— nenhum —</option>
                {cenarios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Moldura>

            <Moldura rotulo="Ambiente sonoro">
              <select
                className="campo"
                value={r.ambiente_sonoro_id ?? ''}
                onChange={(e) => mudar({ ambiente_sonoro_id: e.target.value || null })}
              >
                <option value="">— nenhum —</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </Moldura>

            <div>
              <span className="rotulo">Documentos exigidos</span>
              {documentos.length === 0 ? (
                <p className="text-[12px] text-tinta-fraca">Nenhum documento cadastrado ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {documentos.map((d) => {
                    const ativo = r.documentos.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() =>
                          mudar({
                            documentos: ativo
                              ? r.documentos.filter((x) => x !== d.id)
                              : [...r.documentos, d.id],
                          })
                        }
                        className={[
                          'rounded-md border px-2.5 py-1.5 text-[12px] transition-colors',
                          ativo
                            ? 'border-ouro-escuro bg-ouro/28 font-bold text-tinta'
                            : 'border-borda text-tinta-fraca hover:border-borda-forte hover:text-tinta',
                        ].join(' ')}
                      >
                        {d.nome}
                      </button>
                    );
                  })}
                </div>
              )}
              <span className="mt-1.5 block text-[11px] text-tinta-fraca">
                Que papéis o guarda cobra neste portão. É aqui que a variedade por vila acontece.
              </span>
            </div>
          </div>
        </Caixa>
      </div>

      {/* ── CLIMA: distribuição, não lista ───────────────────────────────── */}
      <Caixa titulo="Climas da vila">
        <p className="mb-4 text-[12px] leading-relaxed text-tinta-fraca">
          Quantos climas quiser, cada um com o percentual de quanto ele aparece por lá. É
          distribuição: o total deveria fechar 100%.
        </p>

        {r.climas.length === 0 ? (
          <p className="rounded-md border border-dashed border-borda px-4 py-8 text-center text-[12px] text-tinta-fraca">
            {climas.length === 0
              ? 'Nenhum clima cadastrado. Crie em Mundo › Climas primeiro.'
              : 'Nenhum clima nesta vila ainda.'}
          </p>
        ) : (
          <div className="space-y-2">
            {r.climas.map((c, i) => {
              const clima = climas.find((x) => x.id === c.clima_id);
              return (
                <div key={c.clima_id} className="flex items-center gap-3">
                  <span className="w-[190px] shrink-0 truncate text-[13px]">
                    <span className="mr-1.5">{clima?.icone ?? '🌤️'}</span>
                    {clima?.nome ?? '— clima removido —'}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={c.percentual}
                    onChange={(e) => {
                      const climasNovos = [...r.climas];
                      climasNovos[i] = { ...c, percentual: Number(e.target.value) };
                      mudar({ climas: climasNovos });
                    }}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-borda accent-oxido"
                    aria-label={clima?.nome ?? 'clima'}
                  />
                  <span className="w-12 shrink-0 text-right text-[12px] font-bold">
                    {c.percentual}%
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                    onClick={() => mudar({ climas: r.climas.filter((x) => x.clima_id !== c.clima_id) })}
                    aria-label={`Remover ${clima?.nome ?? 'clima'}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {disponiveis.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {disponiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                className="botao botao-fantasma px-2.5 py-1.5 text-[12px]"
                onClick={() =>
                  mudar({ climas: [...r.climas, { clima_id: c.id, percentual: 0 }] })
                }
              >
                <Plus size={13} /> {c.icone} {c.nome}
              </button>
            ))}
          </div>
        )}

        {r.climas.length > 0 && Math.round(somaClima) !== 100 && (
          <div className="mt-4">
            <Aviso>
              Os climas somam <strong>{Math.round(somaClima)}%</strong>.{' '}
              {somaClima < 100
                ? `Faltam ${Math.round(100 - somaClima)}% pra fechar.`
                : `Passou ${Math.round(somaClima - 100)}%.`}{' '}
              Não trava o salvamento — mas o jogo normaliza a distribuição, então o que vale de
              verdade é a proporção entre eles.
            </Aviso>
          </div>
        )}
      </Caixa>

      <Moldura rotulo="Descrição">
        <textarea
          className="campo"
          value={r.descricao}
          placeholder="O que essa vila é, quem vive nela, por que alguém passaria por aqui."
          onChange={(e) => mudar({ descricao: e.target.value })}
        />
      </Moldura>
    </div>
  );
}
