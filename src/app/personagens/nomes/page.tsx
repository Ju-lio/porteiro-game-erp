import { Crud } from '@/componentes/Crud';
import { SchemaFaltando } from '@/componentes/ui';
import type { DefCampo, Registro } from '@/lib/campos';
import { buscar } from '@/lib/consultas';
import type { Raca } from '@/lib/tipos';

// NOMES — metade de "Nomes e falas" (mesma tabela `vocabulario`, filtrada por
// tipo). Primeiros nomes e sobrenomes que a geração combina no passe.
//
// Por raça: nome élfico não sai na boca de um humano. Verbete sem raça vale
// para todas (é o caso comum hoje — só existe Humano).

const TIPOS = ['nome_masculino', 'nome_feminino', 'sobrenome'] as const;

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
    ],
  },
  {
    chave: 'texto',
    rotulo: 'Texto',
    tipo: 'texto',
    obrigatorio: true,
    naTabela: true,
    dica: 'Aldo',
  },
];

export default async function Pagina() {
  const [{ linhas, semSchema }, racas] = await Promise.all([
    buscar<Registro>('vocabulario', { ordem: 'tipo' }),
    buscar<Raca>('raca', { ordem: 'codigo' }),
  ]);
  if (semSchema) return <SchemaFaltando />;

  const doGrupo = linhas.filter((l) => TIPOS.includes(l.tipo as (typeof TIPOS)[number]));

  return (
    <Crud
      titulo="Nomes"
      descricao="Primeiros nomes e sobrenomes que a geração combina no passe. Puro volume: quanto mais, menos o elenco se repete."
      tabela="vocabulario"
      caminho="/personagens/nomes"
      campos={CAMPOS}
      linhas={doGrupo}
      racas={racas.linhas}
      singular="nome"
      plural="nomes"
    />
  );
}
