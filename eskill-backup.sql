--
-- PostgreSQL database dump
--

\restrict sM78y8eaOhJl4frDz4LCQ0VFcDcjPjYUfPpDhwaxbr9Pqt4zOZzwO35oGpHlkB2

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.14 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id bigint NOT NULL,
    user_email character varying(255) NOT NULL,
    user_role character varying(50) NOT NULL,
    action character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    path character varying(500) NOT NULL,
    status_code integer NOT NULL,
    ip_address character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    id integer NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    nama_siswa character varying(255) NOT NULL,
    nomor_seri character varying(255) NOT NULL,
    nomor_surat character varying(255),
    nisn character varying(50),
    nis character varying(50),
    jurusan character varying(255) NOT NULL,
    kelas character varying(100) NOT NULL,
    tahun_lulus character varying(10),
    predikat character varying(50) NOT NULL,
    penguji_internal character varying(255),
    penguji_eksternal character varying(255),
    mitra_industri character varying(255),
    competencies jsonb DEFAULT '[]'::jsonb,
    nip_reg_met_penguji character varying(255)
);


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'entry'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, user_email, user_role, action, method, path, status_code, ip_address, created_at) FROM stdin;
1	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 00:03:55.189914
2	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 00:03:56.174329
3	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 00:16:25.727529
4	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 00:16:26.717904
5	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:10:20.30089
6	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:10:21.445009
7	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:10:37.85221
8	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:10:38.846249
9	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:11:07.130766
10	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:11:08.119602
11	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:20:06.331151
12	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:20:07.327996
13	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:20:49.588759
14	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:20:50.573902
15	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:22:19.636297
16	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:22:20.629386
17	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:23:15.382599
18	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:33:09.016781
19	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:33:10.009948
20	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:34:01.001115
21	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:34:01.988049
22	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:37:23.839728
23	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:37:24.827707
24	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:42:13.507751
25	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:42:14.499984
26	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 10:43:03.444565
27	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 10:43:04.432216
28	admin@esuk.id	admin	Logout	POST	/api/auth/logout	200	127.0.0.1	2026-06-16 11:09:07.325383
29	admin@esuk.id	admin	Login	POST	/api/auth/login	200	127.0.0.1	2026-06-16 11:09:10.895444
30	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 11:09:12.942165
31	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 11:09:13.938619
32	admin@esuk.id	admin	Mengganti password pengguna	PUT	/api/users/user_1780470483166297000	200	127.0.0.1	2026-06-16 11:09:29.143949
33	admin@esuk.id	admin	Membuat pengguna	POST	/api/users	500	127.0.0.1	2026-06-16 11:10:15.317395
34	admin@esuk.id	admin	Membuat pengguna	POST	/api/users	201	127.0.0.1	2026-06-16 11:10:26.683819
35	admin@esuk.id	admin	Membuat pengguna	POST	/api/users	201	127.0.0.1	2026-06-16 11:10:52.756717
36	admin@esuk.id	admin	Logout	POST	/api/auth/logout	200	127.0.0.1	2026-06-16 11:10:56.136115
37	naning@lspsmkn1nglegok.sch.id	lsp	Login	POST	/api/auth/login	200	127.0.0.1	2026-06-16 11:11:06.225172
38	naning@lspsmkn1nglegok.sch.id	lsp	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 11:11:08.272809
39	naning@lspsmkn1nglegok.sch.id	lsp	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 11:11:09.267398
40	naning@lspsmkn1nglegok.sch.id	lsp	Logout	POST	/api/auth/logout	200	127.0.0.1	2026-06-16 11:11:21.256862
41	kakonlitkj@gmail.com	entry	Login	POST	/api/auth/login	200	127.0.0.1	2026-06-16 11:11:27.113005
42	kakonlitkj@gmail.com	entry	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 11:11:29.156591
43	kakonlitkj@gmail.com	entry	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 11:11:30.159473
44	kakonlitkj@gmail.com	entry	Logout	POST	/api/auth/logout	200	127.0.0.1	2026-06-16 11:11:32.693415
45	kakonlitsm@gmail.com	kakonli	Login	POST	/api/auth/login	200	127.0.0.1	2026-06-16 11:11:40.299056
46	kakonlitsm@gmail.com	kakonli	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 11:11:42.35582
47	kakonlitsm@gmail.com	kakonli	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 11:11:43.347956
48	kakonlitsm@gmail.com	kakonli	Logout	POST	/api/auth/logout	200	127.0.0.1	2026-06-16 11:12:09.268647
49	admin@esuk.id	admin	Login	POST	/api/auth/login	200	127.0.0.1	2026-06-16 11:12:15.672538
50	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 11:12:17.718615
51	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 11:12:18.713676
52	admin@esuk.id	admin	Memperbarui pengaturan aplikasi	POST	/api/db/app_settings	200	127.0.0.1	2026-06-16 11:13:35.134923
53	admin@esuk.id	admin	Menambah atau memperbarui data siswa	POST	/api/db/students	200	127.0.0.1	2026-06-16 11:13:36.134588
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (id, data, updated_at) FROM stdin;
1	{"layout": {"pageSize": "A4", "orientation": "landscape", "backgroundImage": ""}, "school": {"city": "Blitar", "date": "12 Juni 2026", "logo": "/uploads/logos/school_default_1781056966871.png", "name": "SMKN 1 NGLEGOK", "email": "smkn1_nglegok@yahoo.com", "phone": "(0342) 561355", "address": "Jalan Penataran Nomor 1, Nglegok, Blitar, Jawa Timur 66181", "lspLogo": "/uploads/logos/lsp_default_1781535653579.jpg", "bnspLogo": "/uploads/logos/bnsp_default_1781532745918.png", "lspEmail": "p1smkn1nglegok@gmail.com", "signatory": "A. ROFIQ GHOZALI, S.Pt.", "lspAddress": "JL. Penataran No. 01, Nglegok Kab. Blitar.", "lspWebsite": "http://www.lsp.smkn1nglegok.sch.id/", "lspDirector": "Nurnaning Tiastuti, S. Kom", "lspPhoneFax": "(0342) 561355", "ministryLogo": "", "provinceLogo": "/uploads/logos/province_default_1781058667120.png", "provinceName": "PEMERINTAH PROVINSI JAWA TIMUR", "signatoryNip": "198206122009011011", "lspHeaderName": "LEMBAGA SERTIFIKASI PROFESI (LSP)", "lspSchoolName": "SMK NEGERI 1 NGLEGOK", "signatoryRank": "Penata Tingkat I", "lspDirectorNip": "198602032011011009", "educationOffice": "DINAS PENDIDIKAN", "lspLicenseNumber": "BNSP-LSP-1229-ID", "certificationManager": "Dafiq Ahmad Rozaki, S. Pd", "certificationManagerNip": "198602032011011009", "vicePrincipalCurriculum": "Very Setiawan, S. Kom", "vicePrincipalCurriculumNip": "198602032011011009"}, "industries": {"default": {"logo": "", "name": "ALBEE TECH", "field": "Technopreneur", "leader": "VERY SETIAWAN, S.KOM", "externalExaminers": [{"name": "VERY SETIAWAN, S.KOM"}]}, "industry_1780473928681_5g485": {"logo": "", "name": "Grand Hotel Blitar", "field": "Kuliner", "leader": "Chef Arnold Poernomo", "externalExaminer": "Chef Arnold Poernomo"}, "industry_1780473928681_wz6wj": {"logo": "", "name": "PT. Global Tech Solutions", "field": "Teknik Komputer dan Jaringan", "leader": "Ir. Ahmad Yani", "externalExaminer": "Ir. Ahmad Yani"}}, "departments": {"Kuliner": {"name": "Kuliner", "industryId": "default", "competencies": [], "assignmentTitleEn": "LIST OF COMPETENCIES / SUB COMPETENCIES", "assignmentTitleId": "DAFTAR KOMPETENSI / SUB KOMPETENSI", "internalExaminers": [{"nip": "REG-MET-001", "name": "Dra. Siti Aminah"}]}, "Bisnis Digital": {"name": "Bisnis Digital", "industryId": "default", "competencies": [], "assignmentTitleEn": "LIST OF COMPETENCIES / SUB COMPETENCIES", "assignmentTitleId": "DAFTAR KOMPETENSI / SUB KOMPETENSI", "internalExaminers": []}, "Teknik Sepeda Motor": {"name": "Teknik Sepeda Motor", "industryId": "default", "competencies": [], "assignmentTitleEn": "LIST OF COMPETENCIES / SUB COMPETENCIES", "assignmentTitleId": "DAFTAR KOMPETENSI / SUB KOMPETENSI", "internalExaminers": []}, "Teknik Kendaraan Ringan": {"name": "Teknik Kendaraan Ringan", "industryId": "default", "competencies": [], "assignmentTitleEn": "LIST OF COMPETENCIES / SUB COMPETENCIES", "assignmentTitleId": "DAFTAR KOMPETENSI / SUB KOMPETENSI", "internalExaminers": []}, "Akuntansi Keuangan Lembaga": {"name": "Akuntansi Keuangan Lembaga", "industryId": "default", "competencies": [], "assignmentTitleEn": "LIST OF COMPETENCIES / SUB COMPETENCIES", "assignmentTitleId": "DAFTAR KOMPETENSI / SUB KOMPETENSI", "internalExaminers": []}, "Teknik Elektronika Industri": {"name": "Teknik Elektronika Industri", "industryId": "default", "competencies": [], "assignmentTitleEn": "LIST OF COMPETENCIES / SUB COMPETENCIES", "assignmentTitleId": "DAFTAR KOMPETENSI / SUB KOMPETENSI", "internalExaminers": []}, "Teknik Komputer dan Jaringan": {"logo": "/uploads/logos/department_Teknik Komputer dan Jaringan_1781057034183.jpg", "name": "Teknik Komputer dan Jaringan", "industryId": "default", "competencies": [{"code": "J.611000.001.01", "title": "Mengumpulkan Kebutuhan Teknis Pengguna yang Menggunakan Jaringan", "status": ""}, {"code": "J.611000.002.01", "title": "Mengumpulkan Data Peralatan Jaringan dengan Teknologi yang Sesuai", "status": ""}, {"code": "J.611000.008.02", "title": "Menyiapkan Kabel Jaringan", "status": ""}, {"code": "J.611000.009.02", "title": "Memasang Kabel Jaringan", "status": ""}, {"code": "J.611000.005.02", "title": "Menentukan Spesifikasi Perangkat Jaringan", "status": ""}, {"code": "J.611000.010.02", "title": "Memasang Jaringan Nirkabel", "status": ""}, {"code": "J.611000.003.02", "title": "Merancang Topologi Jaringan", "status": ""}, {"code": "J.611000.004.01", "title": "Merancang Pengalamatan Jaringan", "status": ""}, {"code": "J.611000.011.02", "title": "Memasang Perangkat Jaringan ke dalam Sistem Jaringan", "status": ""}, {"code": "J.611000.012.02", "title": "Mengkonfigurasi Switch pada Jaringan", "status": ""}, {"code": "J.611000.013.02", "title": "Mengkonfigurasi Routing pada Perangkat Jaringan dalam Satu Autonomous System", "status": ""}, {"code": "J.611000.015.01", "title": "Memonitor Keamanan dan Pengaturan Akun Pengguna dalam Jaringan Komputer", "status": ""}, {"code": "J.611000.023.01", "title": "Mengganti Perangkat Jaringan Sesuai dengan Kebutuhan Baru", "status": ""}], "skillProgram": "Teknik Jaringan Komputer dan Telekomunikasi", "lspSchemeName": "KKNI Level II", "expertiseField": "Teknologi Informasi dan Komunikasi", "assignmentTitleEn": "LIST OF COMPETENCIES / SUB COMPETENCIES", "assignmentTitleId": "Network Engineer", "competencyHeadNip": "198602032011011009", "internalExaminers": [{"nip": "198001012005011001", "name": "Budi Santoso, S.Kom."}], "standardReference": "Kep Men No 321 Tahun 2016", "competencyHeadName": "Very Setiawan, S. Kom", "skillConcentration": "Teknik Komputer dan Jaringan", "standardReferenceLSP": "Kep Men No 321 Tahun 2016"}}, "documentNumbering": {"year": "2026", "format": "420.5/UKK/2026/25UKK5240126172", "lspFormat": "420.5/LSP/2026/25UKK5240126172"}}	2026-06-16 11:13:35.133384
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.students (nama_siswa, nomor_seri, nomor_surat, nisn, nis, jurusan, kelas, tahun_lulus, predikat, penguji_internal, penguji_eksternal, mitra_industri, competencies, nip_reg_met_penguji) FROM stdin;
SITI NURHALIZA	2026UKKSWKP74		0056784455	7378/1701.066	Kuliner	XII KL 2	2026		Dra. Siti Aminah	\N	\N	[]	REG-MET-001
ABID NUGROHO	2026UKKPWFNK4		0068742533	7377/1700.066	Teknik Komputer dan Jaringan	XII TKJ 1	2026		Budi Santoso, S.Kom.	\N	\N	[{"code": "J.611000.001.01", "title": "Mengumpulkan Kebutuhan Teknis Pengguna yang Menggunakan Jaringan", "status": "Kompeten"}, {"code": "J.611000.002.01", "title": "Mengumpulkan Data Peralatan Jaringan dengan Teknologi yang Sesuai", "status": "Kompeten"}, {"code": "J.611000.008.02", "title": "Menyiapkan Kabel Jaringan", "status": "Kompeten"}, {"code": "J.611000.009.02", "title": "Memasang Kabel Jaringan", "status": "Kompeten"}, {"code": "J.611000.005.02", "title": "Menentukan Spesifikasi Perangkat Jaringan", "status": "Kompeten"}, {"code": "J.611000.010.02", "title": "Memasang Jaringan Nirkabel", "status": "Kompeten"}, {"code": "J.611000.003.02", "title": "Merancang Topologi Jaringan", "status": "Kompeten"}, {"code": "J.611000.004.01", "title": "Merancang Pengalamatan Jaringan", "status": "Kompeten"}, {"code": "J.611000.011.02", "title": "Memasang Perangkat Jaringan ke dalam Sistem Jaringan", "status": "Kompeten"}, {"code": "J.611000.012.02", "title": "Mengkonfigurasi Switch pada Jaringan", "status": "Kompeten"}, {"code": "J.611000.013.02", "title": "Mengkonfigurasi Routing pada Perangkat Jaringan dalam Satu Autonomous System", "status": "Kompeten"}, {"code": "J.611000.015.01", "title": "Memonitor Keamanan dan Pengaturan Akun Pengguna dalam Jaringan Komputer", "status": ""}, {"code": "J.611000.023.01", "title": "Mengganti Perangkat Jaringan Sesuai dengan Kebutuhan Baru", "status": ""}]	198001012005011001
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (id, email, role) FROM stdin;
admin-default-uuid	admin@esuk.id	admin
user_1780470483166297000	kakonlitkj@gmail.com	entry
user_1781583026679497000	kakonlitsm@gmail.com	kakonli
user_1781583052754553000	naning@lspsmkn1nglegok.sch.id	lsp
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, role, created_at) FROM stdin;
admin-default-uuid	admin@esuk.id	$2a$10$du4E1fBIUFsPemqFgbxMfuVXxdx4K5sI8US71iIbLEpiRUUk6Awa2	admin	2026-06-03 13:55:51.732738
user_1780470483166297000	kakonlitkj@gmail.com	$2a$10$br9kKvKE3hbQlQiYMvEScuEGDWY0/VM8jfAbMU/u67dW4uQAlyk4y	entry	2026-06-03 14:08:03.166392
user_1781583026679497000	kakonlitsm@gmail.com	$2a$10$W6iYpf0Hmbf.YT51zY9Jj.SGieyG5prvnZEXtGdGqCa/dW.J4kI9q	kakonli	2026-06-16 11:10:26.679594
user_1781583052754553000	naning@lspsmkn1nglegok.sch.id	$2a$10$HusvNFJ9gxv5fsGqCmmdD.swE13DxqMq9O9kIs46q.Aj/71SyDppa	lsp	2026-06-16 11:10:52.754675
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 53, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (nomor_seri);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict sM78y8eaOhJl4frDz4LCQ0VFcDcjPjYUfPpDhwaxbr9Pqt4zOZzwO35oGpHlkB2

