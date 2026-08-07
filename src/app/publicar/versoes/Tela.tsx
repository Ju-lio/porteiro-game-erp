'use client';

import { useState, useTransition } from 'react';
import { CircleCheck, ExternalLink, Undo2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Aviso, Cabecalho, Folha, Vazio } from '@/componentes/ui';
import { apontarPara } from '@/lib/publicacao';

type Bundle = {
  id: string;
  versao: number;
  notas: string | null;
  publicado_em: string;
  publicado_por: string | null;
};

export function TelaVersoes({
  bundles,
  versaoAtual,
}: {
  bundles: Bundle[];
  versaoAtual: number | null;
}) {
  const [voltando, setVoltando] = useState<Bundle | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <Folha>
      <Cabecalho
        titulo="Versões"
        descricao="Todo bundle já publicado. Voltar para um deles é trocar um número — nada é reescrito."
      />

      <div className="border-b border-borda px-8 py-4">
        <Aviso>
          Como os arquivos de arte são imutáveis, uma versão antiga reproduz o jogo{' '}
          <strong>exatamente como ele era naquele dia</strong>, inclusive as artes que já foram
          substituídas.
        </Aviso>
      </div>

      {erro && (
        <div className="border-b border-borda px-8 py-4">
          <Aviso tom="erro">{erro}</Aviso>
        </div>
      )}

      {bundles.length === 0 ? (
        <Vazio texto="Nada publicado ainda. Vá em Publicar para tirar o primeiro retrato do conteúdo." />
      ) : (
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Versão</th>
                <th>Publicado em</th>
                <th>Por</th>
                <th>O que mudou</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {bundles.map((b) => {
                const atual = b.versao === versaoAtual;
                return (
                  <tr key={b.id}>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="font-display text-[16px] font-bold">v{b.versao}</span>
                        {atual && (
                          <span className="etiqueta border-sucesso/40 bg-sucesso/12 text-sucesso">
                            <CircleCheck size={11} /> no ar
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-tinta-fraca">
                      {new Date(b.publicado_em).toLocaleString('pt-BR')}
                    </td>
                    <td>{b.publicado_por ?? '—'}</td>
                    <td className="max-w-md text-tinta-fraca">{b.notas ?? '—'}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <a
                          href={`/api/conteudo?v=${b.versao}`}
                          target="_blank"
                          rel="noreferrer"
                          className="botao botao-fantasma px-3 py-1.5 text-[12px]"
                        >
                          <ExternalLink size={13} /> JSON
                        </a>
                        {!atual && (
                          <button
                            className="botao botao-fantasma px-3 py-1.5 text-[12px]"
                            onClick={() => setVoltando(b)}
                          >
                            <Undo2 size={13} /> Voltar pra esta
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        aberto={voltando !== null}
        aoFechar={() => setVoltando(null)}
        titulo={`Voltar para a v${voltando?.versao}?`}
        descricao="O jogo passa a baixar esta versão no próximo boot. As versões mais novas continuam guardadas."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setVoltando(null)}>
              Cancelar
            </button>
            <button
              className="botao botao-primario"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  if (!voltando) return;
                  const r = await apontarPara(voltando.versao);
                  if (r.ok) setVoltando(null);
                  else setErro(r.erro);
                })
              }
            >
              {pendente ? 'Trocando…' : 'Voltar para esta versão'}
            </button>
          </>
        }
      >
        <p className="text-sm text-tinta">{voltando?.notas ?? 'Sem notas.'}</p>
      </Modal>
    </Folha>
  );
}
