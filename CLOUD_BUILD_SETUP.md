# Google Cloud Build Migration Setup Guide

This guide explains how to configure your Cloud Build trigger to automatically run Prisma migrations when deploying to production.

## Prerequisites

-   Google Cloud Project with Cloud Build, Cloud Run, and Cloud SQL enabled
-   Cloud Build trigger already configured (visible in screenshot)
-   Production database running in Cloud SQL
-   Appropriate IAM permissions

## Configuration Steps

### 1. Update Cloud Build Trigger

1. Go to **Google Cloud Console** → **Cloud Build** → **Triggers**
2. Find your trigger: `rmdpgab-lutia-prod-europe-west1-lutia-ai-lutia-makbs`
3. Click **Edit**
4. Update the following settings:

**Build Configuration:**

-   Change **Location** from "Inline" to **"Repository"**
-   Set **Cloud Build configuration file location** to: `cloudbuild.yaml`

**Substitution Variables:**

Your existing variables are already configured. You only need to ADD these 2 new migration-specific variables (click "Add Variable"):

```
_CLOUD_SQL_INSTANCE = lutia-430919:europe-west1:your-instance-name
_DATABASE_URL = postgresql://username:password@localhost:5432/lutia-prod?schema=public
```

**Existing variables (already configured, no changes needed):**

```
_AR_HOSTNAME = europe-west1-docker.pkg.dev
_AR_REPOSITORY = cloud-run-source-deploy
_AR_PROJECT_ID = lutia-430919
_PLATFORM = managed
_SERVICE_NAME = lutia-prod
_DEPLOY_REGION = europe-west1
_TRIGGER_ID = 2cb99579-71d8-4f0c-8e5b-a9e0162f99df
```

**Important**: For the 2 new variables, replace:

-   `your-instance-name` with your actual Cloud SQL instance name
-   `username:password` with your actual database credentials
-   Verify the database name is `lutia-prod`

### 2. Configure Service Account Permissions

Your Cloud Build service account needs these IAM roles:

1. **Cloud SQL Client** - To connect via Cloud SQL Proxy

    ```bash
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
      --role="roles/cloudsql.client"
    ```

2. **Cloud Run Admin** - To deploy services

    ```bash
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
      --role="roles/run.admin"
    ```

3. **Service Account User** - To act as Cloud Run service account

    ```bash
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
      --role="roles/iam.serviceAccountUser"
    ```

4. **Artifact Registry Writer** - To push Docker images
    ```bash
    gcloud projects add-iam-policy-binding PROJECT_ID \
      --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
      --role="roles/artifactregistry.writer"
    ```

### 3. Alternative: Use Secret Manager (More Secure)

Instead of storing `_DATABASE_URL` in substitution variables, use Secret Manager:

1. **Create secret in Secret Manager:**

    ```bash
    echo -n "postgresql://user:pass@localhost:5432/lutia-prod" | \
      gcloud secrets create DATABASE_URL --data-file=-
    ```

2. **Grant access to Cloud Build service account:**

    ```bash
    gcloud secrets add-iam-policy-binding DATABASE_URL \
      --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor"
    ```

3. **Update cloudbuild.yaml** to use secrets:

    ```yaml
    availableSecrets:
        secretManager:
            - versionName: projects/PROJECT_ID/secrets/DATABASE_URL/versions/latest
              env: 'DATABASE_URL'

    steps:
        - name: 'gcr.io/cloud-builders/gcloud'
          secretEnv: ['DATABASE_URL']
          env:
              - 'DATABASE_URL=${DATABASE_URL}'
          # ... rest of migration step
    ```

### 4. Find Your Cloud SQL Instance Connection Name

To get your exact instance connection name:

```bash
# List all instances
gcloud sql instances list --project=lutia-430919

# Get connection name for specific instance
gcloud sql instances describe YOUR_INSTANCE_NAME --project=lutia-430919 --format="value(connectionName)"
```

This returns format: `lutia-430919:europe-west1:instance-name`

Use this **exact value** for the `_CLOUD_SQL_INSTANCE` substitution variable.

### 5. Test the Setup

**Before merging to main**, test in a feature branch:

1. Create a test migration locally:

    ```bash
    npm run prisma:migrate test_cloudbuild_setup
    ```

2. Commit and push to main (or trigger manually):

    ```bash
    git add .
    git commit -m "feat: add automated Prisma migrations to Cloud Build"
    git push origin main
    ```

3. **Monitor the build:**

    - Go to Cloud Build → History
    - Watch logs for "run-migrations" step
    - Verify migration succeeded before deployment

4. **Verify migration applied:**

    ```bash
    # Connect to Cloud SQL
    gcloud sql connect YOUR_INSTANCE_NAME --user=postgres --quiet

    # In psql:
    \c lutia-prod
    SELECT * FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 5;
    ```

## Build Pipeline Flow

```
1. Push to main
   ↓
2. Cloud Build triggered
   ↓
3. Install dependencies (npm ci)
   ↓
4. Generate Prisma Client (npx prisma generate)
   ↓
5. Start Cloud SQL Proxy
   ↓
6. Run migrations (npx prisma migrate deploy)
   ↓ (if successful)
7. Build Docker image
   ↓
8. Push to Artifact Registry
   ↓
9. Deploy to Cloud Run
   ↓
10. New version live with migrations applied
```

If step 6 fails, the build stops and Cloud Run continues running the old version.

## Troubleshooting

### Migration fails with "connection refused"

-   Check `_CLOUD_SQL_INSTANCE` format is correct
-   Verify service account has Cloud SQL Client role
-   Check database credentials in `_DATABASE_URL`

### Migration runs but deployment fails

-   Check Docker build logs
-   Verify Artifact Registry permissions
-   Check Cloud Run service account permissions

### Need to rollback a migration

```bash
# Option 1: Manually rollback in database
# Connect to Cloud SQL and manually revert changes

# Option 2: Create a new migration that reverses changes
npm run prisma:migrate rollback_model_changes
git push origin main  # Triggers new build with rollback migration
```

### Check migration status

```bash
# From Cloud Build step or locally with Cloud SQL Proxy
npx prisma migrate status
```

## Security Best Practices

1. **Never commit database credentials to git**
2. **Use Secret Manager** for `DATABASE_URL` (recommended over substitution variables)
3. **Rotate database passwords periodically**
4. **Enable Cloud Build logging** to audit migration history
5. **Use separate databases** for dev/staging/production
6. **Restrict Cloud Build service account** to only necessary permissions

## Cost Considerations

-   Cloud Build: First 120 build-minutes/day free, then $0.003/build-minute
-   Migrations typically add 10-30 seconds per build
-   Cloud SQL Proxy: No additional cost
-   Estimate: ~$0.01 per deployment with migrations

## Next Steps After Setup

1. **Test with this PR**: Merge your current model update PR to test the pipeline
2. **Monitor first deployment**: Watch Cloud Build logs carefully
3. **Create staging environment**: Set up similar pipeline for staging
4. **Document runbook**: Add migration troubleshooting to team docs
5. **Set up alerts**: Configure Cloud Build notifications for failures
