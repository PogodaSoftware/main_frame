FROM node:22-alpine3.21 AS build

WORKDIR /app

COPY package.json package-lock.json ./


RUN npm install && \
    npm cache clean --force


COPY . .

RUN npm run build 


FROM nginx:stable-alpine3.20-perl

COPY --from=build /app/dist/portfolio-resume-frontend /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

