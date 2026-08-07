import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';

/** O cabeçalho de toda tela: título em óxido + uma linha explicando o que é. */
export function Cabecalho({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-borda px-8 py-6">
      <div className="min-w-0">
        <h1 className="titulo text-[28px] leading-tight">{titulo}</h1>
        {descricao && (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-tinta-fraca">
            {descricao}
          </p>
        )}
      </div>
      {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </div>
  );
}

/** A folha de pergaminho onde toda tela vive. */
export function Folha({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="pergaminho surgir overflow-hidden rounded-xl border border-borda-forte">
        {children}
      </div>
    </div>
  );
}

/** Card interno, como os blocos "Mapa" e "Gameplay" da referência. */
export function Caixa({
  titulo,
  children,
  className = '',
}: {
  titulo?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`caixa p-5 ${className}`}>
      {titulo && (
        <h2 className="titulo mb-4 border-b border-borda pb-2 text-[17px]">{titulo}</h2>
      )}
      {children}
    </section>
  );
}

export function Vazio({ texto, acao }: { texto: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
      <p className="max-w-md text-sm text-tinta-fraca">{texto}</p>
      {acao}
    </div>
  );
}

export function Aviso({
  tom = 'atencao',
  children,
}: {
  tom?: 'atencao' | 'erro';
  children: React.ReactNode;
}) {
  const cor =
    tom === 'erro'
      ? 'border-perigo/40 bg-perigo/8 text-perigo'
      : 'border-ouro-escuro/50 bg-ouro/12 text-tinta';
  return (
    <div className={`flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-[13px] ${cor}`}>
      <TriangleAlert size={16} className="mt-0.5 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

/** Tela de "o schema ainda não foi aplicado" — em vez de um stack trace. */
export function SchemaFaltando() {
  return (
    <Folha>
      <Cabecalho
        titulo="Banco ainda não preparado"
        descricao="As tabelas do ERP não existem no Supabase deste projeto."
      />
      <div className="space-y-4 p-8 text-[13px] leading-relaxed text-tinta">
        <p>
          Abra o <strong>SQL Editor</strong> do Supabase, cole o conteúdo de{' '}
          <code className="rounded bg-pergaminho-3 px-1.5 py-0.5">erp/supabase/schema.sql</code> e
          rode. É idempotente — pode rodar de novo sem quebrar nada.
        </p>
        <p className="text-tinta-fraca">
          Depois é só recarregar esta página.
        </p>
        <Link href="/" className="botao botao-primario mt-2 w-fit">
          Recarregar
        </Link>
      </div>
    </Folha>
  );
}

/** Etiqueta de contagem, usada nos cabeçalhos de lista. */
export function Contador({ n, singular, plural }: { n: number; singular: string; plural: string }) {
  return (
    <span className="etiqueta">
      {n} {n === 1 ? singular : plural}
    </span>
  );
}
