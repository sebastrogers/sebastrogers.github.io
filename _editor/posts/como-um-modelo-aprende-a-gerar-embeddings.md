---
titulo: "Como um modelo aprende a gerar embeddings"
categoria: "Busca semântica"
data: "2026-09-30"
resumo: "Segundo post da série sobre busca semântica: por que o BERTimbau, que entende português tão bem, não serve direto para busca, e como o aprendizado contrastivo transforma um encoder num modelo de embeddings."
capa: ""
rascunho: true
---

No post anterior, um modelo pequeno colocou "Dengue: febre alta, dor retro-orbitária..." em primeiro lugar para a pergunta "dor atrás dos olhos e manchas vermelhas no corpo", sem nenhuma palavra em comum entre as duas. Ficou uma pergunta no ar: quem ensinou esse modelo a fazer isso?

No post 1 eu citei o BERTimbau, o BERT treinado para o português do Brasil que a NeuralMind lançou em 2020. Daí surge uma dúvida natural: se ele entende português tão bem, por que não usar ele direto para gerar os embeddings da busca? A resposta curta é que entender bem a língua e saber organizar textos por significado são habilidades diferentes, aprendidas de jeitos diferentes. Este post é sobre essa diferença.

<p class="post-note"><strong>Série: busca semântica, do zero à produção.</strong> 1. O que é um embedding · 2. Como um modelo aprende a gerar embeddings (este post) · 3. Buscando de verdade: similaridade e índices vetoriais · 4. BM25 não morreu: busca híbrida e reranking · 5. Como saber se a busca está boa · 6. Um benchmark de modelos em português · 7. Do protótipo à produção</p>

## Um encoder não é um modelo de embeddings

Modelos como o BERT e o BERTimbau são chamados de **encoders**. Eles aprendem a língua com um exercício de preencher lacunas. Durante o treino, algumas palavras de cada frase são escondidas e trocadas por uma marca especial, escrita `[MASK]` (máscara, em inglês), e o modelo tem que adivinhar o que estava ali. Por exemplo: ele recebe "Tinha uma [MASK] no meio do caminho" e precisa descobrir que a palavra escondida é "pedra". O exemplo, uma homenagem ao Drummond, está no próprio cartão do BERTimbau no Hugging Face. Repetindo esse exercício bilhões de vezes, o modelo aprende muito sobre a língua: gramática, sentido das palavras, o que costuma aparecer perto do quê.

Repare no que esse exercício pede e no que ele não pede. Ele pede que o modelo entenda cada palavra no seu contexto. Ele não pede, em momento nenhum, que o modelo coloque frases com o mesmo significado perto uma da outra.

Tem mais um detalhe. A saída de um encoder não é um vetor por frase: é um vetor para cada pedaço de palavra, o chamado **token**. Para a busca, a gente precisa de um vetor só por texto. Existem dois jeitos comuns de chegar nele, e a figura mostra os dois:

- **Tirar a média** dos vetores de todos os tokens, posição por posição. Isso se chama *mean pooling*.
- **Usar o vetor do `[CLS]`**. Encoders como o BERT colocam uma marca especial no início de toda frase, o `[CLS]` (de *classification*). Ela não corresponde a nenhuma palavra; a ideia original era que o vetor dela servisse de resumo da frase em tarefas de classificação. Por isso muita gente tenta usar esse vetor como embedding.

![Do vetor de cada token a um vetor só para a frase: pela média (mean pooling) ou pelo vetor do CLS](../assets/blog/como-um-modelo-aprende-a-gerar-embeddings/image-g9kv.webp "Do vetor de cada token a um vetor só para a frase: pela média (mean pooling) ou pelo vetor do [CLS]")

Se quiser ver isso com mais calma, o texto [Sentence Transformers: Meanings in Disguise](https://www.pinecone.io/learn/series/nlp/sentence-embeddings/), da Pinecone, explica o mean pooling passo a passo, com figuras.

Funciona? O artigo do Sentence-BERT, de 2019, mediu exatamente isso, e o resultado surpreende. Usar a média dos vetores do BERT, ou o vetor do `[CLS]`, como embedding de frase deu resultado **pior do que uma receita bem mais antiga e simples**: o GloVe. O GloVe é de 2014, da mesma geração do word2vec que apareceu no post 1. Nele cada palavra tem um vetor fixo, que não muda com o contexto, e o embedding de uma frase é só a média dos vetores das palavras dela. É o jeito mais simples possível de montar um vetor de frase, e mesmo assim ganhou. Em sete tarefas de similaridade entre frases, a média do BERT ficou com correlação média de 54,81 (numa escala até 100) e o `[CLS]`, com 29,19, os dois abaixo do GloVe.

Por que isso acontece? Pense em agulhas de bússola. Cada texto vira uma agulha apontando para algum lado, e o cosseno, que vimos no post 1, mede o ângulo entre duas agulhas: ângulo pequeno, cosseno alto, textos considerados parecidos. O ideal seria que textos sobre dengue apontassem para um lado, textos sobre gripe para outro e textos sobre pressão alta para outro bem diferente. Um estudo de 2019, do pesquisador Kawin Ethayarajh, mostrou que nos encoders como o BERT os vetores das palavras não se espalham assim: ficam quase todos apontando para o mesmo lado, espremidos num cone estreito. Os ângulos ficam pequenos, os cossenos ficam parecidos, e a diferença entre o texto certo e um texto qualquer vira questão de casas decimais. Isso aparece no teste do fim deste post, em que o BERTimbau erra o primeiro lugar por 0,004.

![À esquerda, veetores espremidos num cone: tudo parece parecido com tudo. À direita, cada assunto aponta para um lado e o cosseno consegue separar.](../assets/blog/como-um-modelo-aprende-a-gerar-embeddings/image-kv6d.webp "À esquerda, veetores espremidos num cone: tudo parece parecido com tudo. À direita, cada assunto aponta para um lado e o cosseno consegue separar.")

Gosto de uma comparação. O encoder é alguém que leu uma biblioteca inteira e escreve muito bem. O modelo de embeddings é alguém que também leu tudo, mas foi treinado para outra coisa: organizar a biblioteca, colocando cada livro perto dos que tratam do mesmo assunto. A primeira pessoa é ótima, mas não foi ela quem arrumou as estantes.

![Mesma leitura, treinos diferentes: só o modelo de embeddings organiza os textos por assunto.](../assets/blog/como-um-modelo-aprende-a-gerar-embeddings/image-j06p.webp "Mesma leitura, treinos diferentes: só o modelo de embeddings organiza os textos por assunto.")

## Aprender por comparação

O treino que transforma um encoder em modelo de embeddings se chama **aprendizado contrastivo**. A ideia cabe numa frase: mostrar ao modelo pares de textos que deveriam ficar perto e pedir que ele aproxime esses pares e afaste o resto.

Um par pode ser uma pergunta e o trecho que responde a ela, um título e o corpo da notícia, uma pergunta de fórum e a resposta aceita. Para o nosso exemplo:

- pergunta: "dor atrás dos olhos e manchas vermelhas no corpo"
- par positivo: "Dengue: febre alta, dor retro-orbitária, dor muscular e exantema"

E os negativos, de onde vêm? Aqui entra um truque esperto. O treino acontece em lotes, por exemplo 32 pares de cada vez. Para a pergunta sobre dengue, o par certo é o texto da dengue, e **os outros 31 textos do lote viram negativos de graça**, porque foram escritos para outras perguntas. Isso se chama *in-batch negatives*, e é por isso que lotes maiores costumam ajudar: mais negativos sem custo extra. O artigo do DPR, de 2020, mostrou que esse reaproveitamento é barato e funciona muito bem para busca.

A figura mostra um lote pequeno, de quatro pares. Cada linha é uma pergunta e cada coluna, um texto. Na diagonal estão os pares certos; todo o resto vira negativo sem ninguém precisar rotular nada.

![Num lote de quatro pares, cada pergunta tem um par certo e ganha três negativos de graça: os textos das outras perguntas.](../assets/blog/como-um-modelo-aprende-a-gerar-embeddings/image-32b2.webp "Num lote de quatro pares, cada pergunta tem um par certo e ganha três negativos de graça: os textos das outras perguntas.")

### A conta, com números inventados

Imagine que, no começo do treino, o modelo calcula estas similaridades entre a pergunta e quatro textos do lote:

| Texto | similaridade |
|---|---|
| Dengue (o par certo) | 0.86 |
| Chikungunya | 0.85 |
| Síndrome gripal | 0.84 |
| Hipertensão | 0.83 |

É o retrato de um modelo que ainda não aprendeu a separar: valores quase iguais para textos que deveriam ficar longe uns dos outros. A função de perda mais usada, a **InfoNCE**, transforma essas similaridades numa espécie de prova de múltipla escolha: "entre estes textos, qual é o par da pergunta?". Ela divide cada similaridade por um número pequeno, a **temperatura** (aqui, 0,05), e aplica uma softmax, que converte tudo em probabilidades que somam 1. O valor de 0,05 não é por acaso: é o padrão da biblioteca sentence-transformers. Com os números acima, o modelo dá só **33%** de chance ao texto certo, e a perda fica em 1,11.

O treino ajusta os pesos do modelo para aumentar essa chance. Depois de muitos passos, as similaridades poderiam ficar assim: dengue 0.90, chikungunya 0.60, gripe 0.40, hipertensão 0.10. Agora o texto certo leva **99,7%** da probabilidade, e a perda cai para perto de zero. Ninguém disse ao modelo o que é dengue; ele só foi corrigido milhões de vezes até aprender a separar.

A temperatura explica uma coisa que ficou estranha no post 1: as similaridades do e5 ficaram todas entre 0,84 e 0,87. Os autores contam no FAQ do modelo que usaram uma temperatura bem baixa, de 0,01. Com temperatura baixa, pequenas diferenças de cosseno já bastam para separar o certo do errado durante o treino, e o modelo não precisa espalhar os valores. Por isso o número absoluto quase não diz nada, e o que importa é a ordem.

### Negativos difíceis

Separar dengue de hipertensão é fácil. O que ensina de verdade é separar dengue de chikungunya, ou "dengue com sinais de alarme" de "dengue sem sinais de alarme": textos que dividem quase todas as palavras e o mesmo assunto, mas não respondem à mesma pergunta. Esses são os **negativos difíceis** (*hard negatives*). Um jeito clássico de encontrá-los é usar a própria busca por palavras: pegar o que o BM25 devolve de mais parecido e que não é a resposta certa. No DPR, acrescentar um único negativo desses por pergunta melhorou o resultado de forma clara. Montar bons negativos difíceis é uma parte grande do trabalho de quem treina esses modelos.

## De onde vêm os pares

O Sentence-BERT original foi treinado com dados de inferência textual, pares de frases rotuladas por pessoas como "uma implica a outra", "uma contradiz a outra" ou "nenhuma das duas": cerca de 570 mil pares no SNLI e 430 mil no MultiNLI. Funcionou, mas rotular pares à mão não escala.

Os modelos atuais apostam em volume. O E5, da Microsoft, foi treinado em duas etapas. Primeiro, com cerca de 270 milhões de pares tirados da web, sem rótulo manual: post e comentário do Reddit, pergunta e resposta do StackExchange, título e resumo de artigos científicos, título e texto de páginas e notícias. É supervisão fraca, porque nem todo par é perfeito, mas o volume compensa. Depois vem um ajuste fino com conjuntos rotulados de busca, como o MS MARCO, já com negativos difíceis. A versão multilíngue, a que usei no post 1, foi pré-treinada com cerca de **1 bilhão de pares** em várias línguas. O Qwen3-Embedding vai além e usa um modelo de linguagem grande para gerar pares sintéticos de treino.

E o português? Aqui tem contribuição brasileira importante. O **mMARCO**, da Unicamp, traduziu o MS MARCO, o conjunto de busca mais usado do mundo, para 13 línguas, incluindo o português, e virou matéria-prima para treinar e avaliar modelos de busca na nossa língua. E do outro lado do Atlântico, o grupo PORTULAN, da Universidade de Lisboa, publicou o **Serafim**, uma família de encoders de frases abertos para o português.

## Por que os prefixos importam

Lembra dos `query:` e `passage:` do código do post 1? Eles existem porque a busca é **assimétrica**. A pergunta costuma ser curta e informal ("dor atrás dos olhos"), e o documento, longo e técnico. São textos de naturezas diferentes, e o modelo aprende melhor quando sabe qual é qual.

Cada família resolve isso do seu jeito, e o detalhe faz diferença:

- **multilingual-e5**: `query: ` na pergunta e `passage: ` no documento. Os autores avisam no FAQ que, sem os prefixos, o desempenho cai.
- **Qwen3-Embedding**: uma instrução só do lado da pergunta, no formato `Instruct: {tarefa}\nQuery: {pergunta}`. Os documentos vão sem nada. O cartão do modelo fala em perda de 1% a 5% sem a instrução e recomenda escrever a instrução em inglês, mesmo para buscar em outra língua.

O erro mais comum que vejo é trocar de modelo e esquecer de trocar a convenção. Nada quebra, nenhum erro aparece, a busca só fica pior em silêncio. Vale sempre ler o cartão do modelo antes de usar. No código abaixo dá para ver isso acontecer.

## Mão na massa

O código abaixo faz o teste que motivou este post: compara o BERTimbau usado direto, com média dos vetores, contra o multilingual-e5-small, nos mesmos documentos do post 1. Ele roda o e5 duas vezes, com e sem os prefixos, para ver o efeito deles. Roda no Colab ou num notebook comum (`pip install sentence-transformers`):

```python
from sentence_transformers import SentenceTransformer

documentos = [
    "Dengue: febre alta, dor retro-orbitária, dor muscular e exantema",
    "Sinais de alarme na dengue: dor abdominal intensa, vômitos persistentes e sangramento de mucosas",
    "Chikungunya: febre e dor intensa nas articulações, que pode durar meses",
    "Síndrome gripal: febre, tosse, coriza e dor de garganta",
    "Hipertensão arterial: diagnóstico e acompanhamento na atenção primária",
]
pergunta = "dor atrás dos olhos e manchas vermelhas no corpo"

def ranking(nome, prefixo_pergunta="", prefixo_doc=""):
    modelo = SentenceTransformer(nome)
    docs_vec = modelo.encode([prefixo_doc + d for d in documentos], normalize_embeddings=True)
    perg_vec = modelo.encode(prefixo_pergunta + pergunta, normalize_embeddings=True)
    sims = docs_vec @ perg_vec
    print(f"\n{nome}  (prefixos: {'sim' if prefixo_pergunta else 'não'})")
    for doc, s in sorted(zip(documentos, sims), key=lambda x: -x[1]):
        print(f"  {s:.3f}  {doc[:55]}")

ranking("neuralmind/bert-base-portuguese-cased")                    # encoder, média dos tokens
ranking("intfloat/multilingual-e5-small", "query: ", "passage: ")   # modelo de embeddings
ranking("intfloat/multilingual-e5-small")                           # o mesmo, sem prefixos
```

Ao carregar o BERTimbau, a biblioteca mostra um relatório dizendo que alguns pesos, os que começam com `cls.`, ficaram sem uso. São as peças que o modelo usava no pré-treino, por exemplo para adivinhar a palavra escondida. Para gerar embeddings elas são descartadas, e o que sobra é o encoder, com a média dos vetores por cima. Esse relatório já resume o assunto deste post.

Quando rodei aqui, o resultado foi este:

```
neuralmind/bert-base-portuguese-cased  (prefixos: não)
  0.706  Sinais de alarme na dengue: dor abdominal intensa, vômi
  0.702  Dengue: febre alta, dor retro-orbitária, dor muscular e
  0.668  Chikungunya: febre e dor intensa nas articulações, que 
  0.661  Síndrome gripal: febre, tosse, coriza e dor de garganta
  0.506  Hipertensão arterial: diagnóstico e acompanhamento na a

intfloat/multilingual-e5-small  (prefixos: sim)
  0.873  Dengue: febre alta, dor retro-orbitária, dor muscular e
  0.867  Chikungunya: febre e dor intensa nas articulações, que 
  0.866  Sinais de alarme na dengue: dor abdominal intensa, vômi
  0.855  Síndrome gripal: febre, tosse, coriza e dor de garganta
  0.843  Hipertensão arterial: diagnóstico e acompanhamento na a

intfloat/multilingual-e5-small  (prefixos: não)
  0.901  Chikungunya: febre e dor intensa nas articulações, que 
  0.896  Dengue: febre alta, dor retro-orbitária, dor muscular e
  0.892  Sinais de alarme na dengue: dor abdominal intensa, vômi
  0.875  Síndrome gripal: febre, tosse, coriza e dor de garganta
  0.858  Hipertensão arterial: diagnóstico e acompanhamento na a
```

Vale ser justo com o BERTimbau: ele não foi um desastre. Colocou os dois textos de dengue no topo e a hipertensão bem lá embaixo, porque entende português e percebe que febre, dor e manchas pertencem ao mesmo universo. Mas errou o primeiro lugar. Pôs na frente os sinais de alarme (dor abdominal, vômitos, sangramento), que não têm nada a ver com dor atrás dos olhos, e por uma diferença de 0,004. É o jeito de errar de quem conhece o assunto, mas nunca foi treinado para responder "qual destes textos responde a esta pergunta?". O e5 com prefixos, que repete o resultado do post 1, acerta o primeiro lugar.

A terceira rodada foi a que mais me chamou atenção. O mesmo e5, só que sem os prefixos, coloca a chikungunya em primeiro e a dengue em segundo. Nenhum erro, nenhum aviso: a busca simplesmente piorou em silêncio, exatamente como descrevi na seção anterior. Os valores também subiram todos, para a faixa de 0,86 a 0,90.

Dois cuidados antes de tirar conclusões. Primeiro, números de modelos diferentes não se comparam: o BERTimbau ir de 0,51 a 0,71 e o e5 de 0,84 a 0,87 não quer dizer que um separa melhor que o outro, porque cada modelo tem a sua escala. O que se compara é a ordem. Segundo, uma pergunta e cinco documentos são uma demonstração, não uma medição. Repare como a margem entre os três primeiros do e5 é apertada. Comparar modelos de verdade exige centenas de perguntas e métricas próprias, que são o assunto dos posts 5 e 6.

<p class="post-note">Os exemplos de saúde deste post são didáticos e simplificados. Não são orientação médica: diante de sintomas, procure um serviço de saúde.</p>

## E se eu quiser treinar o meu?

Dá, e não é tão difícil quanto parece. Com a biblioteca `sentence-transformers`, o caminho mais curto é juntar pares (pergunta, trecho certo) do seu domínio e ajustar um modelo que já existe com a `MultipleNegativesRankingLoss`, que é justamente a InfoNCE com negativos do próprio lote. A documentação recomenda lotes grandes, pelo motivo que vimos acima. O tutorial do Tom Aarsen, na seção de referências, mostra o passo a passo. Na maioria dos casos, porém, um bom modelo pronto resolve, e a primeira pergunta deveria ser outra: o modelo que já existe é bom o bastante para os meus dados? Saber responder isso com números é o assunto do post 5.

## Para fechar

Se tiver que guardar uma frase deste post, é esta: **um modelo de embeddings é um encoder que foi treinado por comparação.** Entender a língua vem do pré-treino; saber colocar textos parecidos perto um do outro vem do treino contrastivo, com pares, negativos e uma temperatura. E cada modelo carrega as convenções do jeito como foi treinado, como os prefixos e a escala das similaridades.

No próximo post a gente sai do modelo e vai para a busca em si: como encontrar os vizinhos mais próximos entre milhões de vetores sem comparar a pergunta com um por um.

## Para ir mais fundo

**Livros**

- Jurafsky, D.; Martin, J. H. *Speech and Language Processing*, 3ª ed. (rascunho). [Online e gratuito](https://web.stanford.edu/~jurafsky/slp3/). O capítulo de recuperação de informação e RAG conecta embeddings e busca, e vai servir para os próximos posts também.
- Caseli, H. M.; Nunes, M. G. V. (orgs.). *Processamento de Linguagem Natural: Conceitos, Técnicas e Aplicações em Português*. 4ª ed., BPLN, 2026. [Online e gratuito](https://brasileiraspln.ufscar.br/livro-pln-4ed-vol1/). O capítulo 10, "Representação vetorial e semântica distribucional", é a melhor porta de entrada em português.

**Artigos**

- Reimers, N.; Gurevych, I. [Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks](https://arxiv.org/abs/1908.10084). EMNLP, 2019. De onde vêm os números do BERT contra o GloVe, e a proposta de treinar o encoder para gerar vetores de frase.
- Ethayarajh, K. [How Contextual are Contextualized Word Representations?](https://arxiv.org/abs/1909.00512) EMNLP, 2019. O estudo que mostrou os vetores espremidos num cone estreito.
- van den Oord, A.; Li, Y.; Vinyals, O. [Representation Learning with Contrastive Predictive Coding](https://arxiv.org/abs/1807.03748). 2018. A origem da perda InfoNCE.
- Karpukhin, V. et al. [Dense Passage Retrieval for Open-Domain Question Answering](https://arxiv.org/abs/2004.04906). EMNLP, 2020. Negativos do próprio lote e negativos difíceis vindos do BM25, na prática.
- Wang, L. et al. [Text Embeddings by Weakly-Supervised Contrastive Pre-training](https://arxiv.org/abs/2212.03533). 2022. O E5: pares tirados da web e treino em duas etapas.
- Wang, L. et al. [Multilingual E5 Text Embeddings: A Technical Report](https://arxiv.org/abs/2402.05672). 2024. A versão multilíngue, com 1 bilhão de pares.
- Zhang, Y. et al. [Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models](https://arxiv.org/abs/2506.05176). 2025. Como usar um modelo de linguagem grande para gerar dados de treino.

**Em português**

- Souza, F.; Nogueira, R.; Lotufo, R. [BERTimbau: Pretrained BERT Models for Brazilian Portuguese](https://link.springer.com/chapter/10.1007/978-3-030-61377-8_28). BRACIS, 2020. O encoder usado como contraexemplo, com os modelos [no Hugging Face](https://huggingface.co/neuralmind/bert-base-portuguese-cased).
- Bonifacio, L. et al. [mMARCO: A Multilingual Version of the MS MARCO Passage Ranking Dataset](https://arxiv.org/abs/2108.13897). 2021. O MS MARCO em português, feito na Unicamp; os dados estão [no Hugging Face](https://huggingface.co/datasets/unicamp-dl/mmarco).
- Gomes, L. et al. [Open Sentence Embeddings for Portuguese with the Serafim PT* encoders family](https://arxiv.org/abs/2407.19527). 2024. Encoders de frases abertos para o português, do grupo PORTULAN.

**Blogs e documentação**

- Weng, L. [Contrastive Representation Learning](https://lilianweng.github.io/posts/2021-05-31-contrastive/). 2021. O panorama mais completo que conheço sobre perdas contrastivas, lotes grandes e negativos difíceis.
- Aarsen, T. [Training and Finetuning Embedding Models with Sentence Transformers](https://huggingface.co/blog/train-sentence-transformers). Hugging Face, 2024. O passo a passo para treinar o seu, com a `MultipleNegativesRankingLoss`.
- intfloat. [Cartão do multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small). O FAQ explica os prefixos e por que as similaridades ficam entre 0,7 e 1,0.No post anterior, um modelo pequeno colocou "Dengue: febre alta, dor retro-orbitária..." em primeiro lugar para a pergunta "dor atrás dos olhos e manchas vermelhas no corpo", sem nenhuma palavra em comum entre as duas. Ficou uma pergunta no ar: quem ensinou esse modelo a fazer isso?

E tem uma pergunta irmã que eu ouço bastante, inclusive de alunos: se o BERTimbau entende português tão bem, por que não usar ele direto para gerar os embeddings da busca? A resposta curta é que entender bem a língua e saber organizar textos por significado são habilidades diferentes, aprendidas de jeitos diferentes. Este post é sobre essa diferença.

<p class="post-note"><strong>Série: busca semântica, do zero à produção.</strong> 1. O que é um embedding · 2. Como um modelo aprende a gerar embeddings (este post) · 3. Buscando de verdade: similaridade e índices vetoriais · 4. BM25 não morreu: busca híbrida e reranking · 5. Como saber se a busca está boa · 6. Um benchmark de modelos em português · 7. Do protótipo à produção</p>

## Um encoder não é um modelo de embeddings

Modelos como o BERT e o BERTimbau são chamados de **encoders**. Eles são treinados com uma tarefa de preencher lacunas: o modelo recebe uma frase com uma palavra escondida e tenta adivinhar qual é. O próprio cartão do BERTimbau usa o exemplo "Tinha uma [MASK] no meio do caminho", e o modelo aprende que ali cabe "pedra". Repetindo isso bilhões de vezes, ele aprende muito sobre a língua: gramática, sentido das palavras, o que costuma aparecer perto do quê.

Repare no que essa tarefa pede e no que ela não pede. Ela pede que o modelo entenda cada palavra no seu contexto. Ela não pede, em momento nenhum, que o modelo coloque frases com o mesmo significado perto uma da outra. E a saída de um encoder também não é um vetor por frase: é um vetor para cada pedaço de palavra (token). Para chegar a um vetor só, o jeito mais comum é tirar a média de todos eles, o que se chama *mean pooling*.

Funciona? O artigo do Sentence-BERT, de 2019, mediu exatamente isso. Usar a média dos vetores do BERT, ou o vetor especial `[CLS]` que ele tem no início de toda frase, como embedding de frase deu resultados **piores do que tirar a média dos vetores do GloVe**, um modelo de 2014 que nem sabe o que é contexto. Em sete tarefas de similaridade, a média do BERT ficou com correlação média de 54,81 (numa escala até 100) e o `[CLS]`, com 29,19.

Uma parte da explicação é geométrica. Um estudo de 2019 do Kawin Ethayarajh mostrou que os vetores produzidos por esses modelos não se espalham pelo espaço: ficam todos espremidos num cone estreito, apontando mais ou menos para o mesmo lado. Na prática, quase tudo parece parecido com quase tudo, e a similaridade de cosseno perde o poder de separar o que é relevante do que não é.

Gosto de uma comparação. O encoder é alguém que leu uma biblioteca inteira e escreve muito bem. O modelo de embeddings é alguém que também leu tudo, mas foi treinado para outra coisa: organizar a biblioteca, colocando cada livro perto dos que tratam do mesmo assunto. A primeira pessoa é ótima, mas não foi ela quem arrumou as estantes.

## Aprender por comparação

O treino que transforma um encoder em modelo de embeddings se chama **aprendizado contrastivo**. A ideia cabe numa frase: mostrar ao modelo pares de textos que deveriam ficar perto e pedir que ele aproxime esses pares e afaste o resto.

Um par pode ser uma pergunta e o trecho que responde a ela, um título e o corpo da notícia, uma pergunta de fórum e a resposta aceita. Para o nosso exemplo:

- pergunta: "dor atrás dos olhos e manchas vermelhas no corpo"
- par positivo: "Dengue: febre alta, dor retro-orbitária, dor muscular e exantema"

E os negativos, de onde vêm? Aqui entra um truque esperto. O treino acontece em lotes, por exemplo 32 pares de cada vez. Para a pergunta sobre dengue, o par certo é o texto da dengue, e **os outros 31 textos do lote viram negativos de graça**, porque foram escritos para outras perguntas. Isso se chama *in-batch negatives*, e é por isso que lotes maiores costumam ajudar: mais negativos sem custo extra. O artigo do DPR, de 2020, mostrou que esse reaproveitamento é barato e funciona muito bem para busca.

### A conta, com números inventados

Imagine que, no começo do treino, o modelo calcula estas similaridades entre a pergunta e quatro textos do lote:

| Texto | similaridade |
|---|---|
| Dengue (o par certo) | 0.86 |
| Chikungunya | 0.85 |
| Síndrome gripal | 0.84 |
| Hipertensão | 0.83 |

É o retrato de um modelo que ainda não aprendeu a separar: valores quase iguais para textos que deveriam ficar longe uns dos outros. A função de perda mais usada, a **InfoNCE**, transforma essas similaridades numa espécie de prova de múltipla escolha: "entre estes textos, qual é o par da pergunta?". Ela divide cada similaridade por um número pequeno, a **temperatura** (aqui, 0,05), e aplica uma softmax, que converte tudo em probabilidades que somam 1. O valor de 0,05 não é por acaso: é o padrão da biblioteca sentence-transformers. Com os números acima, o modelo dá só **33%** de chance ao texto certo, e a perda fica em 1,11.

O treino ajusta os pesos do modelo para aumentar essa chance. Depois de muitos passos, as similaridades poderiam ficar assim: dengue 0.90, chikungunya 0.60, gripe 0.40, hipertensão 0.10. Agora o texto certo leva **99,7%** da probabilidade, e a perda cai para perto de zero. Ninguém disse ao modelo o que é dengue; ele só foi corrigido milhões de vezes até aprender a separar.

A temperatura explica uma coisa que ficou estranha no post 1: as similaridades do e5 ficaram todas entre 0,84 e 0,87. Os autores contam no FAQ do modelo que usaram uma temperatura bem baixa, de 0,01. Com temperatura baixa, pequenas diferenças de cosseno já bastam para separar o certo do errado durante o treino, e o modelo não precisa espalhar os valores. Por isso o número absoluto quase não diz nada, e o que importa é a ordem.

### Negativos difíceis

Separar dengue de hipertensão é fácil. O que ensina de verdade é separar dengue de chikungunya, ou "dengue com sinais de alarme" de "dengue sem sinais de alarme": textos que dividem quase todas as palavras e o mesmo assunto, mas não respondem à mesma pergunta. Esses são os **negativos difíceis** (*hard negatives*). Um jeito clássico de encontrá-los é usar a própria busca por palavras: pegar o que o BM25 devolve de mais parecido e que não é a resposta certa. No DPR, acrescentar um único negativo desses por pergunta melhorou o resultado de forma clara. Montar bons negativos difíceis é uma parte grande do trabalho de quem treina esses modelos.

## De onde vêm os pares

O Sentence-BERT original foi treinado com dados de inferência textual, pares de frases rotuladas por pessoas como "uma implica a outra", "uma contradiz a outra" ou "nenhuma das duas": cerca de 570 mil pares no SNLI e 430 mil no MultiNLI. Funcionou, mas rotular pares à mão não escala.

Os modelos atuais apostam em volume. O E5, da Microsoft, foi treinado em duas etapas. Primeiro, com cerca de 270 milhões de pares tirados da web, sem rótulo manual: post e comentário do Reddit, pergunta e resposta do StackExchange, título e resumo de artigos científicos, título e texto de páginas e notícias. É supervisão fraca, porque nem todo par é perfeito, mas o volume compensa. Depois vem um ajuste fino com conjuntos rotulados de busca, como o MS MARCO, já com negativos difíceis. A versão multilíngue, a que usei no post 1, foi pré-treinada com cerca de **1 bilhão de pares** em várias línguas. O Qwen3-Embedding vai além e usa um modelo de linguagem grande para gerar pares sintéticos de treino.

E o português? Aqui tem contribuição brasileira importante. O **mMARCO**, da Unicamp, traduziu o MS MARCO, o conjunto de busca mais usado do mundo, para 13 línguas, incluindo o português, e virou matéria-prima para treinar e avaliar modelos de busca na nossa língua. E do outro lado do Atlântico, o grupo PORTULAN, da Universidade de Lisboa, publicou o **Serafim**, uma família de encoders de frases abertos para o português.

## Por que os prefixos importam

Lembra dos `query:` e `passage:` do código do post 1? Eles existem porque a busca é **assimétrica**. A pergunta costuma ser curta e informal ("dor atrás dos olhos"), e o documento, longo e técnico. São textos de naturezas diferentes, e o modelo aprende melhor quando sabe qual é qual.

Cada família resolve isso do seu jeito, e o detalhe faz diferença:

- **multilingual-e5**: `query: ` na pergunta e `passage: ` no documento. Os autores avisam no FAQ que, sem os prefixos, o desempenho cai.
- **Qwen3-Embedding**: uma instrução só do lado da pergunta, no formato `Instruct: {tarefa}\nQuery: {pergunta}`. Os documentos vão sem nada. O cartão do modelo fala em perda de 1% a 5% sem a instrução e recomenda escrever a instrução em inglês, mesmo para buscar em outra língua.

O erro mais comum que vejo é trocar de modelo e esquecer de trocar a convenção. Nada quebra, nenhum erro aparece, a busca só fica pior em silêncio. Vale sempre ler o cartão do modelo antes de usar. No código abaixo dá para ver isso acontecer.

## Mão na massa

O código abaixo faz o teste que motivou este post: compara o BERTimbau usado direto, com média dos vetores, contra o multilingual-e5-small, nos mesmos documentos do post 1. Ele roda o e5 duas vezes, com e sem os prefixos, para ver o efeito deles. Roda no Colab ou num notebook comum (`pip install sentence-transformers`):

```python
from sentence_transformers import SentenceTransformer

documentos = [
    "Dengue: febre alta, dor retro-orbitária, dor muscular e exantema",
    "Sinais de alarme na dengue: dor abdominal intensa, vômitos persistentes e sangramento de mucosas",
    "Chikungunya: febre e dor intensa nas articulações, que pode durar meses",
    "Síndrome gripal: febre, tosse, coriza e dor de garganta",
    "Hipertensão arterial: diagnóstico e acompanhamento na atenção primária",
]
pergunta = "dor atrás dos olhos e manchas vermelhas no corpo"

def ranking(nome, prefixo_pergunta="", prefixo_doc=""):
    modelo = SentenceTransformer(nome)
    docs_vec = modelo.encode([prefixo_doc + d for d in documentos], normalize_embeddings=True)
    perg_vec = modelo.encode(prefixo_pergunta + pergunta, normalize_embeddings=True)
    sims = docs_vec @ perg_vec
    print(f"\n{nome}  (prefixos: {'sim' if prefixo_pergunta else 'não'})")
    for doc, s in sorted(zip(documentos, sims), key=lambda x: -x[1]):
        print(f"  {s:.3f}  {doc[:55]}")

ranking("neuralmind/bert-base-portuguese-cased")                    # encoder, média dos tokens
ranking("intfloat/multilingual-e5-small", "query: ", "passage: ")   # modelo de embeddings
ranking("intfloat/multilingual-e5-small")                           # o mesmo, sem prefixos
```

Ao carregar o BERTimbau, a biblioteca mostra um relatório dizendo que alguns pesos, os que começam com `cls.`, ficaram sem uso. São as peças que o modelo usava no pré-treino, por exemplo para adivinhar a palavra escondida. Para gerar embeddings elas são descartadas, e o que sobra é o encoder, com a média dos vetores por cima. Esse relatório já resume o assunto deste post.

Quando rodei aqui, o resultado foi este:

```
neuralmind/bert-base-portuguese-cased  (prefixos: não)
  0.706  Sinais de alarme na dengue: dor abdominal intensa, vômi
  0.702  Dengue: febre alta, dor retro-orbitária, dor muscular e
  0.668  Chikungunya: febre e dor intensa nas articulações, que 
  0.661  Síndrome gripal: febre, tosse, coriza e dor de garganta
  0.506  Hipertensão arterial: diagnóstico e acompanhamento na a

intfloat/multilingual-e5-small  (prefixos: sim)
  0.873  Dengue: febre alta, dor retro-orbitária, dor muscular e
  0.867  Chikungunya: febre e dor intensa nas articulações, que 
  0.866  Sinais de alarme na dengue: dor abdominal intensa, vômi
  0.855  Síndrome gripal: febre, tosse, coriza e dor de garganta
  0.843  Hipertensão arterial: diagnóstico e acompanhamento na a

intfloat/multilingual-e5-small  (prefixos: não)
  0.901  Chikungunya: febre e dor intensa nas articulações, que 
  0.896  Dengue: febre alta, dor retro-orbitária, dor muscular e
  0.892  Sinais de alarme na dengue: dor abdominal intensa, vômi
  0.875  Síndrome gripal: febre, tosse, coriza e dor de garganta
  0.858  Hipertensão arterial: diagnóstico e acompanhamento na a
```

Vale ser justo com o BERTimbau: ele não foi um desastre. Colocou os dois textos de dengue no topo e a hipertensão bem lá embaixo, porque entende português e percebe que febre, dor e manchas pertencem ao mesmo universo. Mas errou o primeiro lugar. Pôs na frente os sinais de alarme (dor abdominal, vômitos, sangramento), que não têm nada a ver com dor atrás dos olhos, e por uma diferença de 0,004. É o jeito de errar de quem conhece o assunto, mas nunca foi treinado para responder "qual destes textos responde a esta pergunta?". O e5 com prefixos, que repete o resultado do post 1, acerta o primeiro lugar.

A terceira rodada foi a que mais me chamou atenção. O mesmo e5, só que sem os prefixos, coloca a chikungunya em primeiro e a dengue em segundo. Nenhum erro, nenhum aviso: a busca simplesmente piorou em silêncio, exatamente como descrevi na seção anterior. Os valores também subiram todos, para a faixa de 0,86 a 0,90.

Dois cuidados antes de tirar conclusões. Primeiro, números de modelos diferentes não se comparam: o BERTimbau ir de 0,51 a 0,71 e o e5 de 0,84 a 0,87 não quer dizer que um separa melhor que o outro, porque cada modelo tem a sua escala. O que se compara é a ordem. Segundo, uma pergunta e cinco documentos são uma demonstração, não uma medição. Repare como a margem entre os três primeiros do e5 é apertada. Comparar modelos de verdade exige centenas de perguntas e métricas próprias, que são o assunto dos posts 5 e 6.

<p class="post-note">Os exemplos de saúde deste post são didáticos e simplificados. Não são orientação médica: diante de sintomas, procure um serviço de saúde.</p>

## E se eu quiser treinar o meu?

Dá, e não é tão difícil quanto parece. Com a biblioteca `sentence-transformers`, o caminho mais curto é juntar pares (pergunta, trecho certo) do seu domínio e ajustar um modelo que já existe com a `MultipleNegativesRankingLoss`, que é justamente a InfoNCE com negativos do próprio lote. A documentação recomenda lotes grandes, pelo motivo que vimos acima. O tutorial do Tom Aarsen, na seção de referências, mostra o passo a passo. Na maioria dos casos, porém, um bom modelo pronto resolve, e a primeira pergunta deveria ser outra: o modelo que já existe é bom o bastante para os meus dados? Saber responder isso com números é o assunto do post 5.

## Para fechar

Se tiver que guardar uma frase deste post, é esta: **um modelo de embeddings é um encoder que foi treinado por comparação.** Entender a língua vem do pré-treino; saber colocar textos parecidos perto um do outro vem do treino contrastivo, com pares, negativos e uma temperatura. E cada modelo carrega as convenções do jeito como foi treinado, como os prefixos e a escala das similaridades.

No próximo post a gente sai do modelo e vai para a busca em si: como encontrar os vizinhos mais próximos entre milhões de vetores sem comparar a pergunta com um por um.

## Para ir mais fundo

**Livros**

- Jurafsky, D.; Martin, J. H. *Speech and Language Processing*, 3ª ed. (rascunho). [Online e gratuito](https://web.stanford.edu/~jurafsky/slp3/). O capítulo de recuperação de informação e RAG conecta embeddings e busca, e vai servir para os próximos posts também.
- Caseli, H. M.; Nunes, M. G. V. (orgs.). *Processamento de Linguagem Natural: Conceitos, Técnicas e Aplicações em Português*. 4ª ed., BPLN, 2026. [Online e gratuito](https://brasileiraspln.ufscar.br/livro-pln-4ed-vol1/). O capítulo 10, "Representação vetorial e semântica distribucional", é a melhor porta de entrada em português.

**Artigos**

- Reimers, N.; Gurevych, I. [Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks](https://arxiv.org/abs/1908.10084). EMNLP, 2019. De onde vêm os números do BERT contra o GloVe, e a proposta de treinar o encoder para gerar vetores de frase.
- Ethayarajh, K. [How Contextual are Contextualized Word Representations?](https://arxiv.org/abs/1909.00512) EMNLP, 2019. O estudo que mostrou os vetores espremidos num cone estreito.
- van den Oord, A.; Li, Y.; Vinyals, O. [Representation Learning with Contrastive Predictive Coding](https://arxiv.org/abs/1807.03748). 2018. A origem da perda InfoNCE.
- Karpukhin, V. et al. [Dense Passage Retrieval for Open-Domain Question Answering](https://arxiv.org/abs/2004.04906). EMNLP, 2020. Negativos do próprio lote e negativos difíceis vindos do BM25, na prática.
- Wang, L. et al. [Text Embeddings by Weakly-Supervised Contrastive Pre-training](https://arxiv.org/abs/2212.03533). 2022. O E5: pares tirados da web e treino em duas etapas.
- Wang, L. et al. [Multilingual E5 Text Embeddings: A Technical Report](https://arxiv.org/abs/2402.05672). 2024. A versão multilíngue, com 1 bilhão de pares.
- Zhang, Y. et al. [Qwen3 Embedding: Advancing Text Embedding and Reranking Through Foundation Models](https://arxiv.org/abs/2506.05176). 2025. Como usar um modelo de linguagem grande para gerar dados de treino.

**Em português**

- Souza, F.; Nogueira, R.; Lotufo, R. [BERTimbau: Pretrained BERT Models for Brazilian Portuguese](https://link.springer.com/chapter/10.1007/978-3-030-61377-8_28). BRACIS, 2020. O encoder usado como contraexemplo, com os modelos [no Hugging Face](https://huggingface.co/neuralmind/bert-base-portuguese-cased).
- Bonifacio, L. et al. [mMARCO: A Multilingual Version of the MS MARCO Passage Ranking Dataset](https://arxiv.org/abs/2108.13897). 2021. O MS MARCO em português, feito na Unicamp; os dados estão [no Hugging Face](https://huggingface.co/datasets/unicamp-dl/mmarco).
- Gomes, L. et al. [Open Sentence Embeddings for Portuguese with the Serafim PT* encoders family](https://arxiv.org/abs/2407.19527). 2024. Encoders de frases abertos para o português, do grupo PORTULAN.

**Blogs e documentação**

- Weng, L. [Contrastive Representation Learning](https://lilianweng.github.io/posts/2021-05-31-contrastive/). 2021. O panorama mais completo que conheço sobre perdas contrastivas, lotes grandes e negativos difíceis.
- Aarsen, T. [Training and Finetuning Embedding Models with Sentence Transformers](https://huggingface.co/blog/train-sentence-transformers). Hugging Face, 2024. O passo a passo para treinar o seu, com a `MultipleNegativesRankingLoss`.
- intfloat. [Cartão do multilingual-e5-small](https://huggingface.co/intfloat/multilingual-e5-small). O FAQ explica os prefixos e por que as similaridades ficam entre 0,7 e 1,0.
