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
Go to the create folder and run the following command to create necessary tables
```bash
npx tsx src/lib/db/create/createTable.ts
```
