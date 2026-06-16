# Panduan Production Server Sekolah

Panduan ini untuk menjalankan ESKILL Passport di server sekolah berbasis Linux.

## 1. Siapkan Paket Server

Install kebutuhan:

```bash
sudo apt update
sudo apt install -y git postgresql postgresql-contrib nginx
```

Install Node.js 20 dan Go sesuai panduan resmi distro/server yang digunakan.

## 2. Buat Database

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

## 3. Clone Repo

```bash
sudo mkdir -p /opt/eskill
sudo chown -R $USER:$USER /opt/eskill
git clone https://github.com/USERNAME/eskill-passport.git /opt/eskill
cd /opt/eskill
```

Ganti `USERNAME/eskill-passport` sesuai repo GitHub.

## 4. Siapkan Environment

```bash
sudo mkdir -p /etc/eskill
sudo cp .env.production.example /etc/eskill/eskill.env
sudo nano /etc/eskill/eskill.env
```

Isi:

- `APP_URL` dengan domain sekolah
- `JWT_SECRET` dengan teks random panjang
- `DB_PASSWORD` sesuai password database

## 5. Build Aplikasi

```bash
npm ci
npm run build
go build -o esuk-server .
mkdir -p uploads
```

## 6. Pasang Systemd Service

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

## 7. Update dari GitHub

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

## 8. Backup

Backup yang penting:

- Database PostgreSQL
- Folder `uploads/`
- File environment `/etc/eskill/eskill.env`

Contoh backup database:

```bash
pg_dump -U eskill -h 127.0.0.1 eskill > eskill-backup.sql
```
