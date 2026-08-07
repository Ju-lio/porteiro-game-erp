// Tipos espelhando o schema (erp/supabase/schema.sql).
// Os nomes de domínio ficam em PORTUGUÊS, como no jogo.

export type Genero = 'masculino' | 'feminino';
export type TipoSubCamada = 'cor' | 'traco' | 'arte_pronta';
export type CategoriaItem = 'comum' | 'oficio' | 'suspeito';
export type RegiaoMarca = 'roupa' | 'rosto';
export type Periodo = 'dia' | 'noite';
export type Classe = 'tutorial' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export const CLASSES: Classe[] = ['tutorial', 'F', 'E', 'D', 'C', 'B', 'A', 'S'];

export type Asset = {
  id: string;
  sha256: string;
  caminho: string;
  nome_original: string | null;
  mime: string;
  bytes: number;
  largura: number | null;
  altura: number | null;
  criado_em: string;
};

export type Paleta = {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  cores?: Cor[];
};

export type Cor = {
  id: string;
  paleta_id: string;
  nome: string;
  hex: string;
  ordem: number;
};

export type GrupoCamada = {
  id: string;
  chave: string;
  nome: string;
  ordem: number;
  opcional: boolean;
  chance: number | null;
  familia: string | null;
  descricao: string | null;
  sub_camadas?: SubCamada[];
};

export type SubCamada = {
  id: string;
  grupo_id: string;
  chave: string;
  nome: string;
  ordem: number;
  tipo: TipoSubCamada;
  paleta_id: string | null;
  /** Sub-camada opcional entra pela `chance`, no meio do grupo (blush, rugas). */
  opcional: boolean;
  chance: number | null;
};

export type Peca = {
  id: string;
  grupo_id: string;
  chave: string;
  nome: string;
  genero: Genero | null;
  arquetipos: string[];
  conjunto: string | null;
  ativo: boolean;
  arquivos?: PecaArquivo[];
};

export type PecaArquivo = {
  id: string;
  peca_id: string;
  sub_camada_id: string;
  asset_id: string;
  asset?: Asset;
};

export type Cenario = {
  id: string;
  chave: string;
  nome: string;
  arte_dia_id: string | null;
  arte_tarde_id: string | null;
  arte_noite_id: string | null;
};

export type Som = {
  id: string;
  chave: string;
  nome: string;
  asset_id: string | null;
  volume: number;
  loop: boolean;
  categoria: 'musica' | 'efeito';
};

export type AmbienteSonoro = {
  id: string;
  chave: string;
  nome: string;
  tema_id: string | null;
  ambiente_id: string | null;
  portao_id: string | null;
};

export type Regiao = {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  clima: string | null;
  pos_x: number | null;
  pos_y: number | null;
  cenario_id: string | null;
  ambiente_sonoro_id: string | null;
  regras_especificas: string | null;
  ordem: number;
  ligacoes?: string[];
  documentos?: string[];
};

export type Cidade = { id: string; nome: string; regiao_id: string | null };

export type FonteCampo = 'nome' | 'cidade' | 'profissao' | 'texto_livre';

export type TipoDocumento = {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  /** Cor autêntica da cera. Nulo = documento sem lacre, só campos. */
  cor_autentica: string | null;
  cores_falsas: string[];
  arte_id: string | null;
  ordem: number;
  campos?: CampoDocumento[];
};

export type CampoDocumento = {
  id: string;
  tipo_documento_id: string;
  chave: string;
  rotulo: string;
  ordem: number;
  fonte: FonteCampo;
  /** Pode vir em branco — e o vazio é a pista. */
  pode_faltar: boolean;
};

export const FONTES_CAMPO: { valor: FonteCampo; rotulo: string; ajuda: string }[] = [
  {
    valor: 'nome',
    rotulo: 'Nome do visitante',
    ajuda: 'Preenchido com o nome sorteado. Cosmético — nome não carrega sinal de culpa.',
  },
  {
    valor: 'cidade',
    rotulo: 'Cidade declarada',
    ajuda: 'Pode divergir da cidade real, e aí a resposta à pergunta denuncia.',
  },
  {
    valor: 'profissao',
    rotulo: 'Profissão declarada',
    ajuda: 'Quando difere da real, o visitante é um FARSANTE — o eixo da classe E em diante.',
  },
  {
    valor: 'texto_livre',
    rotulo: 'Texto livre',
    ajuda: 'Enfeite: não é comparado com nada. Use com parcimônia.',
  },
];

export type ItemBolsa = {
  id: string;
  chave: string;
  nome: string;
  icone: string;
  categoria: CategoriaItem;
  camada: 'fraca' | 'forte' | 'decisiva' | null;
};

export type Marca = {
  id: string;
  chave: string;
  nome: string;
  regiao: RegiaoMarca;
  cor: string;
  topo: number;
  esquerda: number;
  largura: number;
  altura: number;
  opacidade: number;
  desfoque: number;
  giro: number;
  raio: string;
};

export type Profissao = {
  id: string;
  chave: string;
  nome: string;
  itens?: { item_id: string; chance: number }[];
  marcas?: { marca_id: string; chance: number }[];
  falas?: { id: string; tipo: 'trabalho' | 'motivo'; texto: string; ordem: number }[];
};

export type TipoVocabulario =
  | 'nome_masculino'
  | 'nome_feminino'
  | 'sobrenome'
  | 'fala_neutra'
  | 'resposta_origem';

export type Vocabulario = { id: string; tipo: TipoVocabulario; texto: string; ordem: number };

export type Regra = {
  id: string;
  chave: string;
  nome: string;
  texto: string;
  condicao: Condicao;
};

export type Cartaz = {
  id: string;
  chave: string;
  regra_id: string | null;
  titulo: string;
  texto: string;
  amostra: { tipo: 'selo'; cor: string } | { tipo: 'sem-selo' } | null;
  itens: string[];
};

export type PerfilGeracao = {
  id: string;
  chave: string;
  nome: string;
  chance_sem_selo: number;
  chance_selo_forjado: number;
  chance_farsante: number;
  chance_farsante_se_entrega: number;
  chance_sem_profissao: number;
  chance_cidade_divergente: number;
  chance_item_suspeito: number;
  profissoes?: string[];
  itens_suspeitos?: string[];
};

export type Missao = {
  id: string;
  chave: string;
  nome: string;
  regiao_id: string | null;
  classe: Classe;
  evento: string | null;
  problemas: string[];
  dificuldade: number;
  cenario_id: string | null;
  ambiente_sonoro_id: string | null;
  regra_id: string | null;
  perfil_id: string | null;
  periodo: Periodo;
  num_visitantes: number;
  pagamento_por_acerto: number;
  multa_por_erro: number;
  fracao_para_aprovar: number;
  ativo: boolean;
};

export type Bundle = {
  id: string;
  versao: number;
  conteudo: unknown;
  notas: string | null;
  publicado_em: string;
  publicado_por: string | null;
};

// ── DSL de regras ──────────────────────────────────────────────────────────
// A condição é DADO, não função: é o que permite alguém criar uma regra nova
// sem programar. O jogo tem um interpretador puro que avalia esta árvore.
// Mantida propositalmente PEQUENA — um DSL amplo demais vira linguagem de
// programação com UI ruim.

export type Condicao =
  | { e: Condicao[] }
  | { ou: Condicao[] }
  | { nao: Condicao }
  /** O valor é a CHAVE de um tipo de documento. */
  | { documentoPresente: string }
  | { documentoAutentico: string }
  | { campoPreenchido: 'nome' | 'cidade' | 'profissao' }
  | { profissaoConfere: true }
  | { cidadeConfere: true }
  | { semItemSuspeito: true };

export type DefPredicado = {
  chave: string;
  rotulo: string;
  ajuda: string;
  /** Que argumento o predicado pede, além de si mesmo. */
  argumento?: 'documento' | 'campo';
};

/** Os predicados que o editor pode montar. Crescer aqui = crescer o DSL. */
export const PREDICADOS: DefPredicado[] = [
  {
    chave: 'documentoPresente',
    rotulo: 'Apresenta o documento',
    ajuda: 'O visitante mostra este papel, autêntico ou não.',
    argumento: 'documento',
  },
  {
    chave: 'documentoAutentico',
    rotulo: 'Documento é autêntico',
    ajuda:
      'Apresenta o documento E o lacre está na cor autêntica dele. Verificável a olho nu — o cartaz da parede diz qual é a cor.',
    argumento: 'documento',
  },
  {
    chave: 'campoPreenchido',
    rotulo: 'Campo preenchido',
    ajuda: 'O campo escolhido do documento não está em branco.',
    argumento: 'campo',
  },
  {
    chave: 'profissaoConfere',
    rotulo: 'Profissão é a verdadeira',
    ajuda: 'A profissão declarada bate com a real. O jogador cruza bolsa, marcas e resposta.',
  },
  {
    chave: 'cidadeConfere',
    rotulo: 'Cidade é a verdadeira',
    ajuda: 'A cidade do passe bate com a resposta de "de onde você veio".',
  },
  {
    chave: 'semItemSuspeito',
    rotulo: 'Sem item suspeito na bolsa',
    ajuda: 'Nada difícil de justificar na bolsa. O jogador precisa ter aberto a bolsa.',
  },
];
