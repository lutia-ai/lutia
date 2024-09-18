## Developing

start development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

## Create PostgreSQL tables

Runs prisma migrate command to update db based on prisma schema

```bash
npm run prisma:migrate MigrationName
```
