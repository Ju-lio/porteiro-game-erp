import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';

// CLIMA — cadastro geral, usado pela vila EM PROPORÇÃO.
//
// Uma vila não tem um clima: tem uma distribuição ("70% chuvoso, 30% neblina").
// Por isso o cadastro é solto aqui e o percentual mora em Vila › Aba 1.

const CAMPOS: DefCampo[] = [
  { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naTabela: true, dica: 'Neblina densa' },
  { chave: 'chave', rotulo: 'Chave', tipo: 'chave', obrigatorio: true, naTabela: true },
  { chave: 'icone', rotulo: 'Ícone', tipo: 'icone', naTabela: true, padrao: '🌤️' },
  { chave: 'cor', rotulo: 'Cor no gráfico', tipo: 'cor', naTabela: true, padrao: '#8a9bb0' },
  {
    chave: 'descricao',
    rotulo: 'Descrição',
    tipo: 'texto_longo',
    largo: true,
    dica: 'Como o clima muda o que se vê pela janela e o humor de quem chega ao portão.',
  },
];

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('clima', { ordem: 'ordem' });
  if (semSchema) return <SchemaFaltando />;

  return (
    <Crud
      titulo="Climas"
      descricao="O tempo que faz nas vilas. Aqui é só a lista — quanto cada um aparece em cada vila é configurado na Aba “Identidade” da Vila."
      tabela="clima"
      caminho="/mundo/climas"
      campos={CAMPOS}
      linhas={linhas}
      singular="clima"
      plural="climas"
      nota="Clima ainda não muda nenhuma regra do jogo: é distribuição de ambientação, e é o que vai alimentar variação de cenário e de humor mais pra frente."
    />
  );
}
