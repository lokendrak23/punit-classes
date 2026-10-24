FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY index.html ./
COPY src ./src
COPY server ./server
ENV NODE_ENV=production
EXPOSE 10000
USER node
CMD ["node", "server/index.mjs"]
