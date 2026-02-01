# Migration Preview Trigger (runs on PRs)
resource "google_cloudbuild_trigger" "migration_preview" {
    name        = "migration-preview-v2"
    description = "Preview database migrations on pull requests"

    github {
        owner = var.github_owner
        name  = var.github_repo

        pull_request {
            branch          = "^main$"
            comment_control = "COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY"
        }
    }

    # No service_account specified - Cloud Build uses default service account

    filename = "cloudbuild-preview.yaml"

    include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

    substitutions = {
        _CLOUD_SQL_INSTANCE = google_sql_database_instance.lutia.connection_name
        _DATABASE_URL       = var.database_url
    }

    tags = [
        "migration-preview",
        "database-migrations"
    ]
}

# Deploy trigger (runs on push to main)
resource "google_cloudbuild_trigger" "main_branch" {
    name        = "lutia-prod-main-deploy-v2"
    description = "Build and deploy to Cloud Run service lutia-prod on push to main"

    github {
        owner = var.github_owner
        name  = var.github_repo

        push {
            branch = "^main$"
        }
    }

    # No service_account specified - Cloud Build uses default service account

    filename = "cloudbuild-deploy.yaml"

    include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

    substitutions = {
        _AR_HOSTNAME        = "${var.region}-docker.pkg.dev"
        _AR_PROJECT_ID      = var.project_id
        _AR_REPOSITORY      = "cloud-run-source-deploy"
        _DEPLOY_REGION      = var.region
        _PLATFORM           = "managed"
        _SERVICE_NAME       = var.service_name
        _CLOUD_SQL_INSTANCE = google_sql_database_instance.lutia.connection_name
        _DATABASE_URL       = var.database_url
    }

    tags = [
        "gcp-cloud-build-deploy-cloud-run",
        "gcp-cloud-build-deploy-cloud-run-managed",
        var.service_name
    ]
}
