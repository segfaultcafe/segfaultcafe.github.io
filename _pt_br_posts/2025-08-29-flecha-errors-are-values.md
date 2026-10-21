---
title: "Flecha Dev Log #18: Erros São Valores"
date: 2025-08-29
published: true
lang: pt-BR
translation_key: "flecha-errors-are-values"
original_url: /flecha-errors-are-values
permalink: /pt-br/flecha-errors-are-values
---
# [](#intro)Introdução

Olá, pessoal!

Uma vez que Flecha poderia retornar tuplas, um caso de uso tornou-se impossível ignorar: um resultado de função e um erro.

Não queríamos exceções, pilha escondida descontraindo, ou um booleano que esqueceu qual falha ocorreu. Queríamos que fossem digitados valores que o fluxo de controle comum pudesse inspecionar e propagar.

Famílias de erros nomeadas, um tipo genérico de `error`, sucesso explícito através do `none` e representações livres de alocação fornecem esse modelo.

# [](#named-families) Famílias nomeadas

Uma família de erros declara suas possíveis falhas:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">error MathError {
    DivisionByZero,
    Overflow,
}

error InputError {
    InvalidDigit,
}</code></pre></div></div>
`MathError` e `InputError` são tipos nominais distintos. A mesma grafia variante em duas famílias ainda representaria falhas diferentes.

Variantes não têm carga útil ou códigos numéricos selecionados pelo usuário. `none` é o valor de sucesso implícito e não pode ser declarado como uma variante de falha.

# [](#specific-and-generic)Specífico e genérico

Um erro chamado pode ampliar para o tipo genérico integrado `error`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">MathError specific = MathError.Overflow;
error general = specific;
general = InputError.InvalidDigit;</code></pre></div></div>
O valor genérico preserva identidade familiar e variante. A conversão na outra direção é rejeitada porque o compilador não pode provar que um erro genérico pertence à família solicitada.

Duas famílias diferentes não podem ser comparadas diretamente. Aumente-os para `error` quando a comparação entre famílias é intencional.

Não há moldes numéricos, downcasts ou conversões automáticas de erro para string.

# [](#success-is-explicit)Sucesso é explícito

`none` representa o sucesso:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">MathError success = none;

if success != none {
    return 1;
}</code></pre></div></div>
Erros não convertem implicitamente para booleanos. Código diz `err != none` em vez de confiar em uma regra de veracidade cuja direção os leitores devem lembrar.

`==` e `!=` comuns permitem o alargamento contextual. `===` e `!==` restrito incluem o tipo estático, então um erro chamado e erro genérico permanecem estritamente diferentes mesmo quando sua identidade de erro comum coincide.

# [](#multiple-results-and-propagation)Multiplos resultados e propagação

Tuplas fazem o estilo pretendido direto:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">(i32, MathError) divide(i32 numerator, i32 denominator) {
    if denominator == 0 {
        return (0, MathError.DivisionByZero);
    }
    return (numerator / denominator, none);
}

i32 main() {
    quotient, err := divide(84, 2);
    if err != none {
        return 1;
    }
    return quotient;
}</code></pre></div></div>
Nenhuma regra do compilador reivindica que o resultado só é significativo quando o erro é `none`. Esse contrato pertence à função e ao seu interlocutor.

Ignorar um erro permaneceu permitido. Nós não adicionamos `try`, `?`, ou propagação automática antes de entender como essas conveniências devem interagir com limpeza e múltiplos resultados.

# [](#representation-without-allocation)Representação sem alocação

Um erro chamado diminui para um código de 32 bits. Zero significa sucesso; códigos não nulos identificam variantes em ordem de declaração.

Um erro genérico armazena uma identidade familiar mais o código da variante. Cada família recebe um endereço global distinto módulo-privado. O alargamento do sucesso esclarece essa identidade, pelo que o sucesso é partilhado entre as famílias.

Comparações examinam os campos diretamente ao invés de comparar o enchimento agregado. Erros não precisam de alocação, destruição, objeto de mensagem ou estado de exceção em tempo de execução.

A representação exata permanece compilador-privado. Compartilhar identidade familiar em módulos compilados independentemente exigiria um contrato de ligação posterior.

# [](#conclusion)Conclusão

Erros Flecha são valores digitados comuns: barato para copiar, explícito para inspecionar e fácil de combinar com múltiplos retornos.

O recurso não adiciona nenhum fluxo de controle invisível. Um retorno de falha executa o mesmo diferimento e limpeza como qualquer outro retorno porque, para o idioma, é um.

<a href="/">Voltar</a>
