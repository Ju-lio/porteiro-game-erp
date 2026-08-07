'use client';

import { useState, useTransition } from 'react';
import { CircleCheck, CircleX, Rocket, TriangleAlert } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura } from '@/componentes/campos';
import { Aviso, Cabecalho, Caixa, Folha } from '@/componentes/ui';
import type { Diagnostico, Problema } from '@/lib/bundle';
import { publicar } from '@/lib/publicacao';

// Publicar = tirar um retrato imutável de TODO o conteúdo. Nada é editado
// depois: corrigir cria a próxima versão.

export function TelaPublicar({
  diagnostico,
  versaoAtual,
  ultimaVersao,
}: {
  diagnostico: Diagnostico;
  versaoAtual: number | null;
  ultimaVersao: number;
}) {
  const [aberto, setAberto] = useState(false);
  const [notas, setNotas] = useState('');
  const [autor, setAutor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<number | null>(null);
  const [pendente, iniciar] = useTransition();

  const bloqueado = diagnostico.erros.length > 0;
  const proxima = ultimaVersao + 1;

  function enviar() {
    setErro(null);
    iniciar(async () => {
      const r = await publicar(notas, autor);
      if (r.ok) {
        setFeito(r.versao);
        setAberto(false);
        setNotas('');
      } else setErro(r.erro);
    });
  }

  return (
    <Folha>
      <Cabecalho
        titulo="Publicar"
        descricao="Tira um retrato de todo o conteúdo e trava numa versão. O jogo passa a baixar essa versão."
        acoes={
          <button
            className="botao botao-primario"
            onClick={() => setAberto(true)}
            disabled={bloqueado}
          >
            <Rocket size={16} /> Publicar v{proxima}
          </button>
        }
      />

      <div className="grid gap-5 p-8 lg:grid-cols-3">
        <Caixa titulo="No ar agora">
          <p className="font-display text-[38px] leading-none font-extrabold text-tinta">
            {versaoAtual !== null ? `v${versaoAtual}` : '—'}
          </p>
          <p className="mt-2 text-[12px] text-tinta-fraca">
            {versaoAtual !== null
              ? 'É o que o jogo baixa quando abre.'
              : 'Nada publicado ainda — o jogo não tem conteúdo pra baixar.'}
          </p>
        </Caixa>

        <Caixa titulo="Erros">
          <p
            className={`font-display text-[38px] leading-none font-extrabold ${
              diagnostico.erros.length ? 'text-perigo' : 'text-sucesso'
            }`}
          >
            {diagnostico.erros.length}
          </p>
          <p className="mt-2 text-[12px] text-tinta-fraca">
            {diagnostico.erros.length ? 'Bloqueiam a publicação.' : 'Nada bloqueando.'}
          </p>
        </Caixa>

        <Caixa titulo="Avisos">
          <p className="font-display text-[38px] leading-none font-extrabold text-tinta">
            {diagnostico.avisos.length}
          </p>
          <p className="mt-2 text-[12px] text-tinta-fraca">
            Publica assim mesmo, mas alguém devia olhar.
          </p>
        </Caixa>
      </div>

      {feito !== null && (
        <div className="px-8 pb-6">
          <div className="flex items-center gap-2.5 rounded-md border border-sucesso/40 bg-sucesso/10 px-4 py-3 text-[13px] font-bold text-sucesso">
            <CircleCheck size={17} /> Publicado como v{feito}. O jogo já baixa esta versão.
          </div>
        </div>
      )}

      <div className="space-y-6 px-8 pb-8">
        {bloqueado ? (
          <Lista
            titulo="Erros que bloqueiam"
            problemas={diagnostico.erros}
            icone={<CircleX size={15} />}
            tom="erro"
          />
        ) : (
          <div className="flex items-center gap-2.5 rounded-md border border-sucesso/40 bg-sucesso/10 px-4 py-3 text-[13px] font-bold text-sucesso">
            <CircleCheck size={17} /> Conteúdo íntegro. Pode publicar.
          </div>
        )}

        {diagnostico.avisos.length > 0 && (
          <Lista
            titulo="Avisos"
            problemas={diagnostico.avisos}
            icone={<TriangleAlert size={15} />}
            tom="aviso"
          />
        )}
      </div>

      <Modal
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={`Publicar v${proxima}?`}
        descricao="A versão fica imutável. Corrigir algo depois cria a v seguinte — esta continua reproduzindo o jogo exatamente como está agora."
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setAberto(false)}>
              Cancelar
            </button>
            <button className="botao botao-primario" onClick={enviar} disabled={pendente}>
              {pendente ? 'Publicando…' : 'Publicar'}
            </button>
          </>
        }
      >
        {erro && (
          <div className="mb-5">
            <Aviso tom="erro">{erro}</Aviso>
          </div>
        )}
        <div className="space-y-5">
          <Moldura rotulo="Quem está publicando">
            <input
              className="campo"
              value={autor}
              placeholder="seu nome"
              onChange={(e) => setAutor(e.target.value)}
            />
          </Moldura>
          <Moldura rotulo="O que mudou" ajuda="Vira o histórico. Uma linha basta.">
            <textarea
              className="campo"
              value={notas}
              placeholder="Três profissões novas e o cenário do porto."
              onChange={(e) => setNotas(e.target.value)}
            />
          </Moldura>
        </div>
      </Modal>
    </Folha>
  );
}

function Lista({
  titulo,
  problemas,
  icone,
  tom,
}: {
  titulo: string;
  problemas: Problema[];
  icone: React.ReactNode;
  tom: 'erro' | 'aviso';
}) {
  // Agrupa por tela, pra saber onde ir corrigir.
  const porOnde = new Map<string, Problema[]>();
  for (const p of problemas) {
    const l = porOnde.get(p.onde) ?? [];
    l.push(p);
    porOnde.set(p.onde, l);
  }

  return (
    <section>
      <h2 className="titulo mb-3 text-[19px]">
        {titulo} <span className="text-tinta-fraca">({problemas.length})</span>
      </h2>
      <div className="space-y-4">
        {[...porOnde].map(([onde, lista]) => (
          <div key={onde} className="caixa overflow-hidden p-0">
            <p className="border-b border-borda bg-pergaminho-3/40 px-4 py-2 text-[12px] font-bold">
              {onde}
            </p>
            <ul className="divide-y divide-borda/50">
              {lista.map((p, i) => (
                <li key={i} className="flex items-start gap-2.5 px-4 py-2.5 text-[13px] leading-relaxed">
                  <span className={tom === 'erro' ? 'mt-0.5 text-perigo' : 'mt-0.5 text-ouro-escuro'}>
                    {icone}
                  </span>
                  {p.texto}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
