---
title: "Flecha Dev Log #17: Tuplas, Múltiplos Resultados e Desestruturação"
date: 2025-08-12
published: true
lang: pt-BR
translation_key: "flecha-tuples-and-multiple-results"
original_url: /flecha-tuples-and-multiple-results
permalink: /pt-br/flecha-tuples-and-multiple-results
---
# [](#intro)Introdução

Olá, pessoal!

As funções Flecha podem devolver um valor. Isso se torna estranho assim que uma operação produz naturalmente dois: um quociente e restante, um resultado e status, ou um valor e seus metadados.

Tuplas fornecem retornos agregados, declarações de destruição, declaração e atribuição mistas e limpeza tuple-saware.

A sintaxe era compacta. As regras de avaliação tinham de ser exactas.

# [](#a-tuple-is-a-value)A tupla é um valor

Uma tupla contém dois ou mais elementos posicionais:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(i32, bool) result = (42, true);
inferred := (42, true);
(i32, (bool, u8)) nested = (42, (true, 7));</code></pre></div></div>
Parênteses em torno de uma expressão permanecem agrupando. `(42)` ainda é um `i32`; Flecha não adicionou tipos de tupla vazios ou de elemento único.

Elementos avaliam exatamente uma vez da esquerda para a direita. Isso torna-se importante quando as expressões têm efeitos colaterais ou recursos próprios.

# [](#multiple-results)Multiplos resultados

Uma função pode retornar uma tupla diretamente:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(i32, i32) divide(i32 dividend, i32 divisor) {
    return (dividend / divisor, dividend % divisor);
}

i32 main() {
    quotient, remainder := divide(17, 5);
    return quotient + remainder;
}</code></pre></div></div>
A chamada é uma vez. Seu resultado completo é capturado antes de qualquer mudança de destino.

Essa regra também torna a troca surpreendente:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">left, right = (right, left);</code></pre></div></div>
A tupla da direita é construída a partir dos valores antigos antes da atribuição começar. Nós não escrevemos acidentalmente `left` e então lemos esse novo valor para `right`.

# [](#destructuring-forms)Formas de destruição

Flecha suporta ligações inferidas, do tipo compartilhado, por nome, descartadas e mistas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">quotient, remainder := divide(17, 5);
i32 q, r = divide(17, 5);
i32 first, i32 second = divide(17, 5);
_, remainder = divide(19, 5);
(i32 next, quotient) = divide(20, 3);</code></pre></div></div>
A linha final declara `next` e atribui um `quotient` existente em uma operação de destruição. Cada destino é validado antes das gravações começarem.

`_` descarta uma posição sem criar uma ligação. Descartar um elemento próprio ainda executa qualquer limpeza que o valor exija.

# [](#ownership-inside-an-aggregate)Ownership dentro de um agregado

Tuplas podem conter strings próprias e tuplas aninhadas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(string, (u8, bool)) describe() {
    return ("Flecha", (42, true));
}</code></pre></div></div>
Devolver uma tupla própria constrói um resultado independente antes da limpeza do escopo do callee. Tuplas locais, parâmetros, temporários e capturas diferidas recursivamente destroem strings próprias.

A limpeza segue a estrutura da fonte ao contrário: campos tuplos são destruídos em ordem inversa, e a limpeza de fluxo de controle existente cobre cada borda de saída.

Referências, fatias e views de string foram inicialmente excluídas de elementos de tupla armazenados porque agregados precisariam preservar suas origens de empréstimo. Os ponteiros crus eram permitidos no âmbito de seu contrato inseguro existente.

# [](#internal-abi)Internal ABI

LLVM representa uma tupla como uma estrutura não-embalada cujos campos seguem a ordem de origem. Tuplas aninhadas permanecem estruturas aninhadas. A disposição dos dados do alvo determina o enchimento.

As funções Flecha passam e retornam esses agregados através de um compilador interno ABI. Nós não afirmamos explicitamente que o layout correspondeu a uma estrutura C ou permaneceria estável entre as versões do compilador.

Esta distinção permitiu que a linguagem ganhasse valores agregados úteis antes de congelar uma interface de função externa que não estava pronta para prometer.

# [](#conclusion)Conclusão

Tuplas dão à Flecha um modelo direto para múltiplos resultados sem parâmetros ocultos ou objetos especiais de execução.

Eles são valores posicionais comuns, então as mesmas regras para ordem de avaliação, propriedade, limpeza e representação ABI se aplicam de forma consistente.

<a href="/">Voltar</a>
