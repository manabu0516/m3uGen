FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# エントリーポイントを指定
CMD ["node", "src/index.js", "/app/configure.json"]
