import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar, opcoesDe } from '@/lib/consultas';

// O cartaz é a cola DURANTE o turno: o guarda vira a cabeça para a parede da
// cabine e relê o que a guilda pregou. É o que torna justo um jogo em que
// nenhum botão julga o visitante pelo jogador.

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('cartaz', { ordem: 'titulo' });
  if (semSchema) return <SchemaFaltando />;

  const regras = await opcoesDe('regra');

  const campos: DefCampo[] = [
    {
      chave: 'titulo',
      rotulo: 'Título',
      tipo: 'texto',
      obrigatorio: true,
      naTabela: true,
      dica: 'A CERA É VERMELHA',
      ajuda: 'Curto e imperativo. É um cartaz pregado na parede, não um manual.',
    },
    { chave: 'chave', rotulo: 'Chave', tipo: 'chave', obrigatorio: true },
    {
      chave: 'regra_id',
      rotulo: 'Regra',
      tipo: 'selecao',
      obrigatorio: true,
      naTabela: true,
      opcoes: regras,
      ajuda: 'Um cartaz por REGRA, não por missão. Regra sem cartaz deixa o jogador no escuro.',
    },
    {
      chave: 'texto',
      rotulo: 'Texto',
      tipo: 'texto_longo',
      obrigatorio: true,
      largo: true,
      naTabela: true,
    },
    {
      chave: 'itens',
      rotulo: 'Linhas de apoio',
      tipo: 'lista_texto',
      largo: true,
      dica: 'Sem selo, sem entrada',
    },
  ];

  return (
    <Crud
      titulo="Cartazes"
      descricao="Os papéis pregados na parede da cabine. A fase abre virada para eles."
      tabela="cartaz"
      caminho="/gameplay/cartazes"
      campos={campos}
      linhas={linhas}
      singular="cartaz"
      plural="cartazes"
      nota="As amostras visuais do cartaz são desenhadas pelos MESMOS componentes da cabine. Um cartaz que mostra um selo diferente do selo do jogo ensina errado — pior que cartaz nenhum."
    />
  );
}
