---
title: "Flecha Dev Log #5: Da IR do LLVM a um Programa Nativo"
date: 2024-08-28
published: true
lang: pt-BR
translation_key: "flecha-from-ir-to-native-code"
original_url: /flecha-from-ir-to-native-code
permalink: /pt-br/flecha-from-ir-to-native-code
---
# [](#intro)Introdução

Olá, pessoal!

LLVM verificado IR é um pipeline completo do compilador em um sentido, mas ainda não é uma experiência completa do usuário.

Ninguém quer alimentar manualmente um arquivo IR para outro comando sempre que muda um programa. Queríamos isto:

```bash
flecha build program.fl -o program
./program
```
A emissão de objetos nativos e a ligação executável completam esse caminho, enquanto o fluxo de controle incomum de Flecha `also` dá a todo o gasoduto um teste semântico útil.

# [](#target-details-are-not-optional) Os detalhes do alvo não são opcionais

O IR LLVM é digitado, mas um alvo nativo ainda decide fatos fundamentais como largura do ponteiro, formato de objeto e convenção de chamada.

O compilador nativo pede ao LLVM o triplo alvo do host e cria um `TargetMachine` para ele. O layout de dados do alvo é anexado ao módulo antes da construção do IR.

Essa ordem foi deliberada. Flecha inclui `isize` e `usize`, cuja largura segue a largura do ponteiro alvo. Se o compilador adivinhou um tamanho baseado na máquina que constrói Flecha em vez do alvo do módulo, esses tipos podem silenciosamente se tornar errados.

Para esta primeira implementação, o anfitrião foi o alvo. Triplas de compilação cruzada, sysroots, níveis de otimização e informações de depuração foram deixadas para posterior. Novamente, o limite foi explícito.

# [](#object-first)Object first, executável second

A compilação nativa foi dividida em duas operações.

Primeiro, o gasoduto de emissão de código da LLVM escreve um objeto relocatável:

```bash
flecha --emit-object program.fl -o program.o
```
Em segundo lugar, Flecha invoca o driver do compilador C do sistema para ligar esse objeto:

```bash
flecha build program.fl -o program
```
Usando o driver compilador em vez de chamar o linker diretamente nos dá objetos de inicialização da plataforma e convenções executáveis padrão. O comando é lançado sem uma shell, evitando outra camada de citação e interpretação de comandos.

O objeto intermediário permanece ao lado do executável como `<output>.o`. Isso tornou a depuração precoce muito mais fácil: quando o link falhou, pudemos inspecionar se a emissão de objetos ainda tinha sucesso.

# [](#also-as-a-real-test)Usando `also` como um teste real

Produzir um executável só é útil se seu fluxo de controle ainda significa o que a fonte diz. A cláusula `also` da Flecha nos deu um excelente teste de ponta a ponta:

<div class="language-flecha highlighter-rouge"><div class="highlight"><pre class="highlight"><code class="language-flecha">i32 main() {
    value := 0;

    if false {
        value = 100;
    } also true {
        value = 99;
    } else if true {
        value = 40;
    } also value == 40 {
        value = value + 2;
    } else {
        value = 1;
    }

    return value;
}</code></pre></div></div>
O primeiro `also` não é executado porque seu próprio `if` não foi executado. O segundo é executado porque seu ramo `else if` foi selecionado. O processo nativo termina com `42`.

Este comportamento já tinha sido normalizado na IR ligada. A infraestrutura nativa não precisava de uma instrução personalizada `also`. Essa foi a arquitetura anterior pagando aluguel.

# [](#the-first-real-executable) O primeiro executável real

O novo alvo `make native-poc` compilou um exemplo Flecha, verificou que tanto o objeto quanto o executável existiam, executou o executável e verificou seu status de saída.

Esse teste ultrapassou vários limites independentes falíveis:

- validação da interface Flecha;
- rebaixamento tipográfico;
- Construção e verificação de IR LLVM;
- emissão de objectos específicos do objectivo;
- ligação do sistema;
- execução do processo do sistema operativo.

Um teste unitário para um nó AST não pode provar nada disso. Precisávamos de ambos os tipos de testes: pequenos testes que localizam falhas e uma prova de ponta a ponta que as camadas ainda compõem.

# [](#conclusion)Conclusão

Este marco transformou Flecha de um experimento compilador em uma linguagem que poderia produzir um executável nativo normal.

Também forçou uma separação importante: a geração de código cria objetos específicos do alvo; vinculando monta programas completos. Mais tarde, quando uma biblioteca runtime entrou na imagem, essa distinção permitiria que a compilação somente objeto permanecesse independente enquanto builds executáveis ganhavam uma conexão automática de runtime.

Ele também confirma uma separação arquitetônica que permanece útil: a geração de código cria objetos específicos do alvo, ao mesmo tempo em que conecta os programas completos.

<a href="/">Voltar</a>
