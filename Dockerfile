# Use Node.js as the base image
FROM node:18 as build

# Set the working directory
WORKDIR /app

COPY package*.json ./
COPY package-lock.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-slim
RUN apt update && apt install libssl-dev dumb-init -y --no-install-recommends
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/.env .env
COPY --from=build /app/package.json .
COPY --from=build /app/package-lock.json .
COPY --from=build /app/node_modules/.prisma/client ./node_modules/.prisma/client

RUN npm install --omit=dev

ENV NODE_ENV production
EXPOSE 3000

# Start the application
CMD ["node", "dist"]