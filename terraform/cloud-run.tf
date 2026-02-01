resource "google_cloud_run_v2_service" "lutia_prod" {
    name     = var.service_name
    location = var.region

    template {
        service_account = local.compute_sa

        timeout = "300s"

        scaling {
            max_instance_count = 100
        }

        containers {
            image = "${var.region}-docker.pkg.dev/${var.project_id}/cloud-run-source-deploy/lutia/${var.service_name}:latest"

            resources {
                limits = {
                    cpu    = "1000m"
                    memory = "512Mi"
                }
                cpu_idle          = true
                startup_cpu_boost = true
            }

            ports {
                container_port = 8080
                name           = "http1"
            }

            startup_probe {
                timeout_seconds   = 240
                period_seconds    = 240
                failure_threshold = 1

                tcp_socket {
                    port = 8080
                }
            }

            # Environment variables
            env {
                name  = "DATABASE_URL"
                value = var.database_url
            }

            env {
                name  = "VITE_OPENAI_API_KEY"
                value = var.openai_api_key
            }

            env {
                name  = "VITE_ANTHROPIC_API_KEY"
                value = var.anthropic_api_key
            }

            env {
                name  = "VITE_GOOGLE_GEMINI_API_KEY"
                value = var.google_gemini_api_key
            }

            env {
                name  = "VITE_LLAMA_API_KEY"
                value = var.llama_api_key
            }

            env {
                name  = "SECRET_GOOGLE_CLIENT_ID"
                value = var.google_client_id
            }

            env {
                name  = "SECRET_GOOGLE_CLIENT_SECRET"
                value = var.google_client_secret
            }

            env {
                name  = "SECRET_XAI_API_KEY"
                value = var.xai_api_key
            }

            env {
                name  = "SECRET_DEEPSEEK_API_KEY"
                value = var.deepseek_api_key
            }

            env {
                name  = "SECRET_AUTH"
                value = var.secret_auth
            }

            env {
                name  = "SECRET_STRIPE_API_KEY"
                value = var.stripe_api_key
            }

            env {
                name  = "PUBLIC_STRIPE_API_KEY"
                value = var.stripe_public_key
            }

            env {
                name  = "BASE_URL"
                value = var.base_url
            }

            env {
                name  = "MAILJET_API_KEY"
                value = var.mailjet_api_key
            }

            env {
                name  = "MAILJET_SECRET_KEY"
                value = var.mailjet_secret_key
            }

            env {
                name  = "SECRET_RECAPTCHA_KEY"
                value = var.recaptcha_key
            }

            env {
                name  = "PUBLIC_RECAPTCHA_KEY"
                value = var.recaptcha_public_key
            }

            env {
                name  = "BODY_SIZE_LIMIT"
                value = "Infinity"
            }
        }
    }

    traffic {
        type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
        percent = 100
    }

    lifecycle {
        ignore_changes = [
            template[0].containers[0].image, # Managed by Cloud Build
            template[0].labels,              # Managed by Cloud Build
            labels,                          # Managed by Cloud Build
        ]
    }
}

# Allow unauthenticated access
resource "google_cloud_run_v2_service_iam_member" "public_access" {
    name     = google_cloud_run_v2_service.lutia_prod.name
    location = google_cloud_run_v2_service.lutia_prod.location
    role     = "roles/run.invoker"
    member   = "allUsers"
}
