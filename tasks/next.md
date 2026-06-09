
# Importacao e Criacao de Carteiras

Na importacao de carteira, o fluxo precisa de algumas melhorias de design primeiro o botao "Importar Carteira"
Tem uma seta -> que fica muito feia no botao, preciso que ajuste para utilizar um icone ou mesmo sem icone. O
botao tem as cores "amarela" com texto branco, sendo que no app todo os botoes sao brancos, isso foge o design do app.

Quando clica em importar, e exibido apenas um loader por um tempo durante a importacao, alem de nao fazer o
sync. Preciso que ajuste o fluxo para quando clicar em importar, exibir um modal, similar aos fluxos de loader
do app do Nubank, entao deve exibir um modal/tela com os feedbacks do processo de importacao, ou seja, exibe 
o fluxo:
    
    1 - Importando chaves
    2 - Sincronizando enderecos
    3 - Sincronizando contas

Em um desig muito elegante a tela ou modal de "loader" primeiro deve exibir "Importando chaves", enquanto
gera as chaves da carteira usando o mnemonico e tudo mais com o address manager. Nesse processo deve gerar
os primeiros 5 enderecos de recebimento e 5 de troco.

Na proxima etapa, deve fazer o sync desses enderecos, exibindo uma mensagem para o usuario, caso hajam transacoes
gastas nesses enderecos, deve exibir uma mensagem de feedback para o usuario e entao gerar os proximos 5 enderecos
e fazer o mesmo, com os enderecos sendo gerados de forma sequencial, deve fazer isso ate chegar nos ultimos 3
endrecos sem transacoes de recebimento, atendendo as politicas de gerenciamento de enderecos do address manager.
Caso existam enderecos com saldos mesmo que saldos gastos e etc na conta default(conta 0 BIP 84), isso 
significa que podem haver outras contas com saldo. Entao de forma sequencial deve seguir o fluxo de gerar os 
10 enderecos(5 de recebimento, 5 de troco) para a proxima conta fazendo a mesma sincronizacao da primeira
conta ate atender as regras da pilitica de gerenciamento de enderecos para essa conta. Isso deve ser feito
ate que gere uma conta onde os enderecos nao tenham nenhuma transacao. Entao as contas com saldos devem ser 
salvas com nomes padrao na segregacao de contas da carteira.

Esse fluxo deve ocorrer tanto na criacao quanto na importacao de enderecos, e deve ser implementado de 
tal modo que seja possivel importar uma mesma carteira no app sem afetar os dados da outra carteira, mesmo 
que as carteiras tenham a mesma chave privada. Esse comportamento e excencial para que essas funcionalidades
possam ser testadas de forma simples durante o desenvolvimento, contudo, implemente uma funcao de validacao
para verificar de a carteira sendo importada ja existe, se ja existir, deve apenas exibir uma mensagem para
o usuario com o feedback de que a carteira ja foi importada/criada no app, essa funcao sera habilitada, no 
fim do desenvolvimento do app.

Atualmente quando tento importar uma carteira que ja existe no app, o app importa porem quando clico em
sincronizar na home da carteira tenho um erro, ajuste isso implementando o fluxo acima.


* Todos os ajustes apontados aqui devem ser implementados seguindo as melhores praticas como Clean code,
SOLID e design pattern. Alem de cobrir todos os ajustes com testes automatizados para garantir que nao
haja regressoes, siga sempre a estrututura e padroes do projeto e sempre que houver implementacao "nova",
reutilize componentes do projeto sempre que possivel.

* O design das telas devem ser baseados no design e padroes do app da Nubank, porem em consistencia com 
o design atual do app.

* No fim da implementacao execute todos os testes para garantir que nao houveram regressoes e que tudo 
esta funcionando como o esperado, execute tambem o lint para garantir que nao foram deixados problemas
para tras. E por fim gere um documento com as politicas de criacao/importacao de carteiras no app e salve
na raiz do projeto em /policys onde ja tem hoje um documento com a politica de gerenciamento de enderecos.

