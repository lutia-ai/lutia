variable "project_id" {
    description = "GCP Project ID"
    type        = string
    default     = "lutia-430919"
}

variable "project_number" {
    description = "GCP Project Number"
    type        = string
    default     = "916876285526"
}

variable "region" {
    description = "Default GCP region"
    type        = string
    default     = "europe-west1"
}

variable "service_name" {
    description = "Cloud Run service name"
    type        = string
    default     = "lutia-prod"
}

variable "github_owner" {
    description = "GitHub repository owner"
    type        = string
    default     = "lutia-ai"
}

variable "github_repo" {
    description = "GitHub repository name"
    type        = string
    default     = "lutia"
}

variable "database_url" {
    description = "Database connection string"
    type        = string
    sensitive   = true
}

# API Keys - sensitive variables
variable "openai_api_key" {
    description = "OpenAI API Key"
    type        = string
    sensitive   = true
}

variable "anthropic_api_key" {
    description = "Anthropic API Key"
    type        = string
    sensitive   = true
}

variable "google_gemini_api_key" {
    description = "Google Gemini API Key"
    type        = string
    sensitive   = true
}

variable "llama_api_key" {
    description = "Llama API Key"
    type        = string
    sensitive   = true
}

variable "google_client_id" {
    description = "Google OAuth Client ID"
    type        = string
    sensitive   = true
}

variable "google_client_secret" {
    description = "Google OAuth Client Secret"
    type        = string
    sensitive   = true
}

variable "xai_api_key" {
    description = "xAI API Key"
    type        = string
    sensitive   = true
}

variable "deepseek_api_key" {
    description = "DeepSeek API Key"
    type        = string
    sensitive   = true
}

variable "secret_auth" {
    description = "Auth secret"
    type        = string
    sensitive   = true
}

variable "stripe_api_key" {
    description = "Stripe API Key"
    type        = string
    sensitive   = true
}

variable "stripe_public_key" {
    description = "Stripe Public Key"
    type        = string
    sensitive   = true
}

variable "mailjet_api_key" {
    description = "Mailjet API Key"
    type        = string
    sensitive   = true
}

variable "mailjet_secret_key" {
    description = "Mailjet Secret Key"
    type        = string
    sensitive   = true
}

variable "recaptcha_key" {
    description = "reCAPTCHA Secret Key"
    type        = string
    sensitive   = true
}

variable "recaptcha_public_key" {
    description = "reCAPTCHA Public Key"
    type        = string
}

variable "base_url" {
    description = "Base URL for the application"
    type        = string
    default     = "https://lutia.ai"
}
