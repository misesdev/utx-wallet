# Privacy Policy — UTX Wallet

**Effective date:** June 9, 2026  
**Developer:** Mises Dev  
**Contact:** madrugadazulu@gmail.com

---

## 1. Overview

UTX Wallet is a self-custodial Bitcoin wallet. This policy explains what data the app handles, where it goes, and what we do — and do not — collect about you.

The short version: **we collect nothing about you.** No accounts, no tracking, no analytics, no ads.

---

## 2. Data We Do NOT Collect

UTX Wallet does not collect, transmit, or store any of the following:

- Personal information (name, email, phone number, ID)
- Device identifiers (IMEI, advertising ID, fingerprint)
- Location data
- Usage analytics or crash reports
- Behavioral tracking or event logs
- Any form of telemetry

There are no third-party analytics SDKs, advertising SDKs, or data brokers integrated into the app.

---

## 3. Data Stored on Your Device

All data the app creates stays exclusively on your device. Nothing is uploaded to our servers (we have none).

| Data | Where it's stored | Who can access it |
|---|---|---|
| Seed phrase (encrypted) | Device encrypted storage | Only you, protected by PIN/biometrics |
| Wallet keys and accounts | Device encrypted storage | Only you |
| Transaction history | Local SQLite database | Only you |
| UTXO and address data | Local SQLite database | Only you |
| App settings (PIN, language, nodes) | Device encrypted storage | Only you |

**Private keys are never written to disk.** They are derived from your seed phrase only at the moment of signing a transaction and are immediately discarded from memory afterwards.

---

## 4. Network Communications

The app communicates with Bitcoin network APIs solely to fetch your wallet's public blockchain data (UTXOs, transactions, balances, fee estimates). It never transmits any private key or seed phrase over the network.

**Requests are made to:**

- **Your personal Mempool.space node** (if configured) — this is the recommended setup for maximum privacy, as only your own infrastructure sees your addresses.
- **Public Mempool.space API** (`mempool.space`) — used as a fallback if no personal node is configured. This is **disabled by default**. When enabled, your Bitcoin addresses may be visible to the Mempool.space API operator.

The app does not contact any server operated by the developer.

---

## 5. Open Source

UTX Wallet is fully open source. You can inspect every line of code that runs on your device:

> **https://github.com/misesdev/utx-wallet**

There are no obfuscated components, no binary blobs, and no hidden network calls.

---

## 6. Children's Privacy

The app is not directed at children under 13 (or the applicable age in your jurisdiction). We do not knowingly collect any information from minors.

---

## 7. Changes to This Policy

If this policy changes, the updated version will be published at this URL with a new effective date. Significant changes will be noted in the app's release notes.

---

## 8. Contact

Questions about this policy:

**Email:** madrugadazulu@gmail.com  
**GitHub:** https://github.com/misesdev/utx-wallet/issues

---

---

# Política de Privacidade — UTX Wallet

**Data de vigência:** 9 de junho de 2026  
**Desenvolvedor:** Mises Dev  
**Contato:** madrugadazulu@gmail.com

---

## 1. Visão geral

O UTX Wallet é uma carteira Bitcoin de autocustódia. Esta política explica quais dados o aplicativo utiliza, para onde vão e o que coletamos — e o que não coletamos — sobre você.

A versão resumida: **não coletamos nada sobre você.** Sem contas, sem rastreamento, sem analytics, sem anúncios.

---

## 2. Dados que NÃO coletamos

O UTX Wallet não coleta, transmite nem armazena nenhum dos seguintes dados:

- Informações pessoais (nome, e-mail, telefone, documento)
- Identificadores de dispositivo (IMEI, ID de publicidade, fingerprint)
- Dados de localização
- Analytics de uso ou relatórios de erros
- Rastreamento comportamental ou logs de eventos
- Qualquer forma de telemetria

Não há SDKs de analytics, SDKs de publicidade nem intermediários de dados integrados ao aplicativo.

---

## 3. Dados armazenados no seu dispositivo

Todos os dados criados pelo app ficam exclusivamente no seu dispositivo. Nada é enviado para servidores nossos (não temos servidores).

| Dado | Onde é armazenado | Quem pode acessar |
|---|---|---|
| Frase-semente (criptografada) | Armazenamento criptografado do dispositivo | Somente você, protegido por PIN/biometria |
| Chaves e contas da carteira | Armazenamento criptografado do dispositivo | Somente você |
| Histórico de transações | Banco de dados SQLite local | Somente você |
| UTXOs e endereços | Banco de dados SQLite local | Somente você |
| Configurações (PIN, idioma, nodes) | Armazenamento criptografado do dispositivo | Somente você |

**Chaves privadas nunca são gravadas em disco.** Elas são derivadas da sua seed somente no momento da assinatura de uma transação e são imediatamente descartadas da memória após o uso.

---

## 4. Comunicações de rede

O aplicativo se comunica com APIs de rede Bitcoin exclusivamente para buscar dados públicos da blockchain relacionados à sua carteira (UTXOs, transações, saldos, estimativas de taxa). Nenhuma chave privada ou seed phrase é transmitida pela rede.

**As requisições são feitas para:**

- **Seu node Mempool.space pessoal** (se configurado) — esta é a configuração recomendada para máxima privacidade, pois somente sua própria infraestrutura verá seus endereços.
- **API pública do Mempool.space** (`mempool.space`) — usada como fallback quando nenhum node pessoal está configurado. Esta opção está **desativada por padrão**. Quando ativada, seus endereços Bitcoin podem ser visíveis ao operador da API do Mempool.space.

O aplicativo não contata nenhum servidor operado pelo desenvolvedor.

---

## 5. Código aberto

O UTX Wallet é totalmente open source. Você pode inspecionar cada linha de código que roda no seu dispositivo:

> **https://github.com/misesdev/utx-wallet**

Não há componentes ofuscados, binários opacos nem chamadas de rede ocultas.

---

## 6. Privacidade de menores

O aplicativo não é direcionado a menores de 13 anos (ou a idade aplicável na sua jurisdição). Não coletamos intencionalmente informações de menores.

---

## 7. Alterações nesta política

Caso esta política seja alterada, a versão atualizada será publicada nesta URL com nova data de vigência. Mudanças significativas serão mencionadas nas notas de atualização do aplicativo.

---

## 8. Contato

Dúvidas sobre esta política:

**E-mail:** madrugadazulu@gmail.com  
**GitHub:** https://github.com/misesdev/utx-wallet/issues
