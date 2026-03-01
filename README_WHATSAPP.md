# Integração WhatsApp - Phone Smart ERP

Este módulo permite o envio automático de notificações de status de Ordem de Serviço via WhatsApp Cloud API.

## 1. Requisitos (Meta for Developers)
1. Crie uma conta de desenvolvedor em [developers.facebook.com](https://developers.facebook.com).
2. Crie um Aplicativo do tipo **Empresa (Business)**.
3. Adicione o produto **WhatsApp** ao aplicativo.
4. Na aba **API Setup**, copie:
   - **Phone Number ID** (Identificador do número de telefone).
   - **Access Token** (Recomendado: Criar um Usuário de Sistema com token permanente).

## 2. Criar Template de Mensagem
O WhatsApp exige que mensagens iniciadas pela empresa usem templates aprovados.

1. No Gerenciador de WhatsApp, vá em **Modelos de Mensagem**.
2. Crie um novo modelo:
   - **Nome**: `os_update` (ou outro nome de sua preferência, que deve ser configurado no ERP).
   - **Categoria**: Utilidade / Atualização de conta.
   - **Idioma**: Português (Brasil).
3. **Corpo da mensagem** (Exemplo):
   ```text
   Olá {{1}}, atualizamos o status da sua OS #{{2}} ({{3}}).
   Novo Status: *{{4}}*
   
   Dúvidas? Entre em contato.
   ```
   *Nota: As variáveis devem seguir essa ordem exata:*
   - `{{1}}`: Nome do Cliente
   - `{{2}}`: Número da OS
   - `{{3}}`: Modelo do Equipamento
   - `{{4}}`: Novo Status

## 3. Configuração no ERP
1. Acesse o menu **Configurações > WhatsApp**.
2. Cole o **Token** e o **Phone Number ID**.
3. Digite o **Nome do Template** criado (ex: `os_update`).
4. Ative a opção **Ativar Notificações**.

## 4. Uso
Ao mover um card na tela de Ordens de Serviço (Kanban), o sistema enviará automaticamente a mensagem para o cliente vinculado à OS (se ele tiver telefone cadastrado).
