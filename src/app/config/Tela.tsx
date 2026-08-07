'use client';

import { useState, useTransition } from 'react';
import { Save } from 'lucide-react';
import { Chance, Moldura } from '@/componentes/campos';
import { Upload } from '@/componentes/Upload';
import { Aviso, Cabecalho, Caixa, Folha } from '@/componentes/ui';
import { salvar } from '@/lib/acoes';
import { urlAsset } from '@/lib/url';

// Tudo travável na mão do admin, nada esperto: quando o padrão de arte mudar,
// muda-se aqui e a validação inteira acompanha.

const CAMINHO = '/config';

type Config = { chave: string; valor: unknown; descricao: string | null };
type Ajustes = {
  timelapse_segundos_por_momento: number;
  timelapse_segundos_de_fade: number;
  timelapse_ativo: boolean;
};
type Sombra = { asset_id: string | null; opacidade: number };

export function TelaConfig({
  config,
  ajustes,
  sombra,
  caminhos,
}: {
  config: Config[];
  ajustes: Ajustes | null;
  sombra: Sombra | null;
  caminhos: Record<string, string>;
}) {
  const inicial = (c: string, padrao: number) =>
    Number(config.find((x) => x.chave === c)?.valor ?? padrao);

  const [canvasL, setCanvasL] = useState(inicial('canvas_largura', 1080));
  const [canvasA, setCanvasA] = useState(inicial('canvas_altura', 1080));
  const [maxKb, setMaxKb] = useState(inicial('max_kb', 400));
  const [maxKbCenario, setMaxKbCenario] = useState(inicial('max_kb_cenario', 4096));
  const [maxKbAudio, setMaxKbAudio] = useState(inicial('max_kb_audio', 8192));

  const [aj, setAj] = useState<Ajustes>(
    ajustes ?? {
      timelapse_segundos_por_momento: 20,
      timelapse_segundos_de_fade: 4,
      timelapse_ativo: true,
    },
  );

  const [somAsset, setSomAsset] = useState(sombra?.asset_id ?? null);
  const [somUrl, setSomUrl] = useState(
    sombra?.asset_id ? urlAsset(caminhos[sombra.asset_id]) : null,
  );
  const [opacidade, setOpacidade] = useState(Number(sombra?.opacidade ?? 0.22));

  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();

  function submeter() {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const resposta = await fetch('/api/config', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([
          { chave: 'canvas_largura', valor: canvasL },
          { chave: 'canvas_altura', valor: canvasA },
          { chave: 'max_kb', valor: maxKb },
          { chave: 'max_kb_cenario', valor: maxKbCenario },
          { chave: 'max_kb_audio', valor: maxKbAudio },
        ]),
      });
      if (!resposta.ok) return setErro('Falha salvando as travas de arte.');

      const r1 = await salvar('ajustes_jogo', { id: 1, ...aj }, CAMINHO);
      if (!r1.ok) return setErro(r1.erro);

      const r2 = await salvar(
        'sombra',
        { id: 1, asset_id: somAsset, opacidade },
        CAMINHO,
      );
      if (!r2.ok) return setErro(r2.erro);

      setSalvo(true);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Settings"
        descricao="As travas do ERP e os ajustes globais do jogo."
        acoes={
          <button className="botao botao-primario" onClick={submeter} disabled={pendente}>
            <Save size={16} /> {pendente ? 'Salvando…' : 'Salvar Mudanças'}
          </button>
        }
      />

      {(erro || salvo) && (
        <div className="border-b border-borda px-8 py-4">
          {erro ? (
            <Aviso tom="erro">{erro}</Aviso>
          ) : (
            <div className="rounded-md border border-sucesso/40 bg-sucesso/10 px-4 py-2.5 text-[13px] font-bold text-sucesso">
              Salvo.
            </div>
          )}
        </div>
      )}

      <div className="grid gap-5 p-8 lg:grid-cols-2">
        <Caixa titulo="Arte de personagem">
          <Aviso>
            O canvas é a trava que mantém as camadas alinhadas. Toda peça precisa ter{' '}
            <strong>exatamente</strong> este tamanho — o alinhamento é de quem desenha, não da
            engine.
          </Aviso>

          <div className="mt-5 grid grid-cols-2 gap-5">
            <Moldura rotulo="Largura (px)">
              <input
                type="number"
                className="campo"
                value={canvasL}
                onChange={(e) => setCanvasL(Number(e.target.value))}
              />
            </Moldura>
            <Moldura rotulo="Altura (px)">
              <input
                type="number"
                className="campo"
                value={canvasA}
                onChange={(e) => setCanvasA(Number(e.target.value))}
              />
            </Moldura>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <Moldura rotulo="Máx. peça (KB)">
              <input
                type="number"
                className="campo"
                value={maxKb}
                onChange={(e) => setMaxKb(Number(e.target.value))}
              />
            </Moldura>
            <Moldura rotulo="Máx. cenário (KB)">
              <input
                type="number"
                className="campo"
                value={maxKbCenario}
                onChange={(e) => setMaxKbCenario(Number(e.target.value))}
              />
            </Moldura>
            <Moldura rotulo="Máx. áudio (KB)">
              <input
                type="number"
                className="campo"
                value={maxKbAudio}
                onChange={(e) => setMaxKbAudio(Number(e.target.value))}
              />
            </Moldura>
          </div>
        </Caixa>

        <Caixa titulo="Sombra do visitante">
          <p className="mb-4 text-[12px] leading-relaxed text-tinta-fraca">
            A silhueta do corpo desenhada por cima de todas as camadas, bem apagada — o
            visitante está do lado de fora, na sombra da cabine. Não é peça sorteável: entra
            sempre, igual pra todo mundo.
          </p>

          <div className="grid grid-cols-2 gap-5">
            <Upload
              rotulo="Silhueta"
              perfil="peca"
              canvasEsperado={{ largura: canvasL, altura: canvasA }}
              urlAtual={somUrl}
              aoEnviar={(id, url) => {
                setSomAsset(id);
                setSomUrl(url);
              }}
              aoLimpar={() => {
                setSomAsset(null);
                setSomUrl(null);
              }}
            />
            <Moldura
              rotulo="Opacidade"
              ajuda="0 = sem sombra; 1 = silhueta preta sólida. Baixo de propósito — é pra assentar o personagem na cena, não pra escondê-lo."
            >
              <Chance valor={opacidade} permiteUm aoMudar={setOpacidade} />
            </Moldura>
          </div>
        </Caixa>

        <Caixa titulo="Timelapse do expediente">
          <p className="mb-4 text-[12px] leading-relaxed text-tinta-fraca">
            O cenário vira dia → tarde → noite → dia sozinho, em cross-fade. Da noite volta
            direto pro dia: não existe madrugada no meio.
          </p>

          <div className="grid grid-cols-2 gap-5">
            <Moldura rotulo="Segundos por momento">
              <input
                type="number"
                className="campo"
                min={1}
                value={aj.timelapse_segundos_por_momento}
                onChange={(e) =>
                  setAj({ ...aj, timelapse_segundos_por_momento: Number(e.target.value) })
                }
              />
            </Moldura>
            <Moldura
              rotulo="Segundos de fade"
              ajuda="Conta DENTRO do tempo do momento. Maior que ele, o cenário nunca fica parado."
            >
              <input
                type="number"
                className="campo"
                min={0}
                value={aj.timelapse_segundos_de_fade}
                onChange={(e) =>
                  setAj({ ...aj, timelapse_segundos_de_fade: Number(e.target.value) })
                }
              />
            </Moldura>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={aj.timelapse_ativo}
              onChange={(e) => setAj({ ...aj, timelapse_ativo: e.target.checked })}
              className="size-4 accent-oxido"
            />
            <span className="text-sm font-bold">Ciclo ativo</span>
          </label>
        </Caixa>

      </div>
    </Folha>
  );
}
