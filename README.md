# Predictus — Backend de Cadastro

API REST de onboarding multi-step com verificação por e-mail (MFA), desenvolvida como teste técnico para a Predictus.

## Stack

- **NestJS 10** · **TypeORM 0.3** · **PostgreSQL 16**
- **pnpm** · **Node 20+**
- **Resend** (envio de e-mails) · **ViaCEP** (consulta de endereço)
- **Swagger** (documentação automática em `/api`) · **Throttler** (rate limiting)

---

## Rodando com Docker (recomendado)

> Sobe PostgreSQL + backend com um único comando. O frontend está em repositório separado.

```bash
# 1. Copiar variáveis de ambiente
cp .env.sample .env

# 2. Preencher obrigatoriamente no .env:
#    RESEND_API_KEY=<sua chave>
#
# As variáveis de banco já vêm pré-configuradas no .env.sample
# com os valores usados pelo docker-compose.
# Se o frontend rodar em outra porta/origem, ajuste também CORS_ORIGIN e FRONTEND_URL.

# 3. Subir todos os serviços
docker-compose up --build
```

| Serviço | URL |
|---------|-----|
| Backend (API) | http://localhost:3001 |
| Swagger | http://localhost:3001/api |

> As migrações do banco rodam automaticamente na inicialização do backend.

---

## Rodando localmente (sem Docker)

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.sample .env
# Edite o .env

# 3. Subir apenas o banco de dados
docker-compose up -d postgres

# 4. Iniciar em modo de desenvolvimento
pnpm run start:dev
```

A API estará disponível em `http://localhost:3001`.

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta em que a API escuta | `3001` |
| `DB_HOST` | Host do PostgreSQL | — |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_USERNAME` | Usuário do banco | — |
| `DB_PASSWORD` | Senha do banco | — |
| `DB_NAME` | Nome do banco | — |
| `RESEND_API_KEY` | Chave de API do Resend (**obrigatório**) | — |
| `CORS_ORIGIN` | Origem permitida pelo CORS | `http://localhost:3000` |
| `EMAIL_FROM` | Remetente dos e-mails (**obrigatório** para entregas a múltiplos destinatários) | `onboarding@resend.dev` |
| `FRONTEND_URL` | URL base do frontend (usado nos links dos e-mails) | `http://localhost:3000` |

> **Resend — plano gratuito:** o domínio `onboarding@resend.dev` só entrega para e-mails verificados no dashboard do Resend, impedindo o envio para destinatários arbitrários. Para que qualquer endereço possa receber os e-mails, **verifique um domínio próprio** no painel do Resend e defina `EMAIL_FROM` com um endereço desse domínio (ex: `no-reply@seudominio.com`).

---

## Testes

```bash
# Unitários
pnpm run test

# Com cobertura
pnpm run test:cov

# End-to-end (requer banco em execução)
pnpm run test:e2e
```

---

## Endpoints da API

### Cadastro (`/registrations`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/registrations` | Cria cadastro e retorna `{ id }` |
| `GET` | `/registrations/:id` | Busca cadastro por ID |
| `GET` | `/registrations/recover?email=` | Retoma cadastro em andamento pelo e-mail |
| `PATCH` | `/registrations/:id/steps/:step` | Avança ou edita um step |
| `POST` | `/registrations/:id/verify-mfa` | Verifica código MFA de 6 dígitos |
| `POST` | `/registrations/:id/resend-mfa` | Reenvia código MFA por e-mail |
| `POST` | `/registrations/:id/complete` | Conclui o cadastro |

### CEP

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/cep/:cep` | Consulta endereço pelo CEP via ViaCEP |

### Body por step (`PATCH /registrations/:id/steps/:step`)

| Step | Campos obrigatórios | Campos opcionais |
|------|---------------------|------------------|
| `IDENTIFICATION` | `name` (mín. 3 chars), `email` | — |
| `DOCUMENT` | `documentType` (`CPF` ou `CNPJ`), `document` (só dígitos) | — |
| `CONTACT` | `phone` (DDD + 9 dígitos, ex: `11912345678`) | — |
| `ADDRESS` | `cep` (8 dígitos), `street`, `number`, `neighborhood`, `city`, `state` (UF) | `complement` |
| `REVIEW` | — (sem body, apenas retorna o cadastro) | — |

> **Edição na revisão:** quando `currentStep` é `REVIEW`, é possível enviar `PATCH` para qualquer step anterior. O backend atualiza o campo e mantém `currentStep` em `REVIEW`, retornando o usuário direto à tela de revisão.

---

## Fluxo de cadastro

```
POST /registrations
       │
       ▼
  IDENTIFICATION  ──── envia MFA por e-mail
       │
       ▼
  POST /verify-mfa  (obrigatório antes de continuar)
       │
       ▼
    DOCUMENT  →  CONTACT  →  ADDRESS  →  REVIEW
                                               │
                                               ▼
                                       POST /complete
                                               │
                                               ▼
                                          COMPLETED
```

**Regras:**
- Não é permitido pular steps — o `step` enviado deve ser o `currentStep` atual, exceto durante revisão (ver acima)
- A partir de `DOCUMENT`, o MFA deve estar verificado (`mfaVerifiedAt != null`), senão `403`
- `REVIEW` não recebe dados nem avança step — só `POST /complete` avança para `COMPLETED`
- Ao concluir, `completedAt` é preenchido automaticamente

---

## Fluxo MFA

1. Ao concluir `IDENTIFICATION`, um código de **6 dígitos** é enviado ao e-mail informado
2. O código expira em **10 minutos**
3. Verificar: `POST /verify-mfa` com `{ "code": "123456" }`
4. Reenviar (se necessário): `POST /resend-mfa` — limite de 3 req/60s

---

## Arquitetura

```
src/
├── common/validators/       # CPF e CNPJ (algoritmo dos dígitos verificadores, sem lib)
├── migrations/              # Migration inicial do schema
├── providers/
│   ├── cep/                 # Interface CepProvider + ViaCepProvider
│   └── email/               # Interface EmailProvider + ResendEmailProvider
├── registration/
│   ├── dto/                 # DTOs de cada step com class-validator
│   ├── entities/            # Entidade Registration + enums
│   ├── mfa/                 # MfaService (geração, hash SHA-256, verificação)
│   ├── tasks/               # AbandonmentTask (cron a cada hora)
│   ├── registration.controller.ts
│   ├── registration.service.ts
│   └── registration.module.ts
├── app.module.ts
└── main.ts
```

### Por que Provider Pattern?

Toda integração externa (e-mail, CEP) usa interface + token de injeção NestJS. Para trocar de fornecedor, basta criar uma nova classe implementando a interface e alterar o `useClass` no módulo — nenhuma regra de negócio muda.

**Trocar ViaCEP por outro serviço de CEP:**

```ts
// src/providers/cep/cep.module.ts
{ provide: CEP_PROVIDER, useClass: MeuNovoProviderCep }
// A nova classe implementa: lookup(cep: string): Promise<CepResponse | null>
```

**Trocar Resend por SendGrid:**

```ts
// src/providers/email/email.module.ts
{ provide: EMAIL_PROVIDER, useClass: SendGridEmailProvider }
// A nova classe implementa: send(to, subject, html): Promise<void>
```

### Cron de abandono

`AbandonmentTask` executa a cada hora. Envia e-mail de retomada com link `?id=<id>` para cadastros que:
- Não foram concluídos
- Não tiveram atualização há mais de 1 hora
- Ainda não receberam o e-mail de abandono
- Possuem e-mail cadastrado

### Migrations

O projeto usa TypeORM migrations (não `synchronize`). As migrations rodam automaticamente na inicialização via `migrationsRun: true`.

Para gerar nova migration após alterar a entidade:

```bash
pnpm migration:generate src/migrations/NomeDaMigration
pnpm migration:run
```

---

## Rate Limiting

| Rota | Limite |
|------|--------|
| Global | 30 req / 60s |
| `POST /verify-mfa` | 5 req / 60s |
| `POST /resend-mfa` | 3 req / 60s |
