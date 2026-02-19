# Easy Health — Azure Deployment & Hardening Guide

> **Version:** 1.0 · **Date:** 2026-02-19 · **Classification:** Internal / Confidential  
> **Platform:** Easy Health Clinical Visit Platform  
> **Target Environment:** Microsoft Azure (HIPAA-eligible services)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Infrastructure Setup (Step-by-Step)](#3-infrastructure-setup)
4. [Security Hardening](#4-security-hardening)
5. [Compliance Controls](#5-compliance-controls)
6. [CI/CD Pipeline](#6-cicd-pipeline)
7. [Disaster Recovery & Business Continuity](#7-disaster-recovery--business-continuity)
8. [Cost Estimation](#8-cost-estimation)
9. [Deployment Verification Checklist](#9-deployment-verification-checklist)
10. [Migration Runbook](#10-migration-runbook)

---

## 1. Executive Summary

### 1.1 Why Azure for Easy Health

Easy Health is an in-home Nurse Practitioner (NP) visit platform that captures, processes, and stores Protected Health Information (PHI) for Medicare Advantage and ACA patients. The platform requires a cloud provider that meets strict healthcare compliance requirements:

- **HIPAA Business Associate Agreement (BAA):** Azure offers a comprehensive BAA covering 80+ services, including all services Easy Health requires.
- **Healthcare AI Ecosystem:** Azure Cognitive Services Speech SDK (already integrated) and Azure OpenAI Service (GPT-4o for clinical field extraction) are first-party services with HIPAA coverage.
- **FedRAMP / HITRUST Certification:** Azure maintains FedRAMP High authorization and HITRUST CSF certification, simplifying compliance audits for health plan partners.
- **Integrated Security Stack:** Microsoft Defender for Cloud, Azure Key Vault, Private Endpoints, and Azure Policy provide defense-in-depth without third-party tooling.

### 1.2 Current State → Target State

| Dimension | Current (Replit POC) | Target (Azure Production) |
|---|---|---|
| **Hosting** | Replit container (shared infrastructure) | Azure App Service P1v3 (isolated, VNet-integrated) |
| **Database** | Neon PostgreSQL (serverless) | Azure Database for PostgreSQL Flexible Server (private endpoint) |
| **Secrets** | Replit Secrets / env vars | Azure Key Vault (RBAC, audit logging, rotation) |
| **AI — Speech** | Azure Cognitive Services Speech SDK (public endpoint) | Azure Speech (private endpoint, same VNet) |
| **AI — LLM** | OpenAI API (public) or Azure OpenAI | Azure OpenAI Service (private endpoint, content filtering) |
| **Networking** | Public internet | Azure VNet, NSGs, Private Endpoints, no public IPs on backend |
| **WAF / CDN** | None | Azure Front Door with WAF (OWASP 3.2) |
| **Monitoring** | Console logs | Azure Monitor + Log Analytics + Application Insights |
| **Identity** | App-level auth (username/password + MFA) | App-level auth + Azure Entra ID (future SSO) |
| **iOS App** | Points to `eh-poc-application.healthtrixss.com` | Points to production Azure domain |
| **Compliance** | Self-attested | Azure BAA + SOC 2 Type II evidence + Azure Policy enforcement |

### 1.3 Azure Services Required

| Service | Purpose |
|---|---|
| Azure App Service (P1v3) | Node.js 20 application hosting |
| Azure Database for PostgreSQL Flexible Server | Managed PostgreSQL with HA |
| Azure Cognitive Services — Speech | Voice-to-text transcription (16kHz mono WAV) |
| Azure OpenAI Service | GPT-4o clinical field extraction, Whisper backup |
| Azure Key Vault | Secrets, keys, certificates |
| Azure Front Door (Standard) | WAF, CDN, TLS termination, global routing |
| Azure Virtual Network | Network isolation |
| Azure Blob Storage | Voice recordings, FHIR export bundles |
| Azure Monitor + Log Analytics | Observability, alerting |
| Application Insights | APM, distributed tracing |
| Microsoft Defender for Cloud | Threat detection, security posture |
| Azure Entra ID | Infrastructure RBAC, future app SSO |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                       │
│                                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────────────┐                      │
│   │ Web      │    │ iOS App  │    │ Health Plan       │                      │
│   │ Browser  │    │ Capacitor│    │ Partners (FHIR)   │                      │
│   └────┬─────┘    └────┬─────┘    └────────┬─────────┘                      │
│        │               │                   │                                │
└────────┼───────────────┼───────────────────┼────────────────────────────────┘
         │               │                   │
         ▼               ▼                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Azure Front Door (WAF + CDN)                        │
│    ┌──────────────────────────────────────────────────────────────┐    │
│    │  WAF Policy: OWASP 3.2 │ Rate Limiting │ Geo-filter (US)   │    │
│    │  TLS 1.2+ termination  │ Health probes │ Custom domain      │    │
│    └──────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬────────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Azure Virtual Network (10.0.0.0/16)                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  App Subnet (10.0.1.0/24)                                          │  │
│  │  ┌──────────────────────────────────────────┐                      │  │
│  │  │  Azure App Service (P1v3)                │                      │  │
│  │  │  ┌────────────────────────────────────┐  │                      │  │
│  │  │  │  Node.js 20 / Express              │  │                      │  │
│  │  │  │  React/Vite (static build)         │  │                      │  │
│  │  │  │  Azure Speech SDK                  │  │                      │  │
│  │  │  │  OpenAI SDK                        │  │                      │  │
│  │  │  │  Managed Identity (system)         │  │                      │  │
│  │  │  └────────────────────────────────────┘  │                      │  │
│  │  │  Deployment Slots: staging / production  │                      │  │
│  │  └──────────────────────────────────────────┘                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Database Subnet (10.0.2.0/24)                                     │  │
│  │  ┌──────────────────────────────────────────┐                      │  │
│  │  │  Azure PostgreSQL Flexible Server        │                      │  │
│  │  │  GP_Standard_D2s_v3 │ Zone-redundant HA  │                      │  │
│  │  │  Private Endpoint │ SSL enforced         │                      │  │
│  │  │  Geo-redundant backups (7-35 days)       │                      │  │
│  │  └──────────────────────────────────────────┘                      │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  AI Services Subnet (10.0.3.0/24)                                  │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                │  │
│  │  │  Azure Speech        │  │  Azure OpenAI        │                │  │
│  │  │  (Cognitive Svc)     │  │  GPT-4o deployment   │                │  │
│  │  │  Private Endpoint    │  │  Whisper deployment  │                │  │
│  │  │  en-US recognition   │  │  Private Endpoint    │                │  │
│  │  └──────────────────────┘  └──────────────────────┘                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Management Subnet (10.0.4.0/24)                                   │  │
│  │  ┌──────────────┐  ┌───────────────┐  ┌──────────────────────┐     │  │
│  │  │  Key Vault   │  │  Blob Storage │  │  Log Analytics       │     │  │
│  │  │  (RBAC mode) │  │  (recordings, │  │  + App Insights      │     │  │
│  │  │  Private EP  │  │   FHIR export)│  │  + Defender for Cloud │     │  │
│  │  └──────────────┘  │  Private EP   │  └──────────────────────┘     │  │
│  │                    └───────────────┘                                │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  NSGs on every subnet │ DDoS Protection Standard                         │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Infrastructure Setup

### Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and set subscription
az login
az account set --subscription "<SUBSCRIPTION_ID>"

# Register required providers
az provider register --namespace Microsoft.CognitiveServices
az provider register --namespace Microsoft.Sql
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.Cdn
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.OperationalInsights
az provider register --namespace Microsoft.Insights
```

### 3.1 Resource Group & Networking

#### Create Resource Group

```bash
RESOURCE_GROUP="rg-easyhealth-prod"
LOCATION="eastus"

az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags Environment=Production Application=EasyHealth HIPAA=true
```

#### Create Virtual Network with Subnets

```bash
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name vnet-easyhealth \
  --address-prefixes 10.0.0.0/16 \
  --location $LOCATION

# App Subnet (delegated to App Service)
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-app \
  --address-prefixes 10.0.1.0/24 \
  --delegations Microsoft.Web/serverFarms

# Database Subnet
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-database \
  --address-prefixes 10.0.2.0/24 \
  --delegations Microsoft.DBforPostgreSQL/flexibleServers

# AI Services Subnet (for private endpoints)
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-ai \
  --address-prefixes 10.0.3.0/24 \
  --disable-private-endpoint-network-policies true

# Management Subnet (Key Vault, Storage, Monitoring private endpoints)
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-management \
  --address-prefixes 10.0.4.0/24 \
  --disable-private-endpoint-network-policies true
```

#### Network Security Groups

```bash
# App subnet NSG
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name nsg-app

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-app \
  --name AllowFrontDoorInbound \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes AzureFrontDoor.Backend \
  --destination-port-ranges 443 80

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-app \
  --name DenyAllInbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --destination-port-ranges '*'

az network vnet subnet update \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-app \
  --network-security-group nsg-app

# Database subnet NSG
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name nsg-database

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-database \
  --name AllowAppSubnet \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 10.0.1.0/24 \
  --destination-port-ranges 5432

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-database \
  --name DenyAllInbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --destination-port-ranges '*'

az network vnet subnet update \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-database \
  --network-security-group nsg-database

# AI Services subnet NSG
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name nsg-ai

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-ai \
  --name AllowAppSubnet \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 10.0.1.0/24 \
  --destination-port-ranges 443

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-ai \
  --name DenyAllInbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --destination-port-ranges '*'

az network vnet subnet update \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-ai \
  --network-security-group nsg-ai

# Management subnet NSG
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name nsg-management

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-management \
  --name AllowAppSubnet \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 10.0.1.0/24 \
  --destination-port-ranges 443

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name nsg-management \
  --name DenyAllInbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --destination-port-ranges '*'

az network vnet subnet update \
  --resource-group $RESOURCE_GROUP \
  --vnet-name vnet-easyhealth \
  --name snet-management \
  --network-security-group nsg-management
```

#### Private DNS Zones

```bash
# Create private DNS zones for each PaaS service
for ZONE in \
  "privatelink.postgres.database.azure.com" \
  "privatelink.vaultcore.azure.net" \
  "privatelink.blob.core.windows.net" \
  "privatelink.cognitiveservices.azure.com" \
  "privatelink.openai.azure.com"; do

  az network private-dns zone create \
    --resource-group $RESOURCE_GROUP \
    --name $ZONE

  az network private-dns link vnet create \
    --resource-group $RESOURCE_GROUP \
    --zone-name $ZONE \
    --name "link-easyhealth" \
    --virtual-network vnet-easyhealth \
    --registration-enabled false
done
```

---

### 3.2 Azure Database for PostgreSQL Flexible Server

#### Deployment

```bash
DB_SERVER_NAME="psql-easyhealth-prod"
DB_ADMIN_USER="ehadmin"
DB_ADMIN_PASSWORD="$(openssl rand -base64 32)"  # Store this in Key Vault immediately

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --location $LOCATION \
  --admin-user $DB_ADMIN_USER \
  --admin-password "$DB_ADMIN_PASSWORD" \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 16 \
  --vnet vnet-easyhealth \
  --subnet snet-database \
  --private-dns-zone privatelink.postgres.database.azure.com \
  --public-access Disabled \
  --high-availability ZoneRedundant \
  --backup-retention 35 \
  --geo-redundant-backup Enabled \
  --tags Environment=Production Application=EasyHealth HIPAA=true
```

**SKU Selection Rationale (HIPAA workloads):**
- `Standard_D2s_v3` (2 vCores, 8 GB RAM): Suitable for initial production load (< 100 concurrent NPs)
- Zone-redundant HA: Required for healthcare uptime SLAs
- Geo-redundant backup: Required for HIPAA disaster recovery
- Scale up to `Standard_D4s_v3` or `Standard_D8s_v3` as visit volume increases

#### SSL Enforcement

```bash
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name require_secure_transport \
  --value on

az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name ssl_min_protocol_version \
  --value TLSv1.2
```

#### Create Application Database

```bash
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --database-name easyhealth

# Connection string format (store in Key Vault):
# postgresql://ehadmin:<password>@psql-easyhealth-prod.postgres.database.azure.com:5432/easyhealth?sslmode=require
```

#### Performance Tuning

```bash
# Optimize for OLTP healthcare workload
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name max_connections \
  --value 200

az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name log_checkpoints \
  --value on

az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name log_connections \
  --value on

az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name log_disconnections \
  --value on

az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER_NAME \
  --name log_min_duration_statement \
  --value 1000
```

#### Database Migration from Neon

```bash
# 1. Export from Neon (run from a machine with access to both databases)
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  "$NEON_DATABASE_URL" \
  > easyhealth_backup.dump

# 2. Restore to Azure PostgreSQL
pg_restore \
  --host=psql-easyhealth-prod.postgres.database.azure.com \
  --port=5432 \
  --username=ehadmin \
  --dbname=easyhealth \
  --no-owner \
  --no-privileges \
  --verbose \
  easyhealth_backup.dump

# 3. Verify row counts for critical tables
psql "$AZURE_DATABASE_URL" -c "
  SELECT 'users' AS tbl, COUNT(*) FROM users
  UNION ALL SELECT 'members', COUNT(*) FROM members
  UNION ALL SELECT 'visits', COUNT(*) FROM visits
  UNION ALL SELECT 'audit_events', COUNT(*) FROM audit_events
  UNION ALL SELECT 'recordings', COUNT(*) FROM recordings
  UNION ALL SELECT 'transcripts', COUNT(*) FROM transcripts;
"
```

#### Monitoring & Alerting

```bash
# Enable diagnostic settings
az monitor diagnostic-settings create \
  --resource "/subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.DBforPostgreSQL/flexibleServers/$DB_SERVER_NAME" \
  --name "psql-diagnostics" \
  --workspace "<LOG_ANALYTICS_WORKSPACE_ID>" \
  --logs '[{"category":"PostgreSQLLogs","enabled":true},{"category":"PostgreSQLFlexSessions","enabled":true},{"category":"PostgreSQLFlexQueryStoreRuntime","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

---

### 3.3 Azure App Service

#### App Service Plan

```bash
APP_SERVICE_PLAN="asp-easyhealth-prod"
APP_NAME="app-easyhealth-prod"

az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_PLAN \
  --location $LOCATION \
  --sku P1V3 \
  --is-linux \
  --tags Environment=Production Application=EasyHealth HIPAA=true
```

**SKU Selection:** P1v3 is the minimum recommended tier for HIPAA workloads because:
- Runs in an isolated networking environment
- Supports VNet integration
- Deployment slots for zero-downtime deployments
- SLA: 99.95%

#### Create Web App

```bash
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $APP_NAME \
  --runtime "NODE:20-lts" \
  --assign-identity '[system]' \
  --tags Environment=Production Application=EasyHealth HIPAA=true

# Enable system-assigned managed identity (if not done above)
az webapp identity assign \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME
```

#### VNet Integration

```bash
az webapp vnet-integration add \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --vnet vnet-easyhealth \
  --subnet snet-app

# Route all outbound traffic through VNet
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings WEBSITE_VNET_ROUTE_ALL=1
```

#### Application Configuration

```bash
# Startup command (matches package.json "start" script)
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --startup-file "node dist/index.cjs" \
  --always-on true \
  --min-tls-version 1.2 \
  --ftps-state Disabled \
  --http20-enabled true

# Application settings (non-secrets — secrets come from Key Vault references)
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    NODE_ENV=production \
    WEBSITE_NODE_DEFAULT_VERSION=~20 \
    WEBSITES_PORT=5000
```

#### Health Check Endpoint

```bash
az webapp config set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --generic-configurations '{"healthCheckPath":"/api/health"}'
```

> **Note:** Easy Health should expose a `/api/health` endpoint that returns HTTP 200 and checks database connectivity. Add this route to `server/routes.ts`:
> ```typescript
> app.get("/api/health", async (_req, res) => {
>   try {
>     await db.execute(sql`SELECT 1`);
>     res.json({ status: "healthy", timestamp: new Date().toISOString() });
>   } catch {
>     res.status(503).json({ status: "unhealthy" });
>   }
> });
> ```

#### Auto-Scaling Rules

```bash
az monitor autoscale create \
  --resource-group $RESOURCE_GROUP \
  --resource $APP_SERVICE_PLAN \
  --resource-type Microsoft.Web/serverfarms \
  --name autoscale-easyhealth \
  --min-count 2 \
  --max-count 6 \
  --count 2

az monitor autoscale rule create \
  --resource-group $RESOURCE_GROUP \
  --autoscale-name autoscale-easyhealth \
  --condition "CpuPercentage > 70 avg 5m" \
  --scale out 1

az monitor autoscale rule create \
  --resource-group $RESOURCE_GROUP \
  --autoscale-name autoscale-easyhealth \
  --condition "CpuPercentage < 30 avg 10m" \
  --scale in 1
```

#### Deployment Slots

```bash
# Create staging slot
az webapp deployment slot create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --slot staging

# Staging slot gets same VNet integration
az webapp vnet-integration add \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --slot staging \
  --vnet vnet-easyhealth \
  --subnet snet-app

# After deploying to staging and verifying:
az webapp deployment slot swap \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --slot staging \
  --target-slot production
```

#### Custom Domain + Managed TLS Certificate

```bash
CUSTOM_DOMAIN="app.easyhealth.com"

# Add custom domain
az webapp config hostname add \
  --resource-group $RESOURCE_GROUP \
  --webapp-name $APP_NAME \
  --hostname $CUSTOM_DOMAIN

# Create managed certificate
az webapp config ssl create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --hostname $CUSTOM_DOMAIN

# Bind certificate
az webapp config ssl bind \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --certificate-thumbprint "<CERT_THUMBPRINT>" \
  --ssl-type SNI

# Enforce HTTPS
az webapp update \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --https-only true
```

#### Key Vault References in Application Settings

```bash
# Syntax for Key Vault references in App Service settings:
# @Microsoft.KeyVault(SecretUri=https://<vault-name>.vault.azure.net/secrets/<secret-name>/)

KV_NAME="kv-easyhealth-prod"

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://$KV_NAME.vault.azure.net/secrets/DATABASE-URL/)" \
    SESSION_SECRET="@Microsoft.KeyVault(SecretUri=https://$KV_NAME.vault.azure.net/secrets/SESSION-SECRET/)" \
    AZURE_SPEECH_KEY="@Microsoft.KeyVault(SecretUri=https://$KV_NAME.vault.azure.net/secrets/AZURE-SPEECH-KEY/)" \
    AZURE_OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://$KV_NAME.vault.azure.net/secrets/AZURE-OPENAI-API-KEY/)" \
    OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://$KV_NAME.vault.azure.net/secrets/OPENAI-API-KEY/)"
```

---

### 3.4 Azure AI Services

#### 3.4.1 Azure Cognitive Services Speech

Easy Health uses the `microsoft-cognitiveservices-speech-sdk` npm package for continuous speech recognition. The current implementation (in `server/routes.ts`) converts uploaded audio to 16kHz mono WAV via ffmpeg, then streams it through the Azure Speech SDK's `SpeechRecognizer` with `startContinuousRecognitionAsync`.

```bash
SPEECH_NAME="speech-easyhealth-prod"

# Create Speech resource
az cognitiveservices account create \
  --resource-group $RESOURCE_GROUP \
  --name $SPEECH_NAME \
  --kind SpeechServices \
  --sku S0 \
  --location $LOCATION \
  --custom-domain $SPEECH_NAME \
  --tags Environment=Production Application=EasyHealth HIPAA=true

# Disable public network access
az cognitiveservices account update \
  --resource-group $RESOURCE_GROUP \
  --name $SPEECH_NAME \
  --public-network-access Disabled

# Create private endpoint
az network private-endpoint create \
  --resource-group $RESOURCE_GROUP \
  --name pe-speech \
  --vnet-name vnet-easyhealth \
  --subnet snet-ai \
  --private-connection-resource-id $(az cognitiveservices account show -g $RESOURCE_GROUP -n $SPEECH_NAME --query id -o tsv) \
  --group-id account \
  --connection-name conn-speech

# Register in private DNS
az network private-endpoint dns-zone-group create \
  --resource-group $RESOURCE_GROUP \
  --endpoint-name pe-speech \
  --name dns-speech \
  --private-dns-zone privatelink.cognitiveservices.azure.com \
  --zone-name cognitiveservices

# Get API key (store in Key Vault)
SPEECH_KEY=$(az cognitiveservices account keys list \
  --resource-group $RESOURCE_GROUP \
  --name $SPEECH_NAME \
  --query key1 -o tsv)
```

**Easy Health Admin Panel Configuration:**

When configuring the AI provider in Easy Health's Admin Console, set:
- **Provider Type:** `azure_speech`
- **Speech Region:** `eastus` (or your deployment region)
- **Speech Endpoint:** `https://speech-easyhealth-prod.cognitiveservices.azure.com/`
- **API Key Secret Name:** `AZURE_SPEECH_KEY`

**Audio Format Requirements:**

The Easy Health transcription pipeline (lines 4909-4979 of `server/routes.ts`) performs:
1. Receives base64-encoded audio from the iOS/web client
2. Writes to temp file with detected extension (.mp4, .ogg, .webm)
3. Converts via ffmpeg: `ffmpeg -y -i input -ar 16000 -ac 1 -f wav output.wav`
4. Streams WAV through `AudioInputStream.createPushStream` with `getWaveFormatPCM(16000, 16, 1)`

Ensure ffmpeg is installed on the App Service (use a custom startup script or Docker image).

**Rate Limiting & Quotas:**
- S0 tier: 100 concurrent requests, 20 requests/second
- For higher volumes, request quota increase via Azure Support
- Monitor via Azure Monitor metrics: `SuccessfulCalls`, `TotalErrors`, `Latency`

**Failover to OpenAI Whisper:**

Easy Health already supports OpenAI Whisper as a fallback provider (lines 4980-4996). Configure a secondary AI provider in the admin panel:
- **Provider Type:** `openai`
- **Model:** `whisper-1`
- **API Key Secret Name:** `OPENAI_API_KEY`

#### 3.4.2 Azure OpenAI Service

Easy Health uses Azure OpenAI for GPT-4o-based clinical field extraction from visit transcripts (lines 5183-5330 of `server/routes.ts`). The extraction prompt asks the model to identify vitals, assessments, medications, conditions, and screening data from free-text clinical transcripts.

```bash
AOAI_NAME="aoai-easyhealth-prod"

# Create Azure OpenAI resource
az cognitiveservices account create \
  --resource-group $RESOURCE_GROUP \
  --name $AOAI_NAME \
  --kind OpenAI \
  --sku S0 \
  --location $LOCATION \
  --custom-domain $AOAI_NAME \
  --tags Environment=Production Application=EasyHealth HIPAA=true

# Deploy GPT-4o model
az cognitiveservices account deployment create \
  --resource-group $RESOURCE_GROUP \
  --name $AOAI_NAME \
  --deployment-name gpt-4o \
  --model-name gpt-4o \
  --model-version "2024-11-20" \
  --model-format OpenAI \
  --sku-capacity 80 \
  --sku-name Standard

# Deploy Whisper model (backup transcription)
az cognitiveservices account deployment create \
  --resource-group $RESOURCE_GROUP \
  --name $AOAI_NAME \
  --deployment-name whisper \
  --model-name whisper \
  --model-version "001" \
  --model-format OpenAI \
  --sku-capacity 1 \
  --sku-name Standard

# Disable public network access
az cognitiveservices account update \
  --resource-group $RESOURCE_GROUP \
  --name $AOAI_NAME \
  --public-network-access Disabled

# Create private endpoint
az network private-endpoint create \
  --resource-group $RESOURCE_GROUP \
  --name pe-openai \
  --vnet-name vnet-easyhealth \
  --subnet snet-ai \
  --private-connection-resource-id $(az cognitiveservices account show -g $RESOURCE_GROUP -n $AOAI_NAME --query id -o tsv) \
  --group-id account \
  --connection-name conn-openai

az network private-endpoint dns-zone-group create \
  --resource-group $RESOURCE_GROUP \
  --endpoint-name pe-openai \
  --name dns-openai \
  --private-dns-zone privatelink.openai.azure.com \
  --zone-name openai

# Get API key (store in Key Vault)
AOAI_KEY=$(az cognitiveservices account keys list \
  --resource-group $RESOURCE_GROUP \
  --name $AOAI_NAME \
  --query key1 -o tsv)
```

**Content Filtering:**

Azure OpenAI includes built-in content filtering. For clinical use:
- Default filters are appropriate (blocks hate, violence, self-harm, sexual content)
- Clinical text may occasionally trigger false positives — monitor `ContentFilterResults` in API responses
- Request a custom content filtering policy via Azure Support if clinical terminology triggers blocks

**Rate Limiting (TPM/RPM):**
- GPT-4o Standard: 80K TPM (tokens per minute) with the above `--sku-capacity 80`
- Monitor usage via `TokenTransaction` metric
- Scale `sku-capacity` as visit volume increases (each extraction uses ~2,000-4,000 tokens)

**Easy Health Admin Panel Configuration:**
- **Provider Type:** `azure_openai`
- **Azure OpenAI Endpoint:** `https://aoai-easyhealth-prod.openai.azure.com/`
- **Extraction Model:** `gpt-4o`
- **API Key Secret Name:** `AZURE_OPENAI_API_KEY`

---

### 3.5 Azure Key Vault

```bash
KV_NAME="kv-easyhealth-prod"

# Create Key Vault with RBAC authorization (no access policies)
az keyvault create \
  --resource-group $RESOURCE_GROUP \
  --name $KV_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true \
  --enable-soft-delete true \
  --soft-delete-retention-days 90 \
  --enable-purge-protection true \
  --public-network-access Disabled \
  --tags Environment=Production Application=EasyHealth HIPAA=true

# Create private endpoint
az network private-endpoint create \
  --resource-group $RESOURCE_GROUP \
  --name pe-keyvault \
  --vnet-name vnet-easyhealth \
  --subnet snet-management \
  --private-connection-resource-id $(az keyvault show -g $RESOURCE_GROUP -n $KV_NAME --query id -o tsv) \
  --group-id vault \
  --connection-name conn-keyvault

az network private-endpoint dns-zone-group create \
  --resource-group $RESOURCE_GROUP \
  --endpoint-name pe-keyvault \
  --name dns-keyvault \
  --private-dns-zone privatelink.vaultcore.azure.net \
  --zone-name vaultcore
```

#### Grant App Service Managed Identity Access

```bash
APP_IDENTITY=$(az webapp identity show \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --query principalId -o tsv)

# Assign "Key Vault Secrets User" role to the App Service identity
az role assignment create \
  --assignee $APP_IDENTITY \
  --role "Key Vault Secrets User" \
  --scope $(az keyvault show -g $RESOURCE_GROUP -n $KV_NAME --query id -o tsv)
```

#### Store Secrets

```bash
# Database connection string
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "DATABASE-URL" \
  --value "postgresql://ehadmin:${DB_ADMIN_PASSWORD}@psql-easyhealth-prod.postgres.database.azure.com:5432/easyhealth?sslmode=require"

# Session secret
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "SESSION-SECRET" \
  --value "$(openssl rand -base64 64)"

# Azure Speech key
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "AZURE-SPEECH-KEY" \
  --value "$SPEECH_KEY"

# Azure OpenAI key
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "AZURE-OPENAI-API-KEY" \
  --value "$AOAI_KEY"

# OpenAI API key (backup/fallback)
az keyvault secret set \
  --vault-name $KV_NAME \
  --name "OPENAI-API-KEY" \
  --value "<YOUR_OPENAI_API_KEY>"
```

#### Key Rotation Policies

```bash
# Set rotation policy for Speech key (rotate every 90 days)
az keyvault secret rotation-policy update \
  --vault-name $KV_NAME \
  --name "AZURE-SPEECH-KEY" \
  --value '{"lifetimeActions":[{"trigger":{"timeBeforeExpiry":"P30D"},"action":{"type":"Notify"}}],"attributes":{"expiryTime":"P90D"}}'
```

#### Enable Audit Logging

```bash
az monitor diagnostic-settings create \
  --resource $(az keyvault show -g $RESOURCE_GROUP -n $KV_NAME --query id -o tsv) \
  --name "kv-diagnostics" \
  --workspace "<LOG_ANALYTICS_WORKSPACE_ID>" \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

---

### 3.6 Azure Front Door / Application Gateway

```bash
AFD_NAME="afd-easyhealth"
AFD_PROFILE="afd-profile-easyhealth"

# Create Front Door profile (Standard tier with WAF)
az afd profile create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $AFD_PROFILE \
  --sku Standard_AzureFrontDoor \
  --tags Environment=Production Application=EasyHealth

# Create endpoint
az afd endpoint create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $AFD_PROFILE \
  --endpoint-name $AFD_NAME \
  --enabled-state Enabled

# Create origin group
az afd origin-group create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $AFD_PROFILE \
  --origin-group-name og-easyhealth \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-path "/api/health" \
  --probe-interval-in-seconds 30 \
  --sample-size 4 \
  --successful-samples-required 3

# Create origin (App Service backend)
az afd origin create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $AFD_PROFILE \
  --origin-group-name og-easyhealth \
  --origin-name origin-appservice \
  --host-name "$APP_NAME.azurewebsites.net" \
  --origin-host-header "$APP_NAME.azurewebsites.net" \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled

# Create route
az afd route create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $AFD_PROFILE \
  --endpoint-name $AFD_NAME \
  --route-name route-default \
  --origin-group og-easyhealth \
  --supported-protocols Https \
  --https-redirect Enabled \
  --forwarding-protocol HttpsOnly \
  --patterns-to-match "/*"
```

#### WAF Policy

```bash
WAF_POLICY="waf-easyhealth"

# Create WAF policy
az network front-door waf-policy create \
  --resource-group $RESOURCE_GROUP \
  --name $WAF_POLICY \
  --sku Standard_AzureFrontDoor \
  --mode Prevention

# Add OWASP 3.2 managed rule set
az network front-door waf-policy managed-rules add \
  --resource-group $RESOURCE_GROUP \
  --policy-name $WAF_POLICY \
  --type Microsoft_DefaultRuleSet \
  --version 2.1 \
  --action Block

# Add bot protection rule set
az network front-door waf-policy managed-rules add \
  --resource-group $RESOURCE_GROUP \
  --policy-name $WAF_POLICY \
  --type Microsoft_BotManagerRuleSet \
  --version 1.0 \
  --action Block
```

#### Custom WAF Rules

```bash
# Rate limiting: max 100 requests per minute per IP
az network front-door waf-policy rule create \
  --resource-group $RESOURCE_GROUP \
  --policy-name $WAF_POLICY \
  --name RateLimitPerIP \
  --priority 100 \
  --rule-type RateLimitRule \
  --rate-limit-threshold 100 \
  --rate-limit-duration-in-minutes 1 \
  --action Block \
  --match-condition \
    match-variable=RemoteAddr \
    operator=IPMatch \
    negate=false \
    match-value=0.0.0.0/0

# Block non-US traffic (if required by compliance)
az network front-door waf-policy rule create \
  --resource-group $RESOURCE_GROUP \
  --policy-name $WAF_POLICY \
  --name GeoBlockNonUS \
  --priority 200 \
  --rule-type MatchRule \
  --action Block \
  --match-condition \
    match-variable=RemoteAddr \
    operator=GeoMatch \
    negate=true \
    match-value=US

# Associate WAF policy with Front Door
az afd security-policy create \
  --resource-group $RESOURCE_GROUP \
  --profile-name $AFD_PROFILE \
  --security-policy-name sp-waf \
  --waf-policy $(az network front-door waf-policy show -g $RESOURCE_GROUP -n $WAF_POLICY --query id -o tsv) \
  --domains $(az afd endpoint show -g $RESOURCE_GROUP --profile-name $AFD_PROFILE --endpoint-name $AFD_NAME --query id -o tsv)
```

---

### 3.7 Azure Blob Storage

```bash
STORAGE_ACCOUNT="steasyhealth"

az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --sku Standard_GRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --default-action Deny \
  --tags Environment=Production Application=EasyHealth HIPAA=true

# Create containers
az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --name voice-recordings \
  --auth-mode login

az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --name fhir-exports \
  --auth-mode login

# Create private endpoint
az network private-endpoint create \
  --resource-group $RESOURCE_GROUP \
  --name pe-storage \
  --vnet-name vnet-easyhealth \
  --subnet snet-management \
  --private-connection-resource-id $(az storage account show -g $RESOURCE_GROUP -n $STORAGE_ACCOUNT --query id -o tsv) \
  --group-id blob \
  --connection-name conn-storage

az network private-endpoint dns-zone-group create \
  --resource-group $RESOURCE_GROUP \
  --endpoint-name pe-storage \
  --name dns-storage \
  --private-dns-zone privatelink.blob.core.windows.net \
  --zone-name blob

# Grant App Service managed identity access
az role assignment create \
  --assignee $APP_IDENTITY \
  --role "Storage Blob Data Contributor" \
  --scope $(az storage account show -g $RESOURCE_GROUP -n $STORAGE_ACCOUNT --query id -o tsv)
```

---

## 4. Security Hardening

### 4.1 Network Security

#### VNet Isolation Summary

| Resource | Subnet | Access Method | Public Access |
|---|---|---|---|
| App Service | snet-app (10.0.1.0/24) | VNet integration + Front Door | Via Front Door only |
| PostgreSQL | snet-database (10.0.2.0/24) | Private endpoint | **Disabled** |
| Azure Speech | snet-ai (10.0.3.0/24) | Private endpoint | **Disabled** |
| Azure OpenAI | snet-ai (10.0.3.0/24) | Private endpoint | **Disabled** |
| Key Vault | snet-management (10.0.4.0/24) | Private endpoint | **Disabled** |
| Blob Storage | snet-management (10.0.4.0/24) | Private endpoint | **Disabled** |

#### NSG Rules Summary

**snet-app (App Service):**
| Priority | Direction | Action | Source | Destination | Port | Purpose |
|---|---|---|---|---|---|---|
| 100 | Inbound | Allow | AzureFrontDoor.Backend | Any | 443, 80 | Front Door traffic |
| 4096 | Inbound | Deny | * | * | * | Block all other inbound |
| 100 | Outbound | Allow | Any | VirtualNetwork | 5432 | Database access |
| 110 | Outbound | Allow | Any | VirtualNetwork | 443 | AI services, Key Vault, Storage |
| 120 | Outbound | Allow | Any | Internet | 443 | Fallback OpenAI API |

**snet-database:**
| Priority | Direction | Action | Source | Destination | Port | Purpose |
|---|---|---|---|---|---|---|
| 100 | Inbound | Allow | 10.0.1.0/24 | Any | 5432 | App Service connections |
| 4096 | Inbound | Deny | * | * | * | Block all other |

#### DDoS Protection

```bash
# Enable DDoS Protection Standard on the VNet
az network ddos-protection create \
  --resource-group $RESOURCE_GROUP \
  --name ddos-easyhealth \
  --location $LOCATION

az network vnet update \
  --resource-group $RESOURCE_GROUP \
  --name vnet-easyhealth \
  --ddos-protection-plan ddos-easyhealth
```

### 4.2 Identity & Access Management

#### Managed Identity (App Service → Azure Resources)

The system-assigned managed identity was created during App Service deployment. It provides passwordless access to:

| Resource | Role Assignment | Purpose |
|---|---|---|
| Key Vault | Key Vault Secrets User | Read secrets (DATABASE_URL, API keys) |
| Blob Storage | Storage Blob Data Contributor | Upload recordings, FHIR exports |
| Application Insights | Monitoring Metrics Publisher | Emit custom metrics |

#### Azure RBAC for Infrastructure Management

```bash
# Create AAD groups
az ad group create --display-name "EasyHealth-Developers" --mail-nickname "eh-dev"
az ad group create --display-name "EasyHealth-DevOps" --mail-nickname "eh-devops"
az ad group create --display-name "EasyHealth-Security" --mail-nickname "eh-security"
az ad group create --display-name "EasyHealth-Compliance" --mail-nickname "eh-compliance"

# Assign roles
# Developers: Read access to production, Contributor to dev/staging
az role assignment create \
  --assignee-object-id $(az ad group show -g "EasyHealth-Developers" --query id -o tsv) \
  --role "Reader" \
  --scope "/subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP"

# DevOps: Contributor (deploy, configure, not delete)
az role assignment create \
  --assignee-object-id $(az ad group show -g "EasyHealth-DevOps" --query id -o tsv) \
  --role "Contributor" \
  --scope "/subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP"

# Security: Security Reader + Key Vault Administrator
az role assignment create \
  --assignee-object-id $(az ad group show -g "EasyHealth-Security" --query id -o tsv) \
  --role "Security Reader" \
  --scope "/subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP"

# Compliance: Reader + Log Analytics Reader
az role assignment create \
  --assignee-object-id $(az ad group show -g "EasyHealth-Compliance" --query id -o tsv) \
  --role "Log Analytics Reader" \
  --scope "/subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP"
```

#### JIT Access for Production Debugging

```bash
# Enable JIT VM Access via Defender for Cloud (if any VM-based resources exist)
# For App Service, use Kudu SCM with AAD authentication:
az webapp auth update \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --enabled true \
  --action LoginWithAzureActiveDirectory \
  --aad-token-issuer-url "https://sts.windows.net/<TENANT_ID>/"
```

#### Conditional Access Policies (Future)

When Easy Health integrates Azure Entra ID for end-user authentication:
- Require MFA for all administrative access
- Block sign-ins from non-compliant devices
- Require compliant iOS device for mobile app access
- Risk-based conditional access for anomalous sign-in patterns

### 4.3 Data Protection

#### Encryption at Rest

| Resource | Encryption Method | Key Management |
|---|---|---|
| PostgreSQL | Azure SSE (AES-256) | Customer-managed key (CMK) in Key Vault |
| Blob Storage | Azure SSE (AES-256) | Customer-managed key (CMK) in Key Vault |
| Key Vault | HSM-backed (FIPS 140-2 Level 2) | Azure-managed |
| App Service temp storage | Azure SSE | Platform-managed |

```bash
# Enable CMK for PostgreSQL
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER_NAME \
  --key $(az keyvault key show --vault-name $KV_NAME --name psql-cmk --query kid -o tsv) \
  --identity $(az identity show -g $RESOURCE_GROUP -n mi-easyhealth-encryption --query id -o tsv)

# Enable CMK for Blob Storage
az storage account update \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --encryption-key-source Microsoft.Keyvault \
  --encryption-key-vault $(az keyvault show -g $RESOURCE_GROUP -n $KV_NAME --query properties.vaultUri -o tsv) \
  --encryption-key-name storage-cmk
```

#### Encryption in Transit

- **TLS 1.2+ enforced** on all services (App Service, PostgreSQL, Key Vault, Storage, AI Services)
- **PostgreSQL:** `sslmode=require` in connection string
- **App Service:** `--min-tls-version 1.2`, `--https-only true`
- **Front Door:** TLS 1.2+ termination, HTTPS redirect
- **All private endpoints:** Traffic encrypted within Azure backbone

#### Database Encryption

PostgreSQL Flexible Server uses Transparent Data Encryption (TDE) by default:
- Data files encrypted at rest with AES-256
- WAL (Write-Ahead Log) encrypted
- Backups encrypted with same key
- No application changes required

### 4.4 Monitoring & Threat Detection

#### Log Analytics Workspace

```bash
LA_WORKSPACE="law-easyhealth"

az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name $LA_WORKSPACE \
  --location $LOCATION \
  --retention-time 365 \
  --tags Environment=Production Application=EasyHealth
```

#### Application Insights

```bash
az monitor app-insights component create \
  --resource-group $RESOURCE_GROUP \
  --app "ai-easyhealth" \
  --location $LOCATION \
  --kind web \
  --workspace $(az monitor log-analytics workspace show -g $RESOURCE_GROUP -n $LA_WORKSPACE --query id -o tsv) \
  --tags Environment=Production Application=EasyHealth

# Add instrumentation key to App Service
APPINSIGHTS_KEY=$(az monitor app-insights component show \
  -g $RESOURCE_GROUP --app "ai-easyhealth" --query connectionString -o tsv)

az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="$APPINSIGHTS_KEY"
```

#### Microsoft Defender for Cloud

```bash
# Enable Defender for Cloud (Standard tier) for all resource types
az security pricing create --name VirtualMachines --tier Standard
az security pricing create --name SqlServers --tier Standard
az security pricing create --name AppServices --tier Standard
az security pricing create --name StorageAccounts --tier Standard
az security pricing create --name KeyVaults --tier Standard
az security pricing create --name OpenSourceRelationalDatabases --tier Standard
```

#### Alert Rules

```bash
ACTION_GROUP="ag-easyhealth-ops"

# Create action group (email + SMS)
az monitor action-group create \
  --resource-group $RESOURCE_GROUP \
  --name $ACTION_GROUP \
  --short-name "EH-Ops" \
  --action email ops-email ops@easyhealth.com \
  --action sms ops-sms 1 5551234567

# Alert: Failed authentications > 10/min
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-failed-auth" \
  --scopes $(az webapp show -g $RESOURCE_GROUP -n $APP_NAME --query id -o tsv) \
  --condition "total Http401 > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $ACTION_GROUP \
  --severity 2

# Alert: Database connection failures
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-db-connection" \
  --scopes $(az postgres flexible-server show -g $RESOURCE_GROUP -n $DB_SERVER_NAME --query id -o tsv) \
  --condition "total active_connections < 1" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $ACTION_GROUP \
  --severity 1

# Alert: AI service errors
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-speech-errors" \
  --scopes $(az cognitiveservices account show -g $RESOURCE_GROUP -n $SPEECH_NAME --query id -o tsv) \
  --condition "total ClientErrors > 5" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $ACTION_GROUP \
  --severity 2

# Alert: WAF rule triggers
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-waf-triggers" \
  --scopes $(az afd profile show -g $RESOURCE_GROUP --profile-name $AFD_PROFILE --query id -o tsv) \
  --condition "total WebApplicationFirewallRequestCount > 50" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $ACTION_GROUP \
  --severity 3

# Alert: Certificate expiration (30 days before)
# Configured via Key Vault certificate policy notifications

# Alert: App Service health check failures
az monitor metrics alert create \
  --resource-group $RESOURCE_GROUP \
  --name "alert-health-check" \
  --scopes $(az webapp show -g $RESOURCE_GROUP -n $APP_NAME --query id -o tsv) \
  --condition "avg HealthCheckStatus < 100" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $ACTION_GROUP \
  --severity 1
```

#### Diagnostic Settings for All Resources

```bash
# Enable diagnostics for each resource (example for App Service)
az monitor diagnostic-settings create \
  --resource $(az webapp show -g $RESOURCE_GROUP -n $APP_NAME --query id -o tsv) \
  --name "app-diagnostics" \
  --workspace $(az monitor log-analytics workspace show -g $RESOURCE_GROUP -n $LA_WORKSPACE --query id -o tsv) \
  --logs '[{"category":"AppServiceHTTPLogs","enabled":true},{"category":"AppServiceConsoleLogs","enabled":true},{"category":"AppServiceAppLogs","enabled":true},{"category":"AppServiceAuditLogs","enabled":true},{"category":"AppServicePlatformLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

---

## 5. Compliance Controls

### 5.1 HIPAA Compliance Mapping

Azure's HIPAA BAA covers all services used by Easy Health. The following table maps HIPAA Security Rule requirements to Azure controls:

| HIPAA Requirement | 45 CFR Reference | Azure Control | Easy Health Implementation |
|---|---|---|---|
| **Access Control** | 164.312(a)(1) | Azure Entra ID + RBAC + Key Vault | Role-based app auth (NP, Supervisor, Admin, Coordinator) + Azure RBAC for infrastructure |
| **Audit Controls** | 164.312(b) | Azure Monitor + Log Analytics | All PHI access logged via audit_events table + Azure Activity Log + Key Vault audit |
| **Integrity Controls** | 164.312(c)(1) | Azure SSE + TDE + CMK | Database TDE + Blob Storage encryption + visit lock mechanism |
| **Person/Entity Authentication** | 164.312(d) | Azure Entra ID + MFA | App-level MFA (SMS codes) + biometric gate + identity verification workflow |
| **Transmission Security** | 164.312(e)(1) | TLS 1.2+ + Private Endpoints | All traffic encrypted; no public endpoints on backend services |
| **Unique User Identification** | 164.312(a)(2)(i) | Azure Entra ID | Unique user accounts with role assignments |
| **Emergency Access** | 164.312(a)(2)(ii) | Break-glass accounts | Dedicated emergency admin accounts in Key Vault |
| **Automatic Logoff** | 164.312(a)(2)(iii) | Session management | Configurable session timeout (default 30 min) + biometric re-auth |
| **Encryption & Decryption** | 164.312(a)(2)(iv) | Azure SSE + CMK | AES-256 at rest, TLS 1.2+ in transit |
| **Contingency Plan** | 164.308(a)(7) | Geo-redundant backups + DR | PostgreSQL geo-backup + multi-region Front Door |
| **Security Incident Procedures** | 164.308(a)(6) | Defender for Cloud + Alerts | Automated alerting for anomalous access patterns |
| **Workforce Training** | 164.308(a)(5) | Azure compliance documentation | Training materials + role-specific access |
| **Business Associate Agreements** | 164.308(b)(1) | Azure BAA | Signed BAA covers all HIPAA-eligible services |
| **Facility Access Controls** | 164.310(a)(1) | Azure datacenters (SOC 2 certified) | N/A — fully cloud-hosted |
| **Workstation Security** | 164.310(b) | Conditional Access (future) | iOS app with biometric lock + session timeout |
| **Device & Media Controls** | 164.310(d)(1) | Azure Disk Encryption + Blob policies | Encryption at rest + retention policies + secure deletion |
| **Risk Analysis** | 164.308(a)(1)(ii)(A) | Defender for Cloud + Azure Policy | Continuous security posture assessment |

### 5.2 SOC 2 Considerations

#### Type II Audit Requirements

For SOC 2 Type II certification:

1. **Trust Service Criteria:** Map to Security, Availability, Processing Integrity, Confidentiality, Privacy
2. **Evidence Collection:**
   - Azure Activity Logs (infrastructure changes) — retained 365 days in Log Analytics
   - Key Vault Audit Events (secret access) — retained 365 days
   - Application audit_events table (PHI access) — retained indefinitely
   - Defender for Cloud compliance reports — exportable on demand
3. **Azure Compliance Documentation:**
   - Azure SOC 2 Type II report available via Service Trust Portal
   - Covers physical security, logical access, change management, incident response
4. **Continuous Monitoring:**
   - Azure Policy compliance dashboard
   - Defender for Cloud Secure Score
   - Weekly compliance report export

### 5.3 Azure Policy & Governance

```bash
# Assign built-in HIPAA HITRUST policy initiative
az policy assignment create \
  --name "hipaa-hitrust" \
  --display-name "HIPAA HITRUST 9.2" \
  --scope "/subscriptions/<SUB_ID>/resourceGroups/$RESOURCE_GROUP" \
  --policy-set-definition "a169a624-5599-4385-a696-c8d643089fab"

# Custom policy: Deny public endpoints on PaaS services
az policy definition create \
  --name "deny-public-endpoints" \
  --display-name "Deny Public Network Access on PaaS" \
  --mode All \
  --rules '{
    "if": {
      "anyOf": [
        {
          "allOf": [
            {"field": "type", "equals": "Microsoft.DBforPostgreSQL/flexibleServers"},
            {"field": "Microsoft.DBforPostgreSQL/flexibleServers/publicNetworkAccess", "notEquals": "Disabled"}
          ]
        },
        {
          "allOf": [
            {"field": "type", "equals": "Microsoft.KeyVault/vaults"},
            {"field": "Microsoft.KeyVault/vaults/publicNetworkAccess", "notEquals": "Disabled"}
          ]
        },
        {
          "allOf": [
            {"field": "type", "equals": "Microsoft.CognitiveServices/accounts"},
            {"field": "Microsoft.CognitiveServices/accounts/publicNetworkAccess", "notEquals": "Disabled"}
          ]
        }
      ]
    },
    "then": {"effect": "Deny"}
  }'

# Custom policy: Require resource tagging
az policy definition create \
  --name "require-hipaa-tag" \
  --display-name "Require HIPAA tag on all resources" \
  --mode All \
  --rules '{
    "if": {
      "field": "tags[HIPAA]",
      "exists": "false"
    },
    "then": {"effect": "Deny"}
  }'

# Custom policy: Enforce TLS 1.2 minimum
az policy definition create \
  --name "enforce-tls12" \
  --display-name "Enforce TLS 1.2 minimum" \
  --mode All \
  --rules '{
    "if": {
      "allOf": [
        {"field": "type", "equals": "Microsoft.Web/sites"},
        {"field": "Microsoft.Web/sites/siteConfig.minTlsVersion", "notEquals": "1.2"}
      ]
    },
    "then": {"effect": "Deny"}
  }'
```

---

## 6. CI/CD Pipeline

### 6.1 GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Easy Health to Azure

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AZURE_WEBAPP_NAME: app-easyhealth-prod
  AZURE_WEBAPP_SLOT: staging
  NODE_VERSION: '20'

permissions:
  id-token: write
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run check

      - name: Build application
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: |
            dist/
            package.json
            package-lock.json

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: dist

      - name: Install production dependencies
        run: npm ci --omit=dev

      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Deploy to staging slot
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ env.AZURE_WEBAPP_NAME }}
          slot-name: ${{ env.AZURE_WEBAPP_SLOT }}
          package: .

  verify-staging:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Wait for deployment
        run: sleep 60

      - name: Health check
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://${{ env.AZURE_WEBAPP_NAME }}-staging.azurewebsites.net/api/health")
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed with status $STATUS"
            exit 1
          fi
          echo "Health check passed"

  swap-to-production:
    needs: verify-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Swap staging to production
        run: |
          az webapp deployment slot swap \
            --resource-group rg-easyhealth-prod \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --slot staging \
            --target-slot production

  rollback:
    needs: swap-to-production
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Login to Azure
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Rollback - swap back
        run: |
          az webapp deployment slot swap \
            --resource-group rg-easyhealth-prod \
            --name ${{ env.AZURE_WEBAPP_NAME }} \
            --slot staging \
            --target-slot production
```

### 6.2 Infrastructure as Code (Bicep)

Create `infra/main.bicep` for reproducible deployments:

```bicep
// infra/main.bicep - Easy Health Azure Infrastructure
targetScope = 'resourceGroup'

@description('Environment name')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Azure region')
param location string = resourceGroup().location

@description('Database admin password')
@secure()
param dbAdminPassword string

// Variables
var prefix = 'easyhealth-${environment}'
var vnetName = 'vnet-${prefix}'
var appServicePlanName = 'asp-${prefix}'
var appName = 'app-${prefix}'
var dbServerName = 'psql-${prefix}'
var kvName = 'kv-${prefix}'

// Virtual Network
resource vnet 'Microsoft.Network/virtualNetworks@2023-09-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    subnets: [
      { name: 'snet-app', properties: { addressPrefix: '10.0.1.0/24', delegations: [{ name: 'appservice', properties: { serviceName: 'Microsoft.Web/serverFarms' } }] } }
      { name: 'snet-database', properties: { addressPrefix: '10.0.2.0/24', delegations: [{ name: 'postgres', properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' } }] } }
      { name: 'snet-ai', properties: { addressPrefix: '10.0.3.0/24', privateEndpointNetworkPolicies: 'Disabled' } }
      { name: 'snet-management', properties: { addressPrefix: '10.0.4.0/24', privateEndpointNetworkPolicies: 'Disabled' } }
    ]
  }
  tags: { Environment: environment, Application: 'EasyHealth', HIPAA: 'true' }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: { name: environment == 'prod' ? 'P1V3' : 'B1', tier: environment == 'prod' ? 'PremiumV3' : 'Basic' }
  kind: 'linux'
  properties: { reserved: true }
  tags: { Environment: environment, Application: 'EasyHealth', HIPAA: 'true' }
}

// App Service
resource app 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    virtualNetworkSubnetId: vnet.properties.subnets[0].id
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      healthCheckPath: '/api/health'
      appCommandLine: 'node dist/index.cjs'
    }
  }
  tags: { Environment: environment, Application: 'EasyHealth', HIPAA: 'true' }
}

// PostgreSQL Flexible Server
resource dbServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-06-01-preview' = {
  name: dbServerName
  location: location
  sku: { name: 'Standard_D2s_v3', tier: 'GeneralPurpose' }
  properties: {
    version: '16'
    administratorLogin: 'ehadmin'
    administratorLoginPassword: dbAdminPassword
    storage: { storageSizeGB: 128 }
    backup: { backupRetentionDays: 35, geoRedundantBackup: 'Enabled' }
    highAvailability: { mode: environment == 'prod' ? 'ZoneRedundant' : 'Disabled' }
    network: { delegatedSubnetResourceId: vnet.properties.subnets[1].id, publicNetworkAccess: 'Disabled' }
  }
  tags: { Environment: environment, Application: 'EasyHealth', HIPAA: 'true' }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    publicNetworkAccess: 'Disabled'
  }
  tags: { Environment: environment, Application: 'EasyHealth', HIPAA: 'true' }
}

// Key Vault role assignment for App Service
resource kvRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, app.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: app.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output appServiceUrl string = 'https://${app.properties.defaultHostName}'
output appServicePrincipalId string = app.identity.principalId
```

**Environment Promotion:**

```bash
# Deploy to dev
az deployment group create \
  --resource-group rg-easyhealth-dev \
  --template-file infra/main.bicep \
  --parameters environment=dev dbAdminPassword="$(az keyvault secret show --vault-name kv-easyhealth-mgmt --name db-password-dev --query value -o tsv)"

# Deploy to staging
az deployment group create \
  --resource-group rg-easyhealth-staging \
  --template-file infra/main.bicep \
  --parameters environment=staging dbAdminPassword="..."

# Deploy to production
az deployment group create \
  --resource-group rg-easyhealth-prod \
  --template-file infra/main.bicep \
  --parameters environment=prod dbAdminPassword="..."
```

**Drift Detection:**

```bash
# Use Azure Policy compliance dashboard or run:
az deployment group what-if \
  --resource-group $RESOURCE_GROUP \
  --template-file infra/main.bicep \
  --parameters environment=prod dbAdminPassword="<placeholder>"
```

---

## 7. Disaster Recovery & Business Continuity

### 7.1 RPO and RTO Targets

| Component | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|---|---|---|
| Database | 5 minutes (continuous backup) | 1 hour (zone-redundant HA failover: ~2 min; geo-restore: ~1 hr) |
| Application | 0 (stateless, from Git) | 15 minutes (redeploy from CI/CD) |
| AI Services | N/A (stateless) | 5 minutes (provision new resource) |
| Blob Storage (recordings) | 0 (GRS replication) | 1 hour (failover to secondary region) |
| Key Vault | 0 (geo-replicated automatically) | Immediate (automatic failover) |

### 7.2 Database Geo-Replication

PostgreSQL Flexible Server with geo-redundant backup:
- Continuous streaming replication within primary zone
- Zone-redundant HA: synchronous replica in different availability zone
- Geo-redundant backup: asynchronous backup replication to paired Azure region
- Point-in-time restore: any point within the 35-day retention window

```bash
# Restore from geo-redundant backup (disaster scenario)
az postgres flexible-server geo-restore \
  --resource-group rg-easyhealth-dr \
  --name psql-easyhealth-dr \
  --source-server $(az postgres flexible-server show -g $RESOURCE_GROUP -n $DB_SERVER_NAME --query id -o tsv) \
  --location westus2
```

### 7.3 Multi-Region Failover Strategy

1. **Primary Region:** East US (all services)
2. **DR Region:** West US 2 (pre-provisioned infrastructure via Bicep, dormant)
3. **Front Door:** Configured with both origins; automatic health-probe failover
4. **DNS:** Azure Front Door handles routing; no manual DNS changes needed

### 7.4 Backup Verification Procedures

| Frequency | Procedure | Owner |
|---|---|---|
| Weekly | Restore database backup to dev environment, verify row counts | DevOps |
| Monthly | Full DR drill: geo-restore database, deploy app to DR region, verify end-to-end | DevOps + Security |
| Quarterly | Tabletop exercise: simulate complete region failure | Engineering + Compliance |

### 7.5 DR Testing Schedule

| Quarter | Test Type | Scope |
|---|---|---|
| Q1 | Database restore verification | Dev environment |
| Q2 | Full region failover drill | DR region (West US 2) |
| Q3 | Backup integrity audit + database restore | All environments |
| Q4 | Full DR drill + compliance review | Full stack + documentation |

---

## 8. Cost Estimation

Estimated monthly costs for Easy Health production deployment (East US, as of 2026):

| Service | SKU / Configuration | Estimated Monthly Cost |
|---|---|---|
| **App Service Plan** | P1v3 (1 vCPU, 8 GB RAM) x2 instances | $290 |
| **PostgreSQL Flexible Server** | GP Standard_D2s_v3, 128 GB storage, Zone-redundant HA | $430 |
| **Azure OpenAI** | GPT-4o: ~500K tokens/day ($0.005/1K input + $0.015/1K output) | $450 |
| **Azure Speech** | S0: ~50 hours audio/month ($1/hr) | $50 |
| **Azure Key Vault** | Standard: ~10K operations/month | $5 |
| **Azure Front Door** | Standard tier + WAF + data transfer | $150 |
| **Azure Blob Storage** | Standard GRS, ~50 GB recordings + FHIR exports | $15 |
| **Azure Monitor / Log Analytics** | ~10 GB logs/month ingested, 365-day retention | $75 |
| **Application Insights** | ~5 GB telemetry/month | $15 |
| **Defender for Cloud** | Standard tier (App Service, DB, Key Vault, Storage) | $60 |
| **DDoS Protection Standard** | Basic (included) or Standard | $0 – $2,944 |
| **Private DNS Zones** | 5 zones | $3 |
| **Private Endpoints** | 6 endpoints | $45 |
| **Azure Entra ID** | P1 (if SSO required) | $6/user |
| | | |
| **Estimated Total (without DDoS Standard)** | | **~$1,590/month** |
| **Estimated Total (with DDoS Standard)** | | **~$4,534/month** |

**Notes:**
- DDoS Protection Standard is $2,944/month. Consider Basic (free) for initial deployment and upgrade if risk assessment warrants it.
- Azure OpenAI costs scale linearly with visit volume. Each clinical extraction uses ~2,000-4,000 tokens.
- Reserved instances (1-year) reduce App Service and PostgreSQL costs by ~35%.
- Consider Azure Savings Plan for compute to reduce costs further.

---

## 9. Deployment Verification Checklist

Run this checklist after every production deployment:

### Infrastructure

- [ ] App Service responding on custom domain (`https://app.easyhealth.com`)
- [ ] TLS certificate valid and not expiring within 30 days
- [ ] HTTPS redirect working (HTTP → HTTPS)
- [ ] Health check endpoint returning 200 (`/api/health`)
- [ ] Deployment slots: staging slot accessible
- [ ] Auto-scaling rules configured (min: 2, max: 6)
- [ ] VNet integration active

### Database

- [ ] Database connectivity from App Service (via private endpoint)
- [ ] SSL connection enforced (`sslmode=require`)
- [ ] Zone-redundant HA active
- [ ] Backup schedule verified (geo-redundant, 35-day retention)
- [ ] Row counts match expected data

### Security

- [ ] Key Vault secrets accessible via managed identity
- [ ] All Key Vault references resolving in App Service settings
- [ ] Private endpoints active (no public access to DB, AI, Key Vault, Storage)
- [ ] WAF rules active and in Prevention mode
- [ ] NSG rules applied to all subnets
- [ ] DDoS Protection enabled
- [ ] Defender for Cloud security score > 80%

### AI Services

- [ ] Azure Speech transcription working (test with sample audio)
- [ ] Azure OpenAI extraction working (test with sample transcript)
- [ ] AI provider configuration correct in admin panel
- [ ] Rate limits adequate for expected volume
- [ ] Fallback provider (OpenAI Whisper) configured and tested

### Monitoring

- [ ] Azure Monitor alerts configured and tested
- [ ] Application Insights receiving telemetry
- [ ] Log Analytics workspace receiving logs from all resources
- [ ] Diagnostic settings enabled on all resources
- [ ] Alert action group configured (email + SMS)

### Application

- [ ] Login flow working (username/password)
- [ ] MFA flow working (code generation and verification)
- [ ] Biometric gate working (iOS app)
- [ ] Session timeout enforced
- [ ] Identity verification workflow functional
- [ ] Visit CRUD operations working
- [ ] Voice capture end-to-end test passing
- [ ] FHIR export producing valid R4 bundles
- [ ] Audit trail recording all PHI access events

### Compliance

- [ ] Azure BAA signed and on file
- [ ] HIPAA HITRUST policy initiative assigned
- [ ] Custom policies (deny public endpoints, require tags) assigned
- [ ] Audit log retention set to 365 days
- [ ] Key Vault purge protection enabled

---

## 10. Migration Runbook

### Step-by-Step: Replit/Neon → Azure Production

**Timeline Estimate:** 2-3 days (with pre-provisioned infrastructure)

---

#### Phase 1: Pre-Migration (Day 1 — Morning)

**Step 1: Provision Azure Infrastructure**

```bash
# Run Bicep deployment or execute CLI commands from Sections 3.1-3.7
az deployment group create \
  --resource-group rg-easyhealth-prod \
  --template-file infra/main.bicep \
  --parameters environment=prod dbAdminPassword="$(openssl rand -base64 32)"

# Verify all resources created
az resource list --resource-group rg-easyhealth-prod --output table
```

**Step 2: Configure Key Vault Secrets**

```bash
# Store all secrets (see Section 3.5)
az keyvault secret set --vault-name kv-easyhealth-prod --name "DATABASE-URL" --value "..."
az keyvault secret set --vault-name kv-easyhealth-prod --name "SESSION-SECRET" --value "..."
az keyvault secret set --vault-name kv-easyhealth-prod --name "AZURE-SPEECH-KEY" --value "..."
az keyvault secret set --vault-name kv-easyhealth-prod --name "AZURE-OPENAI-API-KEY" --value "..."
az keyvault secret set --vault-name kv-easyhealth-prod --name "OPENAI-API-KEY" --value "..."
```

**Step 3: Configure App Service**

```bash
# Set application settings with Key Vault references (see Section 3.3)
az webapp config appsettings set \
  --resource-group rg-easyhealth-prod \
  --name app-easyhealth-prod \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="@Microsoft.KeyVault(SecretUri=https://kv-easyhealth-prod.vault.azure.net/secrets/DATABASE-URL/)" \
    SESSION_SECRET="@Microsoft.KeyVault(SecretUri=https://kv-easyhealth-prod.vault.azure.net/secrets/SESSION-SECRET/)" \
    AZURE_SPEECH_KEY="@Microsoft.KeyVault(SecretUri=https://kv-easyhealth-prod.vault.azure.net/secrets/AZURE-SPEECH-KEY/)" \
    AZURE_OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://kv-easyhealth-prod.vault.azure.net/secrets/AZURE-OPENAI-API-KEY/)" \
    OPENAI_API_KEY="@Microsoft.KeyVault(SecretUri=https://kv-easyhealth-prod.vault.azure.net/secrets/OPENAI-API-KEY/)"
```

---

#### Phase 2: Database Migration (Day 1 — Afternoon)

**Step 4: Migrate Database from Neon**

```bash
# 1. Set Replit app to maintenance mode (or stop accepting new visits)

# 2. Export from Neon
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  "$NEON_DATABASE_URL" \
  > easyhealth_$(date +%Y%m%d_%H%M%S).dump

# 3. Restore to Azure PostgreSQL
# (requires network access to Azure — use Azure Cloud Shell or a jump box in the VNet)
pg_restore \
  --host=psql-easyhealth-prod.postgres.database.azure.com \
  --port=5432 \
  --username=ehadmin \
  --dbname=easyhealth \
  --no-owner \
  --no-privileges \
  --verbose \
  easyhealth_*.dump

# 4. Run Drizzle migrations if needed
# From a machine with VNet access:
DATABASE_URL="postgresql://ehadmin:...@psql-easyhealth-prod.postgres.database.azure.com:5432/easyhealth?sslmode=require" \
  npx drizzle-kit push

# 5. Verify row counts
psql "postgresql://ehadmin:...@psql-easyhealth-prod.postgres.database.azure.com:5432/easyhealth?sslmode=require" -c "
  SELECT 'users' AS tbl, COUNT(*) FROM users
  UNION ALL SELECT 'members', COUNT(*) FROM members
  UNION ALL SELECT 'visits', COUNT(*) FROM visits
  UNION ALL SELECT 'recordings', COUNT(*) FROM recordings
  UNION ALL SELECT 'transcripts', COUNT(*) FROM transcripts
  UNION ALL SELECT 'audit_events', COUNT(*) FROM audit_events
  ORDER BY tbl;
"
```

---

#### Phase 3: Application Deployment (Day 2 — Morning)

**Step 5: Deploy Application Code**

```bash
# Build locally or via CI/CD
npm ci
npm run build

# Deploy to staging slot
az webapp deployment source config-zip \
  --resource-group rg-easyhealth-prod \
  --name app-easyhealth-prod \
  --slot staging \
  --src dist.zip

# Verify staging
curl -s https://app-easyhealth-prod-staging.azurewebsites.net/api/health
# Should return: {"status":"healthy","timestamp":"..."}

# Swap to production
az webapp deployment slot swap \
  --resource-group rg-easyhealth-prod \
  --name app-easyhealth-prod \
  --slot staging \
  --target-slot production
```

**Step 6: Configure AI Services**

1. Log into the Easy Health Admin Console on the Azure deployment
2. Navigate to **AI Provider Configuration**
3. Create Azure Speech provider:
   - Provider Type: `azure_speech`
   - Display Name: `Azure Speech (Production)`
   - Speech Region: `eastus`
   - Speech Endpoint: `https://speech-easyhealth-prod.cognitiveservices.azure.com/`
   - API Key Secret Name: `AZURE_SPEECH_KEY`
   - Set as **Active**
4. Create Azure OpenAI provider (for extraction):
   - Provider Type: `azure_openai`
   - Display Name: `Azure OpenAI (Production)`
   - Azure OpenAI Endpoint: `https://aoai-easyhealth-prod.openai.azure.com/`
   - Extraction Model: `gpt-4o`
   - API Key Secret Name: `AZURE_OPENAI_API_KEY`
5. Test both providers using the admin panel test button
6. Create fallback OpenAI provider (optional):
   - Provider Type: `openai`
   - Model: `whisper-1`
   - API Key Secret Name: `OPENAI_API_KEY`

---

#### Phase 4: DNS & Mobile App (Day 2 — Afternoon)

**Step 7: Update iOS App Server URL**

Update `capacitor.config.ts` to include the new Azure production domain:

```typescript
server: {
  androidScheme: "https",
  iosScheme: "capacitor",
  allowNavigation: [
    "app.easyhealth.com",           // New Azure production domain
    "eh-poc-application.healthtrixss.com"  // Keep old domain during transition
  ],
},
```

Rebuild and submit the iOS app update via TestFlight / App Store Connect.

**Step 8: DNS Cutover**

```bash
# Option A: Point custom domain to Azure Front Door
# Create CNAME record:
#   app.easyhealth.com → afd-easyhealth-<hash>.z01.azurefd.net

# Option B: If using the existing healthtrixss.com domain
# Update CNAME to point to Azure Front Door instead of Replit

# Verify DNS propagation
dig app.easyhealth.com CNAME
nslookup app.easyhealth.com
```

---

#### Phase 5: Verification (Day 2 — Evening / Day 3)

**Step 9: Verify All Functionality**

Run the complete [Deployment Verification Checklist](#9-deployment-verification-checklist) above.

Critical tests:
1. Login with each role (NP, Supervisor, Admin, Coordinator)
2. Create a new visit, record voice, transcribe, extract fields
3. Complete a full visit workflow (intake → vitals → assessment → review → finalize)
4. Export FHIR bundle and validate against R4 spec
5. Verify MFA flow end-to-end
6. Test from iOS app via TestFlight
7. Verify audit trail captures all actions
8. Confirm monitoring alerts fire correctly (trigger a test alert)

---

#### Phase 6: Decommission (Day 3+)

**Step 10: Decommission Replit Deployment**

1. Verify Azure production is stable for 48+ hours
2. Redirect any remaining DNS entries to Azure
3. Remove Replit Secrets (clear sensitive data)
4. Archive Replit project (do not delete immediately — keep for 30 days)
5. Remove old `eh-poc-application.healthtrixss.com` from `capacitor.config.ts` `allowNavigation` in next iOS app update
6. Update all documentation to reference Azure endpoints
7. Notify all stakeholders of completed migration

---

## Appendix A: Environment Variables Reference

| Variable | Source | Description |
|---|---|---|
| `NODE_ENV` | App Setting | `production` |
| `DATABASE_URL` | Key Vault | PostgreSQL connection string |
| `SESSION_SECRET` | Key Vault | Express session encryption key |
| `AZURE_SPEECH_KEY` | Key Vault | Azure Cognitive Services Speech API key |
| `AZURE_OPENAI_API_KEY` | Key Vault | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | App Setting | Azure OpenAI endpoint URL |
| `OPENAI_API_KEY` | Key Vault | OpenAI API key (fallback) |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Setting | Application Insights connection |
| `WEBSITE_VNET_ROUTE_ALL` | App Setting | `1` (route all traffic through VNet) |
| `WEBSITES_PORT` | App Setting | `5000` |

## Appendix B: Key Azure CLI Commands

```bash
# View resource group
az resource list --resource-group rg-easyhealth-prod --output table

# View App Service logs
az webapp log tail --resource-group rg-easyhealth-prod --name app-easyhealth-prod

# View Key Vault secrets (names only)
az keyvault secret list --vault-name kv-easyhealth-prod --output table

# View database status
az postgres flexible-server show --resource-group rg-easyhealth-prod --name psql-easyhealth-prod

# View Defender for Cloud recommendations
az security assessment list --output table

# View Azure Policy compliance
az policy state summarize --resource-group rg-easyhealth-prod

# Restart App Service
az webapp restart --resource-group rg-easyhealth-prod --name app-easyhealth-prod

# Scale App Service
az appservice plan update --resource-group rg-easyhealth-prod --name asp-easyhealth-prod --sku P2V3
```

## Appendix C: Emergency Contacts & Escalation

| Tier | Scenario | Action |
|---|---|---|
| P1 — Critical | App down, data breach suspected | Page on-call DevOps + Security lead, engage Azure Support (Sev A) |
| P2 — High | AI service failures, database performance degradation | Notify DevOps, investigate within 30 min |
| P3 — Medium | WAF false positives, monitoring alert tuning | Create ticket, resolve within 24 hours |
| P4 — Low | Cost optimization, documentation updates | Schedule for next sprint |

---

*End of Document*
