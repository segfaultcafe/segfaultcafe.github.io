---
title: "Execução de Código em R - root-me.org"
date: 2023-12-22
published: true
lang: pt-BR
translation_key: "R-command-execution-root-me"
original_url: /R-command-execution-root-me
permalink: /pt-br/R-command-execution-root-me
---
# [](#intro)Introdução

Há quanto tempo! Já faz algum tempo desde a última vez que postei. Mas agora que estamos de volta, vamos resolver outro [Root-me](https://www.root-me.org) CTF! Desta vez, vamos atacar a Execução de Comando R, sob a aplicação. Nunca programei em R antes, por isso isto pode ser complicado para mim. Talvez tenhamos de fazer uma boa pesquisa sobre isto.

# [](#level-description)Challenge description
Vamos verificar a declaração:

> Declaração
>
> Suas análises estatísticas em R estão se aproximando. O seu professor disponibilizou um intérprete R no TNE da universidade para que possa praticar. Você não tem tempo para revisar, você decide roubar os exames.

Está bem! Desta vez estamos a fazer o papel do batoteiro. Para iniciar este desafio, precisamos clicar em um botão "Iniciar o desafio". Desta vez não é preciso. Depois de clicar no botão, chegamos a um console R:

<img src="../figs/R-exec.png" alt="R Console">

# [](#approach)Approach mindset

Como sempre, vamos manter a seguinte abordagem mentalidade:

1. Compreender conceitos básicos
2. Compreender o problema
3. Criando um ataque
4. Resolvendo

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

Está bem. Primeiro de tudo, precisamos aprender a interagir com este console. Vou tentar ser breve e mostrar todas as minhas tentativas. Suponhamos que somos ignorantes em R (como eu sou). Meu primeiro comando neste console foi `ls`, que me deu o seguinte:

<img src="../figs/R-exec2.png" alt="Output of ls in console">

Para mim, isto parecia uma mensagem de erro. Mas depois de uma pesquisa, descobri que não era. Veja, em R, quando definimos uma função, diga uma assim:

```R
my_func <- function() {
    print("Hi mom")
}
```
Chamamos-lhe escrevendo `my_func()`. No entanto, se ao invés escrevermos `my_func`, teremos a gist função em vez disso. Podemos testar isso com o console:

<img src="../figs/R-exec3.png" alt="my_func() vs my_func">

Como podemos ver, `my_func()` chama a função e executa-a, enquanto `my_func` retorna a definição da função. Isso significa que `ls()` é uma função e temos sua definição quando digitamos `ls` sem o ().
Outra coisa interessante que podemos usar aqui é o operador `?`. Se digitarmos `?<function>`, obteremos a documentação da função. Você pode aprender mais sobre isso [here](https://www.r-project.org/help.html).

Isso significa que podemos executar `?ls` para ver o que ele faz:


<img src="../figs/R-exec4.png" alt="?ls output">

Aha. Então basicamente imprime as funções definidas pelo usuário no ambiente atual. Podemos verificar quais funções podemos usar com o `ls()`:

<img src="../figs/R-exec5.png" alt="ls() output">

Nice, temos uma lista de funções que podemos tentar usar e ver o que acontece. Temos que ter em mente nosso objetivo, que é recuperar o exame para que passemos sem estudar! Para isso, precisamos enumerar este sistema e encontrar o arquivo de exame. A partir da saída `ls()`, podemos querer usar `list.dirs` para verificar o conteúdo do diretório. Vejamos as saídas de `list.dirs` e `list.dirs()` respectivamente:

<img src="../figs/R-exec6.png" alt="list.dirs output">

Interessante. Esta função está nos dizendo que não só é uma função falsa, como é definido apenas para imprimir esta mensagem, mas também que não podemos usá-la para listar os diretórios. No entanto, se olharmos para [esta referência](https://www.geeksforgeeks.org/obtain-list-of-directories-in-r/), a função `list.dirs()` é realmente implementada em um ambiente R. Isso também nos diz que o ambiente em que estamos sobreescreveu o `list.dirs()` com esta função de mensagem personalizada.

A saída de comando `ls()` indica que funções definidas pelo usuário substituíram as funções padrão, restringindo efetivamente seu uso. Só por uma questão de integridade, vamos verificar todas estas funções:

<img src="../figs/R-exec7.png" alt="user defined functions">

Como esperado...



## [](#mindset-step1) Passo 2 - Compreender o problema

Com uma melhor compreensão do ambiente de console R, vamos identificar nossos objetivos e reconhecer as limitações que estamos enfrentando.

1. Precisamos encontrar o arquivo de exame, mas não podemos usar as funções padrão para fazê-lo. O que leva a 2.
2. Precisamos encontrar outras maneiras de listar diretórios e ler arquivos.

Depois de um pouco de pesquisa, eu tropecei em [este artigo](https://stat.ethz.ch/R-manual/R-devel/library/base/html/list.files.html). Nele, podemos ver que existe uma função chamada `dir()` que é um alias para `list.files`. De acordo com a definição, `dir` deve dar:

```R
dir(path = ".", pattern = NULL, all.files = FALSE,
   full.names = FALSE, recursive = FALSE,
   ignore.case = FALSE, include.dirs = FALSE, no.. = FALSE)
```
Vamos ver se isso está habilitado em nosso ambiente:

<img src="../figs/R-exec8.png" alt="dir output">

Aha! Esta função está corretamente definida e podemos ser capazes de usá-la para listar arquivos no sistema! Vamos verificar.

<img src="../figs/R-exec9.png" alt="dir output">

Incrível! Encontrámos um vetor para listar arquivos. Parece que estamos dentro do diretório `/var/www/html` deste site. Agora precisamos de uma maneira de ler os arquivos e imprimi-los na saída. Para isso, podemos usar a função `readLines` em vez de `read.delim`. Verifique [este recurso](https://stackoverflow.com/questions/12626637/read-a-text-file-in-r-line-by-line) para obter mais informações sobre isso.

Vamos experimentar este trecho:

```R
data <- readLines(con="index.php")
print(data)
```
Isto é o que temos:

<img src="../figs/R-exec10.png" alt="attempt to read index.php">

Está bem. Vamos listar os arquivos e lê-los. Isto deve ser suficiente. Vamos começar a nossa busca pelo arquivo do exame agora!


## [](#mindset-step3)Passo 3 - Criando o ataque

Para criar nosso ataque, precisamos começar a listar os arquivos em cada diretório que o exame provavelmente deve ser. Vamos usar `dir()` para isso. Desta vez, no entanto, vamos usar os argumentos `path` e `all.files` deste método. O valor padrão do argumento `path` é `.`, o diretório atual. Podemos manipular isso para navegar e listar arquivos neste sistema:

<img src="../figs/R-exec11.png" alt="attempt to read index.php">

Isto mostra o diretório `/`. Em CTFs, bandeiras geralmente estão dentro do diretório home. Vamos navegar nele e listar o seu conteúdo:

<img src="../figs/R-exec12.png" alt="attempt to read index.php">

Um passo mais adiante:

<img src="../figs/R-exec13.png" alt="attempt to read index.php">

E mais uma:

<img src="../figs/R-exec14.png" alt="attempt to read index.php">

Como o problema afirma que estamos fazendo o exame no futuro, ele pode estar dentro do diretório do último ano, que é `2021`. Vamos um passo mais longe.

<img src="../figs/R-exec15.png" alt="attempt to read index.php">

Aqui está! O nosso arquivo Flag.txt! Agora, só precisamos resolver isso lendo seu conteúdo.

## [](#mindset-step4) Passo 4 - Resolvendo!

Para resolver isso, basta ler o conteúdo do flag.txt. Para isso, corremos:

<img src="../figs/R-exec16.png" alt="attempt to read index.php">

E aqui está. A nossa bandeira!


# [](#conclusions) Conclusão

Neste CTF aprendemos mais sobre linguagem de programação R e como um trapaceiro pode fazer qualquer coisa para contornar a segurança do sistema para passar em um exame! Brincadeiras à parte, este foi um CTF incrível, onde colocamos em teste nossas habilidades para se adaptar e encontrar maneiras através de novos ambientes.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **


<a href="/">Voltar</a>


