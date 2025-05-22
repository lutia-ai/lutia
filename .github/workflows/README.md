# GitHub Actions Workflows

This directory contains GitHub Actions workflow files for continuous integration and testing.

## Workflow Files

### 1. CI Workflow (`ci.yml`)
- **Triggers**: On push to `main`
- **Purpose**: Runs linting and TypeScript type checking
- **Tasks**:
  - Linting using ESLint & Prettier
  - TypeScript type checking

### 2. Test Workflow (`test.yml`)
- **Triggers**: On push to `main`
- **Purpose**: Runs unit tests with coverage reporting
- **Tasks**:
  - Executes test suite with Vitest
  - Generates and uploads coverage reports

### 3. Pull Request Checks (`pull-request.yml`)
- **Triggers**: When pull requests are opened, synchronized, or reopened
- **Purpose**: Comprehensive PR validation (all checks for PRs)
- **Tasks**:
  - Runs linting and type checking
  - Executes all tests
  - Builds the application
  - Reports overall status

### 4. Prisma Schema Validation (`prisma-validate.yml`)
- **Triggers**: On pull requests that change Prisma schema files
- **Purpose**: Validates Prisma schema changes
- **Tasks**:
  - Runs Prisma validation to ensure schema integrity

## Usage

These workflows run automatically based on their triggers. No manual action is required for most operations.

## Customization

- Modify the Node.js version in the workflows if needed
- Add additional steps as needed for your specific project requirements 