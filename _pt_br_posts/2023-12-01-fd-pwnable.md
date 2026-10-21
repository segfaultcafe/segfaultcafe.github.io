---
title: "fd - pwnable.kr"
date: 2023-12-01
published: true
lang: pt-BR
translation_key: "fd-pwnable"
original_url: /fd-pwnable
permalink: /pt-br/fd-pwnable
---
# [](#intro)Introdução

[Pwnable](https://pwnable.kr) é um site para entusiastas da segurança cibernética dispostos a se desafiar resolvendo diferentes tipos de CTFs. Encontrei-o num dos meus calções preguiçosos de YT a ver momentos, onde descobri sobre alguém a resolver estes CTFs. Como entusiasta, pensei: bem, vamos tentar.

Para minha surpresa, não só parecia muito divertido, mas as imagens de nível tag são as diferentes cartas de monstros Ragnarok Online. Está bem! Já me tens aqui! Como alguém com o apelido "Cecil Daemon", senti-me obrigado a começar a quebrar cada nível.

Este post é sobre resolver o primeiro nível, chamado 'fd'. Vamos largar o nosso cartão de Poring!

# [](#level-description)Challenge description
> Mamãe! o que é um descritor de arquivo no Linux?
>
> tente jogar o jogo de guerra você mesmo, mas se você é novato ABSOLUTE, siga este link tutorial:
> https://youtu.be/971eZhMHQQw

> ssh fd@pwnable.kr - p2222 (pw: guest)

# [](#approach)Approach mindset

Ok, eu vou derramar algum ouro aqui, deixando todos vocês saber como eu me aproximo de desafios CTF com uma mentalidade que raramente me falha. Em primeiro lugar, eu não sou um desenvolvedor profissional C/C++, mas eu tenho minha quota de codificação nessas línguas. No entanto, jargão técnico nem sempre foi a minha força. " O que o f*** é um descritor de arquivo " foi meu primeiro pensamento. Mal sabia eu que sabia o que era, mas não pelo seu nome.

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

Pense assim: se não sabemos o que é um descritor de arquivo, é melhor recuarmos um pouco e aprendermos sobre isso. Este é o primeiro passo - entender o problema. Na verdade, eu não aprendi isso fazendo CTFs. Aprendi enquanto estava a seguir o meu mestrado em Física. A palavra para isso é **pesquisa**.

A pesquisa é sempre o seu melhor amigo aqui, e quanto mais nos sentimos confortáveis em aprender coisas, ler documentação e praticar o que aprendemos, mais facilmente estes desafios florescem.


## [](#fd-definition) O que é um Descritor de Arquivo?

Os Descritores de Arquivos são, em termos simples, inteiros não negativos - mais especificamente 0, 1 e 2 - que são abreviaturas para três conceitos importantes: 0 para Entrada Padrão (stdin), 1 para Saída Padrão (stdout) e 2 para Erro Padrão (stderr). A tabela abaixo resume o que cada um destes termos significa

. . . Nome do Descritor . . . . . . . . . . . . . . . . . . . . .
-------------------------------------------
□ Padrão em □ stdin
* Saída padrão do console
O erro padrão do erro do stderr do erro ao console

Um exemplo simples no terminal Linux seria redirecionar os descritores para programas ou arquivos. Por exemplo, digitando um comando errado ou inexistente - como 'dsasd' - no terminal irá levantar um erro de "comando não encontrado":

```bash
kaizen@celestial ~ $ dsasd
bash: dsasd: command not found
```
No entanto, se redirecionarmos nosso stderr para `/dev/null`, não veremos nenhum erro aparecendo:

 ```bash
kaizen@celestial ~ $ dsasd 2>/dev/null
kaizen@celestial ~ :( $ 
 ```
O mesmo se aplica ao nosso descritor stdout. Executar `ls -la` imprime todo o conteúdo no diretório atual para o nosso descritor stdout:

```bash
kaizen@celestial /tmp/fd $ ls -la
total 0
drwxr-xr-x  5 kaizen users 160 Dec  1 23:39 .
drwxrwxrwt 17 root   root  860 Dec  1 23:39 ..
-rw-r--r--  1 kaizen users   0 Dec  1 23:39 file1
-rw-r--r--  1 kaizen users   0 Dec  1 23:39 file2
-rw-r--r--  1 kaizen users   0 Dec  1 23:39 file3
drwxr-xr-x  2 kaizen users  40 Dec  1 23:39 test1
drwxr-xr-x  2 kaizen users  40 Dec  1 23:39 test2
drwxr-xr-x  2 kaizen users  40 Dec  1 23:39 test3
```
Poderíamos redirecionar o stdout para um arquivo, para que a saída seja salva nele:

```bash
kaizen@celestial /tmp/fd $ ls -la 1>stdout
kaizen@celestial /tmp/fd $ cat stdout
total 0
drwxr-xr-x  5 kaizen users 180 Dec  1 23:41 .
drwxrwxrwt 17 root   root  860 Dec  1 23:39 ..
-rw-r--r--  1 kaizen users   0 Dec  1 23:39 file1
-rw-r--r--  1 kaizen users   0 Dec  1 23:39 file2
-rw-r--r--  1 kaizen users   0 Dec  1 23:39 file3
-rw-r--r--  1 kaizen users   0 Dec  1 23:41 stdout
drwxr-xr-x  2 kaizen users  40 Dec  1 23:39 test1
drwxr-xr-x  2 kaizen users  40 Dec  1 23:39 test2
drwxr-xr-x  2 kaizen users  40 Dec  1 23:39 test3
```
Finalmente, stdin é exatamente o que digitamos no terminal do nosso teclado. Um exemplo seria passar a entrada para um comando, como:

```bash
kaizen@celestial /tmp/fd $ echo "ls" | bash
file1  file2  file3  stdout  test1  test2  test3
```
Aqui, nosso stdin é a string `"ls"`, que está sendo passada para nosso intérprete bash.


## [](#mindset-step1) Passo 2 - Compreender o problema

Agora que sabemos o que é um descritor de arquivo e como usá-lo, podemos finalmente iniciar o CTF.

Dica: É uma boa prática verificar o desafio da CTF antes de fazer a pesquisa. Neste caso, no entanto, uma vez que a descrição do desafio mencionou algo 'novo' direto do bastão, eu decidi dar o passo para trás antes de realmente verificar o problema CTF. Na maioria das vezes, precisamos primeiro entender o desafio proposto pela CTF e, em seguida, realizar a pesquisa necessária. 

Para iniciar o CTF, temos de entrar na máquina. Isso pode ser feito com o comando:

`ssh fd@pwnable.kr -p2222`

Você será solicitado para a senha, que é `guest`. Depois de conectar com sucesso à máquina, podemos simplesmente executar ls -l para ver o que temos em nosso diretório home:

```bash
fd@pwnable:~$ ls -l
total 16
-r-sr-x--- 1 fd_pwn fd   7322 Jun 11  2014 fd
-rw-r--r-- 1 root   root  418 Jun 11  2014 fd.c
-r--r----- 1 fd_pwn root   50 Jun 11  2014 flag
```
Note que temos um código C `fd.c`; um arquivo binário `fd` e um arquivo de texto `flag`. Vamos ver quem somos na máquina.

```bash
fd@pwnable:~$ whoami
fd
```
Ok, com base no comando `whoami`, não somos capazes de simplesmente ler `flag`, já que não fazemos parte do grupo `root`, nem somos usuários `fd_pwn`. No entanto, podemos ler `fd.c` e executar `fd`. Podemos `cat fd.c` para ver seu conteúdo:

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
char buf[32];
int main(int argc, char* argv[], char* envp[]){
        if(argc<2){
                printf("pass argv[1] a number\n");
                return 0;
        }
        int fd = atoi( argv[1] ) - 0x1234;
        int len = 0;
        len = read(fd, buf, 32);
        if(!strcmp("LETMEWIN\n", buf)){
                printf("good job :)\n");
                system("/bin/cat flag");
                exit(0);
        }
        printf("learn about Linux file IO\n");
        return 0;

}
```
Este programa parece estar tomando um argumento de número único no `argv[1]` e avaliando a expressão `atoi(argv[1]) - 0x1234`, armazenando o resultado na variável `fd`. A função `read` C toma um descritor de arquivo como primeiro argumento, o que significa que ele vai ler o que é passado nesse descritor específico. Isto é armazenado na variável buffer `buf`.

A função `strcmp` irá comparar a string armazenada no buffer com "LETMEWIN\n", e se forem iguais,  i.e. , `strcmp` retorna 0, a instrução se torna `!0` (C equivalente a true).

A chave para resolver este problema é passar um `argv[1]` que irá avaliar `fd` para um descritor de arquivo que podemos controlar contendo a string "LETMEWIN".

## [](#mindset-step3)Passo 3 - Criando o ataque

Agora que entendemos os conceitos básicos e o problema CTF, precisamos pensar em um vetor de ataque plausível. O mais fácil neste caso é controlar o descritor stdin, que é um que é difícil de defender. Olhando para nossa tabela, este descritor de arquivo é representado pelo inteiro 0. Então precisamos passar um `argv[1]` que irá avaliar a variável `fd` para 0. Note que:

`fd = atoi(argv[1]) - 0x1234`

que está nos dizendo que o número que passamos será subtraído por `0x1234`, um valor hexadecimal. Podemos usar [este site](https://www.rapidtables.com/convert/number/hex-to-decimal.html) para converter hex para decimal. Note-se que o número hexadecimal 0x1234 é 4660 em decimal. Então, se precisamos que `fd` seja 0, precisamos passar 4660 como o argumento. Se fizermos tudo corretamente, este argumento nos levará a função `read` para inserir um valor de stdin, ao invés de apenas nos dizer para aprender sobre o arquivo Linux IO, como conseguimos se passarmos um número aleatório:

```bash
fd@pwnable:~$ ./fd 123
learn about Linux file IO
```
No entanto, passando 4660, o código começa a esperar outra entrada!

```bash
fd@pwnable:~$ ./fd 4660
asdasd
learn about Linux file IO
```
Promissor!

## [](#mindset-step4) Passo 4 - Resolvendo!

Penso que a solução se torna auto-explicativa neste momento. Se não, pode ser uma boa idéia re-ler este post!

Quando o código espera a segunda entrada, que é o descritor stdin, precisamos passar a string "LETMEWIN" para que `strcmp` avalie para `!0`, desencadeando a instrução se que lê a bandeira:

```bash
fd@pwnable:~$ ./fd 4660
LETMEWIN
good job :)
mommy! I think I know what a file descriptor is!!
```
Incrível! Aproveite o seu cartão de Poring. Foi bem merecido!

## [](#solution2) Outra solução

Outra maneira de resolver isso é canalizar a string "LETMEWIN" diretamente para o programa. Isso é semelhante ao exemplo que demos sobre o descritor stdin `echo "ls" | bash`, que executa o comando `ls`.

Aqui, basicamente fazemos a mesma coisa, mas passando "LETMEWIN" para `./fd 4660`

```
fd@pwnable:~$ echo "LETMEWIN" | ./fd 4660
good job :)
mommy! I think I know what a file descriptor is!!
```
# [](#conclusions) Conclusão

Resolver os CTFs e tudo na vida, aliás, resume-se a fazer uma boa pesquisa de antemão.

Neste CTF, aprendemos o que são descritores de arquivos, bem como entendemos algumas análises de código C no caminho.

Obrigado por ficar até o fim. Espero que tenham gostado! E lembre-se, sempre faça sua pesquisa **!

<a href="/">Voltar</a>



