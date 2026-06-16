# ESKILL Passport

ESKILL Passport adalah aplikasi manajemen Skill Passport UKK/LSP untuk sekolah. Aplikasi ini terdiri dari frontend React dan backend Go, dengan PostgreSQL sebagai database production.

## Kebutuhan

- Node.js 20 atau lebih baru
- Go 1.22 atau lebih baru
- PostgreSQL 14 atau lebih baru

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

Logo default boleh disimpan di:

```text
uploads/logos/
```

Folder upload lain akan dibuat oleh aplikasi saat berjalan di server.

## Deploy Server Sekolah

Lihat panduan di [docs/production.md](docs/production.md).
