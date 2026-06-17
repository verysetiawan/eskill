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

RUN apk add --no-cache ca-certificates tzdata \
  && addgroup -S app \
  && adduser -S app -G app

WORKDIR /app

COPY --from=backend /out/esuk-server ./esuk-server
COPY --from=backend /app/dist ./dist
COPY fonts ./fonts
COPY uploads/logos ./uploads/logos

RUN mkdir -p uploads \
  && chown -R app:app /app

USER app

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

CMD ["./esuk-server"]
