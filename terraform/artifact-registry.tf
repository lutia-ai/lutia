resource "google_artifact_registry_repository" "docker_repo" {
    location      = var.region
    repository_id = "cloud-run-source-deploy"
    description   = "Docker repository for Cloud Run deployments"
    format        = "DOCKER"

    # Import existing repository
    lifecycle {
        prevent_destroy = true
    }
}
