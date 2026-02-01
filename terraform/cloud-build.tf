# Migration Preview Trigger (runs on PRs)
resource "google_cloudbuild_trigger" "migration_preview" {
    name     = "migration-preview-v2"
    location = "global"

    github {
        owner = var.github_owner
        name  = var.github_repo

        pull_request {
            branch = "^main$"
        }
    }

    filename = "cloudbuild-preview.yaml"

    include_build_logs = "INCLUDE_BUILD_LOGS_WITH_STATUS"

    substitutions = {
        _CLOUD_SQL_INSTANCE = google_sql_database_instance.lutia.connection_name
        _DATABASE_URL       = var.database_url
    }

    lifecycle {
        ignore_changes = [
            service_account,
            github[0].pull_request[0].comment_control,
            tags
        ]
    }
}

# Deploy trigger (runs on push to main)
resource "google_cloudbuild_trigger" "main_branch" {
    name     = "lutia-prod-main-deploy-v2"
    location = "global"

    github {
        owner = var.github_owner
        name  = var.github_repo

        push {
            branch = "^main$"
        }
    }

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

    lifecycle {
        ignore_changes = [
            service_account,
            tags
        ]
    }
}
