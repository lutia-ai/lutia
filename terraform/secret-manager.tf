# Enable Secret Manager API
resource "google_project_service" "secretmanager" {
    service = "secretmanager.googleapis.com"

    disable_on_destroy = false
}

# Create secrets (without values - will be manually set)
resource "google_secret_manager_secret" "database_url" {
    secret_id = "database-url"

    replication {
        auto {}
    }

    depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret" "openai_api_key" {
    secret_id = "openai-api-key"

    replication {
        auto {}
    }

    depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret" "anthropic_api_key" {
    secret_id = "anthropic-api-key"

    replication {
        auto {}
    }

    depends_on = [google_project_service.secretmanager]
}

resource "google_secret_manager_secret" "google_gemini_api_key" {
    secret_id = "google-gemini-api-key"

    replication {
        auto {}
    }

    depends_on = [google_project_service.secretmanager]
}

# Grant Cloud Run access to secrets
resource "google_secret_manager_secret_iam_member" "cloudrun_database_access" {
    secret_id = google_secret_manager_secret.database_url.id
    role      = "roles/secretmanager.secretAccessor"
    member    = "serviceAccount:${local.compute_sa}"
}

resource "google_secret_manager_secret_iam_member" "cloudrun_openai_access" {
    secret_id = google_secret_manager_secret.openai_api_key.id
    role      = "roles/secretmanager.secretAccessor"
    member    = "serviceAccount:${local.compute_sa}"
}

resource "google_secret_manager_secret_iam_member" "cloudrun_anthropic_access" {
    secret_id = google_secret_manager_secret.anthropic_api_key.id
    role      = "roles/secretmanager.secretAccessor"
    member    = "serviceAccount:${local.compute_sa}"
}

resource "google_secret_manager_secret_iam_member" "cloudrun_gemini_access" {
    secret_id = google_secret_manager_secret.google_gemini_api_key.id
    role      = "roles/secretmanager.secretAccessor"
    member    = "serviceAccount:${local.compute_sa}"
}

# Note: To use these secrets in Cloud Run, you would update cloud-run.tf to use:
# env {
#   name = "DATABASE_URL"
#   value_source {
#     secret_key_ref {
#       secret  = google_secret_manager_secret.database_url.secret_id
#       version = "latest"
#     }
#   }
# }
