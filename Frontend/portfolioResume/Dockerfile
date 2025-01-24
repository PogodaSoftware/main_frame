FROM node:22-alpine3.21 AS build

# Install necessary packages
RUN apk add --no-cache python3 make g++

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install && \
    npm cache clean --force && \
    rm -rf /root/.npm && \
    rm -rf /tmp/*

# Copy the rest of the application code
COPY . .

# Build the application and clean up
RUN npm run build && \
    npm cache clean --force && \
    rm -rf /root/.npm && \
    rm -rf node_modules && \
    rm -rf /tmp/*

# Final Stage
FROM nginx:stable-alpine3.20-perl

# Copy the built application to the Nginx HTML directory
COPY --from=build /app/dist/portfolio-resume-frontend /usr/share/nginx/html

# Copy the Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# FROM node:22-alpine3.21 AS build

# RUN apk add --no-cache python3 make g++


# WORKDIR /app

# COPY package.json package-lock.json ./


# RUN npm install && \
#     npm cache clean --force && \
#     rm -rf /root/.npm
    


# COPY . .

# RUN npm run build && \
#     npm cache clean --force && \
#     rm -rf /root/.npm && \
#     rm -rf node_modules
  

# FROM nginx:stable-alpine3.20-perl

# COPY --from=build /app/dist/portfolio-resume-frontend /usr/share/nginx/html

# COPY nginx.conf /etc/nginx/conf.d/default.conf

