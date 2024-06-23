FROM node:22 as build

WORKDIR /app

COPY . .

RUN npm install typescript@4.0.5 -g --silent
RUN npm install
RUN npm run build

FROM node:22 as container
WORKDIR /app

COPY --from=build /app/build ./dist 
COPY --from=build /app/build/package*.json ./
RUN npm install --only=prod 

EXPOSE 3000
CMD ["npm", "start"]