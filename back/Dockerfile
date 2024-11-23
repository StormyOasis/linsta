FROM node:22 AS build

WORKDIR /app

COPY . .

RUN npm install typescript@4.0.5 -g --silent
RUN npm install
RUN npm run build

FROM node:22 AS container
WORKDIR /dist

COPY --from=build /app /dist/
COPY --from=build /app/package*.json /dist/
COPY --from=build /app/tsconfig.json /dist/

RUN npm install

EXPOSE 3001
CMD ["npm", "start"]