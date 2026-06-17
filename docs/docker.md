# Deploy dengan Docker

Panduan ini cocok jika server sekolah sudah memiliki Docker dan Docker Compose.

## 1. Clone Repo

```bash
git clone https://github.com/USERNAME/eskill-passport.git
cd eskill-passport
```

Ganti `USERNAME/eskill-passport` sesuai repo GitHub.

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

## 6. Update dari GitHub

```bash
git pull
docker compose --env-file .env.docker up -d --build
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
