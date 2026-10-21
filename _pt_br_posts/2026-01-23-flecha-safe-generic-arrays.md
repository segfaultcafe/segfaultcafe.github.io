---
title: "Flecha Dev Log #24: Um Array Genérico Seguro"
date: 2026-01-23
published: true
lang: pt-BR
translation_key: "flecha-safe-generic-arrays"
original_url: /flecha-safe-generic-arrays
permalink: /pt-br/flecha-safe-generic-arrays
---
# [](#intro)Introdução

Olá, pessoal!

Alocação de tamanho de execução deu ao Flecha os ingredientes brutos para um array dinâmico. Os genéricos permitem que uma implementação funcione para muitos tipos de elementos. O ciclo de vida da estrutura tornou a limpeza determinística.

Mas colocar esses ingredientes juntos levantou uma questão de design importante: cada chamador deve entrar `unsafe` apenas porque o recipiente usa memória bruta internamente?

Absolutamente não. A biblioteca padrão agora separa um motor de armazenamento inseguro de um recipiente público seguro.

# [](#the-unsafe-core) O núcleo inseguro

`RawArray&lt;T&gt;` possui armazenamento alocado em tempo de execução e implementa a mecânica: comprimento, capacidade, crescimento, leituras indexadas e escreve, remoção e destruição.

Sua implementação pode alocar um buffer maior, copiar elementos inicializados, liberar o buffer antigo e atualizar a contabilidade. Estas são exatamente as operações onde os ponteiros crus pertencem, e permanecem dentro do tipo que pode defender seus invariantes.

O `T` suportado é intencionalmente conservador: valores escalares e estrutura adequados são aceitos, enquanto strings, ponteiros, referências, valores destrutíveis e tipos de elementos cujo movimento ainda não é modelado são rejeitados.

# [](#the-safe-wrapper)O wrapper seguro

O público `Array&lt;T&gt;` contém a implementação bruta em particular:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">export structure Array&lt;T&gt; {
    private raw_array::RawArray&lt;T&gt; inner;
};

error Array&lt;T&gt;::push(&amp;self, T value) {
    unsafe {
        return self-&gt;inner.push(value);
    }
}</code></pre></div></div>
O bloqueio inseguro não é uma brecha para os usuários. É o limite de implementação onde `Array` se baseia no invariante mantido pelo seu privado `RawArray`. Os métodos públicos não expõem o ponteiro de apoio, de modo que as chamadas não podem invalidar o comprimento ou a capacidade pelas costas do recipiente.

Isso dá ao código normal uma API simples:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">Array&lt;i32&gt; values = none;

if values.push(20) != none {
    return 1;
}

if values.push(22) != none {
    return 1;
}

answer, err := values.get(1);
if err == none {
    stdoutln(answer);
}</code></pre></div></div>
# [](#failure-does-not-break-the-container) Falha não quebra o recipiente

O crescimento pode falhar. O método, portanto, retorna um erro em vez de fingir que a alocação sempre tem sucesso.

O contrato importante é mais forte do que “um erro é devolvido”. Se a reserva de novo armazenamento falhar, os elementos, comprimento e capacidade existentes permanecem válidos. O contêiner só compromete seu novo estado após a alocação e transferência ter sucesso.

As falhas nos limites usam `ArrayError`. Falhas de alocação preservam o `AllocationError.OutOfMemory` compartilhado. Um chamador pode distinguir um índice inválido de uma máquina que não poderia fornecer mais memória.

# [](#one-lifecycle-owner)One proprietário do ciclo de vida

Tanto `RawArray&lt;T&gt;` quanto `Array&lt;T&gt;` não são copiáveis. Copiar o ponteiro e metadados criaria dois valores que acreditam possuir a mesma alocação.

Em vez disso, um array possui um buffer. Seu caminho rasgo destrói elementos inicializados como necessário e libera a alocação de apoio exatamente uma vez. `clear` altera o conteúdo lógico, mas preserva a capacidade utilizável; destruição lida com o armazenamento em si.

A distinção entre comprimento e capacidade é visível no comportamento sem expor representação. `reserve`, `push`, `get`, `set`, `pop` e `clear` mantêm as mesmas invariantes privadas.

# [](#a-small-trusted-surface)Uma pequena superfície confiável

A programação de sistemas seguros não significa a ausência de operações inseguras. Os alocadores e recipientes nativos eventualmente tocam a memória bruta.

O objetivo útil é a concentração: uma pequena implementação carrega a obrigação de prova, enquanto cada usuário comum trabalha através de operações verificadas. Os blocos `unsafe` visíveis da Flecha tornam essa superfície confiável fácil de encontrar durante a revisão.

# [](#conclusion)Conclusão

O array genérico demonstra várias decisões de Flecha trabalhando em conjunto: especialização em tempo de compilação, padrões semânticos, erros explícitos, quebra determinística, campos privados e uma fronteira estreita e insegura.

O resultado é maravilhosamente comum de usar. Essa ordenança é conquistada mantendo o difícil trabalho de memória por trás de uma interface cuidadosamente verificada.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
