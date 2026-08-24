import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';

// PROTAGONISTAS — o elenco fixo do jogo, o que NÃO é sorteado.
//
// Primeiro item do menu de Personagens de propósito: é o lugar onde alguém
// novo no time entende quem já são os personagens fixos antes de mexer em
// conteúdo gerado (paletas, peças, nomes).

const CAMPOS: DefCampo[] = [
  { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, naTabela: true, dica: 'O Porteiro' },
  {
    chave: 'descricao',
    rotulo: 'Descrição',
    tipo: 'texto_longo',
    largo: true,
    dica: 'Quem é, o papel dele na história.',
  },
];

export default async function Pagina() {
  const { linhas, semSchema } = await buscar<Registro>('protagonista', { ordem: 'ordem' });
  if (semSchema) return <SchemaFaltando />;

  return (
    <Crud
      titulo="Protagonistas"
      descricao="O elenco fixo do jogo — quem não é sorteado."
      tabela="protagonista"
      caminho="/personagens/protagonistas"
      campos={CAMPOS}
      linhas={linhas}
      singular="protagonista"
      plural="protagonistas"
    />
  );
}
