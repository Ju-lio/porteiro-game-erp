import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';

// O vocabulário solto que a geração sorteia. É a tela mais fácil de encher —
// provavelmente a primeira que os amigos vão usar de verdade.

const CAMPOS: DefCampo[] = [
  {
    chave: 'tipo',
    rotulo: 'Tipo',
    tipo: 'selecao',
    obrigatorio: true,
    naTabela: true,
    padrao: 'nome_masculino',
    opcoes: [
      { valor: 'nome_masculino', rotulo: 'Nome masculino' },
      { valor: 'nome_feminino', rotulo: 'Nome feminino' },
      { valor: 'sobrenome', rotulo: 'Sobrenome' },
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
  const { linhas, semSchema } = await buscar<Registro>('vocabulario', { ordem: 'tipo' });
  if (semSchema) return <SchemaFaltando />;

  return (
    <Crud
      titulo="Nomes e falas"
      descricao="Nomes, sobrenomes e as falas que a geração sorteia. Puro volume: quanto mais, menos o elenco se repete."
      tabela="vocabulario"
      caminho="/personagens/vocabulario"
      campos={CAMPOS}
      linhas={linhas}
      singular="verbete"
      plural="verbetes"
      nota="Falas de chegada são NEUTRAS de propósito: servem pra honesto e farsante, e nunca citam horário (senão um 'boa noite' vaza num nível de dia). A fala é atmosfera — a prova está na bolsa e no corpo."
    />
  );
}
