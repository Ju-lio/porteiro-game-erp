import { Cabecalho, Caixa, Folha } from '@/componentes/ui';

// A tela que explica as regras não-óbvias pra quem não programa. Ela existe
// porque quase todo erro de conteúdo vem de não saber POR QUE a regra existe.

export default function Ajuda() {
  return (
    <Folha>
      <Cabecalho
        titulo="Como funciona"
        descricao="O mínimo que você precisa saber pra criar conteúdo do Porteiro sem quebrar o jogo."
      />

      <div className="grid gap-5 p-8 lg:grid-cols-2">
        <Caixa titulo="A regra de ouro">
          <p className="text-[13px] leading-relaxed">
            <strong>Nenhum botão julga o visitante pelo jogador.</strong> Toda ação devolve
            observação crua, nunca conclusão. O passe mostra campos; a bolsa mostra itens; a
            pergunta devolve uma fala.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-tinta-fraca">
            Se você está prestes a criar algo que diz “isto é suspeito”, pare — está fazendo o
            trabalho que é do jogador.
          </p>
        </Caixa>

        <Caixa titulo="Aparência não é prova">
          <p className="text-[13px] leading-relaxed">
            Rosto, cabelo, roupa e gênero são sorteados de forma totalmente independente da
            verdade do visitante. Se a cara entregasse a resposta, o jogador pararia de deduzir e
            só reconheceria padrão visual.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-tinta-fraca">
            O que carrega sinal é o que ele <strong>traz</strong> (bolsa), o que{' '}
            <strong>ficou nele</strong> do trabalho (marcas) e o que ele{' '}
            <strong>responde</strong> — e mesmo isso é probabilístico.
          </p>
        </Caixa>

        <Caixa titulo="Chance nunca é 100%">
          <p className="text-[13px] leading-relaxed">
            “80% dos fazendeiros têm lama” quer dizer que <strong>20% não têm</strong> — e é essa
            margem que impede o jogador de decorar uma tabela. Ele não procura um item; ele
            procura o conjunto bater.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-tinta-fraca">
            O banco recusa 100%. Não é preciosismo: certeza vira checklist, e checklist mata a
            dedução.
          </p>
        </Caixa>

        <Caixa titulo="Toda regra é verificável a olho nu">
          <p className="text-[13px] leading-relaxed">
            Antes de salvar uma regra, responda:{' '}
            <strong>“como o jogador descobre isso só observando?”</strong> Se a resposta for “não
            descobre”, a regra pune por algo invisível.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-tinta-fraca">
            Por isso toda regra em uso precisa de um cartaz na parede da cabine — é o que torna
            justo um jogo sem botão de veredito.
          </p>
        </Caixa>

        <Caixa titulo="Exportando arte">
          <ul className="space-y-2.5 text-[13px] leading-relaxed">
            <li>
              <strong>Canvas fixo</strong>, sempre igual. O alinhamento das camadas é de quem
              desenha, não da engine.
            </li>
            <li>
              <strong>Desligue o “trim” / “cortar transparência”</strong> ao exportar. É o erro
              nº 1: a peça sai menor, o canto de cima muda, e o cabelo aparece no ombro.
            </li>
            <li>
              <strong>Dois arquivos por peça:</strong> o traço e a cor. A cor vira máscara
              sozinha — desenhe em qualquer tom, o que importa é o recorte.
            </li>
            <li>
              Exporte cada camada <strong>separada</strong>, deixando as outras invisíveis.
            </li>
          </ul>
        </Caixa>

        <Caixa titulo="Documentos e falsificação">
          <p className="text-[13px] leading-relaxed">
            Cada documento diz qual é a <strong>cor autêntica</strong> do lacre e quais cores o
            falsificador erra. É isso que torna a falsificação visível a olho nu — e o cartaz da
            parede precisa anunciar a cor certa, senão o jogador não tem como saber.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-tinta-fraca">
            A vila escolhe quais papéis o portão cobra (Vilas › aba Identidade). Documento novo
            é uma linha, não uma mecânica nova.
          </p>
        </Caixa>

        <Caixa titulo="Publicar e voltar atrás">
          <p className="text-[13px] leading-relaxed">
            Salvar edita o rascunho — o jogo continua vendo a última versão publicada. Só{' '}
            <strong>Publicar</strong> muda o que os jogadores recebem.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-tinta-fraca">
            Cada versão é imutável e os arquivos nunca são sobrescritos, então voltar para uma
            versão antiga reproduz o jogo daquele dia pixel a pixel. Errar não é caro — deixar de
            publicar é.
          </p>
        </Caixa>
      </div>
    </Folha>
  );
}
