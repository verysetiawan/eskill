# syntax=docker/dockerfile:1

FROM node:22-alpine AS frontend

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build


FROM golang:1.26.3-alpine AS backend

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY main.go main_test.go ./
COPY fonts ./fonts
COPY --from=frontend /app/dist ./dist

RUN CGO_ENABLED=0 GOOS=linux go build -o /out/esuk-server .


FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata su-exec \
  && addgroup -S app \
  && adduser -S app -G app

WORKDIR /app

COPY --from=backend /out/esuk-server ./esuk-server
COPY --from=backend /app/dist ./dist
COPY fonts ./fonts
COPY uploads/logos ./uploads/logos
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p uploads/logos \
  && chmod +x ./docker-entrypoint.sh \
  && chown -R app:app /app

ENV PORT=3007 \
  APP_URL=http://127.0.0.1:3007 \
  DB_HOST=postgres \
  DB_PORT=5432 \
  DB_USER=eskill \
  DB_NAME=eskill \
  DB_SSLMODE=disable \
  ALLOW_NO_DB=false \
  TZ=Asia/Jakarta

EXPOSE 3007

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["./esuk-server"]
