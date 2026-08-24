'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Abas, Aviso, Cabecalho, Folha } from '@/componentes/ui';
import { apagar, salvarComLigacoes } from '@/lib/acoes';
import type {
  AmbienteSonoro,
  Celebridade,
  Cenario,
  Clima,
  Nivel,
  Raca,
  Temperamento,
  TipoDocumento,
  TipoRelacao,
  Vila,
  VilaClima,
  VilaOpiniaoExterna,
  VilaRelacao,
  VilaTemperamento,
} from '@/lib/tipos';
import { urlAsset } from '@/lib/url';
import { AbaCelebridades } from './AbaCelebridades';
import { AbaCultura } from './AbaCultura';
import { AbaIdentidade } from './AbaIdentidade';
import { AbaNiveis } from './AbaNiveis';
import { AbaOpiniao } from './AbaOpiniao';
import { AbaOpiniaoPopular } from './AbaOpiniaoPopular';
import { AbaPolitica } from './AbaPolitica';
import { AbaRacas } from './AbaRacas';
import { AbaTemperamento } from './AbaTemperamento';

// ═══════════════════════════════════════════════════════════════════════════
// A PÁGINA DA VILA — nove abas
//
// Quem salva o quê (a divisão importa pra não perder edição):
//
//   Identidade, Política, Cultura, Opinião externa, Temperamento e Raças →
//   editam um RASCUNHO em memória e vão pro banco juntas, no botão "Salvar" do
//   topo. São a linha da `vila` + seis tabelas de ligação (clima, documento,
//   caminho, relação, opinião externa, temperamento, raça), e
//   `salvarComLigacoes` troca todas de uma vez.
//
//   Níveis, Opinião popular e Celebridades → CRUDs PRÓPRIOS, salvam na hora.
//   Nível tem upload de arte; Opinião popular pertence a um NÍVEL específico
//   (escolhido dentro da própria aba), não à vila direto; Celebridade é uma
//   tabela simples com FK. Nenhuma das três cabe bem num rascunho batido
//   junto do resto.
// ═══════════════════════════════════════════════════════════════════════════

const CAMINHO = '/mundo/vilas';

export type Rascunho = {
  nome: string;
  chave: string;
  descricao: string;
  cor: string;
  cenario_id: string | null;
  ambiente_sonoro_id: string | null;
  regras_especificas: string;
  politica_interna: string;
  costumes: string;
  educacao_analfabeto: number;
  educacao_media: number;
  educacao_acima: number;
  educacao_alto: number;
  icone_mapa_id: string | null;
  icone_mapa_url: string | null;
  ligacoes: string[];
  documentos: string[];
  climas: { clima_id: string; percentual: number }[];
  relacoes: { alvo_id: string; tipo: TipoRelacao }[];
  opinioes: { alvo_id: string; descricao: string; percentual: number }[];
  temperamentos: { raca_id: string; temperamento_id: string; percentual: number }[];
  racas: { raca_id: string; percentual: number }[];
};

type Chave =
  | 'identidade'
  | 'politica'
  | 'cultura'
  | 'niveis'
  | 'opiniaoPopular'
  | 'opiniao'
  | 'racas'
  | 'temperamento'
  | 'celebridades';

export function TelaVila({
  vila,
  outras,
  documentos,
  cenarios,
  ambientes,
  climas,
  vilaClimas,
  relacoes,
  opinioesExternas,
  temperamentos,
  vilaTemperamentos,
  vilaRacas,
  racas,
  niveis,
  celebridades,
  caminhos,
}: {
  vila: Vila;
  outras: Vila[];
  documentos: TipoDocumento[];
  cenarios: Cenario[];
  ambientes: AmbienteSonoro[];
  climas: Clima[];
  vilaClimas: VilaClima[];
  relacoes: VilaRelacao[];
  opinioesExternas: VilaOpiniaoExterna[];
  temperamentos: Temperamento[];
  vilaTemperamentos: VilaTemperamento[];
  vilaRacas: { raca_id: string; percentual: number }[];
  racas: Raca[];
  niveis: Nivel[];
  celebridades: Celebridade[];
  caminhos: Record<string, string>;
}) {
  const [aba, setAba] = useState<Chave>('identidade');
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [pendente, iniciar] = useTransition();

  const [r, setR] = useState<Rascunho>(() => ({
    nome: vila.nome,
    chave: vila.chave,
    descricao: vila.descricao ?? '',
    cor: vila.cor ?? '#8a6a45',
    cenario_id: vila.cenario_id,
    ambiente_sonoro_id: vila.ambiente_sonoro_id,
    regras_especificas: vila.regras_especificas ?? '',
    politica_interna: vila.politica_interna ?? '',
    costumes: vila.costumes ?? '',
    educacao_analfabeto: Number(vila.educacao_analfabeto ?? 0),
    educacao_media: Number(vila.educacao_media ?? 100),
    educacao_acima: Number(vila.educacao_acima ?? 0),
    educacao_alto: Number(vila.educacao_alto ?? 0),
    icone_mapa_id: vila.icone_mapa_id,
    icone_mapa_url: vila.icone_mapa_id ? urlAsset(caminhos[vila.icone_mapa_id]) : null,
    ligacoes: vila.ligacoes ?? [],
    documentos: vila.documentos ?? [],
    climas: vilaClimas.map((c) => ({ clima_id: c.clima_id, percentual: Number(c.percentual) })),
    relacoes: relacoes.map((x) => ({ alvo_id: x.alvo_id, tipo: x.tipo })),
    opinioes: opinioesExternas.map((o) => ({
      alvo_id: o.alvo_id,
      descricao: o.descricao ?? '',
      percentual: Number(o.percentual),
    })),
    temperamentos: vilaTemperamentos.map((t) => ({
      raca_id: t.raca_id,
      temperamento_id: t.temperamento_id,
      percentual: Number(t.percentual),
    })),
    racas: vilaRacas.map((x) => ({ raca_id: x.raca_id, percentual: Number(x.percentual) })),
  }));

  /** Atalho que todas as abas usam pra mexer numa chave do rascunho. */
  function mudar(patch: Partial<Rascunho>) {
    setSalvo(false);
    setR((atual) => ({ ...atual, ...patch }));
  }

  function submeter() {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const resultado = await salvarComLigacoes(
        'vila',
        {
          id: vila.id,
          nome: r.nome,
          chave: r.chave,
          descricao: r.descricao || null,
          cor: r.cor || null,
          cenario_id: r.cenario_id,
          ambiente_sonoro_id: r.ambiente_sonoro_id,
          regras_especificas: r.regras_especificas || null,
          politica_interna: r.politica_interna || null,
          costumes: r.costumes || null,
          educacao_analfabeto: r.educacao_analfabeto,
          educacao_media: r.educacao_media,
          educacao_acima: r.educacao_acima,
          educacao_alto: r.educacao_alto,
          icone_mapa_id: r.icone_mapa_id,
        },
        [
          {
            tabela: 'vila_ligacao',
            colunaDono: 'vila_id',
            linhas: r.ligacoes.map((destino_id) => ({ destino_id })),
          },
          {
            tabela: 'vila_documento',
            colunaDono: 'vila_id',
            linhas: r.documentos.map((tipo_documento_id) => ({ tipo_documento_id })),
          },
          { tabela: 'vila_clima', colunaDono: 'vila_id', linhas: r.climas },
          { tabela: 'vila_relacao', colunaDono: 'vila_id', linhas: r.relacoes },
          {
            tabela: 'vila_opiniao_externa',
            colunaDono: 'vila_id',
            linhas: r.opinioes.map((o, i) => ({
              alvo_id: o.alvo_id,
              descricao: o.descricao || null,
              percentual: o.percentual,
              ordem: i * 10,
            })),
          },
          {
            tabela: 'vila_temperamento',
            colunaDono: 'vila_id',
            linhas: r.temperamentos.map((t, i) => ({ ...t, ordem: i * 10 })),
          },
          { tabela: 'vila_raca', colunaDono: 'vila_id', linhas: r.racas },
        ],
        `${CAMINHO}/${vila.id}`,
      );
      if (resultado.ok) setSalvo(true);
      else setErro(resultado.erro);
    });
  }

  const somaEducacao =
    r.educacao_analfabeto + r.educacao_media + r.educacao_acima + r.educacao_alto;

  return (
    <Folha>
      <Cabecalho
        titulo={r.nome || 'Vila sem nome'}
        descricao="Tudo o que o mundo sabe sobre esta vila. Os níveis são salvos na hora; o resto vai junto no botão ao lado."
        acoes={
          <>
            <Link href={CAMINHO} className="botao botao-secundario">
              <ArrowLeft size={16} /> Vilas
            </Link>
            <button className="botao botao-primario" onClick={submeter} disabled={pendente}>
              <Save size={16} /> {pendente ? 'Salvando…' : 'Salvar Mudanças'}
            </button>
          </>
        }
      />

      {(erro || salvo || Math.round(somaEducacao) !== 100) && (
        <div className="space-y-3 border-b border-borda px-8 py-4">
          {erro && <Aviso tom="erro">{erro}</Aviso>}
          {Math.round(somaEducacao) !== 100 && (
            <Aviso tom="erro">
              As faixas de educação somam {Math.round(somaEducacao)}% — precisam somar 100. O
              banco recusa o salvamento assim. Mexa em qualquer barra da aba Cultura e ela se
              reequilibra sozinha.
            </Aviso>
          )}
          {salvo && !erro && (
            <div className="rounded-md border border-sucesso/40 bg-sucesso/10 px-4 py-2.5 text-[13px] font-bold text-sucesso">
              Salvo.
            </div>
          )}
        </div>
      )}

      <Abas<Chave>
        ativa={aba}
        aoTrocar={setAba}
        abas={[
          { chave: 'identidade', rotulo: 'Identidade' },
          { chave: 'politica', rotulo: 'Política', contador: r.relacoes.length },
          { chave: 'cultura', rotulo: 'Cultura' },
          { chave: 'niveis', rotulo: 'Níveis', contador: niveis.length },
          { chave: 'opiniaoPopular', rotulo: 'Opinião popular' },
          { chave: 'opiniao', rotulo: 'Opinião externa', contador: r.opinioes.length },
          { chave: 'racas', rotulo: 'Raças', contador: r.racas.length },
          { chave: 'temperamento', rotulo: 'Temperamento', contador: r.temperamentos.length },
          { chave: 'celebridades', rotulo: 'Celebridades', contador: celebridades.length },
        ]}
      />

      <div className="p-8">
        {aba === 'identidade' && (
          <AbaIdentidade
            r={r}
            mudar={mudar}
            outras={outras}
            documentos={documentos}
            cenarios={cenarios}
            ambientes={ambientes}
            climas={climas}
          />
        )}
        {aba === 'politica' && <AbaPolitica r={r} mudar={mudar} outras={outras} />}
        {aba === 'cultura' && <AbaCultura r={r} mudar={mudar} />}
        {aba === 'niveis' && <AbaNiveis vilaId={vila.id} niveis={niveis} caminhos={caminhos} />}
        {aba === 'opiniaoPopular' && <AbaOpiniaoPopular vilaId={vila.id} niveis={niveis} />}
        {aba === 'opiniao' && <AbaOpiniao r={r} mudar={mudar} outras={outras} />}
        {aba === 'racas' && <AbaRacas r={r} mudar={mudar} racas={racas} />}
        {aba === 'celebridades' && (
          <AbaCelebridades vilaId={vila.id} celebridades={celebridades} />
        )}
        {aba === 'temperamento' && (
          <AbaTemperamento
            r={r}
            mudar={mudar}
            racas={racas}
            temperamentos={temperamentos}
            vilaId={vila.id}
          />
        )}
      </div>

      <div className="border-t border-borda px-8 py-5">
        <button className="botao botao-perigo" onClick={() => setConfirmando(true)}>
          <Trash2 size={15} /> Apagar vila
        </button>
      </div>

      <Modal
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        titulo="Apagar vila?"
        descricao="Os níveis, as opiniões, as celebridades e a distribuição de clima/raças dela vão junto. Missões e lugares ligados a ela ficam sem vila."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
            <button
              className="botao botao-perigo"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const resultado = await apagar('vila', vila.id, CAMINHO);
                  if (resultado.ok) window.location.href = CAMINHO;
                  else setErro(resultado.erro);
                })
              }
            >
              {pendente ? 'Apagando…' : 'Apagar'}
            </button>
          </>
        }
      >
        <p className="text-sm">
          <strong>{r.nome}</strong>
        </p>
      </Modal>
    </Folha>
  );
}
