export interface Student {
  'Nama Siswa': string;
  NISN: string;
  NIS: string;
  'Nomor Seri': string;
  'Nomor Surat'?: string;
  Jurusan: string;
  Kelas: string;
  Predikat: string;
  'Tahun Lulus': string;
  'Penguji Internal'?: string;
  'NIP/Reg Met Penguji'?: string;
  'Penguji Eksternal'?: string;
  'Mitra Industri'?: string;
  competencies?: Competency[];
}

export interface InternalExaminer {
  name: string;
  nip?: string;
  signature?: string;
}

export interface Competency {
  code: string;
  title: string;
  status?: string; // 'Kompeten' | 'Belum Kompeten'
}

export interface DepartmentSettings {
  name: string;
  logo?: string;
  background?: string;
  assignmentTitleId: string; // Judul Penugasan (Bahasa Indonesia)
  assignmentTitleEn?: string; // Legacy field
  competencyHeadName?: string;
  competencyHeadNip?: string;
  competencyHeadSignature?: string;
  skillProgram?: string;
  skillConcentration?: string;
  expertiseField?: string;
  standardReference?: string; // Legacy field retained for stored data compatibility
  standardReferenceLSP?: string;
  lspSchemeType?: 'Skema' | 'Okupasi' | 'Klaster';
  lspSchemeName?: string;
  competencies: Competency[]; 
  internalExaminers: InternalExaminer[];
  industryId: string; // Legacy: for single selection
  industryIds?: string[]; // Multiple references to industries
}

export interface IndustrySettings {
  name: string;
  field: string;
  leader: string;
  industryLeadTitle?: string; // e.g., "Direktur/Manajer/Penjamin Mutu" (Top line of industry signature)
  certPosition?: string; // Legacy field (Custom job title for certificate)
  assessorPosition?: string; // e.g., "Penguji Eksternal" (Line below assessor name)
  assessorNip?: string; // Optional NIP for assessor
  externalExaminer?: string; // Legacy: for single name
  externalExaminers?: InternalExaminer[]; // Multiple examiners
  logo?: string;
}

export interface SchoolSettings {
  name: string;
  logo?: string;
  ministryLogo?: string;
  provinceLogo?: string;
  lspLogo?: string;
  bnspLogo?: string;
  lspHeaderName?: string;
  lspSchoolName?: string;
  lspLicenseNumber?: string;
  lspAddress?: string;
  lspPhoneFax?: string;
  lspEmail?: string;
  lspWebsite?: string;
  provinceName?: string;
  educationOffice?: string;
  address: string;
  phone?: string;
  email?: string;
  city?: string;
  date: string;
  signatory: string;
  signatoryRank: string;
  signatoryNip: string;
  signatorySignature?: string;
  vicePrincipalCurriculum?: string;
  vicePrincipalCurriculumNip?: string;
  vicePrincipalCurriculumSignature?: string;
  lspDirector?: string;
  lspDirectorNip?: string;
  lspDirectorSignature?: string;
  certificationManager?: string;
  certificationManagerNip?: string;
  certificationManagerSignature?: string;
}

export interface CertificateLayout {
  pageSize: 'A4' | 'Folio';
  orientation: 'landscape' | 'portrait';
  backgroundImage?: string;
}

export interface DocumentNumbering {
  format: string; // Format nomor surat sekolah/UKK, e.g. "420.5/UKK/{YEAR}/{SERIAL}"
  lspFormat?: string; // Kosong berarti memakai format/nomor surat sekolah
  year: string;
}

export interface AppSettings {
  school: SchoolSettings;
  industries: Record<string, IndustrySettings>; // ID -> Industry
  departments: Record<string, DepartmentSettings>;
  documentNumbering: DocumentNumbering;
  layout: CertificateLayout;
}

export type RoleType = 'admin' | 'entry' | 'kakonli' | 'lsp';

export interface UserAccount {
  id: string;
  email: string;
  role: RoleType;
  created_at?: string;
}
