resource "google_sql_database_instance" "lutia" {
    name             = "lutia"
    database_version = "POSTGRES_16"
    region           = var.region

    deletion_protection = true

    settings {
        tier              = "db-f1-micro"
        availability_type = "ZONAL"
        disk_type         = "PD_SSD"
        disk_size         = 10
        disk_autoresize   = true

        backup_configuration {
            enabled                        = true
            start_time                     = "02:00"
            point_in_time_recovery_enabled = true
            transaction_log_retention_days = 7
            backup_retention_settings {
                retained_backups = 7
                retention_unit   = "COUNT"
            }
        }

        ip_configuration {
            ipv4_enabled = true

            # WARNING: This allows public access from anywhere
            # Consider restricting to specific IPs or using Private IP
            authorized_networks {
                name  = "all"
                value = "0.0.0.0/0"
            }
        }

        location_preference {
            zone = "${var.region}-d"
        }

        maintenance_window {
            day          = 7 # Sunday (1=Monday, 7=Sunday)
            hour         = 0 # Midnight
            update_track = "canary"
        }
    }

    lifecycle {
        prevent_destroy = true # Extra safety - never destroy the database
    }
}

# Create the lutia-prod database
resource "google_sql_database" "lutia_prod" {
    name     = "lutia-prod"
    instance = google_sql_database_instance.lutia.name
}

# Backup instance (already exists, import only)
resource "google_sql_database_instance" "lutia_backup" {
    name             = "lutia-backup"
    database_version = "POSTGRES_16"
    region           = var.region

    deletion_protection = true

    # Minimal settings block (actual config will be imported)
    settings {
        tier = "db-f1-micro"
    }

    # Configuration will be imported
    lifecycle {
        prevent_destroy = true
        ignore_changes = [
            settings, # Managed separately
        ]
    }
}
