// Descritor de campo — é o que faz uma tela CRUD inteira caber em ~15 linhas.
// Sem 'use client': serializa do servidor pro componente de formulário.

export type TipoCampo =
  | 'texto'
  | 'texto_longo'
  | 'chave'
  | 'numero'
  | 'chance'
  | 'porcentagem'
  | 'selecao'
  | 'cor'
  | 'booleano'
  | 'lista_texto'
  | 'icone';

export type Opcao = { valor: string; rotulo: string };

export type DefCampo = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  /** Texto de apoio embaixo do campo. Use pra explicar a REGRA, não o óbvio. */
  ajuda?: string;
  dica?: string;
  opcoes?: Opcao[];
  obrigatorio?: boolean;
  padrao?: unknown;
  min?: number;
  max?: number;
  passo?: number;
  /** Ocupa a linha inteira do grid (o padrão é meia linha). */
  largo?: boolean;
  /** Aparece na listagem? Sem isso, só no formulário. */
  naTabela?: boolean;
  /** Coluna só de leitura na tabela (não editável). */
  somenteLeitura?: boolean;
};

export type Registro = Record<string, unknown>;

/** Valores iniciais de um formulário novo, a partir dos padrões do descritor. */
export function registroVazio(campos: DefCampo[]): Registro {
  const r: Registro = {};
  for (const c of campos) {
    if (c.padrao !== undefined) r[c.chave] = c.padrao;
    else if (c.tipo === 'booleano') r[c.chave] = false;
    else if (c.tipo === 'lista_texto') r[c.chave] = [];
    else if (c.tipo === 'numero' || c.tipo === 'chance' || c.tipo === 'porcentagem') r[c.chave] = 0;
    else r[c.chave] = '';
  }
  return r;
}

/** Transforma "Vale das Sombras" em "vale_das_sombras" — a chave que o jogo usa. */
export function paraChave(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}
