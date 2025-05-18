# Lutia.ai - AI Chat Aggregation Platform

Lutia.ai is a powerful AI chat aggregation platform that allows users to interact with multiple AI models through a unified interface. The platform supports various AI providers including OpenAI, Anthropic, Google, xAI, and DeepSeek.

## Features

- **Multi-Model Support**: Access to a wide range of AI models including:
  - GPT-4, GPT-3.5, and other OpenAI models
  - Claude 3 (Opus, Sonnet, Haiku)
  - Google's Gemini models
  - xAI's Grok models
  - And more!

- **Conversation Management**
  - Organize conversations in folders
  - Hierarchical folder structure
  - Conversation history tracking
  - Message threading and references

- **User Management**
  - Secure authentication system
  - Email verification
  - OAuth integration
  - Password reset functionality

- **Billing & Usage**
  - Pay-as-you-go and premium tiers
  - Usage tracking and cost monitoring
  - Stripe integration for payments
  - Balance management

- **Advanced Features**
  - File upload and processing
  - Image generation support
  - Context window management
  - Customizable user settings

## Tech Stack

- **Frontend**: SvelteKit, TypeScript
- **Backend**: Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js
- **Payment Processing**: Stripe
- **Testing**: Vitest, Testing Library
- **Styling**: SASS
- **Build Tools**: Vite

## Prerequisites

- Node.js (Latest LTS version recommended)
- PostgreSQL
- npm or yarn
- Stripe account (for payment processing)

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/lutia-ai/lutia
cd lutia
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/lutia"
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key"
# Add other required environment variables
```

4. Set up the database:
```bash
npm run prisma:migrate
```

5. Start the development server:
```bash
npm run dev
```

## Database Management with Prisma

### Migrations

- Create a new migration:
```bash
npm run prisma:migrate "migration_name"
```

- Apply pending migrations:
```bash
npx prisma migrate deploy
```

- Reset the database (drops all data):
```bash
npx prisma migrate reset
```

- View migration history:
```bash
npx prisma migrate status
```

### Database Schema

- Generate Prisma Client after schema changes:
```bash
npx prisma generate
```

- View database schema:
```bash
npx prisma db pull
```

- Push schema changes to database (without migrations):
```bash
npx prisma db push
```

### Database Studio

- Open Prisma Studio to view and edit data:
```bash
npx prisma studio
```

### Common Issues

- If you need to rollback a migration:
  1. Delete the migration file from `prisma/migrations`
  2. Run `npx prisma migrate reset` to reset the database
  3. Create a new migration with the desired changes

- If you encounter "database is not empty" errors:
  - Use `npx prisma migrate reset --force` to force reset
  - Or manually drop the database and recreate it

## Development

- Start development server:
```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

- Run tests:
```bash
npm run test           # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Run tests with UI
npm run test:coverage # Run tests with coverage
```

- Code quality:
```bash
npm run lint    # Run linter
npm run format  # Format code
```

## Building for Production

1. Create a production build:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

## Docker Support

The project includes Docker support for easy deployment:

```bash
# Build the Docker image
docker build -t lutia .

# Run the container
docker run -p 3000:3000 lutia
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Licensing

Lutia.ai is available under a dual license:

- **Free for personal and non-commercial use** under the GNU AGPLv3
- **Commercial license required for business use**

See the [LICENSE](LICENSE) file for details.

## Support

For commercial licensing inquiries, please contact: [joe@lutia.ai]

## Security

If you discover any security-related issues, please email [joe@lutia.ai] instead of using the issue tracker.