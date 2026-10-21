---
title: "Flecha Dev Log #12: Tornando Visível o Acesso Unsafe à Memória"
date: 2025-05-23
published: true
lang: pt-BR
translation_key: "flecha-making-unsafe-visible"
original_url: /flecha-making-unsafe-visible
permalink: /pt-br/flecha-making-unsafe-visible
---
# [](#intro)Introdução

Olá, pessoal!

Flecha poderia representar tipos de ponteiro bruto, incluindo a diferença entre um ponteiro fixo e um alvo somente de leitura. Ainda se recusou a gerar código que os utilizasse.

Esse era o limite temporário certo. Os ponteiros brutos carregam obrigações que o compilador não pode provar em geral: validade, alinhamento, vida útil, inicialização e aliasing.

Os ponteiros brutos são executáveis apenas através de um limite lexical `unsafe` em torno de operações que confiam nessas obrigações.

# [](#permission-is-lexical)Permission é lexical

A permissão não segura vem de uma função insegura ou de um bloco explícito:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">unsafe void write(constptr i32 destination, i32 value) {
    *destination = value;
}

i32 main() {
    i32 answer = 0;

    unsafe {
        *i32 pointer = &amp;raw answer;
        write(pointer, 42);
    }

    return answer;
}</code></pre></div></div>
Blocos comuns aninhados herdam permissão. Deixar o bloco inseguro restaura o contexto seguro anterior.

Uma função insegura pode chamar uma outra função insegura diretamente. Uma função segura deve entrar em um bloco inseguro antes de chamar um. Um calouro seguro não herda a permissão apenas porque seu chamador era inseguro.

Rejeitamos uma grafia de uma expressão como `unsafe write(...)`. Um bloco torna a região confiável fácil de ver e dá regras de escopo lexical comuns em algum lugar para operar.

# [](#raw-addresses-are-not-borrows)Raw endereços não são emprestados

`&raw value` cria um ponteiro bruto para armazenamento inicializado e endereçável. Exige uma permissão insegura.

O operando pode ser uma variável, um local de armazenamento parênteses, ou uma deferência de ponteiro. Não pode ser um resultado literal, calculado temporário, função ou elenco.

Tomar o endereço não aloca e não prolonga a vida útil do alvo. Esse último ponto é essencial: o ponteiro pode permanecer como bits após a morte do objeto, mas acessar através dele violaria o contrato inseguro.

`&value` permaneceu reservado para criação de referência verificada. Introduzir código inseguro não mudou seu significado, e ponteiros brutos não se tornaram implicitamente referências.

# [](#safe-pointer-values-unsafe-pointees) Valores de ponteiro seguros, pontos inseguros

Copiar, religar, passar, retornar e comparar valores de ponteiro inicializados são operações digitadas ordinárias. Eles manipulam endereços sem tocar no ponteiro.

O desvio é diferente:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">*i32 pointer = none;

unsafe {
    pointer = &amp;raw answer;
    value := *pointer;
    *pointer = value + 1;
}</code></pre></div></div>
Tanto a leitura como a escrita do alvo requerem uma permissão insegura. A atribuição avalia o endereço de destino uma vez, em seguida, o lado direito, em seguida, executa a loja.

`null` e `none` podem inicializar ponteiros brutos. Uma declaração de ponteiro sem um inicializador permanece sujeita a análise de atribuição definitiva antes que seu valor de endereço possa ser lido.

# [](#unsafe-does-not-turn-checks-off)Unsafe não desliga as verificações

Esta foi talvez a decisão mais importante na matéria.

Dentro de um bloco inseguro, Flecha ainda verifica:

- inicialização vinculativa do ponteiro;
- tipos de origem e de destino;
- ligações fixas e objectivos apenas de leitura;
- âmbitos lexicais e sombra;
- limpeza de strings;
- regras normais de fluxo de controlo.

A permissão insegura permite operações específicas. Ele não coloca o compilador em um modo “confiar tudo abaixo desta linha”.

Mesmo `*const T` permanece somente leitura dentro de código inseguro. Remover um qualificador não é uma das permissões que o bloco concede.

# [](#what-the-programmer-promises) O que o programador promete

Para cada deferência, o programador deve estabelecer que o endereço não é nulo, corretamente alinhado, aponta para armazenamento compatível ao vivo, e contém dados inicializados quando lido.

O compilador verifica a ligação do ponteiro. Não prova essas propriedades para endereços brutos arbitrários.

A aritmética do ponteiro, as comparações de ordenação, os moldes inteiro-a-ponto e a reinterpretação explícita do ponteiro foram deliberadamente excluídos. `*void` poderia transportar um endereço opaco, mas não poderia ser desreferenciado porque `void` não tem valor legível.

Queríamos que a primeira superfície insegura fosse útil e suficientemente pequena para especificar completamente.

# [](#native-boundary) O limite nativo

Testes nativos conectaram Flecha funções inseguras a um arnês C++ fornecendo armazenamento válido. Eles cobriram o acesso escalar, ponteiros aninhados, comparações nulas, ordem de avaliação do alvo, atribuição de strings e limpeza através do retorno, controle de loop e saltos.

Esse arnês externo é importante. Flecha não pode verificar chamadas nativas arbitrárias, então o contrato de uma função insegura cruza o limite da linguagem também.

# [](#conclusion)Conclusão

Os ponteiros brutos dão ao Flecha acesso direto à memória sem fingir que a memória bruta se tornou segura.

A fronteira lexical tornou visível a responsabilidade. O compilador continuou a aplicar todas as regras que podia, enquanto o programador aceitou as restantes obrigações de validade de ponteiros.

A maioria dos códigos comuns não precisa de cumprir todas essas obrigações. As referências verificadas fornecem um modelo separado quando o armazenamento e sua origem são conhecidos pelo compilador.

<a href="/">Voltar</a>
