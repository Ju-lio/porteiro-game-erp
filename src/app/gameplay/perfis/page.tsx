import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { ItemBolsa, PerfilGeracao, Profissao } from '@/lib/tipos';
import { TelaPerfis } from './Tela';

type Perfil = PerfilGeracao & {
  perfil_profissao?: { profissao_id: string }[];
  perfil_item_suspeito?: { item_id: string }[];
};

export default async function Pagina() {
  const [perfis, profissoes, itens] = await Promise.all([
    buscar<Perfil>('perfil_geracao', {
      select: '*, perfil_profissao(profissao_id), perfil_item_suspeito(item_id)',
      ordem: 'nome',
    }),
    buscar<Profissao>('profissao', { ordem: 'nome' }),
    buscar<ItemBolsa>('item_bolsa', { ordem: 'nome' }),
  ]);
  if (perfis.semSchema) return <SchemaFaltando />;

  return (
    <TelaPerfis
      perfis={perfis.linhas.map((p) => ({
        ...p,
        profissoes: (p.perfil_profissao ?? []).map((x) => x.profissao_id),
        itens_suspeitos: (p.perfil_item_suspeito ?? []).map((x) => x.item_id),
      }))}
      profissoes={profissoes.linhas}
      itens={itens.linhas.filter((i) => i.categoria === 'suspeito')}
    />
  );
}
