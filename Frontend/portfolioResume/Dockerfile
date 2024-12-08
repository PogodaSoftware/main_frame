# FROM node:18-alpine AS build

# WORKDIR /

# COPY package.json package-lock.json ./
# RUN npm install

# COPY . .
# RUN npm run build --prod


# FROM nginx:alpine

# COPY --from=build /dist/portfolio-resume-frontend /usr/share/nginx/html

# EXPOSE 80

# Stage 1: Build
FROM node:18-alpine AS build

# Install build tools for Alpine (optional but necessary for some npm packages)
RUN apk add --no-cache python3 make g++

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Ensure the Angular workspace is recognized and build the application
RUN npm run build --prod

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built files to the Nginx HTML directory
COPY --from=build /app/dist/portfolio-resume-frontend /usr/share/nginx/html

# Expose the default Nginx port
EXPOSE 8000
