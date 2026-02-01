locals {
    cloudbuild_sa = "${var.project_number}@cloudbuild.gserviceaccount.com"
    compute_sa    = "${var.project_number}-compute@developer.gserviceaccount.com"
}

# Cloud Build IAM Roles
resource "google_project_iam_member" "cloudbuild_sql_client" {
    project = var.project_id
    role    = "roles/cloudsql.client"
    member  = "serviceAccount:${local.cloudbuild_sa}"
}

resource "google_project_iam_member" "cloudbuild_run_admin" {
    project = var.project_id
    role    = "roles/run.admin"
    member  = "serviceAccount:${local.cloudbuild_sa}"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
    project = var.project_id
    role    = "roles/iam.serviceAccountUser"
    member  = "serviceAccount:${local.cloudbuild_sa}"
}

resource "google_project_iam_member" "cloudbuild_ar_writer" {
    project = var.project_id
    role    = "roles/artifactregistry.writer"
    member  = "serviceAccount:${local.cloudbuild_sa}"
}

# Note: cloudbuild.builds.builder already exists, managed by GCP
