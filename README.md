# ESKILL Passport

ESKILL Passport adalah aplikasi manajemen Skill Passport UKK/LSP untuk sekolah. Aplikasi ini terdiri dari frontend React dan backend Go, dengan PostgreSQL sebagai database production.

## Kebutuhan Lokal

- Node.js 20 atau lebih baru
- Go 1.22 atau lebih baru
- PostgreSQL 14 atau lebih baru

Untuk production yang direkomendasikan, server cukup memiliki:

- Git
- Docker
- Docker Compose

## Menjalankan Lokal

1. Install dependency frontend:

   ```bash
   npm ci
   ```

2. Siapkan file environment:

   ```bash
   cp .env.example .env
   ```

3. Pastikan PostgreSQL berjalan dan database `esuk` tersedia.

4. Build frontend:

   ```bash
   npm run build
   ```

5. Jalankan backend:

   ```bash
   go run main.go
   ```

6. Buka aplikasi:

   ```text
   http://127.0.0.1:3007
   ```

## Build Production

Production paling mudah dijalankan dengan Docker. Lihat:

- [Panduan production](docs/production.md)
- [Panduan Docker](docs/docker.md)

Build manual tanpa Docker tetap bisa dilakukan:

```bash
npm ci
npm run build
go build -o esuk-server .
```

Jalankan:

```bash
./esuk-server
```

## File yang Tidak Masuk Git

Repo ini sengaja tidak menyimpan:

- `node_modules/`
- `dist/`
- `.env`
- binary `esuk-server*`
- `local-data/`
- upload dinamis di `uploads/`
- backup database di `backups/`

Logo default boleh disimpan di:

```text
uploads/logos/
```

Folder upload lain akan dibuat oleh aplikasi saat berjalan di server.

## Deploy Server Sekolah dengan Docker

1. Clone repo di server:

   ```bash
   git clone https://github.com/verysetiawan/eskill.git
   cd eskill
   ```

2. Buat konfigurasi production:

   ```bash
   cp .env.docker.example .env.docker
   nano .env.docker
   ```

3. Jalankan aplikasi dan PostgreSQL:

   ```bash
   docker compose --env-file .env.docker up -d --build
   ```

4. Buka aplikasi:

   ```text
   http://IP-SERVER:3007
   ```

5. Update aplikasi dari GitHub:

   ```bash
   git pull
   docker compose --env-file .env.docker up -d --build
   ```

Lihat panduan lengkap di [docs/production.md](docs/production.md).

Panduan Docker yang lebih detail tersedia di [docs/docker.md](docs/docker.md).
