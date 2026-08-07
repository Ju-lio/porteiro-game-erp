import { Castle } from 'lucide-react';
import { Formulario } from './Formulario';

// Sem cadastro: as contas são criadas por convite no painel do Supabase.

export default function Entrar() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="pergaminho surgir w-full max-w-[420px] overflow-hidden rounded-xl border border-borda-forte">
        <div className="flex flex-col items-center gap-3 border-b border-borda px-8 pt-9 pb-7">
          <span className="grid size-14 place-items-center rounded-lg border-2 border-ouro-escuro/70 bg-madeira-700 text-ouro">
            <Castle size={28} />
          </span>
          <div className="text-center">
            <h1 className="titulo text-[26px] leading-tight">Porteiro</h1>
            <p className="mt-1 text-[12px] text-tinta-fraca">
              Engine de conteúdo — entrada só com convite.
            </p>
          </div>
        </div>

        <Formulario />
      </div>
    </div>
  );
}
