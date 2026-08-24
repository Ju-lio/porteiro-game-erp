import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { GrupoCamada, Paleta, Peca, Raca } from '@/lib/tipos';
import { TelaPecas } from './Tela';

type Config = { chave: string; valor: unknown };

export default async function Pagina() {
  const [grupos, pecas, paletas, racas] = await Promise.all([
    buscar<GrupoCamada>('grupo_camada', { select: '*, sub_camadas:sub_camada(*)', ordem: 'ordem' }),
    buscar<Peca>('peca', {
      select: '*, arquivos:peca_arquivo(*, asset:asset(*))',
      ordem: 'chave',
    }),
    buscar<Paleta>('paleta', { select: '*, cores:cor(*)', ordem: 'ordem' }),
    buscar<Raca>('raca', { ordem: 'codigo' }),
  ]);
  if (grupos.semSchema) return <SchemaFaltando />;

  const { linhas: config } = await buscar<Config>('config');
  const valor = (c: string, padrao: number) =>
    Number(config.find((x) => x.chave === c)?.valor ?? padrao);

  return (
    <TelaPecas
      grupos={grupos.linhas.map((g) => ({
        ...g,
        sub_camadas: [...(g.sub_camadas ?? [])].sort((a, b) => a.ordem - b.ordem),
      }))}
      pecas={pecas.linhas}
      paletas={paletas.linhas}
      racas={racas.linhas}
      canvas={{ largura: valor('canvas_largura', 1080), altura: valor('canvas_altura', 1080) }}
    />
  );
}
