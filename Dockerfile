# Single-stage image: keeps devDependencies (tsx, dotenv) in the final image
# on purpose, so `npm run seed:super-admin` can be run inside the running
# container (via `docker exec`) without a separate build stage. This app is
# small enough that image size isn't worth the extra complexity of a
# multi-stage/standalone build.
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies first so this layer is cached unless package.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Local-disk file storage (see lib/storage.ts) -- mount a Dokploy volume at
# this exact path so templates/photos/certificates/Excel files survive
# redeploys instead of living only in this throwaway container layer.
RUN mkdir -p /app/uploads

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
