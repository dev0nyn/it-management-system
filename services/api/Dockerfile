FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/api/package.json ./services/api/
RUN pnpm install --frozen-lockfile=false
COPY services/api ./services/api
COPY tsconfig.json ./
RUN pnpm --filter @it-management/api build
EXPOSE 3001
CMD ["pnpm", "--filter", "@it-management/api", "start"]
