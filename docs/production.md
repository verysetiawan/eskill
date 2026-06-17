# Panduan Production Server Sekolah

Panduan ini untuk menjalankan ESKILL Passport di server sekolah berbasis Linux.

Rekomendasi utama adalah menggunakan Docker karena:

- aplikasi dan PostgreSQL bisa jalan dalam paket yang rapi;
- update dari GitHub lebih mudah;
- tidak perlu memasang Node.js dan Go langsung di server;
- cocok jika server akan menjalankan lebih dari satu aplikasi.

Jika server sekolah sudah memiliki Docker, ikuti bagian Docker di bawah ini. Cara manual tanpa Docker tetap disediakan di bagian akhir.

## A. Production dengan Docker

### 1. Siapkan Server

Install kebutuhan dasar:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

Pastikan Docker berjalan:

```bash
docker --version
docker compose version
```

### 2. Clone Repo dari GitHub

```bash
sudo mkdir -p /opt/eskill
sudo chown -R $USER:$USER /opt/eskill
git clone https://github.com/verysetiawan/eskill.git /opt/eskill
cd /opt/eskill
```

Jika repo GitHub masih private, login GitHub dulu di server atau gunakan Personal Access Token sesuai pengaturan GitHub.

### 3. Buat File Environment Production

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

Contoh isi:

```env
APP_PORT=3007
APP_URL=https://eskill.namasekolah.sch.id
JWT_SECRET=ganti-dengan-secret-random-minimal-32-karakter
POSTGRES_DB=eskill
POSTGRES_USER=eskill
POSTGRES_PASSWORD=ganti-dengan-password-database-kuat
TZ=Asia/Jakarta
```

Catatan penting:

- `.env.docker` tidak boleh diunggah ke GitHub.
- Gunakan password database yang kuat.
- Gunakan `APP_URL` sesuai domain production.

### 4. Jalankan Aplikasi

```bash
docker compose --env-file .env.docker up -d --build
```

Cek status:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f app
```

Aplikasi berjalan di:

```text
http://IP-SERVER:3007
```

Jika memakai domain, arahkan reverse proxy ke port tersebut.

### 5. Restore Database dari Laptop ke Server

Jika kamu ingin membawa data dari laptop agar tidak mengisi ulang dari awal, buat backup dari PostgreSQL lokal lalu restore di server.

Contoh restore jika file backup bernama `eskill-xxxx.dump` sudah ada di folder repo server:

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

File backup tidak disarankan masuk GitHub. Simpan di server, flashdisk, NAS, atau penyimpanan backup sekolah.

### 6. Backup Database di Server

```bash
mkdir -p backups
TS=$(date +%Y%m%d-%H%M%S)
docker compose --env-file .env.docker exec -T postgres pg_dump \
  -U eskill \
  -d eskill \
  -Fc > "backups/eskill-$TS.dump"
```

Folder `backups/` sudah diabaikan oleh Git.

### 7. Update Aplikasi dari GitHub

Saat ada perubahan dari laptop yang sudah di-push ke GitHub:

```bash
cd /opt/eskill
git pull
docker compose --env-file .env.docker up -d --build
```

Jika ingin melihat log setelah update:

```bash
docker compose --env-file .env.docker logs -f app
```

### 8. Menjalankan Dua Aplikasi di Server Sama

Gunakan port, database, dan user database yang berbeda.

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

Domain bisa diarahkan lewat Nginx/Caddy:

```text
eskill.sekolah.sch.id -> 127.0.0.1:3007
app2.sekolah.sch.id   -> 127.0.0.1:3008
```

Panduan Docker ringkas juga tersedia di [docker.md](docker.md).

## B. Production Manual Tanpa Docker

## 1. Siapkan Paket Server

Install kebutuhan:

```bash
sudo apt update
sudo apt install -y git postgresql postgresql-contrib nginx
```

Install Node.js 20 dan Go sesuai panduan resmi distro/server yang digunakan.

## 2. Buat Database Manual

Masuk ke PostgreSQL:

```bash
sudo -u postgres psql
```

Buat user dan database:

```sql
CREATE USER eskill WITH PASSWORD 'ganti-dengan-password-kuat';
CREATE DATABASE eskill OWNER eskill;
\q
```

Backend Go akan membuat/memperbarui tabel otomatis saat pertama dijalankan.

## 3. Clone Repo Manual

```bash
sudo mkdir -p /opt/eskill
sudo chown -R $USER:$USER /opt/eskill
git clone https://github.com/verysetiawan/eskill.git /opt/eskill
cd /opt/eskill
```

## 4. Siapkan Environment Manual

```bash
sudo mkdir -p /etc/eskill
sudo cp .env.production.example /etc/eskill/eskill.env
sudo nano /etc/eskill/eskill.env
```

Isi:

- `APP_URL` dengan domain sekolah
- `JWT_SECRET` dengan teks random panjang
- `DB_PASSWORD` sesuai password database

## 5. Build Aplikasi Manual

```bash
npm ci
npm run build
go build -o esuk-server .
mkdir -p uploads
```

## 6. Pasang Systemd Service Manual

Salin contoh service:

```bash
sudo cp docs/eskill.service.example /etc/systemd/system/eskill.service
sudo nano /etc/systemd/system/eskill.service
```

Pastikan `User`, `WorkingDirectory`, dan path `EnvironmentFile` sudah benar.

Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable eskill
sudo systemctl start eskill
sudo systemctl status eskill
```

## 7. Update Manual dari GitHub

Jika ada update aplikasi:

```bash
cd /opt/eskill
git pull
npm ci
npm run build
go build -o esuk-server .
sudo systemctl restart eskill
```

Atau gunakan:

```bash
./scripts/deploy-production.sh
```

## 8. Backup Manual

Backup yang penting:

- Database PostgreSQL
- Folder `uploads/`
- File environment `/etc/eskill/eskill.env`

Contoh backup database:

```bash
pg_dump -U eskill -h 127.0.0.1 eskill > eskill-backup.sql
```
