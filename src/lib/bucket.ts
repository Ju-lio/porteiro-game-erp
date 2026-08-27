// Nome do bucket de assets no Storage. Separado de `lib/supabase.ts` porque
// aquele arquivo é `server-only` (carrega a secret key) e este precisa ser
// importável do navegador também (upload direto via signed URL).
export const BUCKET = 'assets';
