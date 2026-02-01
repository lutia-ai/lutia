output "cloud_run_url" {
    description = "Cloud Run service URL"
    value       = google_cloud_run_v2_service.lutia_prod.uri
}

output "cloud_sql_connection_name" {
    description = "Cloud SQL connection name"
    value       = google_sql_database_instance.lutia.connection_name
}

output "cloud_sql_ip_address" {
    description = "Cloud SQL public IP address"
    value       = google_sql_database_instance.lutia.ip_address[0].ip_address
}

output "artifact_registry_url" {
    description = "Artifact Registry repository URL"
    value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "cloudbuild_service_account" {
    description = "Cloud Build service account email"
    value       = local.cloudbuild_sa
}

output "cloud_run_service_account" {
    description = "Cloud Run service account email"
    value       = local.compute_sa
}
