import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar, opcoesDe } from '@/lib/consultas';

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('cidade', { ordem: 'nome' });
  if (semSchema) return <SchemaFaltando />;

  const regioes = await opcoesDe('regiao');

  const campos: DefCampo[] = [
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naTabela: true, dica: 'Pedra Branca' },
    {
      chave: 'regiao_id',
      rotulo: 'Região',
      tipo: 'selecao',
      naTabela: true,
      opcoes: regioes,
      ajuda: 'Opcional. Serve pra restringir quem aparece em cada portão mais pra frente.',
    },
  ];

  return (
    <Crud
      titulo="Cidades"
      descricao="Vão para o campo Cidade do passe e para a resposta de “de onde você veio”. Quando as duas não batem, o jogador tem uma pista."
      tabela="cidade"
      caminho="/mundo/cidades"
      campos={campos}
      linhas={linhas}
      singular="cidade"
      plural="cidades"
    />
  );
}
