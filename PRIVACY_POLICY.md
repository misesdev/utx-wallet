# Privacy Policy — UTX Wallet

**App name:** UTX Wallet — Bitcoin & Crypto Wallet  
**Package:** com.utxwallet  
**Effective date:** June 9, 2026  
**Developer:** Mises Dev  
**Contact:** madrugadazulu@gmail.com

---

## 1. Overview

UTX Wallet is a **self-custodial Bitcoin cryptocurrency wallet** application. This privacy policy describes what data the app handles, where it is stored, and what we collect — and explicitly do not collect — about you.

**Summary: we collect nothing about you.** No accounts, no tracking, no analytics, no advertising.

---

## 2. App Category and Data Handling

UTX Wallet is a **cryptocurrency wallet** (Bitcoin wallet) app. Its sole purpose is to allow users to generate, import, manage, and use Bitcoin wallets fully on-device, without any server-side account or profile.

- No user registration is required.
- No account is created on any server.
- All wallet data is stored locally on your device.
- Private keys never leave your device.

---

## 3. Data We Do NOT Collect

UTX Wallet does **not** collect, transmit, or store any of the following:

- Personal information (name, email address, phone number, ID)
- Device identifiers (IMEI, advertising ID, fingerprint)
- Location data
- Usage analytics or crash reports
- Behavioral tracking or event logs
- Any form of telemetry or analytics

There are no third-party analytics SDKs, advertising SDKs, or data brokers integrated into the app.

---

## 4. Data Stored Locally on Your Device

All data created by the app is stored exclusively on your device using **local on-device storage**. Nothing is uploaded to any server (we operate no servers).

| Data | Storage type | Who can access |
|---|---|---|
| Seed phrase / mnemonic (encrypted) | Encrypted local storage | Only you, protected by PIN/biometrics |
| Wallet private keys | Derived on-demand, never persisted to disk | Only at signing time |
| Wallet accounts and origins | Local SQLite database | Only you |
| Transaction history | Local SQLite database | Only you |
| UTXO and address data | Local SQLite database | Only you |
| App settings (PIN, language, personal nodes) | Encrypted local storage | Only you |

### Private Key Handling

**Private keys are never written to disk.** They are derived from the seed phrase only at the moment a transaction is being signed, and are immediately discarded from memory after use. The seed phrase itself is stored encrypted using the device's secure storage mechanism, protected by your PIN and/or biometrics.

---

## 5. App Permissions

UTX Wallet requests the following device permissions:

| Permission | Purpose |
|---|---|
| **Internet** | Fetching Bitcoin blockchain data (UTXOs, transactions, fee estimates) from Mempool.space APIs |
| **Camera** | Scanning QR codes for Bitcoin addresses and wallet import (xpub/descriptor) |
| **Biometric / Fingerprint** | Optional authentication to unlock the app and authorize transactions |

No permission is used to collect, store, or transmit personal data.

---

## 6. Network Communications

The app communicates with Bitcoin network APIs solely to fetch your wallet's **public blockchain data** (UTXOs, transactions, balances, fee estimates). No private key, seed phrase, or personal data is ever transmitted over the network.

**Requests are sent to:**

- **Your personal Mempool.space node** (if configured in Settings → Nodes) — recommended for maximum privacy, as only your own infrastructure sees your Bitcoin addresses.
- **Public Mempool.space API** (`mempool.space`) — used as a fallback when no personal node is configured. **Disabled by default.** When enabled, your Bitcoin addresses may be visible to the Mempool.space API operator.

The app does not contact any server operated by Mises Dev.

---

## 7. No Data Sharing

We do not sell, trade, or share any user data with third parties — because we do not collect any user data in the first place.

---

## 8. Open Source

UTX Wallet is fully open source. You can inspect every line of code that runs on your device:

> **https://github.com/misesdev/utx-wallet**

There are no obfuscated components, no binary blobs, and no hidden network calls.

---

## 9. Google Play Data Safety

In accordance with Google Play's Data Safety requirements:

- **Data collected:** None
- **Data shared with third parties:** None
- **Data encrypted in transit:** Yes (HTTPS)
- **Data can be deleted by user:** Yes — deleting the app removes all local data
- **This app does not require account creation**

---

## 10. Children's Privacy

This app is not directed at children under 13 (or the applicable minimum age in your jurisdiction). We do not knowingly collect any information from minors.

---

## 11. Changes to This Policy

If this policy changes, the updated version will be published at the same URL with a new effective date. Significant changes will be noted in the app's release notes on Google Play.

---

## 12. Contact

Questions about this privacy policy:

**Email:** madrugadazulu@gmail.com  
**GitHub Issues:** https://github.com/misesdev/utx-wallet/issues

---

---

# Política de Privacidade — UTX Wallet

**Nome do app:** UTX Wallet — Carteira Bitcoin & Cripto  
**Pacote:** com.utxwallet  
**Data de vigência:** 9 de junho de 2026  
**Desenvolvedor:** Mises Dev  
**Contato:** madrugadazulu@gmail.com

---

## 1. Visão geral

O UTX Wallet é um aplicativo de **carteira Bitcoin de criptomoeda com autocustódia**. Esta política de privacidade descreve quais dados o aplicativo utiliza, onde são armazenados e o que coletamos — e explicitamente não coletamos — sobre você.

**Resumo: não coletamos nada sobre você.** Sem contas, sem rastreamento, sem analytics, sem publicidade.

---

## 2. Categoria do aplicativo e tratamento de dados

O UTX Wallet é um aplicativo de **carteira de criptomoeda** (carteira Bitcoin). Seu único propósito é permitir que os usuários gerem, importem, gerenciem e utilizem carteiras Bitcoin completamente no dispositivo, sem nenhuma conta ou perfil em servidor.

- Não é necessário cadastro.
- Nenhuma conta é criada em qualquer servidor.
- Todos os dados da carteira são armazenados localmente no seu dispositivo.
- Chaves privadas nunca saem do seu dispositivo.

---

## 3. Dados que NÃO coletamos

O UTX Wallet **não** coleta, transmite nem armazena nenhum dos seguintes dados:

- Informações pessoais (nome, e-mail, telefone, documento de identidade)
- Identificadores de dispositivo (IMEI, ID de publicidade, fingerprint)
- Dados de localização
- Analytics de uso ou relatórios de erros
- Rastreamento comportamental ou logs de eventos
- Qualquer forma de telemetria ou analytics

Não há SDKs de analytics, SDKs de publicidade nem intermediários de dados integrados ao aplicativo.

---

## 4. Dados armazenados localmente no seu dispositivo

Todos os dados criados pelo app ficam armazenados exclusivamente no seu dispositivo, usando **armazenamento local no dispositivo**. Nada é enviado para qualquer servidor (não operamos servidores).

| Dado | Tipo de armazenamento | Quem pode acessar |
|---|---|---|
| Frase-semente / mnemônico (criptografada) | Armazenamento local criptografado | Somente você, protegido por PIN/biometria |
| Chaves privadas da carteira | Derivadas sob demanda, nunca salvas em disco | Somente no momento da assinatura |
| Contas e origens da carteira | Banco de dados SQLite local | Somente você |
| Histórico de transações | Banco de dados SQLite local | Somente você |
| UTXOs e endereços | Banco de dados SQLite local | Somente você |
| Configurações (PIN, idioma, nodes pessoais) | Armazenamento local criptografado | Somente você |

### Tratamento de chaves privadas

**Chaves privadas nunca são gravadas em disco.** Elas são derivadas da seed phrase somente no momento em que uma transação está sendo assinada e são imediatamente descartadas da memória após o uso. A própria seed phrase é armazenada de forma criptografada no armazenamento seguro do dispositivo, protegida pelo seu PIN e/ou biometria.

---

## 5. Permissões do aplicativo

O UTX Wallet solicita as seguintes permissões do dispositivo:

| Permissão | Finalidade |
|---|---|
| **Internet** | Buscar dados públicos da blockchain Bitcoin (UTXOs, transações, estimativas de taxa) nas APIs do Mempool.space |
| **Câmera** | Escanear QR codes de endereços Bitcoin e importação de carteira (xpub/descriptor) |
| **Biometria / Impressão digital** | Autenticação opcional para desbloquear o app e autorizar transações |

Nenhuma permissão é utilizada para coletar, armazenar ou transmitir dados pessoais.

---

## 6. Comunicações de rede

O aplicativo se comunica com APIs de rede Bitcoin exclusivamente para buscar **dados públicos da blockchain** relacionados à sua carteira (UTXOs, transações, saldos, estimativas de taxa). Nenhuma chave privada, seed phrase ou dado pessoal é transmitido pela rede.

**As requisições são feitas para:**

- **Seu node Mempool.space pessoal** (se configurado em Configurações → Nodes) — recomendado para máxima privacidade, pois somente sua própria infraestrutura verá seus endereços Bitcoin.
- **API pública do Mempool.space** (`mempool.space`) — usada como fallback quando nenhum node pessoal está configurado. **Desativada por padrão.** Quando ativada, seus endereços Bitcoin podem ser visíveis ao operador da API do Mempool.space.

O aplicativo não contata nenhum servidor operado pela Mises Dev.

---

## 7. Não compartilhamento de dados

Não vendemos, negociamos nem compartilhamos dados dos usuários com terceiros — porque simplesmente não coletamos dados dos usuários.

---

## 8. Código aberto

O UTX Wallet é totalmente open source. Você pode inspecionar cada linha de código que roda no seu dispositivo:

> **https://github.com/misesdev/utx-wallet**

Não há componentes ofuscados, binários opacos nem chamadas de rede ocultas.

---

## 9. Segurança de dados no Google Play

De acordo com os requisitos de Segurança de Dados do Google Play:

- **Dados coletados:** Nenhum
- **Dados compartilhados com terceiros:** Nenhum
- **Dados criptografados em trânsito:** Sim (HTTPS)
- **Dados podem ser excluídos pelo usuário:** Sim — desinstalar o app remove todos os dados locais
- **Este app não requer criação de conta**

---

## 10. Privacidade de menores

Este aplicativo não é direcionado a menores de 13 anos (ou a idade mínima aplicável na sua jurisdição). Não coletamos intencionalmente informações de menores.

---

## 11. Alterações nesta política

Caso esta política seja alterada, a versão atualizada será publicada na mesma URL com nova data de vigência. Mudanças significativas serão mencionadas nas notas de atualização do app no Google Play.

---

## 12. Contato

Dúvidas sobre esta política de privacidade:

**E-mail:** madrugadazulu@gmail.com  
**GitHub Issues:** https://github.com/misesdev/utx-wallet/issues
