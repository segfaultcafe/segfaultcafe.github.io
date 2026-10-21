---
title: "Flecha Dev Log #15: Slices como Views Verificadas"
date: 2025-07-09
published: true
lang: pt-BR
translation_key: "flecha-slices-as-checked-views"
original_url: /flecha-slices-as-checked-views
permalink: /pt-br/flecha-slices-as-checked-views
---
# [](#intro)Introdução

Olá, pessoal!

Arrays fixos deram ao Flecha armazenamento contíguo em linha, mas seu comprimento fazia parte do tipo. Uma função aceitando `[4]i32` não poderia também aceitar `[40]i32`.

Precisávamos de uma visão cujo comprimento era conhecido em tempo de corrida sem desistir de limites ou verificações de vida.

As fatias verificadas são valores de endereço e comprimento não próprios conectados ao verificador emprestado.

# [](#creating-a-slice)Criando uma fatia

Uma fatia empresta um intervalo semi- aberto:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[5]i32 values = [10, 20, 30, 40, 50];

[]i32 middle = values[1:4];
whole := values[:];
tail := values[1:];
head := values[:2];</code></pre></div></div>
`values[1:4]` contém índices 1, 2 e 3. Os limites inferiores e superiores omitidos tornam-se zero e o comprimento do receptor.

A fatia armazena um endereço e um comprimento `usize`. Não tem capacidade, atribuição, propriedade ou destruidor. O array original ainda possui cada elemento.

Não há conversão implícita array-to-slice. Uma chamada passa `values[:]`, tornando o empréstimo visível no local de chamada.

# [](#access-and-bounds)Acesso e limites

Os slices suportam `len()`, a indexação verificada, `front()` e `back()`:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">middle.front() = 21;
middle.back()++;

first := &amp;middle[0];
*first = 22;</code></pre></div></div>
`front()` e `back()` produzem locais de elementos, não valores de referência ocultos. A leitura copia o elemento; a escrita funciona quando a fatia é mutável; `&` toma explicitamente o local.

Verificação de slice `start <= end <= length`. Verificações de indexação `index < length`. Limites inválidos estáticos são erros de compilador; falhas dinâmicas prendem antes da aritmética do ponteiro.

As fatias vazias são válidas e ainda carregam a vida de seu proprietário. Aceder a um elemento de um não é.

# [](#three-different-consts)Três consts diferentes

O modelo de qualificação recursiva tornou-se imediatamente útil:

- `[]T` é uma fatia mutável rebindable;
- `[]const T` é uma fatia rebindable somente leitura;
- `const []T` é um cabo de slice fixo com elementos mutáveis.

Um array const produz uma fatia somente de leitura. Armazenamento escrito também pode ser intencionalmente emprestado como compartilhado:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">[]const i32 shared = values[:];</code></pre></div></div>
A constância do punho e a constância dos elementos permanecem questões separadas.

# [](#slice-handles-follow-reference-rules)Slice manipula segue regras de referência

Os puxadores de fatias mutáveis movem-se na tarefa. Os punhos de fatia compartilhados copiam. Argumentos de função emprestam novamente para a chamada, preservando o punho do chamador:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void increment([]i32 values) {
    loop usize i = 0; i &lt; values.len(); i++ {
        values[i]++;
    }
}

i32 sum([]const i32 values) {
    i32 total = 0;
    for (_, value) := range values {
        total = total + value;
    }
    return total;
}</code></pre></div></div>
O verificador trata conservadoramente toda a matriz de suporte como uma região emprestada. Ele ainda não prova dois intervalos desarticulados.

Subslices e referências de elementos mantêm o pai emprestado vivo. Seu último uso libera as restrições assim como para referências verificadas.

# [](#iteration-without-copying-elements)Iteration sem copiar elementos

A iteração de alcance fixo instantâneos de toda a matriz. Slice a iteração em vez de copiar apenas o descritor e toma um reemprestado compartilhado para o loop.

Cada elemento é ainda uma cópia de valor, mas os elementos de apoio não são duplicados como uma coleção. O loop compartilhado emprestado evita mutação por baixo da iteração.

Essa diferença segue-se à propriedade. Uma expressão de array é um valor que contém seu armazenamento. Uma fatia já é uma view emprestada do armazenamento em outro lugar.

# [](#the-first-boundary) O primeiro limite

Os slices podem ser passados para funções e reemprestados localmente. Não puderam ser devolvidos.

Devolver uma fatia requer que o chamador saiba qual armazenamento de entrada permanece emprestado e por quanto tempo. Sem esse contrato de função, o comportamento seguro é rejeitar a fuga.

Isto não é uma representação em tempo de execução perdida. O endereço mais o comprimento já está completo. A peça em falta é a informação de tempo de vida de compilação.

# [](#conclusion)Conclusão

Os slices fazem uma função funcionar em vários comprimentos de array sem alocar ou abandonar a segurança.

Eles também demonstraram como as decisões anteriores compuseram: qualificadores const recursivos, referências verificadas, análise de última utilização, verificações de limites de tempo de execução e comprimentos de tamanho alvo todos se tornaram parte de um pequeno valor.

Demonstram como os qualificadores const recursivos, as referências verificadas, a análise de último uso, as verificações de limites de execução e os comprimentos de tamanho alvo compõem-se em um pequeno valor.

<a href="/">Voltar</a>
