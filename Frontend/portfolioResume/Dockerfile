FROM node:23-alpine3.20 AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build --prod

FROM nginx:stable-alpine3.20-perl

COPY --from=build /app/dist/portfolio-resume-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

