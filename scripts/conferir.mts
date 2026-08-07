/**
 * Roda a validação de conteúdo pelo terminal — o mesmo diagnóstico que a tela
 * de Publicar mostra, útil pra conferir logo depois de semear.
 *
 *   npm run conferir
 */
import { montar } from '../src/lib/bundle.ts';
import { validar } from '../src/lib/validacao.ts';

const bundle = await montar();
const d = validar(bundle as never);

const vermelho = (t: string) => `\x1b[31m${t}\x1b[0m`;
const amarelo = (t: string) => `\x1b[33m${t}\x1b[0m`;
const verde = (t: string) => `\x1b[32m${t}\x1b[0m`;

console.log(`\n${d.erros.length ? vermelho(`ERROS (${d.erros.length})`) : verde('Nenhum erro')}`);
for (const e of d.erros) console.log(`  ${vermelho('✗')} [${e.onde}] ${e.texto}`);

console.log(`\n${amarelo(`AVISOS (${d.avisos.length})`)}`);
for (const a of d.avisos) console.log(`  ${amarelo('!')} [${a.onde}] ${a.texto}`);
console.log();
