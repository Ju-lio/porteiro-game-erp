'use client';

import { createClient } from '@supabase/supabase-js';
import { BUCKET } from './bucket';

// Cliente do NAVEGADOR — só a chave publicável (anon), nunca a secreta.
// Existe só pra falar DIRETO com o Storage via signed URL (ver `imagem.ts`):
// o Vercel recusa (413, texto puro, antes do nosso código rodar) requisições
// de função serverless acima de uns 4.5MB, e cenário/mapa/áudio passam disso
// fácil. Com o signed URL, o arquivo pesado nunca passa pela nossa função —
// só o token (pequeno) passa.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const storageDireto = createClient(url, chave, {
  auth: { persistSession: false },
}).storage.from(BUCKET);
