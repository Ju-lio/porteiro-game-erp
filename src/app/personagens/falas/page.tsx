import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';
import type { Raca } from '@/lib/tipos';

// FALAS — a outra metade de "Nomes e falas" (mesma tabela `vocabulario`,
// filtrada por tipo). O que o visitante diz ao chegar e ao responder de onde
// veio.

const TIPOS = ['fala_neutra', 'resposta_origem'] as const;

const CAMPOS: DefCampo[] = [
  {
    chave: 'tipo',
    rotulo: 'Tipo',
    tipo: 'selecao',
    obrigatorio: true,
    naTabela: true,
    padrao: 'fala_neutra',
    opcoes: [
      { valor: 'fala_neutra', rotulo: 'Fala de chegada' },
      { valor: 'resposta_origem', rotulo: 'Resposta de origem' },
    ],
  },
  {
    chave: 'texto',
    rotulo: 'Texto',
    tipo: 'texto_longo',
    obrigatorio: true,
    naTabela: true,
    largo: true,
    dica: 'Venho de {cidade}, guarda. Três dias de estrada.',
    ajuda:
      'Em "resposta de origem", {cidade} é trocado pela cidade REAL do visitante — que nem sempre é a do passe.',
  },
];

export default async function Pagina() {
  const [{ linhas, semSchema }, racas] = await Promise.all([
    buscar<Registro>('vocabulario', { ordem: 'tipo' }),
    buscar<Raca>('raca', { ordem: 'codigo' }),
  ]);
  if (semSchema) return <SchemaFaltando />;

  const doGrupo = linhas.filter((l) => TIPOS.includes(l.tipo as (typeof TIPOS)[number]));

  return (
    <Crud
      titulo="Falas"
      descricao="O que o visitante diz ao chegar e ao responder de onde veio."
      tabela="vocabulario"
      caminho="/personagens/falas"
      campos={CAMPOS}
      linhas={doGrupo}
      racas={racas.linhas}
      singular="fala"
      plural="falas"
      nota="Falas de chegada são NEUTRAS de propósito: servem pra honesto e farsante, e nunca citam horário (senão um 'boa noite' vaza num nível de dia). A fala é atmosfera — a prova está na bolsa e no corpo."
    />
  );
}
