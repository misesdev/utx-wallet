A carteira usa uma política HD conservadora, orientada a privacidade, não reutilização de endereços e segregação lógica de saldos.

1. Endereços

A carteira deve gerenciar endereços derivados de uma seed HD.

Nenhuma chave privada deve ser salva na tabela de endereços.

A tabela de endereços deve salvar apenas:
- walletId
- originId
- address
- path
- accountIndex
- chain
- index
- status
- metadados de sincronização
- relações com UTXOs e transações

A chave privada deve ser derivada novamente pelo path somente no momento de assinatura.

2. Chains

A carteira deve separar endereços em duas chains:

- receive: endereços para recebimento
- change: endereços para troco

Paths recomendados:

Mainnet:
- receive: m/84'/0'/accountIndex'/0/index
- change:  m/84'/0'/accountIndex'/1/index

Testnet:
- receive: m/84'/1'/accountIndex'/0/index
- change:  m/84'/1'/accountIndex'/1/index

3. Origens / segregações

A carteira deve suportar origens de endereço.

A origem padrão usa:

- name: Default
- accountIndex: 0

Cada nova segregação criada pelo usuário deve usar um novo accountIndex.

Exemplo:

- Default: m/84'/0'/0'
- BIPA:    m/84'/0'/1'
- Binance: m/84'/0'/2'

Cada origem deve possuir seu próprio pool de receive e change.

4. Pool mínimo

Para cada origem, a carteira deve manter sempre:

- 3 endereços fresh de recebimento
- 5 endereços fresh de troco

O pool de troco usa um mínimo maior que o de recebimento (5 > 3) porque endereços de troco são selecionados automaticamente durante envios, sem interação do usuário. Esse tamanho é suficiente para múltiplas transações em andamento e fica dentro do gap limit (20), garantindo que a importação da carteira descubra todos os fundos.

Após qualquer sync, criação de origem, recebimento, envio ou alteração de status, o Address Manager deve garantir novamente o pool mínimo.

5. Gap limit

A carteira deve usar gap limit para descoberta de endereços.

Configuração:

- minAvailableReceive = 3  (pool operacional para recebimento)
- minAvailableChange  = 5  (pool operacional para troco)
- gapLimit = 20             (janela de descoberta durante importação)

O gap limit de 20 define quantos endereços consecutivos sem transação o importador verifica antes de parar. O pool de troco (5) é intencionalmente menor que o gap limit para evitar sobrecarga de sincronização em APIs públicas (mempool: 1 req/s). Como o pool < gap limit, a importação sempre encontra todos os endereços usados.

6. Status de endereço

Estados:

- fresh: endereço nunca teve transação
- reserved: endereço foi selecionado como destino de troco em uma transação sendo montada, mas a transação ainda não foi transmitida
- received: endereço recebeu fundos e nunca foi usado como input
- spent_once: endereço já foi usado como input em uma transação
- change: endereço de troco que recebeu fundos
- archived: endereço antigo, apenas histórico
- inconsistent: estado inesperado detectado pelo sync

Ciclo de vida do status reserved:

Um endereço só pode ser marcado como reserved DEPOIS de calcular que o troco é necessário (changeSats >= 546 sats, limite de dust). Se a transação não gerar troco (envio de valor exato, drain, ou troco absorvido por dust), nenhum endereço deve ser reservado.

No sync, se um endereço está como reserved mas não tem transações na blockchain, ele é liberado de volta para fresh. Isso garante que endereços reservados em transações canceladas ou não-transmitidas não criem lacunas permanentes no pool.

7. Regra de recebimento

Um endereço receive pode receber múltiplas transações enquanto nunca tiver sido usado como input.

Quando o usuário clicar em receber:

- se nenhuma origem for escolhida, usar Default
- se uma origem for escolhida, usar aquela origem
- selecionar o endereço receive fresh mais antigo da origem
- opcionalmente marcar como reserved
- se não houver 3 endereços fresh após a seleção, derivar novos

Endereço com status spent_once nunca pode ser sugerido para recebimento.

Endereço change nunca deve ser sugerido como endereço normal de recebimento.

8. Regra de envio

Quando qualquer UTXO de um endereço for usado como input, todos os UTXOs disponíveis daquele mesmo endereço devem ser incluídos na mesma transação.

Regra obrigatória:

Se gastar 1 UTXO do endereço X, gastar todos os UTXOs disponíveis do endereço X.

O saldo restante deve ir obrigatoriamente para um endereço change fresh.

A carteira não deve permitir gasto parcial deixando saldo remanescente no endereço original.

Após o envio:

- todos os endereços usados como input devem ser marcados como spent_once
- nenhum endereço spent_once pode voltar a receber
- troco nunca deve voltar para o mesmo endereço de origem
- troco deve ir para endereço change fresh
- o pool mínimo deve ser recomposto

9. Coin selection

A coin selection pode selecionar UTXOs livremente, mas ao selecionar qualquer UTXO de um endereço, deve expandir a seleção para incluir todos os UTXOs disponíveis daquele endereço.

UTXOs congelados não devem ser usados.

UTXOs indisponíveis, pendentes bloqueados ou já reservados não devem ser usados.

Quando o usuário enviar a partir de uma origem específica, a coin selection deve priorizar UTXOs daquela origem.

Se a transação misturar UTXOs de múltiplas origens, o endereço de troco deve seguir uma política explícita:

- padrão inicial: enviar troco para Default
- alternativa futura: enviar troco para origem majoritária dos inputs

10. Sincronização

O sync deve sincronizar todos os endereços conhecidos:

- receive
- change
- Default
- segregações criadas pelo usuário

O sync deve atualizar:

- txCount
- incomingTxCount
- outgoingTxCount
- totalReceivedSats
- totalSentSats
- hasUtxos
- lastSyncedAt
- status

Regras de status no sync:

- sem transações e status fresh: fresh (mantém)
- sem transações e status reserved: fresh (libera — a tx não foi transmitida)
- recebeu e nunca gastou: received
- apareceu como input: spent_once
- endereço de troco com transações: change
- spent_once com UTXO residual: inconsistent

Após o sync, o Address Manager deve garantir 3 receive fresh e 5 change fresh por origem.

11. Segurança

A tabela de endereços nunca deve conter:

- private key
- seed
- mnemonic
- xprv
- qualquer material secreto

Pode conter:

- address
- derivation path
- public metadata
- balances
- tx references
- UTXO references

12. Futuras segregações

A funcionalidade de segregação de endereços deve funcionar como “caixinhas” lógicas.

Cada segregação terá:

- nome
- accountIndex próprio
- pool receive próprio
- pool change próprio
- saldo derivado dos UTXOs associados aos seus endereços

Exemplo:

- Default
- BIPA
- Binance
- Pessoal
- Reserva

Ao criar uma nova origem, o Address Manager deve gerar automaticamente:

- 3 endereços receive fresh
- 5 endereços change fresh
