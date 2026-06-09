
# No fluxo de criacao de uma carteira, tenho o problema:

* A label da Passphrase aparece como "Passphrase(25 palavra)", oque esta errado, a caretira e gerada 
usando uma seed 12 palavras. O problema tambem existe na importacao da carteira.

---

# As configuracoes devem ser segregadas:

* Na tela inicial, onde sao listadas as carteiras deve ser adicionado um menu na parte inferior da tela,
Esse menu deve conter dois botoes um para abrir as configuracoes globais e um para escanear e importar
carteiras atraves da leitura de qr-code. Clicando no botao de configuracoes abrira uma tela similar a 
tela de configuracoes da carteira, porem com as configuracoes globais como [Configuracao do Node, Idioma,
Seguranca, etc] que devem ser movidas da tela de configuracoes da carteira para a tela de configuracoes globais. 
Clicando deve abrir uma tela com a camera para escanear qr-code, ou seja, ler um 
qr-code e verificar se o valor do qr-code e um Wif, xpub(watch-only) ou xpub, caso seja um Wif ou uma chave 
privada nos formatos aceitos, entao faz a importacao direta da carteira abrindo uma tela apenas para 
o usuario definir um nome. Nesse tipo de importacao deve permitir importar carteiras watch-only com xpub, xpriv, wif etc.
Nessa implementacao verifique e ajuste se necessarios todos os pontos de sync, address manager e etc para
suportar watch-only.

* O item "seguranca" nas configuracoes globais deve abrir a tela de configuracoes normalmente, apenas 
migrando a tela para a home do app. As configuracoes de seguranca devem ser aplicadas, pois atualmente 
mesmo ativando "ocultar saldos" nao reflete na exibicao dos saldos nos lugares onde o saldo aparece. Ainda 
nas configuracoes, deve ajustar o modal de PIN para ficar com um design mais agradavel e modeno, o design 
atual esta terrivel, se ativo o pin/biometria deve ser solicitado sempre que abrir o app e sempre que for 
enviar uma transacao.

* Nas configuracoes da carteira deve ser removido o item de configuracao da rede, pois uma vez criada como 
testnet4 deve permanecer como testenet4, o mesmo vale para mainnet.

* Nas configuracoes da carteira, na tela de "backup" deve ser possivel visualizar a seed solicitando, se
configurado, o PIN/biometria. A tela de exibicao da seed deve ter um design moderno e agradavel, consistente
com o design do restante do app.

* Na tela de configuracoes da carteira deve ter um botao no fim para excluir a carteira, onde clicando em 
excluir, exibe um modal de confirmacao(para isso deve reutilizar um componente de modal de confirmacao ou 
criar um se nao existir), se confirmado, todos os dados da carteira devem ser excluidos redirecionando para 
a home da carteira.

* Na tela de configuracoes da carteira deve exibir o nome da carteira no topo com a opcao para que o usuario
possa editar o nome da carteira.

* Nas configuracoes globais, no topo deve exibir um item "Doar", que quando clicado, deve abrir uma tela
com o endereco bitcoin de recebimento de doacoes(com opcao para copiar facilmente) e logo abaixo uma explicacao 
de como a doacao de satoshis pode ajudar na mantenabilidade do app, alem do link do projeto no github.

---

# Na segregacao de enderecos, os items de "conta":

* Os items de conta devem exibir o saldo atual, em todos os lugares em que exibir a lista de "contas"
deve exibir o saldo nos items, como por exemplo na tela de home da carteira, na tela de envio/recebimento
quando o usuario vai selecionar a conta da qual esta enviando ou para a qual esta recebendo. O mesmo se 
aplica ao saldo disponivel exibido na tela de envio, deve exibir o saldo disponivel da "conta" selecionada,
caso nenhuma conta tenha sido selecionada/cadastrada, entao as regras se aplicam a conta default.

* Deve implementar a possibilidade de renomear uma "conta".

* Na Home da carteira, quando clicar no item da "conta" deve abrir uma tela com o nome da conta no topo
o saldo logo abaixo em uma fonte grande e logo abaixo a lista de transacoes.

* Na lista de transacoes da tela home da carteira deve exibir de qual "conta" a transacao e.


# Nas tela de envio/recebimento:

* Na tela de envio, deve ter uma opcao "pagar a taxa", naturalmente nao ativado, por padrao a taxa 
de rede deve ser paga sempre pelo endereco para o qual o saldo esta sendo enviado. Se marcado 
"pagar taxa" ai sim descontar a taxa de rede do endereco de troco da transacao. Esse item "pagar taxa"
deve estar na tela de definicao da taxa e confirmacao do envio.

# Aceleracao de transacao:

* Quando o usuario abrir uma transacao para ver os detalhes, se a transacao ainda nao estiver confirmada
Deve exibir um botao para permitir que utilize o RBF para remontar a transacao com uma taxa de rede maior
e reenviar a rede sobrescrevendo a transacao anterior.


