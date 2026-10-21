---
title: "Dicas de Bug Bounty"
date: 2024-03-20
published: true
lang: pt-BR
translation_key: "bug-bounty-tips"
original_url: /bug-bounty-tips
permalink: /pt-br/bug-bounty-tips
---
Olá, pessoal! Já faz algum tempo, não é?

Primeiro e acima de tudo, eu não tenho sido tão ativo aqui nestes últimos dois meses porque eu decidi me concentrar em Bug Bounties em vez de CTFs, pelo menos por enquanto. Diferentemente dos CTFs, não posso revelar todos os Bugs que encontro em Bug Bounties, então é por isso que o blog tem sido um pouco silencioso. Por isso, desculpa! No entanto, não pense que nunca mais vou postar! Na verdade, há alguns CVEs no caminho que pretendo postar, e até mesmo alguns trechos sobre o que tenho feito.

Transitoriamente para o nosso tópico principal de hoje, percebo que a minha mudança para o Bug Bounties tem suscitado curiosidade e suscitado perguntas entre muitos de vós. Ultimamente, tenho sido inundado de mensagens no LinkedIn, com muitos de vocês perguntando:  "Ei! Como começaste a fazer recompensas por insectos? Você pode me ajudar?"  ou expressar preocupações como:  "Estou começando a caçar, mas não encontrei nada até agora. Devo desistir?"

Dado o volume de perguntas e a impraticidade de responder a cada uma individualmente, decidi dedicar este post a lançar luz na minha jornada para Bug Bounties.

O começo

Pensando um pouco, lembro-me que a primeira vez que ouvi falar de Insectos foi durante os meus anos de liceu. Claro que não foi quando comecei a participar deles, mas é sempre perspicaz rastrear os nossos encontros iniciais com qualquer coisa. Foi só em 2022 que decidi mudar a minha carreira de físico para entusiasta da segurança cibernética e caçador de bugs. A razão por trás disso? Este é um tópico para outro post!

Minha primeira incursão em participar de um Programa de Bounty Bug foi através do HackerOne, que, para aqueles que podem não ser familiares, é uma das plataformas Bug Bounty mais prestigiadas do reino cibernético. Eu tomei o meu mergulho inaugural com um banco (cujo nome escapa-me agora), onde eu tropecei no que eu acreditava ser um redirecionamento aberto e relatou-o ansiosamente. Verdade seja dita, naquela época, minhas habilidades eram bastante nascentes, e meu relatório foi rapidamente encerrado devido à falta de impacto.

Esta rejeição inicial e bastante significativa veio em agosto de 2022, levando-me a dar um passo para trás e reavaliar minha posição sobre o tabuleiro de xadrez. Tornou-se claro que eu ainda não estava equipado para mergulhar em tais programas, especialmente um associado a um banco — o único nicho que poderia ser reputado com os melhores padrões de segurança. Por causa disso, comecei a desenvolver diligentemente minhas habilidades do zero.

# # O material

Como muitos recém-chegados à cena da segurança cibernética, encontrei-me inundado por uma avalanche de informações sobre o campo. Eu encontrei numerosos cursos on-line pagos, para os quais eu lamentavelmente desembolsei dinheiro, apenas para aprender nada — quer devido aos cursos serem fraudes ou simplesmente falta de métodos de ensino eficazes. No entanto, nem tudo foi em vão, como entre essas tentativas, eu descobri o renomado laboratório de prática web hacking, [Portswigger](https://portswigger.net)!

Se isso não lhe é familiar, imagine Portswigger como um site que o convida a hackear, sem qualquer risco de danos ou repercussões legais. É criado para imitar uma grande variedade de vulnerabilidades web e as técnicas para explorá-las, tornando-se uma plataforma incrivelmente amigável. Além disso, ele se orgulha de uma vasta comunidade, garantindo que se você se encontrar intrigado por um de seus laboratórios, a ajuda está prontamente disponível online. Não o posso recomendar o suficiente. Hoje em dia, até inclui seções de aprendizagem, permitindo que você entenda os conceitos antes de sujar as mãos.

Decidi completar pelo menos todos os laboratórios de nível iniciante antes de voltar para Bug Bounties. E foi isso que eu fiz! Claro, no início só consegui resolver os laboratórios com uma solução ao meu lado. Então minha estratégia foi a seguinte:

<div style="display: flex; justify-content: center; align-items: center;">
<img src="../assets/bbounty-mermaid.png" alt="flow chart">
</div>

Para ser honesto, esta estratégia é a que uso até hoje sempre que quero resolver algo que não posso sem uma solução.

# # O regresso

Depois de completar todos os laboratórios de nível fácil, decidi voltar à caça. Foi quando descobri a minha primeira vulnerabilidade. E adivinha onde o encontrei? No próprio site de Portswigger! No entanto, não estava nos laboratórios, identifiquei uma vulnerabilidade real no site deles. Engraçado, foi outro redirecionamento aberto. Desta vez, porém, fiz uma pausa para considerar: como é que eu poderia relatar isto e demonstrar o seu impacto de forma eficaz? Minha tentativa inicial tinha sido rejeitada devido à falta de impacto demonstrado. Este é o momento que você muitas vezes ouve hackers mencionar a importância de pensar fora da caixa. Então, depois de alguns dias eu encontrei uma maneira de mostrar como alguém poderia alavancar isso na divulgação de informações através de um SSRF (Server Side Request Forgery) e decidiu denunciá-lo.

Escrevi um e-mail para a equipe de apoio e... Acertou em cheio! No dia seguinte eles resolveram e consertaram!

A moagem

Recomendo vivamente a todos os leitores: a prática faz a perfeição. Sempre fui uma pessoa curiosa, por isso descobri uma variedade de sites que oferecem laboratórios de segurança cibernética para a prática. [Pwnable](https://pwnable.kr) é um desses exemplos, e assim é [Root-me](https://www.root-me.org). A primeira é particularmente desafiadora, uma vez que as soluções não estão prontamente disponíveis on-line, e muitos dos seus desafios envolvem exploração binária, aumento do privilégio do sistema e engenharia reversa — conceitos não abrangidos por Portswigger, por exemplo. O Root-me é outro excelente recurso que oferece uma ampla gama de laboratórios, desde a exploração binária até a web, embora as soluções sejam ainda mais escassas do que no Pwnable.

Eu também recomendo [Hacker101](https://www.hacker101.com/), HackerOne próprio site de laboratório prática. É ótimo porque, ao resolvê-los, você ganha pontos. Com pontos suficientes, você pode ser chamado para um programa privado, onde a competição é muito menor. Foi isto que me aconteceu. Depois de resolver alguns destes, fui chamado para verificar os programas VDP da Latam Airlines e da Sephora. Eu poderia relatar um ou dois vulns lá também, mas nada muito impactante.

Finalmente, devo mencionar [TryHackMe](https://tryhackme.com/) e [HackTheBox](https://www.hackthebox.com/) como um dos melhores recursos de aprendizagem lá fora. Eles têm excelente material de estudo e laboratórios incríveis para serem resolvidos, variando de super fáceis até almas escuras quase impossíveis como aqueles.

# # Plataformas de recompensa de bugs

Quando se trata de escolher plataformas, sugiro fortemente optar por plataformas menos competitivas para evitar sentir-se sobrecarregado e frustrado ao relatar duplicatas ou não encontrar vulnerabilidades. A minha abordagem é sempre consistente: Eu seleciono um programa que me atrai tanto em termos de potenciais ganhos e recursos, em seguida, dedicar pelo menos 15 dias para uma pesquisa completa e reconhecimento antes de começar mais 15 dias de testes. Se não encontrar nada durante este tempo, passo para outro programa. A falta de achados pode ser devida à falta de motivação ou concorrência excessiva. Nunca se sabe. Ao alocar tempo para entender o programa e ter uma sensação dele, você pode decidir com confiança se você está no caminho certo. HackerOne e [Bugcrowd](https://www.bugcrowd.com/) são plataformas bem conhecidas, o que pode ser vantajoso em termos de pagamentos, mas às vezes pode ser muito competitivo, levando a menos vulnerabilidades encontradas.

Eu posso estar estragando, mas eu fortemente recomecei você dar uma olhada em [Yogosha](https://yogosha.com); é uma plataforma que requer que você se inscreva para participar, completar um CTF, e passar. Se você passar, eles lhe concedem acesso, e a competição é muito menor do que em outras plataformas grandes como HackerOne e Buglod. Você também pode querer conferir [HuntrDev](https://huntr.dev). Esta plataforma está focada em encontrar bugs em projetos de aprendizado de máquina e geralmente envolve revisão de código, o que torna as coisas um pouco mais fáceis. Como uma menção honrosa, se você gostaria de receber em euros, você pode verificar [Intigriti](https://www.intigriti.com/) Plataforma Bug Bounty. Oferece um bom equilíbrio entre competitividade e pagamentos.

# # Vulns encontrados

Encontrei uma grande variedade de vulnerabilidades, algumas por mim mesma, outras juntas com amigos. Entre os achados mais críticos estavam uma vulnerabilidade de Execução de Código Remoto (RCE) em um projeto de código aberto, uma injeção SQL que levou a um depósito de banco de dados e o sequestro de sessão facilitado por cookies roubados. Eu nunca me concentro nas frutas de pendura baixa; em vez disso, minha estratégia é sempre procurar maneiras de girar e amplificar o impacto de minhas descobertas.

# # Metodologia

Todo mundo desenvolve sua própria metodologia para a caça de insetos. Pessoalmente, prefiro a exploração manual porque me deu os melhores resultados. Métodos manuais permitem uma compreensão mais profunda das vulnerabilidades e suas nuances. Embora eu tenha observado outros empregarem com sucesso a automação — e ela tem seus benefícios, especialmente para cobrir uma área de superfície mais ampla rapidamente — ela, em última análise, resume-se ao que a estratégia mais ressoa com seu estilo de caça. Encontrar a abordagem que melhor representa sua maneira de pensar e explorar é o que o fará ver resultados.

Conclusão

Ao terminar, aqui estão as minhas palavras de sabedoria: uma vez que você tenha conseguido lidar com uma vulnerabilidade específica, dedique-se à fase de reconhecimento e pesquisa. Não posso deixar de salientar como isso é importante, uma vez que uma compreensão profunda do seu objectivo pode simplificar significativamente o processo de exploração. Lançar em tentativas sem uma estratégia clara ou compreensão raramente produz resultados frutíferos. Priorize o reconhecimento, e mantenha seu espírito elevado, mesmo que você não bata em ouro dentro dos primeiros 15 dias ou até mesmo um mês. Minha própria experiência tem visto picos de descobrir múltiplas vulnerabilidades em uma única semana, contrastado com períodos secos que se estendem ao longo de meses.

E, se há um conselho a destacar acima de tudo, é a importância da persistência. Comprometa-se a gastar pelo menos 10 a 15 dias em reconhecimento e testando tarefas diretas no seu alvo. Este período dedicado de exploração e compreensão estabelece as bases para identificar e conectar vulnerabilidades de forma mais eficaz. Lembre-se, dominar a arte de caçar insetos é uma maratona, não um sprint. Resiliência diante de desafios e paciência em seu processo são seus maiores aliados.

E a sua experiência? Detona-me com o teu e talvez até possamos colabrá-lo!

Desejo-vos uma feliz invasão!

E como sempre, não se esqueça de fazer sua **pesquisa**!


<a href="/">Voltar</a>
