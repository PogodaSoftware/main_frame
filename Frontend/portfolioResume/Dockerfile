FROM node:22-alpine3.21 AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

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


