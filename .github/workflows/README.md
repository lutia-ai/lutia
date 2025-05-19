# GitHub Actions Workflows

This directory contains GitHub Actions workflow files for continuous integration, testing, and deployment processes.

## Workflow Files

### 1. CI Workflow (`ci.yml`)
- **Triggers**: On push to `main` and on all pull requests
- **Purpose**: Runs linting and TypeScript type checking
- **Tasks**:
  - Linting using ESLint & Prettier
  - TypeScript type checking

### 2. Test Workflow (`test.yml`)
- **Triggers**: On push to `main` and on all pull requests
- **Purpose**: Runs unit tests with coverage reporting
- **Tasks**:
  - Executes test suite with Vitest
  - Generates and uploads coverage reports

### 3. Build and Deploy Workflow (`deploy.yml`)
- **Triggers**: On push to `main` and manual triggers
- **Purpose**: Builds the application and prepares for deployment
- **Tasks**:
  - Builds the application
  - Uploads build artifacts
  - Has a commented out deployment job to be configured later

### 4. Prisma Schema Validation (`prisma-validate.yml`)
- **Triggers**: On pull requests that change Prisma schema files
- **Purpose**: Validates Prisma schema changes
- **Tasks**:
  - Runs Prisma validation to ensure schema integrity

### 5. Pull Request Checks (`pull-request.yml`)
- **Triggers**: When pull requests are opened, synchronized, or reopened
- **Purpose**: Comprehensive PR validation
- **Tasks**:
  - Runs linting and type checking
  - Executes all tests
  - Builds the application
  - Reports overall status

## Usage

These workflows run automatically based on their triggers. No manual action is required for most operations.

For manual deployment, use the "Run workflow" button in the GitHub Actions UI for the deploy workflow.

## Setting Up Codecov

To use the coverage reporting feature with Codecov:

1. Sign up for [Codecov](https://codecov.io/) and connect your GitHub repository
2. Add a `CODECOV_TOKEN` secret in your GitHub repository settings
3. The test workflow will automatically upload coverage reports

## Customization

- Modify the Node.js version in the workflows if needed
- Update deployment steps in `deploy.yml` when you're ready to add deployment configuration
- Add additional steps as needed for your specific project requirements 