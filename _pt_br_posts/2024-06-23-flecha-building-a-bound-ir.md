---
title: "Flecha Dev Log #3: Construindo a Fronteira Antes do Backend"
date: 2024-06-23
published: true
lang: pt-BR
translation_key: "flecha-building-a-bound-ir"
original_url: /flecha-building-a-bound-ir
permalink: /pt-br/flecha-building-a-bound-ir
---
# [](#intro)Introdução

Olá, pessoal!

Flecha poderia agora analisar um arquivo e determinar o que seus nomes e expressões significavam. O próximo passo óbvio foi começar a gerar código de máquina diretamente da AST.

Decidimos não o fazer.

Esse passo extra é uma das decisões arquitetônicas mais importantes no compilador: uma representação intermediária entre análise semântica e geração de código.

Porquê adicionar outra árvore quando já tínhamos uma? Porque o AST responde, “o que o programador escreveu?” A infra-estrutura precisa, “que operação deve realizar a máquina?”

# [](#syntax-is-not-a-backend-contract)Syntax não é um contrato de infraestrutura

Tome um programa simples:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 add(i32 left, i32 right) {
    return left + right;
}

i32 main() {
    answer := add(20, 22);
    return answer;
}</code></pre></div></div>
No AST, `answer` é uma expressão de nome e `add` é outra expressão de nome seguida de sintaxe de chamada. A infra- estrutura não deve realizar a pesquisa do escopo ou inferir o tipo de resultado novamente.

O menor converte sintaxe válida em um `BoundProgram`. Nesse programa:

- cada expressão tem um tipo semântico resolvido;
- cada nome aponta directamente para o seu símbolo;
- todos os pontos de chamada directamente para o seu símbolo de função;
- cada nó mantém a sua gama de origem;
- os erros de frontend impedem a redução total.

A representação resultante pode dizer algo próximo:

```text
function add(i32 left, i32 right) -> i32
function main() -> i32
  local answer: i32 = (call add 20:i32 22:i32)
  return load answer
```
Este despejo não é sintaxe Flecha e não é um formato de serialização. É uma janela determinística no que o compilador acredita que o programa significa.

# [](#lowering-removes-choices)O lowering elimina escolhas

Linguagens de origem muitas vezes fornecem várias maneiras de expressar fluxo de controle relacionado. As infra- estruturas são mais fáceis de verificar quando recebem menos formas.

Flecha tinha `if`, `else if`, `else` e uma cláusula experimental `also`. Em vez de ensinar cada futuro backend todas as quatro formas de superfície, o mais baixo normalizou-los.

`else if` torna-se um `if` aninhado dentro do bloco alternativo anterior. Uma cláusula `also` torna-se uma condicional anexada ao corpo bem sucedido de seu proprietário.

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">if ready {
    result = 40;
} also result == 40 {
    result = result + 2;
} else {
    result = 0;
}</code></pre></div></div>
A regra importante é que `also` é executado apenas se seu branch próprio for executado. A redução preserva essa regra usando condicionais aninhadas comuns. A infraestrutura não precisa de uma teoria especial de `also`.

Isto nos deu um princípio útil:

> A sintaxe de superfície pode ser expressiva. O IR deve ser explícito.

# [](#a-clean-failure-boundary)Uma fronteira clara de falha

O menor aceita o AST, modelo semântico e saco diagnóstico. Se o frontend tiver erros, ele não produz nenhum programa vinculado.

Essa decisão parece rigorosa, mas mantém fases posteriores honestas. A geração de código nunca recebe um nome desconhecido com um tipo "erro" e tenta fazer algo com ele. O frontend possui recuperação de fonte. A infra- estrutura possui programas válidos e vinculados.

Cada etapa, portanto, tem uma promessa clara:

1. O analisador produz sintaxe recuperável.
2. A análise semântica atribui significado e diagnósticos.
3. Baixando aceita apenas significado válido.
4. A geração de código aceita apenas a linguagem limitada menor.

Quando um compilador cresce, esses limites importam muito mais do que o número de classes em qualquer passagem.

# [](#lifetime-of-the-ir) Vida útil da IR

O IR ligado não duplica todos os símbolos. Mantém referências não próprias a símbolos pertencentes ao modelo semântico. Isso torna a identidade de símbolo estável através de análise semântica e rebaixamento, mas cria uma ordem de vida explícita:

```text
AST → SemanticModel → BoundProgram
```
O AST deve permanecer vivo enquanto as consultas semânticas são usadas. O modelo semântico deve permanecer vivo enquanto o programa vinculado se refere aos seus símbolos.

Ao invés de esconder essa dependência, documentamos e testamos. A propriedade interna previsível é o que permite passar mais tarde ser agressiva sem se tornar frágil.

# [](#what-became-possible) O que se tornou possível

A primeira IR ligada cobriu funções, blocos, declarações locais, declarações de expressão, retornos, condicionais, literais, variáveis, referências de funções, operações unárias e binárias, atribuições e chamadas diretas.

Esse era quase exatamente o subconjunto necessário para uma prova de conceito LLVM.

Mais importante, a infra-estrutura poderia agora ser escrita sem importar a lógica do analisador. Ele não resolveria nomes, decidiria tipos ou entenderia o nível de fonte `else if`. Traduziria um programa verificado e digitado em outra representação verificada.

Essa separação mantém o backend focado na tradução em vez da interpretação da língua-fonte.

# [](#conclusion)Conclusão

Adicionar um IR pode parecer atrasar a parte emocionante. Tínhamos um programa válido e queríamos código nativo. Em vez disso, construímos outra representação.

Mas este é o passo que torna a infra-estrutura suficientemente pequena para raciocinar. A língua de origem pode crescer enquanto LLVM continua a consumir um contrato deliberadamente restringido.

<a href="/">Voltar</a>
