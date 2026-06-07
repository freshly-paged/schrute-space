FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
RUN npm run build

ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
