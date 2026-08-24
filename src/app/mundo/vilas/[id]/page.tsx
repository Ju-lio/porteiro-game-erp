import { notFound } from 'next/navigation';
import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type {
  AmbienteSonoro,
  Asset,
  Celebridade,
  Cenario,
  Clima,
  Nivel,
  NivelOpiniao,
  Raca,
  Temperamento,
  TipoDocumento,
  Vila,
  VilaClima,
  VilaOpiniaoExterna,
  VilaRaca,
  VilaRelacao,
  VilaTemperamento,
} from '@/lib/tipos';
import { TelaVila } from './Tela';

// A PÁGINA da vila. Antes isso era um modal; virou página porque a vila deixou
// de ser "um nome com uma cor" e passou a ser o centro do mundo — seis abas de
// conteúdo, incluindo uma sub-lista inteira (os níveis).
//
// Tudo é lido aqui, de uma vez, e desce como props. As abas não fazem fetch.

type ComLigacoes = Vila & {
  vila_ligacao?: { destino_id: string }[];
  vila_documento?: { tipo_documento_id: string }[];
};

type NivelComOpinioes = Nivel & { nivel_opiniao?: NivelOpiniao[] };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [
    vilas,
    documentos,
    cenarios,
    ambientes,
    climas,
    vilaClimas,
    relacoes,
    opinioesExternas,
    temperamentos,
    vilaTemperamentos,
    vilaRacas,
    racas,
    niveis,
    celebridades,
    assets,
  ] = await Promise.all([
    buscar<ComLigacoes>('vila', {
      select:
        '*, vila_ligacao!vila_ligacao_vila_id_fkey(destino_id), vila_documento(tipo_documento_id)',
      ordem: 'ordem',
    }),
    buscar<TipoDocumento>('tipo_documento', { ordem: 'ordem' }),
    buscar<Cenario>('cenario', { ordem: 'nome' }),
    buscar<AmbienteSonoro>('ambiente_sonoro', { ordem: 'nome' }),
    buscar<Clima>('clima', { ordem: 'ordem' }),
    buscar<VilaClima>('vila_clima'),
    buscar<VilaRelacao>('vila_relacao'),
    buscar<VilaOpiniaoExterna>('vila_opiniao_externa', { ordem: 'ordem' }),
    buscar<Temperamento>('temperamento', { ordem: 'ordem' }),
    buscar<VilaTemperamento>('vila_temperamento', { ordem: 'ordem' }),
    buscar<VilaRaca>('vila_raca'),
    buscar<Raca>('raca', { ordem: 'codigo' }),
    buscar<NivelComOpinioes>('nivel', {
      select: '*, nivel_opiniao(*)',
      ordem: 'nivel',
    }),
    buscar<Celebridade>('celebridade', { ordem: 'ordem' }),
    buscar<Asset>('asset'),
  ]);
  if (vilas.semSchema) return <SchemaFaltando />;

  const vila = vilas.linhas.find((v) => v.id === id);
  if (!vila) notFound();

  const caminhos: Record<string, string> = {};
  for (const a of assets.linhas) caminhos[a.id] = a.caminho;

  const daVila = niveis.linhas
    .filter((n) => n.vila_id === id)
    .map((n) => ({
      ...n,
      opinioes: [...(n.nivel_opiniao ?? [])].sort((a, b) => a.ordem - b.ordem),
    }))
    .sort((a, b) => a.nivel - b.nivel || a.variacao - b.variacao);

  return (
    <TelaVila
      vila={{
        ...vila,
        ligacoes: (vila.vila_ligacao ?? []).map((l) => l.destino_id),
        documentos: (vila.vila_documento ?? []).map((d) => d.tipo_documento_id),
      }}
      /* As outras vilas: alvo das relações (Aba 2) e das opiniões (Aba 5). */
      outras={vilas.linhas.filter((v) => v.id !== id)}
      documentos={documentos.linhas}
      cenarios={cenarios.linhas}
      ambientes={ambientes.linhas}
      climas={climas.linhas}
      vilaClimas={vilaClimas.linhas.filter((c) => c.vila_id === id)}
      relacoes={relacoes.linhas.filter((r) => r.vila_id === id)}
      opinioesExternas={opinioesExternas.linhas.filter((o) => o.vila_id === id)}
      temperamentos={temperamentos.linhas}
      vilaTemperamentos={vilaTemperamentos.linhas.filter((t) => t.vila_id === id)}
      vilaRacas={vilaRacas.linhas.filter((x) => x.vila_id === id)}
      racas={racas.linhas}
      niveis={daVila}
      celebridades={celebridades.linhas.filter((c) => c.vila_id === id)}
      caminhos={caminhos}
    />
  );
}
