FROM node:22-alpine


WORKDIR /app

COPY package*.json ./

RUN npm install -g @angular/cli && npm install
RUN npm install @angular-devkit/build-angular
RUN npm install -g curl

RUN  npm update

# EXPOSE 4200 49153

CMD ["npm", "start"]