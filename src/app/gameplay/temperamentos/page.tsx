import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';

// TEMPERAMENTO — o vocabulário de como um povo reage a outro.
//
// É GERAL, sem raça própria: "desconfiança" é desconfiança em qualquer povo,
// então esta tela não filtra por raça (a raça entra só na ligação, na Aba
// Temperamento da Vila — lá sim é "TAL raça sente TAL temperamento").
//
// Este cadastro é só a LISTA de temperamentos possíveis (hostilidade,
// desconfiança, animosidade, felicidade…). A Aba Temperamento da Vila também
// tem um botão de "+" que cria um temperamento sem sair da tela.
//
// `sinal` existe para o gráfico saber o lado: felicidade sobe, hostilidade
// desce. Sem ele o gráfico seria uma pilha de barras sem leitura.

const CAMPOS: DefCampo[] = [
  {
    chave: 'nome',
    rotulo: 'Nome',
    tipo: 'texto',
    obrigatorio: true,
    naTabela: true,
    dica: 'Desconfiança',
  },
  { chave: 'chave', rotulo: 'Chave', tipo: 'chave', obrigatorio: true, naTabela: true },
  {
    chave: 'sinal',
    rotulo: 'Lado no gráfico',
    tipo: 'selecao',
    naTabela: true,
    padrao: '-1',
    opcoes: [
      { valor: '1', rotulo: 'Positivo — sobe' },
      { valor: '-1', rotulo: 'Negativo — desce' },
    ],
    ajuda: 'Felicidade e acolhimento sobem; hostilidade, desconfiança e animosidade descem.',
  },
  { chave: 'cor', rotulo: 'Cor no gráfico', tipo: 'cor', padrao: '#a3320f' },
  {
    chave: 'descricao',
    rotulo: 'Descrição',
    tipo: 'texto_longo',
    largo: true,
    dica: 'Como esse sentimento aparece no dia a dia da vila.',
  },
];

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('temperamento', { ordem: 'ordem' });
  if (semSchema) return <SchemaFaltando />;

  return (
    <Crud
      titulo="Temperamentos"
      descricao="Como um povo sente em relação a outro. A lista é geral, sem raça; o QUANTO por vila e por raça mora na Aba “Temperamento” da Vila."
      tabela="temperamento"
      caminho="/gameplay/temperamentos"
      campos={CAMPOS}
      linhas={linhas}
      singular="temperamento"
      plural="temperamentos"
    />
  );
}
