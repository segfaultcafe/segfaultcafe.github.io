---
title: "flag - pwnable.kr"
date: 2024-01-08
published: true
lang: pt-BR
translation_key: "flag-pwnable"
original_url: /flag-pwnable
permalink: /pt-br/flag-pwnable
---
# [](#intro)Introdução

Olá, bravos aventureiros da CTF! Hoje vamos deixar cair o cartão da Pupa resolvendo o CTF “flag” em [pwnable](https://pwnable.kr). Sem mais delongas, vamos ver do que se trata este desafio!


# [](#level-description)Challenge description

A descrição do desafio é:

> Papai me trouxe um presente embalado! Vamos abri-lo.
>
>
> Download : [http://pwnable.kr/bin/flag](http://pwnable.kr/bin/flag)
>
> Esta é uma tarefa inversa. tudo o que você precisa é binário
>

Este desafio parece ser apenas uma tarefa de engenharia reversa, sem qualquer código fonte. O que esperar dele?


# [](#approach)Approach mindset

Vamos aguçar nossa mentalidade. Como não temos mais nenhuma informação sobre o desafio, precisamos fazer um pequeno reconhecimento primeiro, analisando o binário com o GDB. Então, se a bandeira está dentro do binário, nós só precisamos encontrar seu endereço e usar `x/1s <address>` para recuperá-lo em formato strings.


## [](#examining-binary)Examinando o binário
Assim que baixarmos o binário, precisamos executar o `chmod +x flag`, então podemos usar o GDB para examiná-lo:

```bash
$ gdb ./flag
...
Reading symbols from ./flag...
(No debugging symbols found in ./flag)
(gdb)
```
Isso é problemático... Não temos símbolos, por isso não há maneira de o desmontarmos com o GDB. Vamos sair e usar outros truques para entender por que os símbolos estão faltando. Podemos analisá-lo com o comando `strings`:

```bash
$ strings flag
[...snip...]
USQRH
PROT_EXEC|PROT_WRITE failed.
$Info: This file is packed with the UPX executable packer http://upx.sf.net $
$Id: UPX 3.08 Copyright (C) 1996-2011 the UPX Team. All Rights Reserved. $
[...snip...]
```
Note que a partir da enorme saída que temos, esta linha se levanta, mostrando que o arquivo é embalado com UPX empacotador. Certo, esta pode ser a razão pela qual os símbolos estão faltando. Os arquivos embalados têm seus símbolos despojados, e a única maneira de lê-los é desempacotando-os.

Após uma rápida pesquisa, encontramos [este artigo](https://linux.die.net/man/1/upx) sobre o comando `upx` Linux. Este comando pode ser usado para descompactar arquivos UPX executáveis, que parece ser o nosso caso. Podemos tentar usar o seguinte comando para desfazer o arquivo:

```bash
$ upx -d flag
```
Isto deve desfazer o binário `flag` e restaurar os símbolos em falta. Após desempacotar, podemos analisar o binário novamente usando o comando `file` para ver se os símbolos são despojados:

```bash
$ file flag
flag: ELF 64-bit LSB executable, x86-64, version 1 (GNU/Linux), statically linked, for GNU/Linux 2.6.24, BuildID[sha1]=96ec4cc272aeb383bd9ed26c0d4ac0eb5db41b16, not stripped
```
Como podemos ver, o arquivo não é despojado e podemos ler seus símbolos! Com uma pequena ajuda do GDB, podemos desmontar a função principal:

```bash
(gdb) disassemble main
Dump of assembler code for function main:
   0x0000000000401164 <+0>:     push   %rbp
   0x0000000000401165 <+1>:     mov    %rsp,%rbp
   0x0000000000401168 <+4>:     sub    $0x10,%rsp
   0x000000000040116c <+8>:     mov    $0x496658,%edi
   0x0000000000401171 <+13>:    call   0x402080 <puts>
   0x0000000000401176 <+18>:    mov    $0x64,%edi
   0x000000000040117b <+23>:    call   0x4099d0 <malloc>
   0x0000000000401180 <+28>:    mov    %rax,-0x8(%rbp)
   0x0000000000401184 <+32>:    mov    0x2c0ee5(%rip),%rdx        # 0x6c2070 <flag>                                                                       
   0x000000000040118b <+39>:    mov    -0x8(%rbp),%rax
   0x000000000040118f <+43>:    mov    %rdx,%rsi
   0x0000000000401192 <+46>:    mov    %rax,%rdi
   0x0000000000401195 <+49>:    call   0x400320
   0x000000000040119a <+54>:    mov    $0x0,%eax
   0x000000000040119f <+59>:    leave
   0x00000000004011a0 <+60>:    ret
End of assembler dump.
```
Aha! Como podemos ver, há um endereço que a bandeira é armazenada: `0x6c2070`.

## [](#solving)Solving!

Agora podemos usar o `x/1s *0x6c2070` para ver o conteúdo alocado neste endereço:

```bash
(gdb) x/1s *0x6c2070
0x496628:       "UPX...? sounds like a delivery service :)"
```
E ali está a nossa bandeira (:


# [](#conclusions)Conclusão
Este foi um desafio CTF muito simples. Descompactando o arquivo binário embalado usando o comando `upx`, conseguimos restaurar os símbolos que faltavam e lê-los com o GDB. Após analisar o binário, descobrimos o endereço onde a bandeira foi armazenada e usamos o comando `x/1s` para recuperar a bandeira: `UPX...? sounds like a delivery service :)`

Aproveite o seu cartão Pupa! Ouvi dizer que dá 400 HP base, por isso é muito bom para classe super novato!

<img src="../figs/pupa.png" alg="pupa card">

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **!


<a href="/">Voltar</a>
