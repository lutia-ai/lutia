# Lutia Infrastructure - Terraform

## Prerequisites

1. Install Terraform: https://developer.hashicorp.com/terraform/downloads
2. Authenticate with GCP: `gcloud auth application-default login`
3. Set environment variables or create `terraform.tfvars`

## Setup

### 1. Create terraform.tfvars

Create a `terraform.tfvars` file with your sensitive values:

```hcl
database_url          = "postgresql://user:password@34.78.244.9:5432/lutia-prod?schema=public"
openai_api_key        = "sk-proj-..."
anthropic_api_key     = "sk-ant-..."
google_gemini_api_key = "AIza..."
llama_api_key         = "LA-..."
google_client_id      = "916876285526-..."
google_client_secret  = "GOCSPX-..."
xai_api_key           = "xai-..."
deepseek_api_key      = "sk-..."
secret_auth           = "your-auth-secret"
stripe_api_key        = "sk_live_..."
stripe_public_key     = "pk_live_..."
mailjet_api_key       = "..."
mailjet_secret_key    = "..."
recaptcha_key         = "..."
recaptcha_public_key  = "..."
```

**NEVER commit terraform.tfvars to git!**

### 2. Initialize Terraform

```bash
cd terraform
terraform init
```

### 3. Import Existing Resources

Before applying any changes, import your existing GCP resources:

```bash
# Import Artifact Registry
terraform import google_artifact_registry_repository.docker_repo projects/lutia-430919/locations/europe-west1/repositories/cloud-run-source-deploy

# Import Cloud Run service
terraform import google_cloud_run_v2_service.lutia_prod projects/lutia-430919/locations/europe-west1/services/lutia-prod

# Import Cloud Build trigger
terraform import google_cloudbuild_trigger.main_branch projects/lutia-430919/locations/global/triggers/2cb99579-71d8-4f0c-8e5b-a9e0162f99df

# Import Cloud SQL instances
terraform import google_sql_database_instance.lutia projects/lutia-430919/instances/lutia
terraform import google_sql_database_instance.lutia_backup projects/lutia-430919/instances/lutia-backup
terraform import google_sql_database.lutia_prod projects/lutia-430919/instances/lutia/databases/lutia-prod
```

### 4. Plan Changes

Review what Terraform will do:

```bash
terraform plan
```

### 5. Apply Changes

Apply the configuration:

```bash
terraform apply
```

## Managing Changes

-   Always run `terraform plan` before `apply`
-   Review changes carefully
-   IAM changes take effect immediately
-   Cloud Run changes will be applied on next deployment

## Managing IAM Roles

The IAM roles for Cloud Build are managed separately and can be applied with:

```bash
terraform apply -target=google_project_iam_member.cloudbuild_sql_client
terraform apply -target=google_project_iam_member.cloudbuild_run_admin
terraform apply -target=google_project_iam_member.cloudbuild_sa_user
terraform apply -target=google_project_iam_member.cloudbuild_ar_writer
```

## Secret Manager (Optional)

The `secret-manager.tf` file creates Secret Manager secrets but doesn't populate them. To use:

1. Apply the secret-manager resources:
    ```bash
    terraform apply -target=google_project_service.secretmanager
    terraform apply -target=google_secret_manager_secret.database_url
    # etc...
    ```
2. Populate secrets manually via GCP Console or gcloud:
    ```bash
    echo -n "your-secret-value" | gcloud secrets versions add database-url --data-file=-
    ```
3. Update `cloud-run.tf` to reference secrets instead of plain text variables

## Testing

### Validate Configuration

```bash
terraform validate
terraform fmt -check
```

### Dry Run

```bash
terraform plan -out=tfplan
terraform show tfplan
```

## Important Notes

1. **Cloud SQL**: Connection name: `lutia-430919:europe-west1:lutia`
2. **Database Security**: Currently allows public access (0.0.0.0/0). Consider:
    - Using Cloud SQL Proxy from Cloud Run
    - Private IP / VPC peering
    - Restricting to specific IP ranges
3. **Secrets**: Currently stored as plain environment variables. Consider migrating to Secret Manager.
4. **State File**: Contains sensitive data. Consider using remote backend (GCS).
5. **Deletion Protection**: Enabled on Cloud SQL to prevent accidental deletion.

## Outputs

View outputs after applying:

```bash
terraform output
terraform output cloud_run_url
terraform output cloud_sql_connection_name
```

## Rollback Plan

If something goes wrong:

1. IAM changes are additive (safe)
2. Cloud Run changes can be rolled back via GCP Console
3. Cloud Build trigger can be manually reverted
4. Keep backups of `.tfstate` files

## Remote State (Future Enhancement)

To store state in Google Cloud Storage:

1. Create a GCS bucket:
    ```bash
    gsutil mb -p lutia-430919 -l europe-west1 gs://lutia-terraform-state
    gsutil versioning set on gs://lutia-terraform-state
    ```
2. Update `versions.tf`:
    ```hcl
    terraform {
      backend "gcs" {
        bucket = "lutia-terraform-state"
        prefix = "production"
      }
    }
    ```
3. Re-initialize:
    ```bash
    terraform init -migrate-state
    ```

## Next Steps

1. Create staging environment by duplicating terraform with different variables
2. Add monitoring and alerting resources
3. Set up automated terraform plan checks in CI/CD
4. Consider migrating to Secret Manager for better security

## Troubleshooting

### Import Errors

If import fails, the resource might already be in state:

```bash
terraform state list
terraform state show google_cloud_run_v2_service.lutia_prod
```

### State Issues

View and manage state:

```bash
terraform state list
terraform state show RESOURCE_NAME
terraform state rm RESOURCE_NAME  # Remove from state if needed
```

### Drift Detection

Check if infrastructure has drifted from state:

```bash
terraform plan -detailed-exitcode
```

Exit codes:

-   0 = No changes
-   1 = Error
-   2 = Changes detected
