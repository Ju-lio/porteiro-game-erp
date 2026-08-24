import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar, opcoesDe } from '@/lib/consultas';

// LUGAR (era "Cidade").
//
// É o nome solto que vai para o campo "Cidade" do passe e para a resposta de
// "de onde você veio" — continua sendo SORTEADO aleatoriamente pela geração.
// A mudança de ago/2026 é que todo lugar pertence obrigatoriamente a uma VILA:
// o mundo passa a ser navegável a partir da vila, e nenhum nome fica solto.
//
// ⚠️ Não confundir com NÍVEL. O nível é onde se JOGA (vila + nível + variação,
// com arte de cenário); o lugar é só um topônimo que aparece no papel.

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('lugar', { ordem: 'nome' });
  if (semSchema) return <SchemaFaltando />;

  const vilas = await opcoesDe('vila');

  const campos: DefCampo[] = [
    { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naTabela: true, dica: 'Pedra Branca' },
    {
      chave: 'vila_id',
      rotulo: 'Vila',
      tipo: 'selecao',
      obrigatorio: true,
      naTabela: true,
      opcoes: vilas,
      ajuda: 'Obrigatório. É o que amarra o topônimo ao mundo — todo lugar pertence a uma vila.',
    },
  ];

  return (
    <Crud
      titulo="Lugares"
      descricao="Os topônimos que vão para o campo Cidade do passe e para a resposta de “de onde você veio”. Quando os dois não batem, o jogador tem uma pista."
      tabela="lugar"
      caminho="/mundo/lugares"
      campos={campos}
      linhas={linhas}
      singular="lugar"
      plural="lugares"
      nota="Lugar é só um NOME sorteado — não é onde se joga. O lugar jogável é o Nível, dentro da página da Vila."
    />
  );
}
