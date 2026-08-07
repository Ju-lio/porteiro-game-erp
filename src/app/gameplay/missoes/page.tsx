import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar, opcoesDe } from '@/lib/consultas';
import { CLASSES } from '@/lib/tipos';

// O catálogo do quadro da guilda. O quadro não mostra esta lista: ele SORTEIA
// ofertas daqui para a classe atual do jogador, e cada oferta concluída some
// pra sempre (da classe E em diante). É isso que dá a sensação de guilda viva.

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('missao', { ordem: 'classe' });
  if (semSchema) return <SchemaFaltando />;

  const [regioes, cenarios, ambientes, regras, perfis] = await Promise.all([
    opcoesDe('regiao'),
    opcoesDe('cenario'),
    opcoesDe('ambiente_sonoro'),
    opcoesDe('regra'),
    opcoesDe('perfil_geracao'),
  ]);

  const campos: DefCampo[] = [
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naTabela: true, dica: 'Festival do Rei' },
    { chave: 'chave', rotulo: 'Chave', tipo: 'chave', obrigatorio: true },
    {
      chave: 'classe',
      rotulo: 'Classe da guilda',
      tipo: 'selecao',
      obrigatorio: true,
      naTabela: true,
      padrao: 'F',
      opcoes: CLASSES.map((c) => ({ valor: c, rotulo: c === 'tutorial' ? 'Treino' : `Classe ${c}` })),
      ajuda: 'Treino e F mostram 1 oferta e podem repetir. Da classe E em diante são 3 ofertas e o trabalho some.',
    },
    { chave: 'regiao_id', rotulo: 'Região', tipo: 'selecao', naTabela: true, opcoes: regioes },
    { chave: 'evento', rotulo: 'Evento do dia', tipo: 'texto', dica: 'Festival da Colheita' },
    {
      chave: 'problemas',
      rotulo: 'Problemas anunciados',
      tipo: 'lista_texto',
      largo: true,
      dica: 'Selos falsos',
      ajuda: 'O que o quadro avisa que o guarda vai encontrar. É expectativa, não gabarito.',
    },
    {
      chave: 'regra_id',
      rotulo: 'Regra do portão',
      tipo: 'selecao',
      obrigatorio: true,
      naTabela: true,
      opcoes: regras,
      ajuda: 'É dela que sai o gabarito. Não existe "quem é culpado" escrito à mão — a regra decide.',
    },
    {
      chave: 'perfil_id',
      rotulo: 'Perfil de geração',
      tipo: 'selecao',
      obrigatorio: true,
      opcoes: perfis,
      ajuda: 'A dificuldade mora aqui. Para endurecer o nível, mexa nas probabilidades do perfil.',
    },
    { chave: 'cenario_id', rotulo: 'Cenário', tipo: 'selecao', opcoes: cenarios },
    { chave: 'ambiente_sonoro_id', rotulo: 'Ambiente sonoro', tipo: 'selecao', opcoes: ambientes },
    {
      chave: 'periodo',
      rotulo: 'Período',
      tipo: 'selecao',
      padrao: 'dia',
      opcoes: [
        { valor: 'dia', rotulo: 'Dia' },
        { valor: 'noite', rotulo: 'Noite' },
      ],
      ajuda: 'Regra de mundo do expediente inteiro — diferente do relógio visual, que corre por dentro.',
    },
    { chave: 'dificuldade', rotulo: 'Dificuldade (1–5)', tipo: 'numero', padrao: 2, min: 1, max: 5, naTabela: true },
    { chave: 'num_visitantes', rotulo: 'Nº de visitantes', tipo: 'numero', padrao: 8, min: 1, max: 40 },
    { chave: 'pagamento_por_acerto', rotulo: 'Pagamento por acerto', tipo: 'numero', padrao: 10 },
    { chave: 'multa_por_erro', rotulo: 'Multa por erro', tipo: 'numero', padrao: 5 },
    {
      chave: 'fracao_para_aprovar',
      rotulo: 'Fração para aprovar',
      tipo: 'chance',
      padrao: 0.8,
      max: 1,
      ajuda: 'No treino use 100% (gabaritar). Reprovar nunca rebaixa a classe.',
    },
    { chave: 'ativo', rotulo: 'Ativa no quadro', tipo: 'booleano', padrao: true, naTabela: true },
  ];

  return (
    <Crud
      titulo="Missões"
      descricao="Os trabalhos que a guilda oferece. Adicionar um trabalho é adicionar uma linha — nenhuma lógica do jogo muda."
      tabela="missao"
      caminho="/gameplay/missoes"
      campos={campos}
      linhas={linhas}
      singular="missão"
      plural="missões"
    />
  );
}
