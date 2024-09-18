# build stage
FROM node:18-alpine as build

WORKDIR /app

# copy everything
COPY . .

# install dependencies
RUN npm ci

# build the SvelteKit app
RUN npm run build

# Copy prisma schema
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# run stage, to separate it from the build stage, to save disk storage
FROM node:18-alpine

WORKDIR /app

# copy package.json and package-lock.json
COPY --from=build /app/package.json /app/package-lock.json ./

# install production dependencies
RUN npm ci --omit=dev

# copy the built app from the build stage
COPY --from=build /app/build ./build

# expose the app's port
EXPOSE 3000

# run the server
CMD ["node", "./build"]