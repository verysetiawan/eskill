package main

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/lib/pq"
	"github.com/signintech/gopdf"
	"github.com/skip2/go-qrcode"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

// JWT Claims struct
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type DBUser struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	Password string `json:"password,omitempty"`
	Role     string `json:"role"`
}

var jwtKey = []byte("esuk-default-jwt-secret-key-123456789")
var db *sql.DB
var activityLogMutex sync.Mutex

func main() {
	// Load Env
	if envKey := os.Getenv("JWT_SECRET"); envKey != "" {
		jwtKey = []byte(envKey)
	}

	// Initialize Fonts
	ensureFonts()

	// Connect to Database
	var err error
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		pass := getEnv("DB_PASSWORD", "postgres")
		name := getEnv("DB_NAME", "esuk")
		ssl := getEnv("DB_SSLMODE", "disable")
		connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", host, port, user, pass, name, ssl)
	}

	log.Println("Connecting to PostgreSQL...")
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Wait and retry connection
	for i := 0; i < 5; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		log.Printf("Database not ready yet (retry %d/5): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		if getEnv("ALLOW_NO_DB", "false") == "true" {
			log.Printf("Database unavailable, continuing in no-db mode: %v", err)
		} else {
			log.Fatalf("Could not connect to database: %v", err)
		}
	}
	if err == nil {
		log.Println("Connected to PostgreSQL successfully.")
	}

	// Run migrations
	if err == nil {
		if err := initDB(db); err != nil {
			log.Fatalf("Database migration failed: %v", err)
		}
	}

	// Setup Server
	mux := http.NewServeMux()

	// Serve Static Uploads
	os.MkdirAll("uploads", 0755)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))

	// API Auth Routes
	mux.HandleFunc("/api/auth/login", handleLogin)
	mux.HandleFunc("/api/auth/session", handleSession)
	mux.HandleFunc("/api/auth/logout", handleLogout)
	mux.HandleFunc("/api/auth/password", handleOwnPasswordChange)
	mux.HandleFunc("/api/activity-logs", handleActivityLogs)

	// API Users Routes
	mux.HandleFunc("/api/users", handleUsers)
	mux.HandleFunc("/api/users/", handleUsersWithID)

	// Supabase Mock DB Router
	mux.HandleFunc("/api/db/user_roles", handleDbUserRoles)
	mux.HandleFunc("/api/db/students", handleDbStudents)
	mux.HandleFunc("/api/db/students/delete", handleDbStudentsDelete)
	mux.HandleFunc("/api/db/app_settings", handleDbAppSettings)

	// API File Upload
	mux.HandleFunc("/api/upload-image", handleUploadImage)

	// Excel Templates & Parsing
	mux.HandleFunc("/api/download-template", handleDownloadTemplate)
	mux.HandleFunc("/api/download-competency-template", handleDownloadCompetencyTemplate)
	mux.HandleFunc("/api/upload-excel", handleUploadExcel)
	mux.HandleFunc("/api/upload-competency-excel", handleUploadCompetencyExcel)

	// PDF Certificate Generator
	mux.HandleFunc("/api/generate-certificate", handleGenerateCertificate)

	// Health Check / Ping
	mux.HandleFunc("/api/ping", handlePing)

	// Serve production Vite frontend if we build it
	distPath := "./dist"
	if _, err := os.Stat(distPath); err == nil {
		log.Printf("Serving production build from %s", distPath)
		fileServer := http.FileServer(http.Dir(distPath))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// If file exists, serve it, else serve index.html for SPA routing
			path := filepath.Join(distPath, r.URL.Path)
			if _, err := os.Stat(path); os.IsNotExist(err) {
				http.ServeFile(w, r, filepath.Join(distPath, "index.html"))
				return
			}
			fileServer.ServeHTTP(w, r)
		})
	} else {
		log.Println("Frontend 'dist' directory not found. In development, run Vite dev server separately.")
	}

	// Start Server
	port := getEnv("PORT", "3000")
	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe("0.0.0.0:"+port, corsMiddleware(activityLoggingMiddleware(mux))); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// CORS Middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type statusResponseWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusResponseWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusResponseWriter) Write(data []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	return w.ResponseWriter.Write(data)
}

type ActivityLog struct {
	ID         int64     `json:"id"`
	UserEmail  string    `json:"user_email"`
	UserRole   string    `json:"user_role"`
	Action     string    `json:"action"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	StatusCode int       `json:"status_code"`
	IPAddress  string    `json:"ip_address"`
	CreatedAt  time.Time `json:"created_at"`
}

func activityLoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		action := activityAction(r)
		if action == "" {
			next.ServeHTTP(w, r)
			return
		}

		recorder := &statusResponseWriter{ResponseWriter: w}
		next.ServeHTTP(recorder, r)
		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}

		claims, err := authenticateToken(r)
		if err != nil {
			return
		}
		recordActivity(claims.Email, claims.Role, action, r.Method, r.URL.Path, status, clientIPAddress(r))
	})
}

func activityAction(r *http.Request) string {
	path := r.URL.Path
	if path == "/api/activity-logs" || path == "/api/auth/login" || path == "/api/auth/session" || path == "/api/ping" {
		return ""
	}

	if r.Method == http.MethodGet {
		switch path {
		case "/api/download-template":
			return "Mengunduh template data siswa"
		case "/api/download-competency-template":
			return "Mengunduh template unit kompetensi"
		case "/api/generate-certificate":
			return "Membuat Skill Passport"
		default:
			return ""
		}
	}

	switch {
	case path == "/api/auth/logout":
		return "Logout"
	case path == "/api/auth/password":
		return "Mengganti password sendiri"
	case path == "/api/users" && r.Method == http.MethodPost:
		return "Membuat pengguna"
	case strings.HasPrefix(path, "/api/users/") && r.Method == http.MethodPut:
		return "Mengganti password pengguna"
	case strings.HasPrefix(path, "/api/users/") && r.Method == http.MethodDelete:
		return "Menghapus pengguna"
	case path == "/api/db/students" && r.Method == http.MethodPost:
		return "Menambah atau memperbarui data siswa"
	case path == "/api/db/students/delete":
		return "Menghapus data siswa"
	case path == "/api/db/app_settings":
		return "Memperbarui pengaturan aplikasi"
	case path == "/api/upload-image":
		return "Mengunggah gambar atau logo"
	case path == "/api/upload-excel":
		return "Mengunggah data siswa dari Excel"
	case path == "/api/upload-competency-excel":
		return "Mengunggah unit kompetensi dari Excel"
	case path == "/api/generate-certificate":
		return "Membuat Skill Passport"
	default:
		return ""
	}
}

func clientIPAddress(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		return strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

// Helpers
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// Font helpers
func downloadFont(url, dest string) error {
	if _, err := os.Stat(dest); err == nil {
		return nil
	}
	log.Printf("Downloading font to %s...", dest)
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status downloading font: %s", resp.Status)
	}

	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, resp.Body)
	return err
}

func ensureFonts() {
	os.MkdirAll("fonts", 0755)
	_ = downloadFont("https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf", "fonts/Roboto-Regular.ttf")
	_ = downloadFont("https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Bold.ttf", "fonts/Roboto-Bold.ttf")
	_ = downloadFont("https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Italic.ttf", "fonts/Roboto-Italic.ttf")
}

// DB Migrations & Seeding
func initDB(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id VARCHAR(255) PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			password VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL DEFAULT 'entry',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE TABLE IF NOT EXISTS user_roles (
			id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			email VARCHAR(255) NOT NULL,
			role VARCHAR(50) NOT NULL
		);

		CREATE TABLE IF NOT EXISTS students (
			nama_siswa VARCHAR(255) NOT NULL,
			nomor_seri VARCHAR(255) PRIMARY KEY,
			nomor_surat VARCHAR(255),
			nisn VARCHAR(50),
			nis VARCHAR(50),
			jurusan VARCHAR(255) NOT NULL,
			kelas VARCHAR(100) NOT NULL,
			tahun_lulus VARCHAR(10),
				predikat VARCHAR(50) NOT NULL,
				penguji_internal VARCHAR(255),
				nip_reg_met_penguji VARCHAR(255),
				penguji_eksternal VARCHAR(255),
			mitra_industri VARCHAR(255)
		);

			CREATE TABLE IF NOT EXISTS app_settings (
			id INT PRIMARY KEY,
			data JSONB NOT NULL,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			CREATE TABLE IF NOT EXISTS activity_logs (
				id BIGSERIAL PRIMARY KEY,
				user_email VARCHAR(255) NOT NULL,
				user_role VARCHAR(50) NOT NULL,
				action VARCHAR(255) NOT NULL,
				method VARCHAR(10) NOT NULL,
				path VARCHAR(500) NOT NULL,
				status_code INT NOT NULL,
				ip_address VARCHAR(100),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
	`)
	if err != nil {
		return err
	}

	// Migration: add competencies column if not exists
	_, err = db.Exec(`ALTER TABLE students ADD COLUMN IF NOT EXISTS competencies JSONB DEFAULT '[]'`)
	if err != nil {
		return err
	}
	_, err = db.Exec(`ALTER TABLE students ADD COLUMN IF NOT EXISTS nip_reg_met_penguji VARCHAR(255)`)
	if err != nil {
		return err
	}

	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	if err != nil {
		return err
	}
	if count == 0 {
		adminID := "admin-default-uuid"
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		_, err = db.Exec("INSERT INTO users (id, email, password, role) VALUES ($1, $2, $3, $4)", adminID, "admin@esuk.id", string(hashedPassword), "admin")
		if err != nil {
			return err
		}
		_, err = db.Exec("INSERT INTO user_roles (id, email, role) VALUES ($1, $2, $3)", adminID, "admin@esuk.id", "admin")
		if err != nil {
			return err
		}
		log.Println("Seeded default admin user: admin@esuk.id / admin123")
	}
	return nil
}

// Authentication Middlewares & Handlers
func authenticateToken(r *http.Request) (*Claims, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("missing Authorization header")
	}

	bearerToken := strings.Split(authHeader, " ")
	if len(bearerToken) != 2 || strings.ToLower(bearerToken[0]) != "bearer" {
		return nil, fmt.Errorf("invalid token format")
	}

	tokenStr := bearerToken[1]
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid or expired token")
	}

	return claims, nil
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var creds struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}

	if getEnv("ALLOW_NO_DB", "false") == "true" {
		if creds.Email == "admin@esuk.id" && creds.Password == "admin123" {
			writeLoginSession(w, r, "admin-default-uuid", creds.Email, "admin")
			return
		}

		localUsers, err := readLocalUsers()
		if err == nil {
			for _, u := range localUsers {
				if strings.EqualFold(u.Email, creds.Email) && bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(creds.Password)) == nil {
					writeLoginSession(w, r, u.ID, u.Email, u.Role)
					return
				}
			}
		}
		writeError(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}

	var user struct {
		ID       string
		Email    string
		Password string
		Role     string
	}

	err = db.QueryRow("SELECT id, email, password, role FROM users WHERE email = $1", creds.Email).
		Scan(&user.ID, &user.Email, &user.Password, &user.Role)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(creds.Password))
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal membuat session")
		return
	}

	recordActivity(user.Email, user.Role, "Login", r.Method, r.URL.Path, http.StatusOK, clientIPAddress(r))
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": tokenString,
		"user": map[string]string{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

func writeLoginSession(w http.ResponseWriter, r *http.Request, userID, email, role string) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal membuat session")
		return
	}

	recordActivity(email, role, "Login", r.Method, r.URL.Path, http.StatusOK, clientIPAddress(r))
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": tokenString,
		"user": map[string]string{
			"id":    userID,
			"email": email,
			"role":  role,
		},
	})
}

func handleSession(w http.ResponseWriter, r *http.Request) {
	claims, err := authenticateToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user": map[string]string{
			"id":    claims.UserID,
			"email": claims.Email,
			"role":  claims.Role,
		},
	})
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

func handleActivityLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	claims, err := authenticateToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.Role != "admin" {
		writeError(w, http.StatusForbidden, "Hanya admin yang dapat melihat log aktivitas")
		return
	}

	logs, err := readLatestActivityLogs(100)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal mengambil log aktivitas")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"logs": logs})
}

func recordActivity(email, role, action, method, path string, status int, ipAddress string) {
	if strings.TrimSpace(email) == "" || strings.TrimSpace(action) == "" {
		return
	}
	entry := ActivityLog{
		UserEmail:  email,
		UserRole:   role,
		Action:     action,
		Method:     method,
		Path:       path,
		StatusCode: status,
		IPAddress:  ipAddress,
		CreatedAt:  time.Now(),
	}

	if getEnv("ALLOW_NO_DB", "false") == "true" {
		if err := appendLocalActivityLog(entry); err != nil {
			log.Printf("Failed to save local activity log: %v", err)
		}
		return
	}
	if _, err := db.Exec(`
		INSERT INTO activity_logs (user_email, user_role, action, method, path, status_code, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		entry.UserEmail, entry.UserRole, entry.Action, entry.Method, entry.Path, entry.StatusCode, entry.IPAddress, entry.CreatedAt); err != nil {
		log.Printf("Failed to save activity log: %v", err)
	}
}

func readLatestActivityLogs(limit int) ([]ActivityLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 100
	}
	if getEnv("ALLOW_NO_DB", "false") == "true" {
		activityLogMutex.Lock()
		defer activityLogMutex.Unlock()
		logs, err := readLocalActivityLogs()
		if err != nil {
			return nil, err
		}
		if len(logs) > limit {
			logs = logs[len(logs)-limit:]
		}
		for left, right := 0, len(logs)-1; left < right; left, right = left+1, right-1 {
			logs[left], logs[right] = logs[right], logs[left]
		}
		return logs, nil
	}

	rows, err := db.Query(`
		SELECT id, user_email, user_role, action, method, path, status_code, COALESCE(ip_address, ''), created_at
		FROM activity_logs ORDER BY created_at DESC, id DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	logs := make([]ActivityLog, 0, limit)
	for rows.Next() {
		var entry ActivityLog
		if err := rows.Scan(&entry.ID, &entry.UserEmail, &entry.UserRole, &entry.Action, &entry.Method, &entry.Path, &entry.StatusCode, &entry.IPAddress, &entry.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, entry)
	}
	return logs, rows.Err()
}

func localActivityLogsPath() string {
	return filepath.Join("local-data", "activity_logs.json")
}

func readLocalActivityLogs() ([]ActivityLog, error) {
	data, err := os.ReadFile(localActivityLogsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return []ActivityLog{}, nil
		}
		return nil, err
	}
	var logs []ActivityLog
	if err := json.Unmarshal(data, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

func appendLocalActivityLog(entry ActivityLog) error {
	activityLogMutex.Lock()
	defer activityLogMutex.Unlock()
	logs, err := readLocalActivityLogs()
	if err != nil {
		return err
	}
	entry.ID = int64(len(logs) + 1)
	logs = append(logs, entry)
	if len(logs) > 500 {
		logs = logs[len(logs)-500:]
	}
	if err := os.MkdirAll(filepath.Dir(localActivityLogsPath()), 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(logs, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(localActivityLogsPath(), data, 0644)
}

func handleOwnPasswordChange(w http.ResponseWriter, r *http.Request) {
	if r.Method != "PUT" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims, err := authenticateToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.Role == "admin" {
		writeError(w, http.StatusForbidden, "Admin mengganti password melalui Manajemen User")
		return
	}

	var req struct {
		CurrentPassword string `json:"currentPassword"`
		NewPassword     string `json:"newPassword"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if req.CurrentPassword == "" {
		writeError(w, http.StatusBadRequest, "Password saat ini wajib diisi")
		return
	}
	if len(req.NewPassword) < 8 {
		writeError(w, http.StatusBadRequest, "Password baru minimal 8 karakter")
		return
	}
	if req.CurrentPassword == req.NewPassword {
		writeError(w, http.StatusBadRequest, "Password baru harus berbeda dari password saat ini")
		return
	}

	if getEnv("ALLOW_NO_DB", "false") == "true" {
		users, err := readLocalUsers()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		updated := false
		for i := range users {
			if users[i].ID != claims.UserID {
				continue
			}
			if bcrypt.CompareHashAndPassword([]byte(users[i].Password), []byte(req.CurrentPassword)) != nil {
				writeError(w, http.StatusUnauthorized, "Password saat ini salah")
				return
			}
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "Gagal mengenkripsi password")
				return
			}
			users[i].Password = string(hashedPassword)
			updated = true
			break
		}
		if !updated {
			writeError(w, http.StatusNotFound, "Pengguna tidak ditemukan")
			return
		}
		if err := writeLocalUsers(users); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "Password berhasil diperbarui"})
		return
	}

	var storedPassword string
	if err := db.QueryRow("SELECT password FROM users WHERE id = $1", claims.UserID).Scan(&storedPassword); err != nil {
		if err == sql.ErrNoRows {
			writeError(w, http.StatusNotFound, "Pengguna tidak ditemukan")
		} else {
			writeError(w, http.StatusInternalServerError, "Gagal membaca data pengguna")
		}
		return
	}
	if bcrypt.CompareHashAndPassword([]byte(storedPassword), []byte(req.CurrentPassword)) != nil {
		writeError(w, http.StatusUnauthorized, "Password saat ini salah")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal mengenkripsi password")
		return
	}
	if _, err := db.Exec("UPDATE users SET password = $1 WHERE id = $2", string(hashedPassword), claims.UserID); err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal memperbarui password")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "Password berhasil diperbarui"})
}

// User Management Handlers (API `/api/users`)
func handleUsers(w http.ResponseWriter, r *http.Request) {
	claims, err := authenticateToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if claims.Role != "admin" {
		writeError(w, http.StatusForbidden, "Forbidden")
		return
	}

	if r.Method == "GET" {
		if getEnv("ALLOW_NO_DB", "false") == "true" {
			users, err := readLocalUsers()
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{"users": publicUsers(users)})
			return
		}

		rows, err := db.Query("SELECT id, email, role FROM users")
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer rows.Close()

		var users []map[string]interface{}
		for rows.Next() {
			var u struct {
				ID    string
				Email string
				Role  string
			}
			if err := rows.Scan(&u.ID, &u.Email, &u.Role); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			users = append(users, map[string]interface{}{
				"id":    u.ID,
				"email": u.Email,
				"role":  u.Role,
			})
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"users": users})
		return
	}

	if r.Method == "POST" {
		var req struct {
			Email    string `json:"email"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		if req.Email == "" || req.Password == "" || req.Role == "" {
			writeError(w, http.StatusBadRequest, "Email, password, and role are required")
			return
		}
		if len(req.Password) < 8 {
			writeError(w, http.StatusBadRequest, "Password minimal 8 karakter")
			return
		}
		if req.Role != "admin" && req.Role != "entry" && req.Role != "kakonli" && req.Role != "lsp" {
			writeError(w, http.StatusBadRequest, "Role tidak valid")
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to hash password")
			return
		}

		uuidStr := fmt.Sprintf("user_%d", time.Now().UnixNano())
		if getEnv("ALLOW_NO_DB", "false") == "true" {
			users, err := readLocalUsers()
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			for _, user := range users {
				if strings.EqualFold(user.Email, req.Email) {
					writeError(w, http.StatusBadRequest, "Email sudah terdaftar")
					return
				}
			}
			newUser := DBUser{ID: uuidStr, Email: req.Email, Password: string(hashedPassword), Role: req.Role}
			users = append(users, newUser)
			if err := writeLocalUsers(users); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusCreated, map[string]interface{}{
				"message": "User created locally",
				"user": map[string]string{
					"id":    uuidStr,
					"email": req.Email,
					"role":  req.Role,
				},
			})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer tx.Rollback()

		_, err = tx.Exec("INSERT INTO users (id, email, password, role) VALUES ($1, $2, $3, $4)", uuidStr, req.Email, string(hashedPassword), req.Role)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "User creation failed: "+err.Error())
			return
		}

		_, err = tx.Exec("INSERT INTO user_roles (id, email, role) VALUES ($1, $2, $3)", uuidStr, req.Email, req.Role)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Role assignment failed: "+err.Error())
			return
		}

		if err := tx.Commit(); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"message": "User created successfully",
			"user": map[string]string{
				"id":    uuidStr,
				"email": req.Email,
				"role":  req.Role,
			},
		})
		return
	}

	writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
}

func handleUsersWithID(w http.ResponseWriter, r *http.Request) {
	claims, err := authenticateToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}

	if claims.Role != "admin" {
		writeError(w, http.StatusForbidden, "Forbidden")
		return
	}

	// Extract ID from path
	parts := strings.Split(r.URL.Path, "/")
	id := parts[len(parts)-1]
	if id == "" || id == "users" {
		writeError(w, http.StatusBadRequest, "Missing ID")
		return
	}

	if r.Method == "PUT" {
		var req struct {
			Password string `json:"password"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}
		if len(req.Password) < 8 {
			writeError(w, http.StatusBadRequest, "Password minimal 8 karakter")
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Gagal mengenkripsi password")
			return
		}
		if getEnv("ALLOW_NO_DB", "false") == "true" {
			users, err := readLocalUsers()
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			updated := false
			for i := range users {
				if users[i].ID == id {
					users[i].Password = string(hashedPassword)
					updated = true
					break
				}
			}
			if !updated {
				writeError(w, http.StatusNotFound, "Pengguna tidak ditemukan")
				return
			}
			if err := writeLocalUsers(users); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"message": "Password berhasil diperbarui"})
			return
		}

		result, err := db.Exec("UPDATE users SET password = $1 WHERE id = $2", string(hashedPassword), id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Gagal memperbarui password")
			return
		}
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			writeError(w, http.StatusNotFound, "Pengguna tidak ditemukan")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "Password berhasil diperbarui"})
		return
	}

	if r.Method != "DELETE" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	if getEnv("ALLOW_NO_DB", "false") == "true" {
		if id == "admin-default-uuid" {
			writeError(w, http.StatusBadRequest, "Admin default tidak dapat dihapus")
			return
		}
		users, err := readLocalUsers()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		filtered := make([]DBUser, 0, len(users))
		for _, user := range users {
			if user.ID != id {
				filtered = append(filtered, user)
			}
		}
		if err := writeLocalUsers(filtered); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "User deleted locally"})
		return
	}

	tx, err := db.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM user_roles WHERE id = $1", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	_, err = tx.Exec("DELETE FROM users WHERE id = $1", id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

// Supabase Mock DB Endpoint Handlers
func handleDbUserRoles(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	idParam := r.URL.Query().Get("id")
	if idParam == "" {
		writeError(w, http.StatusBadRequest, "Missing user ID filter")
		return
	}

	// Expected idParam format: "eq.UUID"
	var uuidVal string
	if strings.HasPrefix(idParam, "eq.") {
		uuidVal = idParam[3:]
	} else {
		uuidVal = idParam
	}

	if getEnv("ALLOW_NO_DB", "false") == "true" {
		if uuidVal == "admin-default-uuid" {
			writeJSON(w, http.StatusOK, map[string]string{"role": "admin"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"role": "entry"})
		return
	}

	var role string
	err := db.QueryRow("SELECT role FROM user_roles WHERE id = $1", uuidVal).Scan(&role)
	if err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusOK, nil)
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"role": role})
}

// Student database mapping struct for REST
type DBStudent struct {
	NamaSiswa        string          `json:"nama_siswa"`
	NomorSeri        string          `json:"nomor_seri"`
	NomorSurat       string          `json:"nomor_surat"`
	NISN             string          `json:"nisn"`
	NIS              string          `json:"nis"`
	Jurusan          string          `json:"jurusan"`
	Kelas            string          `json:"kelas"`
	TahunLulus       string          `json:"tahun_lulus"`
	Predikat         string          `json:"predikat"`
	PengujiInternal  *string         `json:"penguji_internal"`
	NipRegMetPenguji *string         `json:"nip_reg_met_penguji"`
	PengujiEksternal *string         `json:"penguji_eksternal"`
	MitraIndustri    *string         `json:"mitra_industri"`
	Competencies     json.RawMessage `json:"competencies,omitempty"`
}

func handleDbStudents(w http.ResponseWriter, r *http.Request) {
	// GET fetches students
	if r.Method == "GET" {
		if getEnv("ALLOW_NO_DB", "false") == "true" {
			students, err := readLocalStudents()
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			serialParam := r.URL.Query().Get("nomor_seri")
			if serialParam != "" {
				val := serialParam
				if strings.HasPrefix(serialParam, "eq.") {
					val = serialParam[3:]
				}
				for _, s := range students {
					if s.NomorSeri == val {
						writeJSON(w, http.StatusOK, s)
						return
					}
				}
				writeError(w, http.StatusNotFound, "Skill Passport tidak ditemukan atau tidak valid.")
				return
			}

			writeJSON(w, http.StatusOK, students)
			return
		}

		// Landing page queries verify single student via serial number
		serialParam := r.URL.Query().Get("nomor_seri")
		if serialParam != "" {
			var val string
			if strings.HasPrefix(serialParam, "eq.") {
				val = serialParam[3:]
			} else {
				val = serialParam
			}

			var s DBStudent
			err := db.QueryRow(`
					SELECT nama_siswa, nomor_seri, nomor_surat, nisn, nis, jurusan, kelas, tahun_lulus, predikat, penguji_internal, nip_reg_met_penguji, penguji_eksternal, mitra_industri, competencies 
					FROM students WHERE nomor_seri = $1`, val).
				Scan(&s.NamaSiswa, &s.NomorSeri, &s.NomorSurat, &s.NISN, &s.NIS, &s.Jurusan, &s.Kelas, &s.TahunLulus, &s.Predikat, &s.PengujiInternal, &s.NipRegMetPenguji, &s.PengujiEksternal, &s.MitraIndustri, &s.Competencies)

			if err != nil {
				if err == sql.ErrNoRows {
					writeError(w, http.StatusNotFound, "Sertifikat tidak ditemukan atau tidak valid.")
					return
				}
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, s)
			return
		}

		// List all students
		rows, err := db.Query("SELECT nama_siswa, nomor_seri, nomor_surat, nisn, nis, jurusan, kelas, tahun_lulus, predikat, penguji_internal, nip_reg_met_penguji, penguji_eksternal, mitra_industri, competencies FROM students")
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer rows.Close()

		students := []DBStudent{}
		for rows.Next() {
			var s DBStudent
			err := rows.Scan(&s.NamaSiswa, &s.NomorSeri, &s.NomorSurat, &s.NISN, &s.NIS, &s.Jurusan, &s.Kelas, &s.TahunLulus, &s.Predikat, &s.PengujiInternal, &s.NipRegMetPenguji, &s.PengujiEksternal, &s.MitraIndustri, &s.Competencies)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			students = append(students, s)
		}
		writeJSON(w, http.StatusOK, students)
		return
	}

	// POST handles bulk upserts
	if r.Method == "POST" {
		claims, err := authenticateToken(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, err.Error())
			return
		}

		if claims.Role != "admin" && claims.Role != "entry" && claims.Role != "kakonli" && claims.Role != "lsp" {
			writeError(w, http.StatusForbidden, "Forbidden")
			return
		}

		// Can receive either a single object or an array of objects
		var list []DBStudent

		bodyBytes, _ := io.ReadAll(r.Body)
		// Check if array or object
		if bytes.HasPrefix(bodyBytes, []byte("[")) {
			if err := json.Unmarshal(bodyBytes, &list); err != nil {
				writeError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
				return
			}
		} else {
			var s DBStudent
			if err := json.Unmarshal(bodyBytes, &s); err != nil {
				writeError(w, http.StatusBadRequest, "Invalid JSON: "+err.Error())
				return
			}
			list = append(list, s)
		}

		if getEnv("ALLOW_NO_DB", "false") == "true" {
			existing, err := readLocalStudents()
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			bySerial := map[string]DBStudent{}
			for _, s := range existing {
				if s.NomorSeri != "" {
					bySerial[s.NomorSeri] = s
				}
			}
			for _, s := range list {
				if s.NomorSeri == "" {
					s.NomorSeri = generateSerial(s.TahunLulus)
				}
				if len(s.Competencies) == 0 || string(s.Competencies) == "null" {
					s.Competencies = json.RawMessage(`[]`)
				}
				bySerial[s.NomorSeri] = s
			}
			merged := make([]DBStudent, 0, len(bySerial))
			for _, s := range bySerial {
				merged = append(merged, s)
			}
			if err := writeLocalStudents(merged); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"message": "Students saved locally"})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer tx.Rollback()

		stmt, err := tx.Prepare(`
			INSERT INTO students (nama_siswa, nomor_seri, nomor_surat, nisn, nis, jurusan, kelas, tahun_lulus, predikat, penguji_internal, nip_reg_met_penguji, penguji_eksternal, mitra_industri, competencies)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
			ON CONFLICT (nomor_seri) DO UPDATE SET
				nama_siswa = EXCLUDED.nama_siswa,
				nomor_surat = EXCLUDED.nomor_surat,
				nisn = EXCLUDED.nisn,
				nis = EXCLUDED.nis,
				jurusan = EXCLUDED.jurusan,
				kelas = EXCLUDED.kelas,
				tahun_lulus = EXCLUDED.tahun_lulus,
				predikat = EXCLUDED.predikat,
				penguji_internal = EXCLUDED.penguji_internal,
				nip_reg_met_penguji = EXCLUDED.nip_reg_met_penguji,
				penguji_eksternal = EXCLUDED.penguji_eksternal,
				mitra_industri = EXCLUDED.mitra_industri,
				competencies = EXCLUDED.competencies
		`)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		defer stmt.Close()

		for _, s := range list {
			compJSON := json.RawMessage(`[]`)
			if len(s.Competencies) > 0 && string(s.Competencies) != "null" {
				compJSON = s.Competencies
			}
			_, err = stmt.Exec(s.NamaSiswa, s.NomorSeri, s.NomorSurat, s.NISN, s.NIS, s.Jurusan, s.Kelas, s.TahunLulus, s.Predikat, s.PengujiInternal, s.NipRegMetPenguji, s.PengujiEksternal, s.MitraIndustri, compJSON)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "Upsert error: "+err.Error())
				return
			}
		}

		if err := tx.Commit(); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "Students synced successfully"})
		return
	}

	writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
}

type DeleteRequest struct {
	Column string      `json:"column"`
	Value  interface{} `json:"value"`
	Values []any       `json:"values"`
}

func handleDbStudentsDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	claims, err := authenticateToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	if claims.Role != "admin" && claims.Role != "entry" && claims.Role != "kakonli" && claims.Role != "lsp" {
		writeError(w, http.StatusForbidden, "Forbidden")
		return
	}

	var req DeleteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Column != "nomor_seri" {
		writeError(w, http.StatusBadRequest, "Can only delete by nomor_seri column")
		return
	}

	if getEnv("ALLOW_NO_DB", "false") == "true" {
		students, err := readLocalStudents()
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		deleteSet := map[string]bool{}
		if req.Value != nil {
			deleteSet[fmt.Sprintf("%v", req.Value)] = true
		}
		for _, v := range req.Values {
			deleteSet[fmt.Sprintf("%v", v)] = true
		}
		remaining := make([]DBStudent, 0, len(students))
		for _, s := range students {
			if !deleteSet[s.NomorSeri] {
				remaining = append(remaining, s)
			}
		}
		if err := writeLocalStudents(remaining); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"message": "Deletion completed locally"})
		return
	}

	// Delete single serial
	if req.Value != nil {
		valStr := fmt.Sprintf("%v", req.Value)
		_, err = db.Exec("DELETE FROM students WHERE nomor_seri = $1", valStr)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	} else if len(req.Values) > 0 {
		// Batch delete
		vals := make([]string, len(req.Values))
		for i, v := range req.Values {
			vals[i] = fmt.Sprintf("%v", v)
		}
		_, err = db.Exec("DELETE FROM students WHERE nomor_seri = ANY($1)", pq.Array(vals))
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Deletion completed"})
}

func handleDbAppSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		if getEnv("ALLOW_NO_DB", "false") == "true" {
			dataBytes, err := os.ReadFile(localSettingsPath())
			if err != nil {
				if os.IsNotExist(err) {
					writeJSON(w, http.StatusOK, nil)
					return
				}
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}

			var settings interface{}
			_ = json.Unmarshal(dataBytes, &settings)
			writeJSON(w, http.StatusOK, map[string]interface{}{
				"id":   1,
				"data": settings,
			})
			return
		}

		var dataStr []byte
		err := db.QueryRow("SELECT data FROM app_settings WHERE id = 1").Scan(&dataStr)
		if err != nil {
			if err == sql.ErrNoRows {
				writeJSON(w, http.StatusOK, nil)
				return
			}
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		var settings interface{}
		_ = json.Unmarshal(dataStr, &settings)
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id":   1,
			"data": settings,
		})
		return
	}

	if r.Method == "POST" {
		claims, err := authenticateToken(r)
		if err != nil {
			writeError(w, http.StatusUnauthorized, err.Error())
			return
		}
		if claims.Role != "admin" && claims.Role != "entry" && claims.Role != "kakonli" && claims.Role != "lsp" {
			writeError(w, http.StatusForbidden, "Forbidden")
			return
		}

		var req struct {
			ID   int             `json:"id"`
			Data json.RawMessage `json:"data"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		if getEnv("ALLOW_NO_DB", "false") == "true" {
			if err := os.MkdirAll(filepath.Dir(localSettingsPath()), 0755); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			if err := os.WriteFile(localSettingsPath(), []byte(req.Data), 0644); err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, map[string]string{"message": "Settings saved locally"})
			return
		}

		_, err = db.Exec(`
			INSERT INTO app_settings (id, data, updated_at) 
			VALUES (1, $1, NOW()) 
			ON CONFLICT (id) DO UPDATE SET 
				data = EXCLUDED.data, 
				updated_at = NOW()`, []byte(req.Data))
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "Settings saved"})
		return
	}

	writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
}

func localSettingsPath() string {
	return filepath.Join("local-data", "app_settings.json")
}

func localStudentsPath() string {
	return filepath.Join("local-data", "students.json")
}

func localUsersPath() string {
	return filepath.Join("local-data", "users.json")
}

func defaultLocalAdmin() DBUser {
	return DBUser{ID: "admin-default-uuid", Email: "admin@esuk.id", Role: "admin"}
}

func readLocalUsers() ([]DBUser, error) {
	dataBytes, err := os.ReadFile(localUsersPath())
	if err != nil {
		if os.IsNotExist(err) {
			return []DBUser{defaultLocalAdmin()}, nil
		}
		return nil, err
	}
	var users []DBUser
	if err := json.Unmarshal(dataBytes, &users); err != nil {
		return nil, err
	}

	hasAdmin := false
	for _, user := range users {
		if user.ID == "admin-default-uuid" || strings.EqualFold(user.Email, "admin@esuk.id") {
			hasAdmin = true
			break
		}
	}
	if !hasAdmin {
		users = append([]DBUser{defaultLocalAdmin()}, users...)
	}
	return users, nil
}

func writeLocalUsers(users []DBUser) error {
	if err := os.MkdirAll(filepath.Dir(localUsersPath()), 0755); err != nil {
		return err
	}
	filtered := make([]DBUser, 0, len(users))
	for _, user := range users {
		if user.ID == "admin-default-uuid" {
			continue
		}
		filtered = append(filtered, user)
	}
	dataBytes, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(localUsersPath(), dataBytes, 0644)
}

func publicUsers(users []DBUser) []map[string]interface{} {
	result := make([]map[string]interface{}, 0, len(users))
	for _, user := range users {
		result = append(result, map[string]interface{}{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		})
	}
	return result
}

func readLocalStudents() ([]DBStudent, error) {
	dataBytes, err := os.ReadFile(localStudentsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return []DBStudent{}, nil
		}
		return nil, err
	}
	var students []DBStudent
	if err := json.Unmarshal(dataBytes, &students); err != nil {
		return nil, err
	}
	return students, nil
}

func writeLocalStudents(students []DBStudent) error {
	if err := os.MkdirAll(filepath.Dir(localStudentsPath()), 0755); err != nil {
		return err
	}
	dataBytes, err := json.MarshalIndent(students, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(localStudentsPath(), dataBytes, 0644)
}

// File Upload Handler
func handleUploadImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// File size limit: 10MB
	r.ParseMultipartForm(10 << 20)

	file, header, err := r.FormFile("image")
	if err != nil {
		writeError(w, http.StatusBadRequest, "Failed to get file from request: "+err.Error())
		return
	}
	defer file.Close()

	// Preserve the requested relative path so the stored URL always points to
	// the actual uploaded file. filepath.Base prevents directory traversal.
	requestedPath := strings.TrimSpace(r.FormValue("path"))
	ext := filepath.Ext(header.Filename)
	relativePath := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	if requestedPath != "" {
		dir := filepath.Dir(filepath.Clean(requestedPath))
		if dir == "." || strings.HasPrefix(dir, "..") || filepath.IsAbs(dir) {
			dir = ""
		}
		filename := filepath.Base(requestedPath)
		if filename != "." && filename != "" {
			relativePath = filepath.Join(dir, filename)
		}
	}
	filePath := filepath.Join("uploads", relativePath)
	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to prepare upload directory: "+err.Error())
		return
	}

	out, err := os.Create(filePath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save file: "+err.Error())
		return
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	imageUrl := "/uploads/" + filepath.ToSlash(relativePath)
	writeJSON(w, http.StatusOK, map[string]string{"imageUrl": imageUrl})
}

// Excel Templates & Parsers
func handleDownloadTemplate(w http.ResponseWriter, r *http.Request) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Siswa"
	index, _ := f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")

	headers := []string{"Nama Siswa", "NISN", "NIS", "Jurusan", "Kelas", "Angkatan", "Penguji", "NIP/Reg Met Penguji"}
	for i, h := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheet, col+"1", h)
	}

	rows := [][]interface{}{
		{"ABID NUGROHO", "0068742533", "7377/1700.066", "Teknik Komputer dan Jaringan", "X TKJ 1", "2026", "Budi Santoso, S.Kom.", "198001012005011001"},
		{"SITI NURHALIZA", "0056784455", "7378/1701.066", "Kuliner", "XI KL 2", "2026", "Dra. Siti Aminah", "REG-MET-001"},
	}

	for rIdx, r := range rows {
		rowStr := strconv.Itoa(rIdx + 2)
		for cIdx, val := range r {
			col, _ := excelize.ColumnNumberToName(cIdx + 1)
			f.SetCellValue(sheet, col+rowStr, val)
		}
	}

	f.SetActiveSheet(index)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal membuat berkas template")
		return
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", "attachment; filename=template_data_siswa.xlsx")
	w.Write(buf.Bytes())
}

func handleDownloadCompetencyTemplate(w http.ResponseWriter, r *http.Request) {
	f := excelize.NewFile()
	defer f.Close()

	sheet := "Kompetensi"
	index, _ := f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")

	headers := []string{"Kode", "Unit Kompetensi"}
	for i, h := range headers {
		col, _ := excelize.ColumnNumberToName(i + 1)
		f.SetCellValue(sheet, col+"1", h)
	}

	rows := [][]interface{}{
		{"016.UK.01", "Menerapkan Prosedur Kesehatan, Keselamatan dan Keamanan Kerja"},
		{"016.UK.02", "Melakukan Persiapan Bahan Bakar dan Pelumas"},
	}

	for rIdx, r := range rows {
		rowStr := strconv.Itoa(rIdx + 2)
		for cIdx, val := range r {
			col, _ := excelize.ColumnNumberToName(cIdx + 1)
			f.SetCellValue(sheet, col+rowStr, val)
		}
	}

	f.SetActiveSheet(index)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal membuat berkas template")
		return
	}

	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", "attachment; filename=template_kompetensi.xlsx")
	w.Write(buf.Bytes())
}

func handleUploadCompetencyExcel(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	r.ParseMultipartForm(10 << 20)
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "No file uploaded")
		return
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Failed to read excel file")
		return
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil || len(rows) < 2 {
		writeError(w, http.StatusBadRequest, "Excel sheet is empty or invalid format")
		return
	}

	// Parse Headers
	headers := rows[0]
	codeIdx, titleIdx := -1, -1
	for i, h := range headers {
		hLower := strings.ToLower(strings.TrimSpace(h))
		if strings.Contains(hLower, "kode") {
			codeIdx = i
		} else if strings.Contains(hLower, "judul") || (strings.Contains(hLower, "kompetensi") && !strings.Contains(hLower, "status") && !strings.Contains(hLower, "kode")) {
			titleIdx = i
		}
	}

	if titleIdx == -1 {
		writeError(w, http.StatusBadRequest, "Format Excel tidak cocok (Unit Kompetensi tidak ditemukan)")
		return
	}

	var competencies []map[string]string
	for _, row := range rows[1:] {
		if len(row) <= titleIdx || strings.TrimSpace(row[titleIdx]) == "" {
			continue
		}
		codeVal := ""
		if codeIdx != -1 && len(row) > codeIdx {
			codeVal = strings.TrimSpace(row[codeIdx])
		}
		titleVal := strings.TrimSpace(row[titleIdx])
		competencies = append(competencies, map[string]string{
			"code":   codeVal,
			"title":  titleVal,
			"status": "",
		})
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"competencies": competencies})
}

func handleUploadExcel(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	r.ParseMultipartForm(10 << 20)
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "No file uploaded")
		return
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Failed to read Excel: "+err.Error())
		return
	}
	defer f.Close()

	sheetName := f.GetSheetName(0)
	rows, err := f.GetRows(sheetName)
	if err != nil || len(rows) < 2 {
		writeError(w, http.StatusBadRequest, "Excel sheet is empty or invalid format")
		return
	}

	headers := rows[0]
	var students []map[string]string

	for _, row := range rows[1:] {
		if len(row) == 0 {
			continue
		}

		obj := make(map[string]string)
		for cIdx, val := range row {
			if cIdx >= len(headers) {
				continue
			}
			cleanKey := strings.ToLower(strings.TrimSpace(headers[cIdx]))
			valStr := strings.TrimSpace(val)

			if strings.Contains(cleanKey, "nama") {
				obj["Nama Siswa"] = valStr
			} else if strings.Contains(cleanKey, "nisn") {
				obj["NISN"] = valStr
			} else if strings.Contains(cleanKey, "nis") {
				obj["NIS"] = valStr
			} else if strings.Contains(cleanKey, "surat") {
				obj["Nomor Surat"] = valStr
			} else if strings.Contains(cleanKey, "seri") || (strings.Contains(cleanKey, "sertifikat") && !strings.Contains(cleanKey, "surat")) {
				obj["Nomor Seri"] = valStr
			} else if strings.Contains(cleanKey, "jurusan") {
				obj["Jurusan"] = valStr
			} else if strings.Contains(cleanKey, "kelas") {
				obj["Kelas"] = valStr
			} else if strings.Contains(cleanKey, "predikat") {
				obj["Predikat"] = valStr
			} else if strings.Contains(cleanKey, "tahun") || strings.Contains(cleanKey, "angkatan") {
				obj["Tahun Lulus"] = valStr
			} else if (strings.Contains(cleanKey, "nip") || strings.Contains(cleanKey, "reg")) && strings.Contains(cleanKey, "penguji") {
				obj["NIP/Reg Met Penguji"] = valStr
			} else if cleanKey == "penguji" || strings.Contains(cleanKey, "penguji") && !strings.Contains(cleanKey, "eksternal") && !strings.Contains(cleanKey, "external") {
				obj["Penguji Internal"] = valStr
			} else if strings.Contains(cleanKey, "internal") {
				obj["Penguji Internal"] = valStr
			} else if strings.Contains(cleanKey, "eksternal") || strings.Contains(cleanKey, "external") {
				obj["Penguji Eksternal"] = valStr
			} else if strings.Contains(cleanKey, "mitra") || strings.Contains(cleanKey, "industri") {
				obj["Mitra Industri"] = valStr
			}
		}

		if obj["Nama Siswa"] == "" {
			continue
		}

		if obj["Nomor Seri"] == "" {
			year := obj["Tahun Lulus"]
			obj["Nomor Seri"] = generateSerial(year)
		}

		students = append(students, obj)
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"students": students})
}

func generateSerial(year string) string {
	if year == "" {
		year = fmt.Sprintf("%d", time.Now().Year())
	}
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 6)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		b[i] = chars[n.Int64()]
	}
	return fmt.Sprintf("%sUKK%s", year, string(b))
}

// Certificate Generation Handlers
type CertSettings struct {
	Name                       string                 `json:"name"`
	Address                    string                 `json:"address"`
	Phone                      string                 `json:"phone"`
	Email                      string                 `json:"email"`
	City                       string                 `json:"city"`
	ProvinceName               string                 `json:"provinceName"`
	EducationOffice            string                 `json:"educationOffice"`
	ProvinceLogo               string                 `json:"provinceLogo"`
	LspLogo                    string                 `json:"lspLogo"`
	BnspLogo                   string                 `json:"bnspLogo"`
	LspHeaderName              string                 `json:"lspHeaderName"`
	LspSchoolName              string                 `json:"lspSchoolName"`
	LspLicenseNumber           string                 `json:"lspLicenseNumber"`
	LspAddress                 string                 `json:"lspAddress"`
	LspPhoneFax                string                 `json:"lspPhoneFax"`
	LspEmail                   string                 `json:"lspEmail"`
	LspWebsite                 string                 `json:"lspWebsite"`
	Signatory                  string                 `json:"signatory"`
	SignatoryRank              string                 `json:"signatoryRank"`
	SignatoryNip               string                 `json:"signatoryNip"`
	VicePrincipalCurriculum    string                 `json:"vicePrincipalCurriculum"`
	VicePrincipalCurriculumNip string                 `json:"vicePrincipalCurriculumNip"`
	LspDirector                string                 `json:"lspDirector"`
	LspDirectorNip             string                 `json:"lspDirectorNip"`
	CertificationManager       string                 `json:"certificationManager"`
	CertificationManagerNip    string                 `json:"certificationManagerNip"`
	SchoolLogo                 string                 `json:"schoolLogo"`
	MinistryLogo               string                 `json:"ministryLogo"`
	IndustryLogo               string                 `json:"industryLogo"`
	IndustryName               string                 `json:"industryName"`
	IndustryLeader             string                 `json:"industryLeader"`
	IndustryField              string                 `json:"industryField"`
	Date                       string                 `json:"date"`
	Origin                     string                 `json:"origin"`
	Layout                     map[string]interface{} `json:"layout"`
	DocumentNumbering          map[string]interface{} `json:"documentNumbering"`
	Departments                map[string]interface{} `json:"departments"`
	Industries                 map[string]interface{} `json:"industries"`
}

type CertRequest struct {
	Student         map[string]interface{} `json:"student"`
	Settings        CertSettings           `json:"settings"`
	CertificateType string                 `json:"certificateType"`
}

func handleGenerateCertificate(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req CertRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body: "+err.Error())
		return
	}

	student := req.Student
	settings := req.Settings

	// Prepare PDF
	pdf := gopdf.GoPdf{}

	// Setup layout sizes
	var pw, ph float64
	pageSize := "A4"
	orientation := "portrait"

	if req.Settings.Layout != nil {
		if val, ok := req.Settings.Layout["pageSize"].(string); ok {
			pageSize = val
		}
		if val, ok := req.Settings.Layout["orientation"].(string); ok {
			orientation = val
		}
	}
	pageSize = "A4"
	orientation = "portrait"

	sizes := map[string]map[string][2]float64{
		"A4": {
			"portrait":  {595.28, 841.89},
			"landscape": {841.89, 595.28},
		},
		"Folio": {
			"portrait":  {609.45, 935.43},
			"landscape": {935.43, 609.45},
		},
	}

	pageSizeMap, ok := sizes[pageSize]
	if !ok {
		pageSizeMap = sizes["A4"]
	}
	dim, ok := pageSizeMap[orientation]
	if !ok {
		dim = pageSizeMap["landscape"]
	}

	pw = dim[0]
	ph = dim[1]

	pdf.Start(gopdf.Config{PageSize: gopdf.Rect{W: pw, H: ph}})

	// Add font configs
	_ = pdf.AddTTFFont("Helvetica", "fonts/Roboto-Regular.ttf")
	_ = pdf.AddTTFFont("Helvetica-Bold", "fonts/Roboto-Bold.ttf")
	_ = pdf.AddTTFFont("Helvetica-Italic", "fonts/Roboto-Italic.ttf")

	renderSkillPassportPDF(&pdf, student, settings, pw, ph, req.CertificateType)
	w.Header().Set("Content-Type", "application/pdf")
	_ = pdf.Write(w)
	return

	// Page 1
	pdf.AddPage()

	// Draw Background on Page 1
	if req.Settings.Layout != nil {
		if bg, ok := req.Settings.Layout["backgroundImage"].(string); ok && bg != "" {
			bgHolder, err := resolveImageHolder(bg)
			if err == nil {
				_ = pdf.ImageByHolder(bgHolder, 0, 0, &gopdf.Rect{W: pw, H: ph})
			} else {
				log.Printf("Background Image decode failed: %v", err)
			}
		}
	}

	// Serial Number
	serialStr := fmt.Sprintf("%v", student["Nomor Seri"])
	if serialStr == "" || serialStr == "<nil>" {
		serialStr = "-"
	}
	serialNo := fmt.Sprintf("No. Seri : %s", serialStr)
	pdf.SetFont("Helvetica", "", 11)
	serialW, _ := pdf.MeasureTextWidth(serialNo)
	pdf.SetXY(pw-serialW-50, 40)
	pdf.Text(serialNo)

	// Ministry Logo (Left)
	if settings.MinistryLogo != "" {
		logoHolder, err := resolveImageHolder(settings.MinistryLogo)
		if err == nil {
			lw, lh := scaleImage(settings.MinistryLogo, 70, 70)
			pdf.ImageByHolder(logoHolder, 70+(70-lw)/2, 40+(70-lh)/2, &gopdf.Rect{W: lw, H: lh})
		}
	}

	// Industry Logo (Right)
	// Fallback to department industry or default industry logo
	var industryLogoStr string
	mitra := fmt.Sprintf("%v", student["Mitra Industri"])
	jurusanName := fmt.Sprintf("%v", student["Jurusan"])
	industryLogoStr = findIndustryLogo(mitra, jurusanName, settings.Industries, settings.Departments, settings.IndustryLogo)

	if industryLogoStr != "" {
		logoHolder, err := resolveImageHolder(industryLogoStr)
		if err == nil {
			lw, lh := scaleImage(industryLogoStr, 85, 75)
			pdf.ImageByHolder(logoHolder, pw-50-lw, 40+(75-lh)/2, &gopdf.Rect{W: lw, H: lh})
		}
	}

	// Titles
	headerTitle := "SERTIFIKAT UJI KOMPETENSI"
	drawTextCentered(&pdf, headerTitle, "Helvetica-Bold", 18, 80, pw, 0.12, 0.25, 0.69)

	headerSub := "CERTIFICATE OF COMPETENCY ASSESSMENT"
	drawTextCentered(&pdf, headerSub, "Helvetica-Bold", 13, 100, pw, 0.2, 0.5, 0.9)

	// Document Number
	if settings.DocumentNumbering != nil {
		docFormat, _ := settings.DocumentNumbering["format"].(string)
		docYear, _ := settings.DocumentNumbering["year"].(string)
		serial := fmt.Sprintf("%v", student["Nomor Seri"])
		docNo := strings.ReplaceAll(docFormat, "{YEAR}", docYear)
		docNo = strings.ReplaceAll(docNo, "{SERIAL}", serial)
		docText := fmt.Sprintf("Nomor : %s", docNo)
		drawTextCentered(&pdf, docText, "Helvetica-Bold", 11, 120, pw, 0, 0, 0)
	}

	currentY := 180.0
	drawTextCentered(&pdf, "Dengan ini menyatakan bahwa", "Helvetica", 11, currentY, pw, 0, 0, 0)
	currentY += 15
	drawTextCentered(&pdf, "This is to certify that", "Helvetica-Italic", 10, currentY, pw, 0.4, 0.4, 0.4)

	currentY += 40
	studentName := strings.ToUpper(fmt.Sprintf("%v", student["Nama Siswa"]))
	drawTextCentered(&pdf, studentName, "Helvetica-Bold", 24, currentY, pw, 0, 0, 0)

	currentY += 25
	nisInfo := fmt.Sprintf("NIS/NISN: %v / %v", student["NIS"], student["NISN"])
	drawTextCentered(&pdf, nisInfo, "Helvetica-Bold", 13, currentY, pw, 0, 0, 0)

	currentY += 35
	drawTextCentered(&pdf, "Pada Kompetensi Keahlian", "Helvetica", 11, currentY, pw, 0, 0, 0)
	currentY += 15
	drawTextCentered(&pdf, "In Competency of", "Helvetica-Italic", 10, currentY, pw, 0.4, 0.4, 0.4)

	currentY += 35
	jurusanVal := strings.ToUpper(fmt.Sprintf("%v", student["Jurusan"]))
	drawTextCentered(&pdf, jurusanVal, "Helvetica-Bold", 16, currentY, pw, 0, 0, 0)

	currentY += 35
	drawTextCentered(&pdf, "pada Judul Penugasan", "Helvetica", 11, currentY, pw, 0, 0, 0)
	currentY += 15
	drawTextCentered(&pdf, "on Assignment", "Helvetica-Italic", 10, currentY, pw, 0.4, 0.4, 0.4)

	currentY += 30
	// Get department assignment titles
	var assignmentTitleId, assignmentTitleEn string
	if settings.Departments != nil {
		if deptData, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
			assignmentTitleId, _ = deptData["assignmentTitleId"].(string)
			assignmentTitleEn, _ = deptData["assignmentTitleEn"].(string)
		}
	}
	if assignmentTitleId != "" {
		drawTextCentered(&pdf, assignmentTitleId, "Helvetica-Bold", 11, currentY, pw, 0, 0, 0)
		currentY += 15
		drawTextCentered(&pdf, assignmentTitleEn, "Helvetica-Italic", 10, currentY, pw, 0.4, 0.4, 0.4)
	}

	currentY += 35
	drawTextCentered(&pdf, "Dengan predikat", "Helvetica", 11, currentY, pw, 0, 0, 0)
	currentY += 15
	drawTextCentered(&pdf, "With Achievement level", "Helvetica-Italic", 10, currentY, pw, 0.4, 0.4, 0.4)

	currentY += 40
	predicate := strings.ToUpper(fmt.Sprintf("%v", student["Predikat"]))
	drawTextCentered(&pdf, predicate, "Helvetica-Bold", 22, currentY, pw, 0, 0, 0)

	currentY += 20
	predicateEn := "COMPETENT"
	pLower := strings.ToLower(strings.TrimSpace(predicate))
	if pLower == "sangat kompeten" {
		predicateEn = "HIGHLY COMPETENT"
	} else if pLower == "belum kompeten" || pLower == "telah mengikuti ukk" {
		predicateEn = "PARTICIPATED IN COMPETENCY ASSESSMENT"
	}
	enFontSize := 14.0
	if len(predicateEn) > 20 {
		enFontSize = 10.0
	}
	drawTextCentered(&pdf, predicateEn, "Helvetica-Bold", enFontSize, currentY, pw, 0, 0, 0)

	// QR Code
	cleanOrigin := strings.TrimSuffix(settings.Origin, "/")
	verifyUrl := fmt.Sprintf("%s/?verify=%s", cleanOrigin, serialStr)
	qrBytes, err := qrcode.Encode(verifyUrl, qrcode.Medium, 200)
	if err == nil {
		qrHolder, err := gopdf.ImageHolderByBytes(qrBytes)
		if err == nil {
			pdf.ImageByHolder(qrHolder, pw-150, ph/2-50, &gopdf.Rect{W: 100, H: 100})
		}
	}

	// Signatures Base Y Coordinate
	sigBaseY := 230.0
	if ph > 900 {
		sigBaseY = 350.0
	}
	dateCity := strings.TrimSpace(settings.City)
	if dateCity == "" {
		dateCity = "Kota"
	}
	dateText := fmt.Sprintf("%s, %s", dateCity, settings.Date)
	drawTextCentered(&pdf, dateText, "Helvetica", 11, ph-sigBaseY, pw, 0, 0, 0)

	sigY := ph - sigBaseY + 40
	sigPadding := 70.0
	columnWidth := (pw - (sigPadding * 2)) / 2
	leftCenterX := sigPadding + (columnWidth / 2)
	rightCenterX := pw - sigPadding - (columnWidth / 2)

	// School Signatory (Left)
	sig1Line1 := "Kepala"
	sig1Line2 := settings.Name
	pdf.SetFont("Helvetica", "", 10)
	w11, _ := pdf.MeasureTextWidth(sig1Line1)
	pdf.SetXY(leftCenterX-w11/2, sigY)
	pdf.Text(sig1Line1)

	w12, _ := pdf.MeasureTextWidth(sig1Line2)
	pdf.SetXY(leftCenterX-w12/2, sigY+12)
	pdf.Text(sig1Line2)

	sig1Name := settings.Signatory
	pdf.SetFont("Helvetica-Bold", "", 11)
	wName1, _ := pdf.MeasureTextWidth(sig1Name)
	pdf.SetXY(leftCenterX-wName1/2, sigY+100)
	pdf.Text(sig1Name)
	pdf.SetLineWidth(1)
	pdf.Line(leftCenterX-wName1/2, sigY+102, leftCenterX+wName1/2, sigY+102)

	sig1Rank := settings.SignatoryRank
	pdf.SetFont("Helvetica", "", 9)
	wRank, _ := pdf.MeasureTextWidth(sig1Rank)
	pdf.SetXY(leftCenterX-wRank/2, sigY+114)
	pdf.Text(sig1Rank)

	if settings.SignatoryNip != "" && settings.SignatoryNip != "-" {
		nipText := fmt.Sprintf("NIP. %s", settings.SignatoryNip)
		wNip, _ := pdf.MeasureTextWidth(nipText)
		pdf.SetXY(leftCenterX-wNip/2, sigY+126)
		pdf.Text(nipText)
	}

	// Industry Signatory (Right)
	// Find Industry fields based on student's Mitra
	indFound := findIndustryData(mitra, settings.Industries)
	sig2Line1 := "Direktur/Manajer/Penjamin Mutu"
	if indFound != nil {
		if leadTitle, ok := indFound["industryLeadTitle"].(string); ok && leadTitle != "" {
			sig2Line1 = leadTitle
		}
	}
	sig2Line2 := settings.IndustryName

	pdf.SetFont("Helvetica", "", 10)
	w21, _ := pdf.MeasureTextWidth(sig2Line1)
	pdf.SetXY(rightCenterX-w21/2, sigY)
	pdf.Text(sig2Line1)

	w22, _ := pdf.MeasureTextWidth(sig2Line2)
	pdf.SetXY(rightCenterX-w22/2, sigY+12)
	pdf.Text(sig2Line2)

	sig2Name := settings.IndustryLeader
	pdf.SetFont("Helvetica-Bold", "", 11)
	wName2, _ := pdf.MeasureTextWidth(sig2Name)
	pdf.SetXY(rightCenterX-wName2/2, sigY+100)
	pdf.Text(sig2Name)
	pdf.Line(rightCenterX-wName2/2, sigY+102, rightCenterX+wName2/2, sigY+102)

	if indFound != nil {
		if rawPos, ok := indFound["assessorPosition"].(string); ok && rawPos != "" {
			pdf.SetFont("Helvetica", "", 10)
			wPos, _ := pdf.MeasureTextWidth(rawPos)
			pdf.SetXY(rightCenterX-wPos/2, sigY+114)
			pdf.Text(rawPos)
		}
		if rawNip, ok := indFound["assessorNip"].(string); ok && rawNip != "" {
			pdf.SetFont("Helvetica", "", 9)
			wNip2, _ := pdf.MeasureTextWidth(rawNip)
			pdf.SetXY(rightCenterX-wNip2/2, sigY+126)
			pdf.Text(rawNip)
		}
	}

	// --- Page 2: Competency List ---
	pdf.AddPage()

	// Page Header Draw helper
	drawPage2Header := func() {
		if req.Settings.Layout != nil {
			if bg, ok := req.Settings.Layout["backgroundImage"].(string); ok && bg != "" {
				bgHolder, err := resolveImageHolder(bg)
				if err == nil {
					_ = pdf.ImageByHolder(bgHolder, 0, 0, &gopdf.Rect{W: pw, H: ph})
				}
			}
		}

		p2TitleId := "DAFTAR KOMPETENSI"
		p2TitleEn := "List Of Competency"
		drawTextCentered(&pdf, p2TitleId, "Helvetica-Bold", 15, 50, pw, 0, 0, 0)
		drawTextCentered(&pdf, p2TitleEn, "Helvetica-Italic", 13, 68, pw, 0.4, 0.4, 0.4)

		pdf.SetFont("Helvetica-Bold", "", 10)
		pdf.SetXY(50, 100)
		pdf.Text("Nama")
		pdf.SetXY(100, 100)
		pdf.SetFont("Helvetica", "", 10)
		pdf.Text(fmt.Sprintf(": %s", studentName))

		pdf.SetFont("Helvetica-Bold", "", 10)
		pdf.SetXY(50, 115)
		pdf.Text("NISN")
		pdf.SetXY(100, 115)
		pdf.SetFont("Helvetica", "", 10)
		pdf.Text(fmt.Sprintf(": %v", student["NISN"]))
	}

	drawPage2Header()

	// Extract competencies: prefer per-student, fallback to department
	var competencies []interface{}
	if studentComp, ok := student["competencies"]; ok && studentComp != nil {
		if compList, ok2 := studentComp.([]interface{}); ok2 && len(compList) > 0 {
			competencies = compList
		}
	}
	if len(competencies) == 0 && settings.Departments != nil {
		if deptData, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
			if list, ok2 := deptData["competencies"].([]interface{}); ok2 {
				competencies = list
			}
		}
	}

	col1X := 50.0
	col2X := 90.0
	col3X := 220.0
	statusColX := pw - 175.0
	colEnd := pw - 50.0
	tableWidth := pw - 100.0

	isLongList := len(competencies) > 25
	isVeryLongList := len(competencies) > 35

	baseFontSize := 9.5
	baseRowHeight := 19.0
	tableHeaderY := 165.0

	if isVeryLongList {
		baseFontSize = 7.0
		baseRowHeight = 11.2
		tableHeaderY = 135.0
	} else if isLongList {
		baseFontSize = 8.5
		baseRowHeight = 16.0
		tableHeaderY = 145.0
	}

	drawTableHeader := func(y float64) float64 {
		hHeight := 40.0
		if isVeryLongList {
			hHeight = 18.0
		} else if isLongList {
			hHeight = 25.0
		}

		// Draw border
		pdf.SetLineWidth(1)
		pdf.SetStrokeColor(0, 0, 0)
		pdf.Rectangle(col1X, y, col1X+tableWidth, y+hHeight, "D", 0, 0)

		titleY := y + 18.0
		subtitleY := y + 32.0

		if isVeryLongList {
			titleY = y + 11.0
		} else if isLongList {
			titleY = y + 14.0
			subtitleY = y + 28.0
		}

		pdf.SetFont("Helvetica-Bold", "", baseFontSize)
		pdf.SetXY(col1X+4, titleY)
		pdf.Text("NO")

		pdf.SetXY(col2X+8, titleY)
		pdf.Text("Kode Kompetensi")
		if !isLongList {
			pdf.SetFont("Helvetica-Italic", "", 8)
			pdf.SetXY(col2X+8, subtitleY)
			pdf.Text("Code of Competency")
		}

		pdf.SetFont("Helvetica-Bold", "", baseFontSize)
		pdf.SetXY(col3X+8, titleY)
		pdf.Text("Judul Kompetensi")
		if !isLongList {
			pdf.SetFont("Helvetica-Italic", "", 8)
			pdf.SetXY(col3X+8, subtitleY)
			pdf.Text("Title of Competency")
		}

		pdf.SetFont("Helvetica-Bold", "", baseFontSize)
		pdf.SetXY(statusColX+4, titleY)
		pdf.Text("Keterangan")
		if !isLongList {
			pdf.SetFont("Helvetica-Italic", "", 8)
			pdf.SetXY(statusColX+4, subtitleY)
			pdf.Text("Status")
		}

		// vertical dividers
		pdf.Line(col2X, y, col2X, y+hHeight)
		pdf.Line(col3X, y, col3X, y+hHeight)
		pdf.Line(statusColX, y, statusColX, y+hHeight)

		return y + hHeight
	}

	tableY := drawTableHeader(tableHeaderY)

	for i, c := range competencies {
		compMap, ok := c.(map[string]interface{})
		if !ok {
			continue
		}

		code, _ := compMap["code"].(string)
		title, _ := compMap["title"].(string)
		compStatus, _ := compMap["status"].(string)
		if compStatus == "" {
			compStatus = "Kompeten" // default if not set
		}

		titleMaxWidth := statusColX - col3X - 16
		titleLines := wrapText(&pdf, title, titleMaxWidth, "Helvetica", baseFontSize)

		lineSpacing := 2.0
		verticalPadding := 6.0
		if isVeryLongList {
			lineSpacing = 1.0
			verticalPadding = 1.5
		}

		textHeight := float64(len(titleLines)) * (baseFontSize + lineSpacing)
		actualRowHeight := baseRowHeight
		if textHeight+verticalPadding > actualRowHeight {
			actualRowHeight = textHeight + verticalPadding
		}

		// Page break validation
		if tableY+actualRowHeight > ph-40 {
			pdf.AddPage()
			drawPage2Header()
			tableY = drawTableHeader(125.0)
		}

		// Draw row rect
		pdf.Rectangle(col1X, tableY, col1X+tableWidth, tableY+actualRowHeight, "D", 0, 0)

		contentMidY := tableY + (actualRowHeight / 2) - (baseFontSize / 3)
		pdf.SetFont("Helvetica", "", baseFontSize)
		pdf.SetXY(col1X+4, contentMidY)
		pdf.Text(fmt.Sprintf("%d.", i+1))

		pdf.SetXY(col2X+8, contentMidY)
		pdf.Text(code)

		// Draw wrapped title lines
		titleStartY := tableY + (actualRowHeight-textHeight)/2 + baseFontSize
		for lineIdx, line := range titleLines {
			pdf.SetXY(col3X+8, titleStartY+(float64(lineIdx)*(baseFontSize+lineSpacing)))
			pdf.Text(line)
		}

		// Draw status with color
		isKompeten := !strings.Contains(strings.ToLower(compStatus), "belum")
		if isKompeten {
			pdf.SetTextColor(0, 128, 0) // green for Kompeten
		} else {
			pdf.SetTextColor(200, 0, 0) // red for Belum Kompeten
		}
		pdf.SetFont("Helvetica-Bold", "", baseFontSize-0.5)
		statusMaxW := colEnd - statusColX - 8
		statusLines := wrapText(&pdf, compStatus, statusMaxW, "Helvetica-Bold", baseFontSize-0.5)
		statusTextH := float64(len(statusLines)) * (baseFontSize + lineSpacing)
		statusStartY := tableY + (actualRowHeight-statusTextH)/2 + baseFontSize - 0.5
		for sIdx, sl := range statusLines {
			pdf.SetXY(statusColX+4, statusStartY+float64(sIdx)*(baseFontSize+lineSpacing))
			pdf.Text(sl)
		}
		pdf.SetTextColor(0, 0, 0) // reset to black

		// Draw vertical lines
		pdf.Line(col2X, tableY, col2X, tableY+actualRowHeight)
		pdf.Line(col3X, tableY, col3X, tableY+actualRowHeight)
		pdf.Line(statusColX, tableY, statusColX, tableY+actualRowHeight)

		tableY += actualRowHeight
	}

	// Footer examiners block
	if tableY+130 > ph {
		pdf.AddPage()
		drawPage2Header()
		tableY = 125.0
	}

	footerY := tableY + 25.0
	if isVeryLongList {
		footerY = tableY + 15.0
	}

	fontSize := 10.0
	subLabelSize := 9.0
	lineGap := 13.0
	blockGap := 30.0
	if isVeryLongList {
		fontSize = 9.0
		subLabelSize = 8.0
		lineGap = 10.0
		blockGap = 15.0
	}

	internalExaminerName := fmt.Sprintf("%v", student["Penguji Internal"])
	if internalExaminerName == "" || internalExaminerName == "<nil>" {
		internalExaminerName = "Nama Penguji Internal"
	}

	// Internal Examiner
	pdf.SetFont("Helvetica-Bold", "", fontSize)
	pdf.SetXY(50, footerY)
	pdf.Text("PENGUJI INTERNAL")
	pdf.SetFont("Helvetica-Italic", "", subLabelSize)
	pdf.SetXY(50, footerY+lineGap)
	pdf.Text("INTERNAL ASSESSOR")

	pdf.SetFont("Helvetica", "", fontSize)
	pdf.SetXY(180, footerY+lineGap/2)
	pdf.Text(fmt.Sprintf(": %s", internalExaminerName))

	// External Examiner
	yE := footerY + lineGap + blockGap
	pdf.SetFont("Helvetica-Bold", "", fontSize)
	pdf.SetXY(50, yE)
	pdf.Text("PENGUJI EKSTERNAL")
	pdf.SetFont("Helvetica-Italic", "", subLabelSize)
	pdf.SetXY(50, yE+lineGap)
	pdf.Text("EXTERNAL ASSESSOR")

	// Parse Examiners
	extRaw := fmt.Sprintf("%v", student["Penguji Eksternal"])
	if extRaw == "" || extRaw == "<nil>" {
		extRaw = settings.IndustryLeader
	}
	externalCompany := settings.IndustryName

	// Split by semicolon or pipe
	var extExaminers []string
	if strings.Contains(extRaw, ";") {
		extExaminers = strings.Split(extRaw, ";")
	} else if strings.Contains(extRaw, "|") {
		extExaminers = strings.Split(extRaw, "|")
	} else {
		extExaminers = []string{extRaw}
	}

	primaryExt := "Very Setiawan"
	if len(extExaminers) > 0 && strings.TrimSpace(extExaminers[0]) != "" {
		primaryExt = strings.TrimSpace(extExaminers[0])
	}

	pdf.SetFont("Helvetica", "", fontSize)
	pdf.SetXY(180, yE+lineGap/2)
	pdf.Text(fmt.Sprintf(": %s (%s)", primaryExt, externalCompany))

	if len(extExaminers) > 1 && strings.TrimSpace(extExaminers[1]) != "" {
		secondaryExt := strings.TrimSpace(extExaminers[1])
		pdf.SetXY(180, yE+lineGap/2+15)
		pdf.Text(fmt.Sprintf("  %s (%s)", secondaryExt, externalCompany))
	}

	w.Header().Set("Content-Type", "application/pdf")
	_ = pdf.Write(w)
}

func renderSkillPassportPDF(pdf *gopdf.GoPdf, student map[string]interface{}, settings CertSettings, pw, ph float64, certificateType string) {
	if strings.EqualFold(strings.TrimSpace(certificateType), "lsp") {
		renderLSPSchemePDF(pdf, student, settings, pw, ph)
		return
	}
	pdf.AddPage()

	marginX := 62.0
	currentY := 24.0

	schoolName := strings.TrimSpace(settings.Name)
	if schoolName == "" {
		schoolName = "NAMA SEKOLAH"
	}
	schoolAddress := strings.TrimSpace(settings.Address)
	if schoolAddress == "" {
		schoolAddress = "Alamat sekolah"
	}
	dateCity := strings.TrimSpace(settings.City)
	if dateCity == "" {
		dateCity = "Kota"
	}

	isLSP := strings.EqualFold(strings.TrimSpace(certificateType), "lsp")
	if isLSP {
		currentY = drawLSPLetterhead(pdf, settings, marginX, currentY, pw)
	} else {
		provinceName := strings.TrimSpace(settings.ProvinceName)
		if provinceName == "" {
			provinceName = "PEMERINTAH PROVINSI JAWA TIMUR"
		}
		educationOffice := strings.TrimSpace(settings.EducationOffice)
		if educationOffice == "" {
			educationOffice = "DINAS PENDIDIKAN"
		}

		if strings.TrimSpace(settings.ProvinceLogo) != "" {
			if logoHolder, err := resolveImageHolder(settings.ProvinceLogo); err == nil {
				lw, lh := scaleImage(settings.ProvinceLogo, 64, 70)
				pdf.ImageByHolder(logoHolder, marginX+5+(64-lw)/2, currentY+(70-lh)/2, &gopdf.Rect{W: lw, H: lh})
			}
		}

		drawTextCentered(pdf, strings.ToUpper(provinceName), "Helvetica", 13, currentY+2, pw, 0, 0, 0)
		drawTextCentered(pdf, strings.ToUpper(educationOffice), "Helvetica", 13, currentY+17, pw, 0, 0, 0)
		drawTextCentered(pdf, strings.ToUpper(schoolName), "Helvetica-Bold", 18, currentY+34, pw, 0, 0, 0)
		drawTextCentered(pdf, schoolAddress, "Helvetica", 11, currentY+54, pw, 0, 0, 0)
		contactParts := []string{}
		if strings.TrimSpace(settings.Phone) != "" {
			contactParts = append(contactParts, "Telepon "+strings.TrimSpace(settings.Phone))
		}
		if strings.TrimSpace(settings.Email) != "" {
			contactParts = append(contactParts, "Pos-el "+strings.TrimSpace(settings.Email))
		}
		if len(contactParts) > 0 {
			drawTextCentered(pdf, strings.Join(contactParts, ", "), "Helvetica", 10.5, currentY+69, pw, 0, 0, 0)
		}
		currentY += 88
	}
	pdf.SetLineWidth(2)
	pdf.Line(marginX, currentY, pw-marginX, currentY)

	currentY += 31
	drawTextCentered(pdf, "SURAT KETERANGAN (SKILL PASSPORT)", "Helvetica-Bold", 16, currentY, pw, 0, 0, 0)
	currentY += 18
	drawTextCentered(pdf, "UJI KOMPETENSI KEAHLIAN", "Helvetica-Bold", 16, currentY, pw, 0, 0, 0)
	currentY += 17
	drawTextCentered(pdf, fmt.Sprintf("NOMOR: %s", resolveDocumentNumber(student, settings, certificateType)), "Helvetica-Bold", 10.5, currentY, pw, 0, 0, 0)

	currentY += 36
	pdf.SetFont("Helvetica", "", 11.5)
	pdf.SetXY(marginX, currentY)
	if isLSP {
		pdf.Text("Direktur LSP menerangkan bahwa :")
	} else {
		pdf.Text(fmt.Sprintf("Kepala %s menerangkan bahwa :", schoolName))
	}

	currentY += 24
	labelX := marginX
	colonX := marginX + 132
	valueX := marginX + 146
	rowGap := 18.0
	writeInfoRow := func(label, value string) {
		pdf.SetFont("Helvetica", "", 11.5)
		pdf.SetXY(labelX, currentY)
		pdf.Text(label)
		pdf.SetXY(colonX, currentY)
		pdf.Text(":")
		pdf.SetFont("Helvetica", "", 11.5)
		pdf.SetXY(valueX, currentY)
		pdf.Text(value)
		currentY += rowGap
	}

	jurusanName := valueFromStudent(student, "Jurusan")
	programName, concentrationName := resolveDepartmentIdentity(jurusanName, settings)
	writeInfoRow("Nama Asesi", valueFromStudent(student, "Nama Siswa"))
	writeInfoRow("NIS/NISN", strings.Trim(strings.TrimSpace(valueFromStudent(student, "NIS"))+"/"+strings.TrimSpace(valueFromStudent(student, "NISN")), "/"))
	writeInfoRow("Program Keahlian", programName)
	writeInfoRow("Konsentrasi Keahlian", concentrationName)
	writeInfoRow("Kelas", valueFromStudent(student, "Kelas"))

	serialStr := valueFromStudent(student, "Nomor Seri")
	if serialStr != "" {
		cleanOrigin := strings.TrimSuffix(settings.Origin, "/")
		verifyURL := fmt.Sprintf("%s/?verify=%s", cleanOrigin, serialStr)
		if qrBytes, err := qrcode.Encode(verifyURL, qrcode.Medium, 180); err == nil {
			if qrHolder, err := gopdf.ImageHolderByBytes(qrBytes); err == nil {
				qrSize := 72.0
				qrX := pw - marginX - qrSize
				qrY := currentY - (rowGap * 5) - 18
				pdf.ImageByHolder(qrHolder, qrX, qrY, &gopdf.Rect{W: qrSize, H: qrSize})
				pdf.SetFont("Helvetica-Bold", "", 7.5)
				caption := "Kode Sertifikat"
				captionWidth, _ := pdf.MeasureTextWidth(caption)
				pdf.SetXY(qrX+(qrSize-captionWidth)/2, qrY+qrSize+4)
				pdf.Text(caption)
				pdf.SetFont("Helvetica", "", 7.2)
				serialWidth, _ := pdf.MeasureTextWidth(serialStr)
				pdf.SetXY(qrX+(qrSize-serialWidth)/2, qrY+qrSize+14)
				pdf.Text(serialStr)
			}
		}
	}

	assignmentTitle := resolveAssignmentTitle(jurusanName, settings)
	if assignmentTitle == "" {
		assignmentTitle = jurusanName
	}

	currentY += 26
	leadText := fmt.Sprintf("Telah mengikuti Uji Kompetensi Keahlian pada penugasan %s dengan keterangan pada unit di bawah ini :", strings.ToLower(assignmentTitle))
	pdf.SetFont("Helvetica", "", 11.5)
	for _, line := range wrapText(pdf, leadText, pw-(marginX*2), "Helvetica", 11.5) {
		pdf.SetXY(marginX, currentY)
		pdf.Text(line)
		currentY += 18
	}

	currentY += 14
	competencies := resolveSkillPassportCompetencies(student, settings, jurusanName)
	currentY = drawSkillPassportTable(pdf, competencies, marginX, currentY, pw, ph)

	if currentY+305 > ph {
		pdf.AddPage()
		currentY = 46
	}

	currentY += 28
	pdf.SetFont("Helvetica", "", 11.5)
	closingLines := wrapText(pdf, "Demikian surat keterangan ini kami sampaikan untuk dipergunakan sebagaimana mestinya.", pw-(marginX*2), "Helvetica", 11.5)
	for _, line := range closingLines {
		pdf.SetXY(marginX, currentY)
		pdf.Text(line)
		currentY += 16
	}

	leftX := marginX + 2
	tableRightX := pw - marginX - 2
	signatureColumnWidth := (tableRightX - leftX) / 2
	rightX := leftX + signatureColumnWidth
	signY := currentY + 4
	kakonliName, kakonliNip := resolveCompetencyHead(jurusanName, settings)
	examinerName, examinerNip := resolveInternalExaminer(student, jurusanName, settings)
	departmentCode := departmentAbbreviation(jurusanName)
	drawTextCenteredInArea(pdf, fmt.Sprintf("%s, %s", dateCity, settings.Date), "Helvetica-Bold", 10.5, signY, rightX, signatureColumnWidth, 0, 0, 0)
	drawTextCenteredInArea(pdf, "Mengetahui,", "Helvetica-Bold", 11.5, signY+132, leftX, signatureColumnWidth, 0, 0, 0)
	if isLSP {
		drawSignatureBlock(pdf, "Manajer Sertifikasi", settings.CertificationManager, "", "", leftX, signatureColumnWidth, signY+18)
		drawSignatureBlock(pdf, "Asesor", examinerName, examinerNip, "Reg MET.", rightX, signatureColumnWidth, signY+18)
		drawSignatureBlock(pdf, "Kepala Sekolah", settings.Signatory, settings.SignatoryNip, "NIP.", leftX, signatureColumnWidth, signY+147)
		drawSignatureBlock(pdf, "Direktur LSP", settings.LspDirector, "", "", rightX, signatureColumnWidth, signY+147)
	} else {
		drawSignatureBlock(pdf, fmt.Sprintf("Kakonli %s", departmentCode), kakonliName, kakonliNip, "NIP.", leftX, signatureColumnWidth, signY+18)
		drawSignatureBlock(pdf, "Penguji", examinerName, examinerNip, "NIP.", rightX, signatureColumnWidth, signY+18)
		drawSignatureBlock(pdf, "Kepala Sekolah", settings.Signatory, settings.SignatoryNip, "NIP.", leftX, signatureColumnWidth, signY+147)
		drawSignatureBlock(pdf, "Waka Kurikulum", settings.VicePrincipalCurriculum, settings.VicePrincipalCurriculumNip, "NIP.", rightX, signatureColumnWidth, signY+147)
	}
}

func renderLSPSchemePDF(pdf *gopdf.GoPdf, student map[string]interface{}, settings CertSettings, pw, ph float64) {
	pdf.AddPage()
	marginX := 42.0
	currentY := drawLSPLetterhead(pdf, settings, marginX, 22, pw)
	pdf.SetLineWidth(2)
	pdf.Line(marginX, currentY, pw-marginX, currentY)

	jurusanName := valueFromStudent(student, "Jurusan")
	expertiseField, programName, concentrationName, standardReference, schemeType, schemeName := resolveLSPDepartmentIdentity(jurusanName, settings)
	currentY += 35
	for _, line := range wrapText(pdf, strings.ToUpper(strings.TrimSpace(schemeType+" "+schemeName)), pw-(marginX*2), "Helvetica-Italic", 18) {
		drawTextCentered(pdf, line, "Helvetica-Italic", 18, currentY, pw, 0, 0, 0)
		currentY += 24
	}
	currentY += 10
	drawFittedCenteredText := func(text string, fontName string, maxFont, minFont, y, maxWidth float64) {
		fontSize := maxFont
		for fontSize > minFont {
			pdf.SetFont(fontName, "", fontSize)
			if w, _ := pdf.MeasureTextWidth(text); w <= maxWidth {
				break
			}
			fontSize -= 0.5
		}
		drawTextCentered(pdf, text, fontName, fontSize, y, pw, 0, 0, 0)
	}
	drawFittedCenteredText("PADA KOMPETENSI KEAHLIAN "+strings.ToUpper(concentrationName), "Helvetica-Italic", 15, 9.5, currentY, pw-(marginX*2))
	currentY += 21

	currentY += 24
	labelX := marginX + 4
	colonX := marginX + 165
	valueX := colonX + 18
	rowGap := 27.0
	qrSize := 68.0
	qrX := pw - marginX - qrSize
	valueMaxW := qrX - valueX - 18
	writeRow := func(label, value string) {
		pdf.SetFont("Helvetica", "", 12.5)
		pdf.SetXY(labelX, currentY)
		pdf.Text(label)
		pdf.SetXY(colonX, currentY)
		pdf.Text(":")
		valueFont := 12.5
		for valueFont > 9.5 {
			pdf.SetFont("Helvetica", "", valueFont)
			if w, _ := pdf.MeasureTextWidth(value); w <= valueMaxW {
				break
			}
			valueFont -= 0.5
		}
		pdf.SetXY(valueX, currentY)
		pdf.Text(value)
		currentY += rowGap
	}
	writeRow("Nama Asesi", valueFromStudent(student, "Nama Siswa"))
	writeRow("Bidang Keahlian", expertiseField)
	writeRow("Program Keahlian", programName)
	writeRow("Kompetensi Keahlian", concentrationName)
	writeRow("Acuan Standar", standardReference)

	serialStr := valueFromStudent(student, "Nomor Seri")
	if serialStr != "" {
		cleanOrigin := strings.TrimSuffix(settings.Origin, "/")
		verifyURL := fmt.Sprintf("%s/?verify=%s", cleanOrigin, serialStr)
		if qrBytes, err := qrcode.Encode(verifyURL, qrcode.Medium, 180); err == nil {
			if qrHolder, err := gopdf.ImageHolderByBytes(qrBytes); err == nil {
				qrY := currentY - (rowGap * 5) - 18
				pdf.ImageByHolder(qrHolder, qrX, qrY, &gopdf.Rect{W: qrSize, H: qrSize})
				drawTextCenteredInArea(pdf, "Kode Sertifikat", "Helvetica-Bold", 7.5, qrY+70, qrX-8, qrSize+16, 0, 0, 0)
				drawTextCenteredInArea(pdf, serialStr, "Helvetica", 7, qrY+81, qrX-8, qrSize+16, 0, 0, 0)
			}
		}
	}

	competencies := resolveSkillPassportCompetencies(student, settings, jurusanName)
	currentY += 12
	currentY = drawSkillPassportTable(pdf, competencies, marginX, currentY, pw, ph)
	if currentY+285 > ph {
		pdf.AddPage()
		currentY = 46
	}

	leftX := marginX + 2
	rightEdge := pw - marginX - 2
	columnWidth := (rightEdge - leftX) / 2
	rightX := leftX + columnWidth
	signY := currentY + 28
	examinerName, examinerRegMet := resolveInternalExaminer(student, jurusanName, settings)
	drawTextCenteredInArea(pdf, fmt.Sprintf("%s, %s", strings.TrimSpace(settings.City), settings.Date), "Helvetica-Bold", 10.5, signY, rightX, columnWidth, 0, 0, 0)
	drawSignatureBlock(pdf, "Manajer Sertifikasi", settings.CertificationManager, "", "", leftX, columnWidth, signY+18)
	drawSignatureBlock(pdf, "Asesor", examinerName, examinerRegMet, "Reg MET.", rightX, columnWidth, signY+18)
	drawTextCenteredInArea(pdf, "Mengetahui,", "Helvetica-Bold", 11.5, signY+132, leftX, columnWidth, 0, 0, 0)
	drawSignatureBlock(pdf, "Kepala Sekolah", settings.Signatory, settings.SignatoryNip, "NIP.", leftX, columnWidth, signY+147)
	drawSignatureBlock(pdf, "Direktur LSP", settings.LspDirector, "", "", rightX, columnWidth, signY+147)
}

func resolveLSPDepartmentIdentity(jurusanName string, settings CertSettings) (string, string, string, string, string, string) {
	expertiseField := "-"
	programName := "-"
	concentrationName := strings.TrimSpace(jurusanName)
	standardReference := "-"
	schemeType := "SKEMA"
	schemeName := "SERTIFIKASI"
	if concentrationName == "" {
		concentrationName = "-"
	}
	read := func(dept map[string]interface{}) {
		if value, ok := dept["expertiseField"].(string); ok && strings.TrimSpace(value) != "" {
			expertiseField = strings.TrimSpace(value)
		}
		if value, ok := dept["skillProgram"].(string); ok && strings.TrimSpace(value) != "" {
			programName = strings.TrimSpace(value)
		}
		if value, ok := dept["skillConcentration"].(string); ok && strings.TrimSpace(value) != "" {
			concentrationName = strings.TrimSpace(value)
		}
		if value, ok := dept["standardReferenceLSP"].(string); ok && strings.TrimSpace(value) != "" {
			standardReference = strings.TrimSpace(value)
		}
		if value, ok := dept["lspSchemeType"].(string); ok && strings.TrimSpace(value) != "" {
			schemeType = strings.TrimSpace(value)
		}
		if value, ok := dept["lspSchemeName"].(string); ok && strings.TrimSpace(value) != "" {
			schemeName = strings.TrimSpace(value)
		}
	}
	if dept, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
		read(dept)
	} else {
		for _, rawDept := range settings.Departments {
			dept, ok := rawDept.(map[string]interface{})
			if !ok {
				continue
			}
			name, _ := dept["name"].(string)
			if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(jurusanName)) {
				read(dept)
				break
			}
		}
	}
	return expertiseField, programName, concentrationName, standardReference, schemeType, schemeName
}

func drawLSPLetterhead(pdf *gopdf.GoPdf, settings CertSettings, marginX, currentY, pw float64) float64 {
	drawLogo := func(source string, x float64) {
		if strings.TrimSpace(source) == "" {
			return
		}
		if holder, err := resolveImageHolder(source); err == nil {
			lw, lh := scaleImage(source, 62, 72)
			pdf.ImageByHolder(holder, x+(62-lw)/2, currentY+(72-lh)/2, &gopdf.Rect{W: lw, H: lh})
		}
	}
	drawLogo(settings.LspLogo, marginX+2)
	drawLogo(settings.BnspLogo, pw-marginX-64)

	headerName := strings.TrimSpace(settings.LspHeaderName)
	if headerName == "" {
		headerName = "LEMBAGA SERTIFIKASI PROFESI (LSP)"
	}
	lspSchoolName := strings.TrimSpace(settings.LspSchoolName)
	if lspSchoolName == "" {
		lspSchoolName = settings.Name
	}
	drawTextCentered(pdf, strings.ToUpper(headerName), "Helvetica-Bold", 13.5, currentY+1, pw, 0, 0, 0)
	drawTextCentered(pdf, strings.ToUpper(lspSchoolName), "Helvetica-Bold", 17, currentY+18, pw, 0, 0, 0)
	if license := strings.TrimSpace(settings.LspLicenseNumber); license != "" {
		drawTextCentered(pdf, "No. Lisensi: "+license, "Helvetica-Bold", 12.5, currentY+39, pw, 220, 0, 0)
	}
	addressLine := strings.TrimSpace(settings.LspAddress)
	if phone := strings.TrimSpace(settings.LspPhoneFax); phone != "" {
		addressLine = strings.TrimSpace(addressLine + "  Telp/Faks " + phone)
	}
	if addressLine != "" {
		drawTextCentered(pdf, addressLine, "Helvetica", 9.5, currentY+57, pw, 0, 0, 0)
	}
	contactParts := []string{}
	if email := strings.TrimSpace(settings.LspEmail); email != "" {
		contactParts = append(contactParts, "Email: "+email)
	}
	if website := strings.TrimSpace(settings.LspWebsite); website != "" {
		contactParts = append(contactParts, "Website: "+website)
	}
	if len(contactParts) > 0 {
		drawTextCentered(pdf, strings.Join(contactParts, "   "), "Helvetica", 9.5, currentY+71, pw, 0, 0, 0)
	}
	return currentY + 91
}

func drawSignatureBlock(pdf *gopdf.GoPdf, title, name, identifier, identifierLabel string, x, width, y float64) {
	drawTextCenteredInArea(pdf, title, "Helvetica-Bold", 11.5, y, x, width, 0, 0, 0)
	name = strings.TrimSpace(name)
	if name == "" {
		name = "-"
	}
	drawTextCenteredInArea(pdf, name, "Helvetica-Bold", 11.5, y+64, x, width, 0, 0, 0)
	identifier = strings.TrimSpace(identifier)
	identifierLabel = strings.TrimSpace(identifierLabel)
	if identifierLabel == "" {
		return
	}
	if identifier == "" {
		identifier = "-"
	}
	drawTextCenteredInArea(pdf, fmt.Sprintf("%s %s", identifierLabel, identifier), "Helvetica-Bold", 9.5, y+78, x, width, 0, 0, 0)
}

func resolveInternalExaminer(student map[string]interface{}, jurusanName string, settings CertSettings) (string, string) {
	name := strings.TrimSpace(valueFromStudent(student, "Penguji Internal"))
	studentNip := strings.TrimSpace(valueFromStudent(student, "NIP/Reg Met Penguji"))
	if studentNip != "" && studentNip != "-" {
		return name, studentNip
	}
	if settings.Departments == nil {
		return name, ""
	}
	findInDepartment := func(deptData map[string]interface{}) string {
		rawExaminers, ok := deptData["internalExaminers"].([]interface{})
		if !ok {
			return ""
		}
		for _, rawExaminer := range rawExaminers {
			examiner, ok := rawExaminer.(map[string]interface{})
			if !ok {
				continue
			}
			examinerName := strings.TrimSpace(fmt.Sprintf("%v", examiner["name"]))
			if strings.EqualFold(examinerName, name) {
				nipValue := strings.TrimSpace(fmt.Sprintf("%v", examiner["nip"]))
				if nipValue == "<nil>" {
					return ""
				}
				return nipValue
			}
		}
		return ""
	}
	if deptData, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
		return name, findInDepartment(deptData)
	}
	return name, ""
}

func resolveCompetencyHead(jurusanName string, settings CertSettings) (string, string) {
	if settings.Departments == nil {
		return "", ""
	}
	readHead := func(deptData map[string]interface{}) (string, string) {
		name, _ := deptData["competencyHeadName"].(string)
		nip, _ := deptData["competencyHeadNip"].(string)
		return strings.TrimSpace(name), strings.TrimSpace(nip)
	}
	if deptData, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
		return readHead(deptData)
	}
	for _, rawDept := range settings.Departments {
		deptData, ok := rawDept.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := deptData["name"].(string)
		if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(jurusanName)) {
			return readHead(deptData)
		}
	}
	return "", ""
}

func departmentAbbreviation(name string) string {
	normalized := strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(name)), " "))
	knownAbbreviations := map[string]string{
		"teknik kendaraan ringan":      "TKR",
		"teknik sepeda motor":          "TSM",
		"teknik komputer dan jaringan": "TKJ",
		"teknik elektronika industri":  "TEI",
		"kuliner":                      "KL",
		"bisnis digital":               "BD",
		"akuntansi keuangan lembaga":   "AKL",
		"akuntansi keungan lembaga":    "AKL",
	}
	if abbreviation, ok := knownAbbreviations[normalized]; ok {
		return abbreviation
	}

	ignored := map[string]bool{"dan": true, "of": true, "the": true, "konsentrasi": true, "keahlian": true}
	parts := strings.Fields(name)
	var abbreviation strings.Builder
	for _, part := range parts {
		clean := strings.Trim(part, "-_/.,()")
		if clean == "" || ignored[strings.ToLower(clean)] {
			continue
		}
		abbreviation.WriteString(strings.ToUpper(string([]rune(clean)[0])))
	}
	if abbreviation.Len() == 0 {
		return "-"
	}
	return abbreviation.String()
}

func resolveDocumentNumber(student map[string]interface{}, settings CertSettings, certificateType string) string {
	schoolNumber := strings.TrimSpace(valueFromStudent(student, "Nomor Surat"))
	isLSP := strings.EqualFold(strings.TrimSpace(certificateType), "lsp")
	if settings.DocumentNumbering != nil {
		docFormat, _ := settings.DocumentNumbering["format"].(string)
		lspFormat, _ := settings.DocumentNumbering["lspFormat"].(string)
		docYear, _ := settings.DocumentNumbering["year"].(string)
		if !isLSP || strings.TrimSpace(lspFormat) == "" {
			if schoolNumber != "" && schoolNumber != "-" && schoolNumber != "<nil>" {
				return schoolNumber
			}
		} else {
			docFormat = lspFormat
		}
		if docFormat != "" {
			if docYear == "" {
				docYear = valueFromStudent(student, "Tahun Lulus")
			}
			serial := valueFromStudent(student, "Nomor Seri")
			if schoolNumber != "" && schoolNumber != "-" && schoolNumber != "<nil>" {
				parts := strings.Split(schoolNumber, "/")
				if lastPart := strings.TrimSpace(parts[len(parts)-1]); lastPart != "" {
					serial = lastPart
				}
			}
			docNo := strings.ReplaceAll(docFormat, "{YEAR}", docYear)
			docNo = strings.ReplaceAll(docNo, "{SERIAL}", serial)
			return docNo
		}
	}
	if schoolNumber != "" && schoolNumber != "-" && schoolNumber != "<nil>" {
		return schoolNumber
	}
	return "-"
}

func resolveAssignmentTitle(jurusanName string, settings CertSettings) string {
	if settings.Departments == nil {
		return ""
	}
	if deptData, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
		if title, ok := deptData["assignmentTitleId"].(string); ok {
			return strings.TrimSpace(title)
		}
	}
	for _, rawDept := range settings.Departments {
		deptData, ok := rawDept.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := deptData["name"].(string)
		if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(jurusanName)) {
			title, _ := deptData["assignmentTitleId"].(string)
			return strings.TrimSpace(title)
		}
	}
	return ""
}

func resolveDepartmentIdentity(jurusanName string, settings CertSettings) (string, string) {
	programName := "-"
	concentrationName := strings.TrimSpace(jurusanName)
	if concentrationName == "" {
		concentrationName = "-"
	}

	readIdentity := func(deptData map[string]interface{}) (string, string) {
		program, _ := deptData["skillProgram"].(string)
		concentration, _ := deptData["skillConcentration"].(string)
		program = strings.TrimSpace(program)
		concentration = strings.TrimSpace(concentration)
		if program == "" {
			program = "-"
		}
		if concentration == "" {
			concentration = concentrationName
		}
		return program, concentration
	}

	if settings.Departments == nil {
		return programName, concentrationName
	}
	if deptData, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
		return readIdentity(deptData)
	}
	for _, rawDept := range settings.Departments {
		deptData, ok := rawDept.(map[string]interface{})
		if !ok {
			continue
		}
		name, _ := deptData["name"].(string)
		if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(jurusanName)) {
			return readIdentity(deptData)
		}
	}
	return programName, concentrationName
}

func resolveSkillPassportCompetencies(student map[string]interface{}, settings CertSettings, jurusanName string) []map[string]string {
	statusByCode := map[string]string{}
	statusByTitle := map[string]string{}
	if studentComps, ok := student["competencies"].([]interface{}); ok {
		for _, rawComp := range studentComps {
			compMap, ok := rawComp.(map[string]interface{})
			if !ok {
				continue
			}
			code := strings.TrimSpace(fmt.Sprintf("%v", compMap["code"]))
			title := strings.TrimSpace(fmt.Sprintf("%v", compMap["title"]))
			status := strings.TrimSpace(fmt.Sprintf("%v", compMap["status"]))
			if status != "" && status != "<nil>" {
				if code != "" && code != "<nil>" {
					statusByCode[strings.ToLower(code)] = status
				}
				if title != "" && title != "<nil>" {
					statusByTitle[strings.ToLower(title)] = status
				}
			}
		}
	}

	var rawList []interface{}
	if settings.Departments != nil {
		if deptData, ok := settings.Departments[jurusanName].(map[string]interface{}); ok {
			rawList, _ = deptData["competencies"].([]interface{})
		}
		if len(rawList) == 0 {
			for _, rawDept := range settings.Departments {
				deptData, ok := rawDept.(map[string]interface{})
				if !ok {
					continue
				}
				name, _ := deptData["name"].(string)
				if strings.EqualFold(strings.TrimSpace(name), strings.TrimSpace(jurusanName)) {
					rawList, _ = deptData["competencies"].([]interface{})
					break
				}
			}
		}
	}
	if len(rawList) == 0 {
		rawList, _ = student["competencies"].([]interface{})
	}

	competencies := []map[string]string{}
	for _, rawComp := range rawList {
		compMap, ok := rawComp.(map[string]interface{})
		if !ok {
			continue
		}
		code := strings.TrimSpace(fmt.Sprintf("%v", compMap["code"]))
		title := strings.TrimSpace(fmt.Sprintf("%v", compMap["title"]))
		status := strings.TrimSpace(fmt.Sprintf("%v", compMap["status"]))
		if status == "" || status == "<nil>" {
			status = statusByCode[strings.ToLower(code)]
		}
		if status == "" {
			status = statusByTitle[strings.ToLower(title)]
		}
		if code == "<nil>" {
			code = ""
		}
		if title == "<nil>" {
			title = ""
		}
		if status == "" || status == "<nil>" {
			continue
		}
		competencies = append(competencies, map[string]string{
			"code":   code,
			"title":  title,
			"status": status,
		})
	}
	return competencies
}

func drawSkillPassportTable(pdf *gopdf.GoPdf, competencies []map[string]string, marginX, y, pw, ph float64) float64 {
	tableX := marginX + 2
	codeW := 92.0
	infoW := 100.0
	tableW := pw - (marginX * 2) - 4
	titleW := tableW - codeW - infoW
	headerH := 40.0
	fontSize := 10.4

	drawHeader := func(startY float64) float64 {
		pdf.SetLineWidth(0.8)
		pdf.SetFillColor(210, 210, 210)
		pdf.Rectangle(tableX, startY, tableX+tableW, startY+headerH, "FD", 0, 0)
		pdf.Line(tableX+codeW, startY, tableX+codeW, startY+headerH)
		pdf.Line(tableX+codeW+titleW, startY, tableX+codeW+titleW, startY+headerH)

		drawCenteredCellText(pdf, "Kode Unit", "Helvetica-Bold", 11, tableX, startY+13, codeW)
		drawCenteredCellText(pdf, "Unit Code", "Helvetica-Italic", 10, tableX, startY+27, codeW)
		drawCenteredCellText(pdf, "Judul Unit", "Helvetica-Bold", 11, tableX+codeW, startY+13, titleW)
		drawCenteredCellText(pdf, "Unit Title", "Helvetica-Italic", 10, tableX+codeW, startY+27, titleW)
		drawCenteredCellText(pdf, "Keterangan", "Helvetica-Bold", 11, tableX+codeW+titleW, startY+13, infoW)
		drawCenteredCellText(pdf, "Information", "Helvetica-Italic", 10, tableX+codeW+titleW, startY+27, infoW)
		return startY + headerH
	}

	y = drawHeader(y)
	if len(competencies) == 0 {
		competencies = append(competencies, map[string]string{"code": "-", "title": "Belum ada data unit kompetensi pada Data Jurusan", "status": "-"})
	}

	for _, comp := range competencies {
		codeFontSize := 9.0
		codeLineHeight := codeFontSize + 3.0
		codeLines := wrapText(pdf, comp["code"], codeW-12, "Helvetica", codeFontSize)
		titleLines := wrapText(pdf, comp["title"], titleW-8, "Helvetica", fontSize)
		statusLines := wrapText(pdf, comp["status"], infoW-8, "Helvetica-Bold", fontSize)
		lineCount := len(titleLines)
		if len(codeLines) > lineCount {
			lineCount = len(codeLines)
		}
		if len(statusLines) > lineCount {
			lineCount = len(statusLines)
		}
		lineHeight := fontSize + 2.2
		rowH := float64(lineCount)*lineHeight + 14
		codeRowH := float64(len(codeLines))*codeLineHeight + 16
		if codeRowH > rowH {
			rowH = codeRowH
		}
		if rowH < 34 {
			rowH = 34
		}

		if y+rowH > ph-36 {
			pdf.AddPage()
			y = 46
			y = drawHeader(y)
		}

		pdf.SetLineWidth(0.7)
		pdf.Rectangle(tableX, y, tableX+tableW, y+rowH, "D", 0, 0)
		pdf.Line(tableX+codeW, y, tableX+codeW, y+rowH)
		pdf.Line(tableX+codeW+titleW, y, tableX+codeW+titleW, y+rowH)

		drawCellLines := func(lines []string, x, width float64, fontName string, fontSize, cellLineHeight float64, centered bool) {
			pdf.SetFont(fontName, "", fontSize)
			textHeight := float64(len(lines)) * cellLineHeight
			textY := y + (rowH-textHeight)/2 + fontSize
			for _, line := range lines {
				textX := x + 4
				if centered {
					w, _ := pdf.MeasureTextWidth(line)
					textX = x + (width-w)/2
				}
				pdf.SetXY(textX, textY)
				pdf.Text(line)
				textY += cellLineHeight
			}
		}

		drawCellLines(codeLines, tableX, codeW, "Helvetica", codeFontSize, codeLineHeight, false)
		drawCellLines(titleLines, tableX+codeW, titleW, "Helvetica", fontSize, lineHeight, false)
		pdf.SetFont("Helvetica-Bold", "", fontSize)
		statusTextH := float64(len(statusLines)) * lineHeight
		statusY := y + (rowH-statusTextH)/2 + fontSize
		for _, line := range statusLines {
			w, _ := pdf.MeasureTextWidth(line)
			pdf.SetXY(tableX+codeW+titleW+(infoW-w)/2, statusY)
			pdf.Text(line)
			statusY += lineHeight
		}

		y += rowH
	}
	return y
}

func drawCenteredCellText(pdf *gopdf.GoPdf, text, fontName string, size, x, y, width float64) {
	pdf.SetFont(fontName, "", size)
	w, _ := pdf.MeasureTextWidth(text)
	pdf.SetXY(x+(width-w)/2, y)
	pdf.Text(text)
}

func valueFromStudent(student map[string]interface{}, key string) string {
	value := strings.TrimSpace(fmt.Sprintf("%v", student[key]))
	if value == "<nil>" {
		return ""
	}
	return value
}

func drawTextCentered(pdf *gopdf.GoPdf, text string, fontName string, size float64, y float64, width float64, r, g, b float64) {
	pdf.SetFont(fontName, "", size)
	pdf.SetTextColor(uint8(r*255), uint8(g*255), uint8(b*255))
	w, _ := pdf.MeasureTextWidth(text)
	x := (width - w) / 2
	pdf.SetXY(x, y)
	pdf.Text(text)
}

func drawTextCenteredInArea(pdf *gopdf.GoPdf, text string, fontName string, size float64, y float64, x float64, width float64, r, g, b float64) {
	pdf.SetFont(fontName, "", size)
	pdf.SetTextColor(uint8(r*255), uint8(g*255), uint8(b*255))
	w, _ := pdf.MeasureTextWidth(text)
	pdf.SetXY(x+(width-w)/2, y)
	pdf.Text(text)
}

func drawTextRightAligned(pdf *gopdf.GoPdf, text string, fontName string, size float64, y float64, rightX float64) {
	pdf.SetFont(fontName, "", size)
	w, _ := pdf.MeasureTextWidth(text)
	pdf.SetXY(rightX-w, y)
	pdf.Text(text)
}

func wrapText(pdf *gopdf.GoPdf, text string, maxWidth float64, fontName string, fontSize float64) []string {
	pdf.SetFont(fontName, "", fontSize)
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{""}
	}

	splitLongWord := func(word string) []string {
		runes := []rune(word)
		var chunks []string
		current := ""
		for _, r := range runes {
			candidate := current + string(r)
			w, _ := pdf.MeasureTextWidth(candidate)
			if w <= maxWidth || current == "" {
				current = candidate
				continue
			}
			chunks = append(chunks, current)
			current = string(r)
		}
		if current != "" {
			chunks = append(chunks, current)
		}
		return chunks
	}

	var lines []string
	currentLine := ""

	for _, word := range words {
		wordWidth, _ := pdf.MeasureTextWidth(word)
		if wordWidth > maxWidth {
			for _, chunk := range splitLongWord(word) {
				if currentLine != "" {
					lines = append(lines, currentLine)
					currentLine = ""
				}
				lines = append(lines, chunk)
			}
			continue
		}

		testLine := word
		if currentLine != "" {
			testLine = currentLine + " " + word
		}

		w, _ := pdf.MeasureTextWidth(testLine)
		if w <= maxWidth {
			currentLine = testLine
		} else {
			if currentLine != "" {
				lines = append(lines, currentLine)
			}
			currentLine = word
		}
	}
	if currentLine != "" {
		lines = append(lines, currentLine)
	}
	if len(lines) == 0 {
		return []string{""}
	}
	return lines
}

// Aspect ratio scaling helper
func scaleImage(imagePath string, maxWidth, maxHeight float64) (float64, float64) {
	imgBytes, err := readImageBytes(imagePath)
	if err != nil {
		return maxWidth, maxHeight
	}

	config, _, err := image.DecodeConfig(bytes.NewReader(imgBytes))
	if err != nil {
		return maxWidth, maxHeight
	}

	ratio := float64(config.Width) / float64(config.Height)

	w := maxWidth
	h := maxWidth / ratio

	if h > maxHeight {
		h = maxHeight
		w = maxHeight * ratio
	}

	return w, h
}

func readImageBytes(imagePath string) ([]byte, error) {
	if strings.HasPrefix(imagePath, "data:image") {
		parts := strings.Split(imagePath, ",")
		if len(parts) > 1 {
			return base64.StdEncoding.DecodeString(parts[1])
		}
		return nil, fmt.Errorf("invalid base64 image")
	}

	if strings.HasPrefix(imagePath, "http") {
		resp, err := http.Get(imagePath)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		return io.ReadAll(resp.Body)
	}

	localPath := imagePath
	if strings.HasPrefix(imagePath, "/uploads/") {
		fileName := filepath.Base(imagePath)
		localPath = filepath.Join("uploads", fileName)
	}

	imgBytes, err := os.ReadFile(localPath)
	if err != nil {
		localPath = filepath.Join(".", imagePath)
		imgBytes, err = os.ReadFile(localPath)
	}
	return imgBytes, err
}

func resolveImageHolder(imagePath string) (gopdf.ImageHolder, error) {
	imgBytes, err := readImageBytes(imagePath)
	if err != nil {
		return nil, err
	}
	return gopdf.ImageHolderByBytes(imgBytes)
}

func findIndustryLogo(mitraID, deptName string, industries, departments map[string]interface{}, defaultLogo string) string {
	if industries != nil && mitraID != "" {
		if ind, ok := industries[mitraID].(map[string]interface{}); ok {
			if logo, ok := ind["logo"].(string); ok && logo != "" {
				return logo
			}
		}
	}

	// Exact string matching for custom industry names (not started with industry_)
	if mitraID != "" && !strings.HasPrefix(mitraID, "industry_") && mitraID != "default" {
		cleanName := strings.ToLower(strings.TrimSpace(mitraID))
		for _, indVal := range industries {
			if ind, ok := indVal.(map[string]interface{}); ok {
				if indName, ok := ind["name"].(string); ok && strings.ToLower(strings.TrimSpace(indName)) == cleanName {
					if logo, ok := ind["logo"].(string); ok && logo != "" {
						return logo
					}
				}
			}
		}
	}

	// Fallback to department default industry
	if departments != nil && deptName != "" {
		if dept, ok := departments[deptName].(map[string]interface{}); ok {
			if indID, ok := dept["industryId"].(string); ok && indID != "" {
				if industries != nil {
					if ind, ok := industries[indID].(map[string]interface{}); ok {
						if logo, ok := ind["logo"].(string); ok && logo != "" {
							return logo
						}
					}
				}
			}
		}
	}

	// Default
	if industries != nil {
		if defInd, ok := industries["default"].(map[string]interface{}); ok {
			if logo, ok := defInd["logo"].(string); ok && logo != "" {
				return logo
			}
		}
	}

	return defaultLogo
}

func findIndustryData(mitraID string, industries map[string]interface{}) map[string]interface{} {
	if industries == nil {
		return nil
	}
	if ind, ok := industries[mitraID].(map[string]interface{}); ok {
		return ind
	}
	// Name match
	if mitraID != "" && !strings.HasPrefix(mitraID, "industry_") && mitraID != "default" {
		cleanName := strings.ToLower(strings.TrimSpace(mitraID))
		for _, indVal := range industries {
			if ind, ok := indVal.(map[string]interface{}); ok {
				if indName, ok := ind["name"].(string); ok && strings.ToLower(strings.TrimSpace(indName)) == cleanName {
					return ind
				}
			}
		}
	}
	if defInd, ok := industries["default"].(map[string]interface{}); ok {
		return defInd
	}
	return nil
}

// Health Check Endpoint Handler
func handlePing(w http.ResponseWriter, r *http.Request) {
	dbStatus := "Connected"
	if err := db.Ping(); err != nil {
		dbStatus = "Error: " + err.Error()
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "ok",
		"timestamp": time.Now().Format(time.RFC3339),
		"database":  dbStatus,
	})
}
