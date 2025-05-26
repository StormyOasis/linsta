FROM node:22 as build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 80

ENV PORT=80

CMD ["npm", "run", "start"]