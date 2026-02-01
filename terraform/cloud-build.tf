# Migration Preview Trigger (runs on PRs)
resource "google_cloudbuild_trigger" "migration_preview" {
    name        = "migration-preview"
    description = "Preview database migrations on pull requests"

    github {
        owner = var.github_owner
        name  = var.github_repo

        pull_request {
            branch          = "^main$"
            comment_control = "COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY"
        }
    }

    service_account = "projects/${var.project_id}/serviceAccounts/${local.cloudbuild_sa}"

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

# Deploy Trigger (runs on push to main)
# Deploy trigger (runs on push to main)
resource "google_cloudbuild_trigger" "main_branch" {
    name        = "lutia-prod-main-deploy"
    description = "Build and deploy to Cloud Run service lutia-prod on push to main"

    github {
        owner = var.github_owner
        name  = var.github_repo

        push {
            branch = "^main$"
        }
    }

    service_account = "projects/${var.project_id}/serviceAccounts/${local.compute_sa}"

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

# Migration preview trigger (runs on PRs)
resource "google_cloudbuild_trigger" "migration_preview" {
    name        = "migration-preview"
    description = "Preview database migrations on pull requests"

    github {
        owner = var.github_owner
        name  = var.github_repo

        pull_request {
            branch          = "^main$"
            comment_control = "COMMENTS_ENABLED_FOR_EXTERNAL_CONTRIBUTORS_ONLY"
        }
    }

    service_account = "projects/${var.project_id}/serviceAccounts/${local.compute_sa}"

    filename = "cloudbuild-preview.yaml"

    include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

    substitutions = {
        _CLOUD_SQL_INSTANCE = google_sql_database_instance.lutia.connection_name
        _DATABASE_URL       = var.database_url
    }
}
