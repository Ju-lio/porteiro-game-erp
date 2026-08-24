'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/componentes/Modal';
import { Moldura } from '@/componentes/campos';
import { Aviso, Vazio } from '@/componentes/ui';
import { apagar, salvar } from '@/lib/acoes';
import type { Celebridade } from '@/lib/tipos';

// ABA CELEBRIDADES — gente famosa da vila
//
// Simples de propósito: nome + descrição, presa à vila por FK. Salva NA HORA
// (CRUD próprio, como Níveis) — é uma tabela que "depois vai virar menu
// separado" (fk com a vila, mas nascendo aqui dentro por enquanto).

export function AbaCelebridades({
  vilaId,
  celebridades,
}: {
  vilaId: string;
  celebridades: Celebridade[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<{ id?: string; nome: string; descricao: string } | null>(
    null,
  );
  const [confirmando, setConfirmando] = useState<Celebridade | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const CAMINHO = `/mundo/vilas/${vilaId}`;

  function abrir(c?: Celebridade) {
    setErro(null);
    setEditando({ id: c?.id, nome: c?.nome ?? '', descricao: c?.descricao ?? '' });
  }

  function submeter() {
    if (!editando) return;
    setErro(null);
    iniciar(async () => {
      const resultado = await salvar(
        'celebridade',
        {
          id: editando.id,
          vila_id: vilaId,
          nome: editando.nome,
          descricao: editando.descricao || null,
          ordem: editando.id ? undefined : celebridades.length * 10,
        },
        CAMINHO,
      );
      if (resultado.ok) {
        setEditando(null);
        router.refresh();
      } else setErro(resultado.erro);
    });
  }

  return (
    <div className="space-y-6">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <div className="flex items-center justify-between gap-4">
        <p className="max-w-2xl text-[12px] leading-relaxed text-tinta-fraca">
          Gente famosa desta vila — quem os visitantes citam, quem os cartazes homenageiam.
        </p>
        <button className="botao botao-primario shrink-0" onClick={() => abrir()}>
          <Plus size={16} /> Nova celebridade
        </button>
      </div>

      {celebridades.length === 0 ? (
        <Vazio
          texto="Nenhuma celebridade cadastrada ainda."
          acao={
            <button className="botao botao-primario" onClick={() => abrir()}>
              <Plus size={16} /> Criar a primeira
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {celebridades.map((c) => (
            <div key={c.id} className="caixa p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="titulo text-[15px]">{c.nome}</p>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-borda/50 hover:text-tinta"
                    onClick={() => abrir(c)}
                    aria-label="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="rounded-md p-1.5 text-tinta-fraca transition-colors hover:bg-perigo/12 hover:text-perigo"
                    onClick={() => setConfirmando(c)}
                    aria-label="Apagar"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {c.descricao && (
                <p className="mt-1.5 text-[12px] leading-relaxed text-tinta-fraca">
                  {c.descricao}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        aberto={editando !== null}
        aoFechar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar celebridade' : 'Nova celebridade'}
        largura="sm"
        rodape={
          <>
            <button className="botao botao-secundario" onClick={() => setEditando(null)}>
              Cancelar
            </button>
            <button className="botao botao-primario" onClick={submeter} disabled={pendente}>
              {pendente ? 'Salvando…' : 'Salvar'}
            </button>
          </>
        }
      >
        {erro && (
          <div className="mb-4">
            <Aviso tom="erro">{erro}</Aviso>
          </div>
        )}
        {editando && (
          <div className="space-y-5">
            <Moldura rotulo="Nome" obrigatorio>
              <input
                className="campo"
                autoFocus
                value={editando.nome}
                placeholder="A Bruxa do Vale"
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
              />
            </Moldura>
            <Moldura rotulo="Descrição">
              <textarea
                className="campo"
                value={editando.descricao}
                placeholder="Quem é e por que é conhecida por aqui."
                onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              />
            </Moldura>
          </div>
        )}
      </Modal>

      <Modal
        aberto={confirmando !== null}
        aoFechar={() => setConfirmando(null)}
        titulo="Apagar celebridade?"
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
                  const resultado = await apagar('celebridade', confirmando.id, CAMINHO);
                  if (resultado.ok) {
                    setConfirmando(null);
                    router.refresh();
                  } else setErro(resultado.erro);
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
    </div>
  );
}
