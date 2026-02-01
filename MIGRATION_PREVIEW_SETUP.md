# Database Migration Preview Setup

This guide explains how to set up two-stage database migrations with preview in GitHub PRs.

## Overview

**Two Cloud Build Triggers:**

1. **Migration Preview** (automatic on PRs) - Shows what will change
2. **Deploy with Migrations** (manual after merge) - Actually runs migrations

## Architecture

```
┌─────────────────┐
│   Create PR     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Trigger: migration-preview      │  ← Automatic
│ Status check appears in GitHub  │
│ Click "Details" to see SQL diff │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Review PR     │
│ See migrations  │
│   Merge PR      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│ Trigger: Deploy automatically   │  ← Automatic on merge
│ Runs migrations + deploys app   │
└─────────────────────────────────┘
```

## Setup Instructions

### 1. Create Migration Preview Trigger

**In Google Cloud Console:**

1. Go to **Cloud Build > Triggers**
2. Click **"Create Trigger"**
3. Configure:
   - **Name**: `migration-preview`
   - **Description**: `Preview database migrations on pull requests`
   - **Event**: `Pull request`
   - **Source**: `lutia-ai/lutia` (main branch)
   - **Comment control**: `Required except for owners and collaborators`
   - **Build configuration**: `Cloud Build configuration file`
   - **Location**: `cloudbuild-preview.yaml`

4. **Substitution variables** (click "Add Variable"):
   ```
   _CLOUD_SQL_INSTANCE = lutia-430919:europe-west1:lutia
   _DATABASE_URL = (your database URL from Secret Manager)
   ```

5. **Service account**: 
   - Use default Cloud Build service account
   - Ensure it has `cloudsql.client` role

6. Click **"Create"**

### 2. Update Deploy Trigger

**Modify your existing `lutia-prod-main-deploy` trigger:**

1. Go to **Cloud Build > Triggers**
2. Click on `lutia-prod-main-deploy`
3. Click **"Edit"**
4. Ensure **Event** is set to: `Push to a branch`
5. **Branch**: `^main$`
6. Update **Build configuration** location to: `cloudbuild-deploy.yaml`
7. Click **"Save"**

### 3. Workflow

#### For Pull Requests:

1. **Create PR** with Prisma schema changes
2. **Preview trigger runs automatically**
3. **View status in GitHub PR**:
   ```
   ✅ Cloud Build / migration-preview
      Details →
   ```
4. **Click "Details"** to see formatted migration preview in Cloud Build logs
5. **Review the SQL changes**

#### After Merge:

1. **PR is merged to main**
2. **Deploy trigger runs automatically**
3. **Migrations run** → App deploys
4. **Done!** No manual steps needed

## What You'll See in Cloud Build

### Preview Trigger Logs:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 DATABASE MIGRATION PREVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Current Migration Status:
────────────────────────────────────────────────────────────
Your database is up to date!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Proposed SQL Changes:
────────────────────────────────────────────────────────────
-- CreateTable
CREATE TABLE "NewFeature" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewFeature_name_key" ON "NewFeature"("name");

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  CHANGES DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The SQL statements above will be executed when you run
the 'Apply Migrations' trigger after merging this PR.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Preview completed successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Security

- `cloudbuild-preview.yaml` is safe to commit (no secrets)
- Database credentials come from substitution variables
- Preview trigger has read-only database access

## Benefits

- ✅ **See changes before applying** - Just like `terraform plan`
- ✅ **GitHub PR integration** - Status checks show in every PR
- ✅ **Manual control** - Deploy trigger runs only when you click it
- ✅ **No surprises** - Always know what will change in production
- ✅ **Audit trail** - All previews logged in Cloud Build

## Troubleshooting

### Preview trigger doesn't run on PRs

- Check trigger is set to "Pull request" event
- Verify GitHub App is connected: Cloud Build > Repositories
- Check comment control settings

### Can't see migration details

- Click "Details" link in GitHub PR status check
- Opens Cloud Build console with full logs
- Look for the formatted preview section

### Deploy trigger doesn't run migrations

- Ensure `cloudbuild-deploy.yaml` is configured correctly
- Check `_DATABASE_URL` substitution variable is set
- Verify Cloud Build SA has `cloudsql.client` role

## Optional: Terraform Management

You can manage these triggers with Terraform:

```hcl
# Preview trigger (on PRs)
resource "google_cloudbuild_trigger" "migration_preview" {
  name        = "migration-preview"
  description = "Preview database migrations on pull requests"
  
  github {
    owner = "lutia-ai"
    name  = "lutia"
    
    pull_request {
      branch = "^main$"
    }
  }
  
  filename = "cloudbuild-preview.yaml"
  
  substitutions = {
    _CLOUD_SQL_INSTANCE = "lutia-430919:europe-west1:lutia"
    _DATABASE_URL       = var.database_url
  }
}

# Deploy trigger (automatic on main)
resource "google_cloudbuild_trigger" "deploy" {
  name        = "lutia-prod-deploy"
  description = "Deploy to production with migrations"
  
  github {
    owner = "lutia-ai"
    name  = "lutia"
    
    push {
      branch = "^main$"
    }
  }
  
  filename = "cloudbuild-deploy.yaml"
  
  substitutions = {
    _CLOUD_SQL_INSTANCE = "lutia-430919:europe-west1:lutia"
    _DATABASE_URL       = var.database_url
    # ... other substitutions
  }
}
```
