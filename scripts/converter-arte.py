#!/usr/bin/env python3
"""
Normaliza a arte de personagem do jogo para o canvas PADRAO decidido (1080x1080).

Por que existe: a arte organizada hoje esta em 1080x1117, herdado dos arquivos
mais altos (corpo e roupa). O padrao que ficou definido e 1080x1080 -- e os 37px
que sobram embaixo ficam ATRAS da arte da cabine, entao cortar nao perde nada
visivel.

Toda peca e ancorada no TOPO-ESQUERDA, igual ao `scripts/organizar-personagens.py`
do jogo: e esse ancoramento que mantem as camadas alinhadas entre si. Imagem
menor que o alvo ganha transparencia embaixo; maior, e cortada embaixo.

Uso:
    python3 converter-arte.py <origem> <destino> [largura] [altura]
"""
import os
import sys

from PIL import Image


def normalizar(caminho_entrada, caminho_saida, largura, altura):
    """Poe a imagem num canvas largura x altura, ancorada no topo-esquerda."""
    with Image.open(caminho_entrada) as im:
        im = im.convert("RGBA")
        original = im.size
        canvas = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
        canvas.paste(im, (0, 0))
        # Se a original era mais alta, o paste ja descartou o excedente.
        os.makedirs(os.path.dirname(caminho_saida), exist_ok=True)
        canvas.save(caminho_saida, "PNG", optimize=True)
        return original


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    origem, destino = sys.argv[1], sys.argv[2]
    largura = int(sys.argv[3]) if len(sys.argv) > 3 else 1080
    altura = int(sys.argv[4]) if len(sys.argv) > 4 else 1080

    if not os.path.isdir(origem):
        print(f"origem nao encontrada: {origem}")
        sys.exit(1)

    convertidas = 0
    alteradas = []

    for raiz, _, arquivos in os.walk(origem):
        for arquivo in sorted(arquivos):
            if not arquivo.lower().endswith(".png"):
                continue
            entrada = os.path.join(raiz, arquivo)
            relativo = os.path.relpath(entrada, origem)
            saida = os.path.join(destino, relativo)
            antes = normalizar(entrada, saida, largura, altura)
            convertidas += 1
            if antes != (largura, altura):
                alteradas.append((relativo, antes))

    print(f"  {convertidas} arquivos normalizados para {largura}x{altura}")
    if alteradas:
        print(f"  {len(alteradas)} precisaram de ajuste:")
        for rel, (l, a) in alteradas:
            print(f"    {l}x{a} -> {largura}x{altura}  {rel}")


if __name__ == "__main__":
    main()
