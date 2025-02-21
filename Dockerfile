# ---- Build ----
FROM node:20-alpine AS builder

LABEL org.opencontainers.image.title="ampcast" \
    org.opencontainers.image.description="A music player inspired by Winamp" \
    org.opencontainers.image.url="https://ampcast.app" \
    org.opencontainers.image.source="https://github.com/rekkyrosso/ampcast" \
    org.opencontainers.image.version="0.9.16" \
    org.opencontainers.image.licenses="GPLv3"

WORKDIR /app
COPY . /app

# install deps
RUN npm i

# build the web view
RUN npm run build:docker

# ---- Release ----
FROM node:20-alpine AS release
WORKDIR /app

# copy build
COPY --from=builder --chown=node:node /app/app/www ./app/www
COPY --from=builder --chown=node:node /app/server.js ./server.js
COPY --from=builder --chown=node:node /app/proxy-login.js ./proxy-login.js
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# don't run as root
USER node

EXPOSE 8000

# start app
CMD ["npm", "run", "start:docker"]
