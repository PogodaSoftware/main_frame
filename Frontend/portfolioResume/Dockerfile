# FROM node:22-alpine


# WORKDIR /app

# COPY package*.json ./

# RUN npm install -g @angular/cli && npm install
# RUN npm install @angular-devkit/build-angular
# RUN npm install -g curl

# RUN  npm update

# # EXPOSE 4200 49153

# CMD ["npm", "start"]

# Stage 1: Build the Angular app
FROM node:18-alpine AS build

WORKDIR /

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build --prod

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# COPY --from=build /dist/your-app-name /usr/share/nginx/html

EXPOSE 80