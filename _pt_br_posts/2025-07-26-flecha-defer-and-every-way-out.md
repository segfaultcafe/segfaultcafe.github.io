---
title: "Flecha Dev Log #16: Defer e Todas as Formas de Sair de um Escopo"
date: 2025-07-26
published: true
lang: pt-BR
translation_key: "flecha-defer-and-every-way-out"
original_url: /flecha-defer-and-every-way-out
permalink: /pt-br/flecha-defer-and-every-way-out
---
# [](#intro)Introdução

Olá, pessoal!

A limpeza dos recursos é fácil quando uma função tem uma saída na parte inferior. Flecha tinha retornos, blocos aninhados, loops, `break`, `proceed` e saltos nomeados.

Queríamos uma maneira de registrar limpeza ao lado da operação que precisava dele e confiar no compilador para executá-lo em cada caminho comum para fora.

Chamadas diretas diferidas combinam regras precisas de captura, integração emprestada e blocos de limpeza para todas as bordas de saída.

# [](#capture-now-call-later) Capturar agora, ligar mais tarde

`defer` aceita uma chamada de função direta:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void report(i32 value) {
    stdoutln(value);
}

i32 main() {
    i32 value = 10;
    defer report(value);
    value = 20;
    return 42;
}</code></pre></div></div>
O programa imprime `10`.

Argumentos avaliam uma vez, da esquerda para a direita, quando a execução atinge a instrução de adiamento. Os seus efeitos secundários acontecem imediatamente. A chamada de função externa espera até que o escopo lexical atual saia.

Essa decisão evita uma ambiguidade perigosa. “Execute esta expressão mais tarde” permitiria que cada local referenciado mudasse – ou desaparecesse – antes da avaliação. Flecha, em vez disso, captura valores de argumento concretos agora.

# [](#reverse-order-per-scope)Reverso ordem por escopo

Cada escopo executa chamadas diferidas em ordem de registro inverso:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">{
    defer report(1);
    defer report(2);
} // prints 2, then 1</code></pre></div></div>
Os escopos internos drenam antes dos escopos externos. O registro ocorre apenas se a execução atingir a instrução, e um loop pode registrar o mesmo site de chamada várias vezes.

Isso dá a limpeza da disciplina de pilha familiar: a mais nova responsabilidade adquirida é tratada primeiro.

# [](#different-values-need-different-captures)Diferentes valores precisam de diferentes capturas

Escalares, ponteiros brutos e arrays fixos capturam seus valores atuais.

Possuindo strings e views de string recebem instantâneos de byte de propriedade independente. Essa captura pode alocar, mas impede uma visualização diferida de depender de uma string que muda ou morre antes da chamada.

Referências e fatias não podem ser copiadas para propriedade. Eles capturam alças emprestadas, então seus empréstimos permanecem ativos até que a saída do escopo execute a chamada diferida.

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">void set(&amp;i32 target) {
    *target = 42;
}

i32 main() {
    i32 answer = 0;
    {
        defer set(&amp;answer);
    }
    return answer;
}</code></pre></div></div>
O empréstimo exclusivo impede o acesso conflitante enquanto a chamada está pendente e termina quando o bloco drena sua pilha de diferimento.

# [](#every-ordinary-exit)Toda saída normal

Chamadas diferidas em execução:

- queda normal;
- `return`;
- `break`;
- `proceed`;
- `jumpto` bordas deixando o escopo.

Uma expressão de retorno avalia antes da limpeza. O código diferido não pode alterar o valor já selecionado para retorno.

Em um loop contado, o escopo do corpo limpa antes que a expressão de atualização seja executada, inclusive quando `proceed` é usado. Um salto que permanece dentro do mesmo escopo mantém registros pendentes; um salto para trás pode adicionar outro.

Armadilhas e encerramento imediato do processo não descontraem. Se as armadilhas de avaliação de argumentos, a chamada nunca é registrada. Se um callee diferido armadilhas, mais tarde as chamadas pendentes não executar. Flecha não introduziu discretamente exceções através da limpeza.

# [](#defer-is-not-ownership) Defere não é propriedade

Os ponteiros crus mantêm suas obrigações inseguras. `defer free(pointer)` poderia eventualmente ser uma limpeza conveniente, mas adiar sozinho não provou que o ponteiro veio de uma alocação, que ainda estava ao vivo, ou que outro livre não estava pendente.

Agendar uma chamada e provar a propriedade de recursos são problemas diferentes.

Esta separação manteve o adiamento geralmente útil ao deixar o rastreamento de alocação para uma análise dedicada.

# [](#how-it-lowers)Como baixa

Cada escopo ativo recebe uma pilha vinculada de registros de chamadas capturados. Registros de registro são alocados no armazenamento da pilha de funções e marcados pelo local de chamada. Escopo-saída blocos de limpeza drená-los em ordem reversa e restaurar a pilha anterior.

A fila em si não requer nenhum alocador de pilha. Registro repetido consome pilha proporcional ao número e tamanho das capturas pendentes, de modo que um loop ilimitado pode esgotar a pilha.

O gráfico controle-fluxo registra a avaliação de argumentos no registro. Símbolos de captura sintéticos preservam origens emprestadas até a borda de saída correspondente. Blocos de limpeza LLVM manuseiam saltos não locais entre escopos.

# [](#conclusion)Conclusão

`defer` parece uma palavra-chave. Seu comportamento requer tempo de captura definido, regras de captura específicas de valor, vida útil emprestada, comportamento de loop, comportamento de salto, ordem de destruição, e uma política de armadilha sem vento.

É exatamente por isso que as características da linguagem são tão interessantes: a sintaxe geralmente é a menor parte.

<a href="/">Voltar</a>
