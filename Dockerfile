FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/client/dist ./client/dist
EXPOSE 47819
CMD ["npm", "run", "start", "-w", "server"]
