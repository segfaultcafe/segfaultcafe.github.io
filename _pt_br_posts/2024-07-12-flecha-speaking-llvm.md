---
title: "Flecha Dev Log #4: Falando LLVM pela Primeira Vez"
date: 2024-07-12
published: true
lang: pt-BR
translation_key: "flecha-speaking-llvm"
original_url: /flecha-speaking-llvm
permalink: /pt-br/flecha-speaking-llvm
---
# [](#intro)Introdução

Olá, pessoal!

Tínhamos código fonte, um AST, análise semântica e uma RI ligada. Cada etapa terminou com uma representação projetada para o palco depois dele.

Agora queríamos provar que a arquitetura poderia deixar o compilador e se tornar um comportamento executável.

A infraestrutura do LLVM prova o fim da arquitetura: o código Flecha torna-se IR do LLVM, passa o verificador do LLVM e executa com o resultado esperado.

# [](#the-first-complete-path) O primeiro caminho completo

O exemplo foi pequeno:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 add(i32 left, i32 right) {
    return left + right;
}

i32 main() {
    x := 21;
    y := 22;
    return add(x, y);
}</code></pre></div></div>
Sim, ele retorna `43`; o alvo ao redor da prova foi ajustado mais tarde, enquanto o fluxo de trabalho da infra-estrutura foi resolvido. A parte valiosa era o caminho:

```text
source
  → tokens
  → AST
  → semantic model
  → bound IR
  → LLVM module
```
O driver do compilador ganhou `--emit-llvm`, o que tornou o IR gerado observável:

```bash
build/flecha --emit-llvm examples/llvm_poc.fl -o build/llvm_poc.ll
```
A observação era importante. LLVM IR tornou-se outro limite que poderíamos inspecionar em vez de uma caixa preta escondida atrás de "compilar".

# [](#the-backend-does-less)O backend faz menos

O gerador LLVM consome apenas o programa ligado. Ele não lê nós de sintaxe, escopos de caminhada, realizar pesquisa de nome, ou tipos de inferência.

Essa limitação é uma característica.

Todas as funções são declaradas em LLVM antes de qualquer corpo de função ser emitido. Uma chamada pode, portanto, visar uma função que aparece mais tarde no arquivo Flecha sem depender da ordem de emissão. Os locais se tornam alocações de pilha com cargas e lojas explícitas. Aritmética seleciona instruções usando tipos o analisador semântico já resolvido.

Para tipos não suportados, a geração de código falha com uma mensagem. Ele não inventa uma representação ou emite IR inválida e espera LLVM explica os danos.

# [](#control-flow-is-values-and-blocks)Control fluxo são valores e blocos

Condicionais tornar-se LLVM blocos básicos e ramos. Boolean `and` e `or` requerem cuidados especiais porque Flecha promete avaliação de curto-circuito:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">if ready and check() {
    return 42;
}</code></pre></div></div>
`check()` não deve ser executado quando `ready` é falso. A infra-estrutura emite ramos e junta o resultado com um nó PHI. Operações lógicas inteiras permanecem operações bitwise comuns porque ambos os operandos são valores, não decisões de fluxo de controle.

Essa distinção é exatamente por que tipos semânticos e operações ligadas devem atingir a infraestrutura intacta. O token `and` sozinho não é informação suficiente.

# [](#verify-every-module)Verificar cada módulo

O LLVM pode representar IR malformado na memória enquanto está sendo construído. Optamos por executar o verificador do LLVM em cada módulo concluído antes de devolvê-lo.

Isso cria uma poderosa invariante: se a geração de código relata sucesso, o módulo é estruturalmente válido de acordo com LLVM. Um terminal ausente, tipo descompasso, ou borda PHI inválida torna-se uma falha do compilador perto de sua causa.

A prova de conceito suportava inteiros primitivos, flutuadores, booleanos, caracteres, funções, parâmetros, locais de pilha, atribuições, chamadas, retornos e fluxo de controle condicional.

Ele deliberadamente não suportava strings, ponteiros, emissão de objetos, layouts de alvo, pipelines de otimização ou links nativos ainda. Nomear essas exclusões fazia parte do projeto. “Não implementado” é muito mais seguro do que uma representação acidental se tornando permanente.

# [](#why-llvm) Porquê LLVM?

Escolher LLVM deixou Flecha focar na semântica da linguagem enquanto confia em um otimizador maduro e ecossistema alvo. Mas LLVM não foi permitido tornar-se a especificação da linguagem.

Flecha decide o que um elenco significa, se avaliação curto-circuitos, quais tipos inteiros são assinados, e onde as verificações de tempo de execução pertencem. A LLVM recebe essas decisões após terem sido resolvidas.

A infra-estrutura é uma implementação da semântica de Flecha, não o lugar onde os descobrimos.

# [](#conclusion)Conclusão

O primeiro módulo emitido mudou a sensação do projeto. Uma declaração já não era apenas um nó AST. Uma instrução de retorno poderia viajar através de cada camada e se tornar uma instrução que outra ferramenta poderia executar.

O resultado importante é uma infra-estrutura com uma estreita responsabilidade: traduzir um programa ligado verificado em IR LLVM verificado sem redefinir a semântica de Flecha ao longo do caminho.

<a href="/">Voltar</a>
