# --- сборка фронтенда ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Адрес сайта для canonical, Open Graph и sitemap в готовом HTML: docker build --build-arg VITE_SITE_URL=https://…
ARG VITE_SITE_URL=
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN npm run build

# --- рантайм: сервер + собранная статика ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY src/entities ./src/entities
# Каталог для заявок должен принадлежать node, иначе том создастся от root и запись упадёт с EACCES.
RUN mkdir -p -m 700 /app/data && chown node:node /app/data
USER node
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server/index.ts"]
