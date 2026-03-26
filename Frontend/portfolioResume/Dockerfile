FROM node:22-alpine3.21 AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

# Updated 2025-11-12: Angular 19.2.15, removed unused dependencies
# - Removed: @angular/forms, @angular/animations, Karma, Jasmine
# - Security: Fixed high severity SSR vulnerability
# - Result: 308 fewer packages (-27% reduction)
COPY package.json package-lock.json ./
RUN npm install && \
    npm cache clean --force && \
    rm -rf /root/.npm && \
    rm -rf /tmp/*

COPY . .

RUN npm run build && \
    npm cache clean --force && \
    rm -rf /root/.npm && \
    rm -rf node_modules && \
    rm -rf /tmp/*

FROM nginx:stable-alpine3.20-perl

COPY --from=build /app/dist/portfolio-resume-frontend /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf


