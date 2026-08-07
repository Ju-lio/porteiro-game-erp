import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';

const CAMPOS: DefCampo[] = [
  { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naTabela: true, dica: 'Rede de pesca' },
  { chave: 'chave', rotulo: 'Chave', tipo: 'chave', obrigatorio: true, naTabela: true },
  { chave: 'icone', rotulo: 'Ícone', tipo: 'icone', naTabela: true, padrao: '📦' },
  {
    chave: 'categoria',
    rotulo: 'Categoria',
    tipo: 'selecao',
    obrigatorio: true,
    naTabela: true,
    padrao: 'comum',
    opcoes: [
      { valor: 'comum', rotulo: 'Comum — ruído' },
      { valor: 'oficio', rotulo: 'De ofício — revela a profissão real' },
      { valor: 'suspeito', rotulo: 'Suspeito — difícil de justificar' },
    ],
    ajuda:
      'Comum é ruído puro (qualquer um carrega). De ofício vira evidência só quando contradiz o passe. Suspeito é o que pesa.',
  },
  {
    chave: 'camada',
    rotulo: 'Peso da evidência',
    tipo: 'selecao',
    naTabela: true,
    opcoes: [
      { valor: 'fraca', rotulo: 'Fraca' },
      { valor: 'forte', rotulo: 'Forte' },
      { valor: 'decisiva', rotulo: 'Decisiva' },
    ],
    ajuda: 'Só itens suspeitos têm peso. Comum e de ofício ficam sem — eles não provam nada sozinhos.',
  },
];

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('item_bolsa', { ordem: 'nome' });
  if (semSchema) return <SchemaFaltando />;

  return (
    <Crud
      titulo="Itens de bolsa"
      descricao="O que o jogador encontra ao abrir a bolsa. A bolsa não diz nada — ela mostra."
      tabela="item_bolsa"
      caminho="/gameplay/itens"
      campos={CAMPOS}
      linhas={linhas}
      singular="item"
      plural="itens"
      nota="Um item nunca é veredito. Uma rede de pesca só vira pista quando contradiz a profissão escrita no passe — e quem conclui isso é o jogador."
    />
  );
}
