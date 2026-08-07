import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O ERP vive dentro do repositório do jogo por enquanto, então existem dois
  // lockfiles e o Turbopack escolhe o de cima. Fixar a raiz aqui evita isso —
  // e some sozinho quando o ERP virar repositório próprio.
  turbopack: { root: path.resolve(import.meta.dirname) },
};

export default nextConfig;
