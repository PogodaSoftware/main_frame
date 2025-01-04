FROM node:18-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

RUN npm run build --prod

FROM nginx:alpine

COPY --from=build /app/dist/portfolio-resume-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

