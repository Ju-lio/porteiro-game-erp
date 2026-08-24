'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura, SeletorCor } from '@/componentes/campos';
import { GraficoDivergente } from '@/componentes/graficos';
import { Aviso, Caixa } from '@/componentes/ui';
import { salvar } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { Raca, Temperamento } from '@/lib/tipos';
import type { Rascunho } from './Tela';

// ABA 6 — TEMPERAMENTO POPULAR EM RELAÇÃO A OUTRAS RAÇAS
//
// A linha é: RAÇA · TEMPERAMENTO · PERCENTUAL. "Nesta vila, os élficos são
// vistos com 60% de desconfiança."
//
// O `sinal` do temperamento decide o lado do gráfico (felicidade sobe,
// hostilidade desce) — por isso o percentual guardado é sempre 0..100 e quem
// aplica o sinal é a leitura, não o dado. Assim, trocar um temperamento de
// lado no cadastro reinterpreta todas as vilas de uma vez, sem migração.
//
// O botão "+" cadastra um temperamento novo sem sair daqui: quem está
// escrevendo a vila raramente quer parar pra ir em outra tela.

export function AbaTemperamento({
  r,
  mudar,
  racas,
  temperamentos,
  vilaId,
}: {
  r: Rascunho;
  mudar: (patch: Partial<Rascunho>) => void;
  racas: Raca[];
  temperamentos: Temperamento[];
  vilaId: string;
}) {
  const router = useRouter();
  const [novo, setNovo] = useState<{ nome: string; sinal: string; cor: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const [racaNova, setRacaNova] = useState('');
  const [tempNovo, setTempNovo] = useState('');

  function adicionar() {
    if (!racaNova || !tempNovo) return;
    const jaTem = r.temperamentos.some(
      (t) => t.raca_id === racaNova && t.temperamento_id === tempNovo,
    );
    if (jaTem) return;
    mudar({
      temperamentos: [
        ...r.temperamentos,
        { raca_id: racaNova, temperamento_id: tempNovo, percentual: 50 },
      ],
    });
    setTempNovo('');
  }

  function criarTemperamento() {
    if (!novo?.nome) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await salvar(
        'temperamento',
        {
          chave: paraChave(novo.nome),
          nome: novo.nome,
          sinal: novo.sinal,
          cor: novo.cor,
          ordem: temperamentos.length * 10,
        },
        `/mundo/vilas/${vilaId}`,
      );
      if (resultado.ok) {
        setNovo(null);
        // Recarrega a página pra lista de temperamentos já vir com o novo.
        router.refresh();
      } else setErro(resultado.erro);
    });
  }

  return (
    <div className="space-y-6">
      <Caixa titulo="Como esta vila enxerga cada raça">
        <p className="mb-4 text-[12px] leading-relaxed text-tinta-fraca">
          Uma linha por combinação de raça e temperamento. A mesma raça pode ter vários
          sentimentos ao mesmo tempo — desconfiança alta e admiração baixa convivem bem.
        </p>

        {racas.length === 0 || temperamentos.length === 0 ? (
          <Aviso>
            {racas.length === 0
              ? 'Nenhuma raça cadastrada — crie em Personagens › Raças.'
              : 'Nenhum temperamento cadastrado ainda. Use o botão abaixo pra criar o primeiro sem sair daqui.'}
          </Aviso>
        ) : null}

        {/* ── linha de adicionar ─────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="w-[200px]">
            <Moldura rotulo="Raça">
              <select
                className="campo"
                value={racaNova}
                onChange={(e) => setRacaNova(e.target.value)}
              >
                <option value="">— escolha —</option>
                {racas.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.codigo} · {x.nome}
                  </option>
                ))}
              </select>
            </Moldura>
          </div>
          <div className="w-[220px]">
            <Moldura rotulo="Temperamento">
              <select
                className="campo"
                value={tempNovo}
                onChange={(e) => setTempNovo(e.target.value)}
              >
                <option value="">— escolha —</option>
                {temperamentos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.sinal > 0 ? '↑' : '↓'} {t.nome}
                  </option>
                ))}
              </select>
            </Moldura>
          </div>
          <button
            type="button"
            className="botao botao-fantasma mb-0.5 px-3"
            title="Cadastrar um temperamento novo sem sair desta tela"
            onClick={() => setNovo({ nome: '', sinal: '-1', cor: '#b3401a' })}
          >
            <Plus size={15} />
          </button>
          <button
            type="button"
            className="botao botao-secundario mb-0.5"
            onClick={adicionar}
            disabled={!racaNova || !tempNovo}
          >
            Adicionar linha
          </button>
        </div>

        {/* ── a tabela ───────────────────────────────────────────────────── */}
        {r.temperamentos.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Raça</th>
                  <th>Temperamento</th>
                  <th>Percentual</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {r.temperamentos.map((t, i) => {
                  const raca = racas.find((x) => x.id === t.raca_id);
                  const temp = temperamentos.find((x) => x.id === t.temperamento_id);
                  return (
                    <tr key={`${t.raca_id}-${t.temperamento_id}`}>
                      <td>{raca ? `${raca.codigo} · ${raca.nome}` : '— raça removida —'}</td>
                      <td>
                        <span className="flex items-center gap-1.5">
                          <span className="text-tinta-fraca">
                            {(temp?.sinal ?? -1) > 0 ? '↑' : '↓'}
                          </span>
                          {temp?.nome ?? '— removido —'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={t.percentual}
                            onChange={(e) => {
                              const temperamentosNovos = [...r.temperamentos];
                              temperamentosNovos[i] = { ...t, percentual: Number(e.target.value) };
                              mudar({ temperamentos: temperamentosNovos });
                            }}
                            className="h-1.5 w-40 cursor-pointer appearance-none rounded-full bg-borda accent-oxido"
                            aria-label={`${raca?.nome} · ${temp?.nome}`}
                          />
                          <span className="w-10 text-right text-[12px] font-bold">
                            {t.percentual}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                            onClick={() =>
                              mudar({
                                temperamentos: r.temperamentos.filter(
                                  (x) =>
                                    !(
                                      x.raca_id === t.raca_id &&
                                      x.temperamento_id === t.temperamento_id
                                    ),
                                ),
                              })
                            }
                            aria-label="Remover linha"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Caixa>

      <Caixa titulo="O humor da vila, de relance">
        <GraficoDivergente
          rotuloPositivo="Sentimentos positivos"
          rotuloNegativo="Sentimentos negativos"
          vazio="Adicione uma linha acima para ver o humor da vila."
          itens={r.temperamentos.map((t) => {
            const raca = racas.find((x) => x.id === t.raca_id);
            const temp = temperamentos.find((x) => x.id === t.temperamento_id);
            // O sinal vem do CADASTRO do temperamento, não do dado da vila.
            const sinal = temp?.sinal ?? -1;
            return {
              id: `${t.raca_id}-${t.temperamento_id}`,
              rotulo: temp?.nome ?? '— removido —',
              grupo: raca?.nome ?? '— raça removida —',
              valor: t.percentual * sinal,
            };
          })}
        />
        <p className="mt-4 text-[11px] leading-relaxed text-tinta-fraca">
          O lado da coluna vem do <strong>cadastro do temperamento</strong> (Personagens ›
          Temperamentos), não desta tela. Trocar um temperamento de lado lá reinterpreta todas as
          vilas de uma vez.
        </p>
      </Caixa>

      {/* ── cadastro rápido, sem sair da vila ────────────────────────────── */}
      <Modal
        aberto={novo !== null}
        aoFechar={() => setNovo(null)}
        titulo="Novo temperamento"
        descricao="Entra no cadastro geral (Personagens › Temperamentos) e já fica disponível aqui."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setNovo(null)}>
              Cancelar
            </button>
            <button
              className="botao botao-primario"
              onClick={criarTemperamento}
              disabled={pendente || !novo?.nome}
            >
              {pendente ? 'Criando…' : 'Criar'}
            </button>
          </>
        }
      >
        {erro && (
          <div className="mb-4">
            <Aviso tom="erro">{erro}</Aviso>
          </div>
        )}
        {novo && (
          <div className="space-y-5">
            <Moldura rotulo="Nome" obrigatorio>
              <input
                className="campo"
                autoFocus
                value={novo.nome}
                placeholder="Desconfiança"
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </Moldura>
            <Moldura
              rotulo="Lado no gráfico"
              ajuda="Felicidade e acolhimento sobem; hostilidade, desconfiança e animosidade descem."
            >
              <select
                className="campo"
                value={novo.sinal}
                onChange={(e) => setNovo({ ...novo, sinal: e.target.value })}
              >
                <option value="1">Positivo — sobe</option>
                <option value="-1">Negativo — desce</option>
              </select>
            </Moldura>
            <Moldura rotulo="Cor">
              <SeletorCor valor={novo.cor} aoMudar={(cor) => setNovo({ ...novo, cor })} />
            </Moldura>
          </div>
        )}
      </Modal>
    </div>
  );
}
