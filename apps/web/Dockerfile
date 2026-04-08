FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile=false
COPY apps/web ./apps/web
RUN pnpm --filter web build
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]
