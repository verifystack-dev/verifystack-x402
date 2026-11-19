FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY bin/ ./bin/

ENV NODE_ENV=production

ENTRYPOINT ["node"]
CMD ["bin/verifystack-mcp.mjs"]
