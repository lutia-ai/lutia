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

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "build"]