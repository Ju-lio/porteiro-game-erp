import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';

// As marcas são manchas posicionadas em % do canvas do personagem e recortadas
// pela silhueta da peça (roupa ou rosto) — sem o recorte a mancha é um
// retângulo solto boiando no cenário.

const CAMPOS: DefCampo[] = [
  { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naTabela: true, dica: 'Lama na roupa' },
  { chave: 'chave', rotulo: 'Chave', tipo: 'chave', obrigatorio: true, naTabela: true },
  {
    chave: 'regiao',
    rotulo: 'Recorta pela silhueta de',
    tipo: 'selecao',
    obrigatorio: true,
    naTabela: true,
    padrao: 'roupa',
    opcoes: [
      { valor: 'roupa', rotulo: 'Roupa' },
      { valor: 'rosto', rotulo: 'Rosto' },
    ],
    ajuda: 'A mancha é cortada pela máscara real da peça que o visitante sorteou.',
  },
  { chave: 'cor', rotulo: 'Cor', tipo: 'cor', obrigatorio: true, naTabela: true, padrao: '#6b4a2a' },
  { chave: 'topo', rotulo: 'Topo (%)', tipo: 'porcentagem', naTabela: true, padrao: 40 },
  { chave: 'esquerda', rotulo: 'Esquerda (%)', tipo: 'porcentagem', padrao: 40 },
  { chave: 'largura', rotulo: 'Largura (%)', tipo: 'porcentagem', padrao: 12 },
  {
    chave: 'altura',
    rotulo: 'Altura (%)',
    tipo: 'porcentagem',
    naTabela: true,
    padrao: 10,
    ajuda: '⚠️ Topo + altura tem que ficar até 74%. Abaixo disso a arte da cabine cobre a marca.',
  },
  {
    chave: 'opacidade',
    rotulo: 'Opacidade',
    tipo: 'chance',
    padrao: 0.5,
    max: 1,
    ajuda: 'Marca discreta obriga a olhar — e é isso que a gente quer.',
  },
  { chave: 'desfoque', rotulo: 'Desfoque (px)', tipo: 'numero', padrao: 6, min: 0, max: 60 },
  {
    chave: 'giro',
    rotulo: 'Giro (graus)',
    tipo: 'numero',
    padrao: 0,
    min: -180,
    max: 180,
    ajuda: 'Quebra a simetria e evita cara de "bolha de CSS".',
  },
];

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('marca', { ordem: 'nome' });
  if (semSchema) return <SchemaFaltando />;

  return (
    <Crud
      titulo="Marcas do ofício"
      descricao="Lama, fuligem, cicatriz — o que o trabalho deixou no corpo. O jogador vê desde que o visitante chega, sem precisar clicar em nada."
      tabela="marca"
      caminho="/gameplay/marcas"
      campos={CAMPOS}
      linhas={linhas}
      singular="marca"
      plural="marcas"
      nota="A cabine cobre o visitante a partir de ~74% da altura. Topo + altura acima disso e a marca fica invisível — o banco recusa."
    />
  );
}
