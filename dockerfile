FROM node:22-alpine

RUN apk add --no-cache python3 make g++

RUN npm install -g pnpm

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm config set minimumReleaseAge 0 && \
    pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm rebuild argon2

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && pnpm run start:dev"]
