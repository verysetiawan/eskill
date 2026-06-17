# Deploy dengan Docker

Panduan ini cocok jika server sekolah sudah memiliki Docker dan Docker Compose. Ini adalah cara production yang direkomendasikan untuk ESKILL Passport.

Docker akan menjalankan dua layanan:

- `app`: aplikasi ESKILL Passport.
- `postgres`: database PostgreSQL.

## 1. Clone Repo

```bash
git clone https://github.com/verysetiawan/eskill.git
cd eskill
```

## 2. Buat File Environment

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

Isi minimal:

```env
APP_PORT=3007
APP_URL=https://eskill.namasekolah.sch.id
JWT_SECRET=ganti-dengan-secret-random-minimal-32-karakter
POSTGRES_DB=eskill
POSTGRES_USER=eskill
POSTGRES_PASSWORD=ganti-dengan-password-database-kuat
TZ=Asia/Jakarta
```

File `.env.docker` tidak boleh diunggah ke GitHub.

Keterangan:

- `APP_PORT`: port yang dibuka di server.
- `APP_URL`: domain production.
- `JWT_SECRET`: kunci rahasia login, gunakan teks random panjang.
- `POSTGRES_PASSWORD`: password database production.

## 3. Jalankan Aplikasi

```bash
docker compose --env-file .env.docker up -d --build
```

Cek status:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app
```

Aplikasi akan tersedia di:

```text
http://IP-SERVER:3007
```

atau domain yang diarahkan oleh reverse proxy.

Jika ingin menghentikan aplikasi:

```bash
docker compose --env-file .env.docker down
```

## 4. Restore Database dari Backup

Jika kamu punya file backup `eskill-xxxx.dump`, salin ke server lalu jalankan:

```bash
docker compose --env-file .env.docker cp eskill-xxxx.dump postgres:/tmp/eskill.dump
docker compose --env-file .env.docker exec postgres pg_restore \
  -U eskill \
  -d eskill \
  --clean \
  --if-exists \
  /tmp/eskill.dump
docker compose --env-file .env.docker restart app
```

Jika nama database atau user di `.env.docker` kamu ubah, sesuaikan `-U eskill` dan `-d eskill`.

## 5. Backup Database di Server

```bash
mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
docker compose --env-file .env.docker exec -T postgres pg_dump \
  -U eskill \
  -d eskill \
  -Fc > "backups/eskill-$TS.dump"
```

Folder `backups/` tidak ikut GitHub.

Simpan file backup di tempat aman, misalnya storage server, NAS, flashdisk, atau cloud sekolah.

## 6. Update dari GitHub

```bash
git pull
docker compose --env-file .env.docker up -d --build
```

Perintah ini akan mengambil kode terbaru, membangun ulang aplikasi, lalu menjalankan container baru tanpa menghapus volume database.

Jika ingin melihat log:

```bash
docker compose --env-file .env.docker logs -f app
```

## 7. Dua Aplikasi di Server yang Sama

Jika server memiliki dua aplikasi web, gunakan port berbeda.

Contoh ESKILL:

```env
APP_PORT=3007
POSTGRES_DB=eskill
POSTGRES_USER=eskill
```

Contoh aplikasi kedua:

```env
APP_PORT=3008
POSTGRES_DB=app_kedua
POSTGRES_USER=app_kedua
```

Reverse proxy seperti Nginx/Caddy bisa mengarahkan:

```text
eskill.sekolah.sch.id -> 127.0.0.1:3007
app2.sekolah.sch.id   -> 127.0.0.1:3008
```
