# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
COPY package-lock.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine as deploy

RUN apt update && apt install libssl-dev dumb-init -y --no-install-recommends

WORKDIR /app

COPY --chown=node:node --from=build /app/build ./build
COPY --chown=node:node --from=build /app/package.json ./
COPY --chown=node:node --from=build /app/package-lock.json ./
RUN npm install --omit=dev
COPY --chown=node:node --from=build /app/node_modules/.prisma/client  ./node_modules/.prisma/client

ENV NODE_ENV production
EXPOSE 3000

USER node

# Start the application
CMD ["node", "build"]