# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files first to leverage caching
COPY package*.json ./
COPY package-lock.json ./

# Use npm ci for faster, more reliable installs
RUN npm ci

# Copy the rest of the application code
COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine

RUN apk add --no-cache libssl1.1 dumb-init

WORKDIR /app

# Copy only necessary files from build stage
COPY --chown=node:node --from=build /app/build ./build
COPY --chown=node:node --from=build /app/package.json ./
COPY --chown=node:node --from=build /app/package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

COPY --chown=node:node --from=build /app/node_modules/.prisma/client  ./node_modules/.prisma/client

ENV NODE_ENV production
EXPOSE 3000

USER node

# Start the application
CMD ["dumb-init", "node", "build"]