FROM node:lts AS build

WORKDIR /app

COPY . .

RUN npm install typescript@4.0.5 -g --silent
RUN npm install
RUN npm run build

FROM node:lts AS container
WORKDIR /dist

COPY --from=build /app /dist/
COPY --from=build /app/package*.json /dist/
COPY --from=build /app/tsconfig.json /dist/

RUN npm install
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]