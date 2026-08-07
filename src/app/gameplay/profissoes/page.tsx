import { SchemaFaltando } from '@/componentes/ui';
import { buscar } from '@/lib/consultas';
import type { ItemBolsa, Marca, Profissao } from '@/lib/tipos';
import { TelaProfissoes } from './Tela';

export default async function Pagina() {
  const [profissoes, itens, marcas] = await Promise.all([
    buscar<Profissao>('profissao', {
      select: '*, itens:profissao_item(*), marcas:profissao_marca(*), falas:profissao_fala(*)',
      ordem: 'nome',
    }),
    buscar<ItemBolsa>('item_bolsa', { ordem: 'nome' }),
    buscar<Marca>('marca', { ordem: 'nome' }),
  ]);
  if (profissoes.semSchema) return <SchemaFaltando />;

  return (
    <TelaProfissoes
      profissoes={profissoes.linhas}
      itens={itens.linhas.filter((i) => i.categoria === 'oficio')}
      marcas={marcas.linhas}
    />
  );
}
