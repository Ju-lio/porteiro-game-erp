'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, Map, MapPin, Plus } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura, SeletorCor } from '@/componentes/campos';
import { Aviso, Cabecalho, Contador, Folha, Vazio } from '@/componentes/ui';
import { salvar } from '@/lib/acoes';
import { paraChave } from '@/lib/campos';
import type { Vila } from '@/lib/tipos';
import { EditorMapa } from './EditorMapa';
import { VisualizarMapa } from './VisualizarMapa';

// A vila é o gargalo do mundo: tudo pendura nela. Esta tela é só a VITRINE —
// o trabalho de verdade acontece na página de cada uma.

const CAMINHO = '/mundo/vilas';

export function TelaVilas({
  vilas,
  niveisPorVila,
  climasPorVila,
  mapaUrl,
  caminhos,
}: {
  vilas: Vila[];
  niveisPorVila: Record<string, number>;
  climasPorVila: Record<string, number>;
  mapaUrl: string | null;
  caminhos: Record<string, string>;
}) {
  const router = useRouter();
  const busca = useSearchParams();
  const [criando, setCriando] = useState<{ nome: string; chave: string; cor: string } | null>(null);
  const [mapaAberto, setMapaAberto] = useState(false);
  const [visualizarAberto, setVisualizarAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  // `?mapa=1` abre o editor direto — é por onde o botão "Abrir mapa do mundo"
  // da aba Identidade da vila chega aqui. A query some depois, pra recarregar
  // a página não reabrir o mapa sozinho.
  useEffect(() => {
    if (busca.get('mapa') === '1') {
      setMapaAberto(true);
      window.history.replaceState(null, '', CAMINHO);
    }
  }, [busca]);

  function criar() {
    if (!criando) return;
    setErro(null);
    iniciar(async () => {
      // Nasce só com o essencial; o resto se preenche nas abas da página dela.
      const r = await salvar(
        'vila',
        {
          chave: criando.chave,
          nome: criando.nome,
          cor: criando.cor,
          ordem: vilas.length * 10,
        },
        CAMINHO,
      );
      if (r.ok) {
        setCriando(null);
        router.refresh();
      } else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Vilas"
        descricao="Os lugares do reino. Cada portão que o jogador guarda pertence a uma vila — e é dentro dela que ficam os níveis onde se joga."
        acoes={
          <>
            <Contador n={vilas.length} singular="vila" plural="vilas" />
            <button className="botao botao-secundario" onClick={() => setMapaAberto(true)}>
              <Map size={16} /> Editar mapa
            </button>
            <button
              className="botao botao-secundario"
              disabled={!mapaUrl}
              onClick={() => setVisualizarAberto(true)}
            >
              <Eye size={16} /> Visualizar mapa
            </button>
            <button
              className="botao botao-primario"
              onClick={() => setCriando({ nome: '', chave: '', cor: '#8a6a45' })}
            >
              <Plus size={16} /> Nova
            </button>
          </>
        }
      />

      {erro && (
        <div className="border-b border-borda px-8 py-4">
          <Aviso tom="erro">{erro}</Aviso>
        </div>
      )}

      {vilas.length === 0 ? (
        <Vazio
          texto="Nenhuma vila ainda. Comece pela vila onde o jogador faz o treino — é o primeiro portão que ele guarda."
          acao={
            <button
              className="botao botao-primario"
              onClick={() => setCriando({ nome: '', chave: '', cor: '#8a6a45' })}
            >
              <Plus size={16} /> Criar a primeira
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 p-8 sm:grid-cols-2 xl:grid-cols-3">
          {vilas.map((v) => (
            <Link
              key={v.id}
              href={`/mundo/vilas/${v.id}`}
              className="caixa overflow-hidden p-0 text-left transition-colors hover:border-borda-forte"
            >
              <div className="h-1.5 w-full" style={{ background: v.cor ?? '#8a6a45' }} />
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="titulo text-[17px]">{v.nome}</span>
                  <MapPin size={16} className="shrink-0 text-tinta-fraca opacity-50" />
                </div>
                {v.descricao && (
                  <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-tinta-fraca">
                    {v.descricao}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="etiqueta">{niveisPorVila[v.id] ?? 0} nível(is)</span>
                  {(climasPorVila[v.id] ?? 0) > 0 && (
                    <span className="etiqueta">{climasPorVila[v.id]} clima(s)</span>
                  )}
                  {(v.ligacoes?.length ?? 0) > 0 && (
                    <span className="etiqueta">{v.ligacoes?.length} caminho(s)</span>
                  )}
                  {(v.documentos?.length ?? 0) > 0 && (
                    <span className="etiqueta">{v.documentos?.length} documento(s)</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <EditorMapa
        aberto={mapaAberto}
        aoFechar={() => setMapaAberto(false)}
        vilas={vilas}
        mapaUrl={mapaUrl}
        caminhos={caminhos}
      />

      <VisualizarMapa
        aberto={visualizarAberto}
        aoFechar={() => setVisualizarAberto(false)}
        vilas={vilas}
        mapaUrl={mapaUrl}
        caminhos={caminhos}
      />

      {/* Criar é de propósito o mínimo: nome, chave e cor. Tudo o mais mora nas
          abas da vila, e forçar isso aqui só faria um formulário gigante. */}
      <Modal
        aberto={criando !== null}
        aoFechar={() => setCriando(null)}
        titulo="Nova vila"
        descricao="Só o nome por enquanto. Níveis, clima, política e o resto ficam nas abas da vila."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setCriando(null)}>
              Cancelar
            </button>
            <button
              className="botao botao-primario"
              onClick={criar}
              disabled={pendente || !criando?.nome || !criando?.chave}
            >
              {pendente ? 'Criando…' : 'Criar vila'}
            </button>
          </>
        }
      >
        {criando && (
          <div className="space-y-5">
            <Moldura rotulo="Nome" obrigatorio>
              <input
                className="campo"
                autoFocus
                value={criando.nome}
                placeholder="Vale das Sombras"
                onChange={(e) =>
                  setCriando({
                    ...criando,
                    nome: e.target.value,
                    chave: paraChave(e.target.value),
                  })
                }
              />
            </Moldura>
            <Moldura rotulo="Chave" obrigatorio ajuda="É por ela que o jogo referencia a vila.">
              <input
                className="campo font-mono"
                value={criando.chave}
                onChange={(e) => setCriando({ ...criando, chave: paraChave(e.target.value) })}
              />
            </Moldura>
            <Moldura rotulo="Cor predominante">
              <SeletorCor valor={criando.cor} aoMudar={(cor) => setCriando({ ...criando, cor })} />
            </Moldura>
          </div>
        )}
      </Modal>
    </Folha>
  );
}
