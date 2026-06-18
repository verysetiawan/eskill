/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, 
  Settings, 
  Printer, 
  Upload, 
  Download, 
  UserPlus, 
  Search, 
  ChevronRight,
  Filter,
  School,
  Factory,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  Plus,
  Clock,
  Calendar,
  ExternalLink,
  FileText,
  Menu,
  X,
  Users,
  QrCode,
  KeyRound,
  UserCircle,
  ChevronDown,
  Lock,
  ScrollText,
  RefreshCw
} from 'lucide-react';
import { Student, AppSettings, DocumentNumbering, RoleType, UserAccount, IndustrySettings } from '../types';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { compressImage } from '../lib/imageUtils';
import * as XLSX from 'xlsx';

// Mock data for initial states
const INITIAL_SETTINGS: AppSettings = {
  school: {
    name: 'SMKN 1 NGLEGOK',
    logo: '',
    ministryLogo: '',
    provinceLogo: '',
    lspLogo: '',
    bnspLogo: '',
    lspHeaderName: 'LEMBAGA SERTIFIKASI PROFESI (LSP)',
    lspSchoolName: 'SMK NEGERI 1 NGLEGOK',
    lspLicenseNumber: 'BNSP-LSP-1229-ID',
    lspAddress: 'Jalan Penataran Nomor 1, Nglegok, Kabupaten Blitar',
    lspPhoneFax: '(0342) 561355',
    lspEmail: 'p1smkn1nglegok@gmail.com',
    lspWebsite: 'www.lsp.smkn1nglegok.sch.id',
    provinceName: 'PEMERINTAH PROVINSI JAWA TIMUR',
    educationOffice: 'DINAS PENDIDIKAN',
    address: 'Jalan Penataran Nomor 1, Nglegok, Blitar, Jawa Timur 66181',
    phone: '(0342) 561355',
    email: 'smkn1_nglegok@yahoo.com',
    city: 'Kab. Sukabumi',
    date: '25 April 2025',
    signatory: 'A. ROFIQ GHOZALI, S.Pt.',
    signatoryRank: 'Penata Tingkat I',
    signatoryNip: '198206122009011011',
    signatorySignature: '',
    vicePrincipalCurriculum: '',
    vicePrincipalCurriculumNip: '',
    vicePrincipalCurriculumSignature: '',
    lspDirector: '',
    lspDirectorNip: '',
    lspDirectorSignature: '',
    certificationManager: '',
    certificationManagerNip: '',
    certificationManagerSignature: ''
  },
  industries: {
    'default': {
      name: 'ALBEE TECH',
      field: 'Technopreneur',
      leader: 'VERY SETIAWAN, S.KOM',
      logo: '',
      externalExaminers: [{ name: 'VERY SETIAWAN, S.KOM' }]
    }
  },
  departments: {
    'Teknik Komputer dan Jaringan': { 
      name: 'Teknik Komputer dan Jaringan', 
      assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
      assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
      competencies: [],
      internalExaminers: [],
      industryId: 'default'
    },
    'Teknik Kendaraan Ringan': { 
      name: 'Teknik Kendaraan Ringan', 
      assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
      assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
      competencies: [],
      internalExaminers: [],
      industryId: 'default'
    },
    'Teknik Elektronika Industri': { 
      name: 'Teknik Elektronika Industri', 
      assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
      assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
      competencies: [],
      internalExaminers: [],
      industryId: 'default'
    },
    'Teknik Sepeda Motor': { 
      name: 'Teknik Sepeda Motor', 
      assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
      assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
      competencies: [],
      internalExaminers: [],
      industryId: 'default'
    },
    'Kuliner': { 
      name: 'Kuliner', 
      assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
      assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
      competencies: [],
      internalExaminers: [],
      industryId: 'default'
    },
    'Bisnis Digital': { 
      name: 'Bisnis Digital', 
      assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
      assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
      competencies: [],
      internalExaminers: [],
      industryId: 'default'
    },
    'Akuntansi Keuangan Lembaga': { 
      name: 'Akuntansi Keuangan Lembaga', 
      assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
      assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
      competencies: [],
      internalExaminers: [],
      industryId: 'default'
    }
  },
  layout: {
    pageSize: 'A4',
    orientation: 'landscape',
    backgroundImage: ''
  },
  documentNumbering: {
    format: '420.5/UKK/{YEAR}/{SERIAL}',
    lspFormat: '',
    year: new Date().getFullYear().toString()
  }
};

const getDepartmentAbbreviation = (name: string) => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const knownAbbreviations: Record<string, string> = {
    'teknik kendaraan ringan': 'TKR',
    'teknik sepeda motor': 'TSM',
    'teknik komputer dan jaringan': 'TKJ',
    'teknik elektronika industri': 'TEI',
    'kuliner': 'KL',
    'bisnis digital': 'BD',
    'akuntansi keuangan lembaga': 'AKL',
    'akuntansi keungan lembaga': 'AKL'
  };

  if (knownAbbreviations[normalized]) return knownAbbreviations[normalized];

  return name
    .split(/\s+/)
    .filter(word => !['dan', 'konsentrasi', 'keahlian'].includes(word.toLowerCase()))
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase() || 'KONLI';
};

const getClassOptionsForDepartment = (departmentName: string) => {
  const abbreviation = getDepartmentAbbreviation(departmentName || '');
  if (!departmentName || !abbreviation) return [];

  const levels = ['X', 'XI', 'XII'];
  const roomNumbers = ['1', '2', '3'];
  return levels.flatMap(level => roomNumbers.map(room => `${level} ${abbreviation} ${room}`));
};

const getDocumentSerial = (student: Student) => {
  const schoolNumber = (student['Nomor Surat'] || '').trim();
  if (schoolNumber) {
    const parts = schoolNumber.split('/');
    const lastPart = parts[parts.length - 1]?.trim();
    if (lastPart) return lastPart;
  }
  return student['Nomor Seri'] || '';
};

const resolvePreviewDocumentNumber = (
  student: Student,
  numbering: DocumentNumbering,
  certificateType: 'ukk' | 'lsp'
) => {
  const schoolNumber = (student['Nomor Surat'] || '').trim();
  const lspFormat = (numbering?.lspFormat || '').trim();
  if (certificateType === 'ukk' || !lspFormat) {
    if (schoolNumber) return schoolNumber;
  }

  const selectedFormat = certificateType === 'lsp' && lspFormat
    ? lspFormat
    : numbering?.format || '';
  const year = student['Tahun Lulus'] || numbering?.year || new Date().getFullYear().toString();
  return selectedFormat
    .replaceAll('{YEAR}', year)
    .replaceAll('{SERIAL}', getDocumentSerial(student)) || '-';
};

type DashboardTab = 'dashboard' | 'school' | 'certificate-signatures' | 'departments' | 'industry' | 'students' | 'scores' | 'certificates' | 'bulk-delete' | 'settings' | 'document-numbering' | 'users' | 'validation' | 'activity-logs';

interface ActivityLogEntry {
  id: number;
  user_email: string;
  user_role: string;
  action: string;
  method: string;
  path: string;
  status_code: number;
  ip_address: string;
  created_at: string;
}

const canAccessTab = (role: RoleType, tab: DashboardTab) => {
  if (role === 'admin') return true;
  if (role === 'entry') return !['users', 'activity-logs'].includes(tab);
  if (role === 'lsp') return !['users', 'school', 'settings', 'activity-logs'].includes(tab);
  return ['departments', 'students', 'scores', 'certificates', 'validation'].includes(tab);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(window.innerWidth >= 1024);
  
  // Auth & Roles
  const [userRole, setUserRole] = useState<RoleType | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isOwnPasswordModalOpen, setIsOwnPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newOwnPassword, setNewOwnPassword] = useState('');
  const [newOwnPasswordConfirm, setNewOwnPasswordConfirm] = useState('');
  const [isUpdatingOwnPassword, setIsUpdatingOwnPassword] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [activityLogsGenerated, setActivityLogsGenerated] = useState(false);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);

  // App save & UI states
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [verifyMode, setVerifyMode] = useState<{active: boolean, serial: string | null}>({active: false, serial: null});
  const [editingDept, setEditingDept] = useState<string | null>(null);

  // Navigation & Tabs
  const handleTabChange = (tab: DashboardTab) => {
    if (userRole && !canAccessTab(userRole, tab)) return;
    setActiveTab(tab);
    if (window.innerWidth < 1024) {
      setIsSidebarExpanded(false);
    }
  };

  // Responsive sidebar toggling globally
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarExpanded(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          if (error && (error.message.includes('Refresh Token Not Found') || error.message.includes('refresh_token_not_found'))) {
            await supabase.auth.signOut();
          }
          navigate('/');
          return;
        }
        
        setUserEmail(session.user.email || '');

        const { data, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        if (data && !roleError) {
          setUserRole(data.role as RoleType);
        } else {
          const sessionRole = session.user.role as RoleType | undefined;
          console.error("Role not found, using session role.");
          setUserRole(sessionRole || 'entry');
        }
      } catch (err) {
        console.error("Failed auth check:", err);
        navigate('/');
      } finally {
        setAuthLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (!userRole || canAccessTab(userRole, activeTab)) return;
    setActiveTab(userRole === 'kakonli' ? 'departments' : 'dashboard');
  }, [userRole, activeTab]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    const closeProfileMenu = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeProfileMenu);
    return () => document.removeEventListener('mousedown', closeProfileMenu);
  }, []);

  const handleOwnPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOwnPassword.length < 8) {
      setNotification({ message: 'Password baru minimal 8 karakter', type: 'error' });
      return;
    }
    if (newOwnPassword !== newOwnPasswordConfirm) {
      setNotification({ message: 'Konfirmasi password baru tidak sama', type: 'error' });
      return;
    }

    setIsUpdatingOwnPassword(true);
    try {
      const sessionStr = localStorage.getItem('esuk_session');
      const token = sessionStr ? JSON.parse(sessionStr)?.access_token : '';
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword: newOwnPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengganti password');
      setNotification({ message: 'Password berhasil diganti', type: 'success' });
      setIsOwnPasswordModalOpen(false);
      setCurrentPassword('');
      setNewOwnPassword('');
      setNewOwnPasswordConfirm('');
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal mengganti password', type: 'error' });
    } finally {
      setIsUpdatingOwnPassword(false);
    }
  };

  const closeOwnPasswordModal = () => {
    if (isUpdatingOwnPassword) return;
    setIsOwnPasswordModalOpen(false);
    setCurrentPassword('');
    setNewOwnPassword('');
    setNewOwnPasswordConfirm('');
  };

  const generateActivityLogs = async () => {
    setActivityLogsLoading(true);
    try {
      const sessionStr = localStorage.getItem('esuk_session');
      const token = sessionStr ? JSON.parse(sessionStr)?.access_token : '';
      const res = await fetch('/api/activity-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengambil log aktivitas');
      setActivityLogs(data.logs || []);
      setActivityLogsGenerated(true);
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal mengambil log aktivitas', type: 'error' });
    } finally {
      setActivityLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users' && userRole === 'admin') {
       fetchUsers();
    }
  }, [activeTab, userRole]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) return;
    setIsCreatingUser(true);
    try {
       const sessionStr = localStorage.getItem('esuk_session');
       const token = sessionStr ? JSON.parse(sessionStr)?.access_token : '';
       const res = await fetch('/api/users', {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error);
       setNotification({ message: 'User berhasil dibuat', type: 'success' });
       setNewUserEmail('');
       setNewUserPassword('');
       fetchUsers();
    } catch (err: any) {
       setNotification({ message: err.message || 'Gagal membuat user', type: 'error' });
    } finally {
       setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Apakah anda yakin ingin menghapus pengguna ini?')) return;
    try {
      const sessionStr = localStorage.getItem('esuk_session');
      const token = sessionStr ? JSON.parse(sessionStr)?.access_token : '';
      const res = await fetch(`/api/users/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
         const data = await res.json();
         throw new Error(data.error);
      }
      setNotification({ message: 'User berhasil dihapus', type: 'success' });
      fetchUsers();
    } catch(err: any) {
      setNotification({ message: err.message || 'Gagal menghapus', type: 'error' });
    }
  };

  // User Management State
  const [manageUsers, setManageUsers] = useState<UserAccount[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleType>('entry');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserAccount | null>(null);
  const [replacementPassword, setReplacementPassword] = useState('');
  const [replacementPasswordConfirm, setReplacementPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (replacementPassword.length < 8) {
      setNotification({ message: 'Password minimal 8 karakter', type: 'error' });
      return;
    }
    if (replacementPassword !== replacementPasswordConfirm) {
      setNotification({ message: 'Konfirmasi password tidak sama', type: 'error' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const sessionStr = localStorage.getItem('esuk_session');
      const token = sessionStr ? JSON.parse(sessionStr)?.access_token : '';
      const res = await fetch(`/api/users/${passwordUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: replacementPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengganti password');
      setNotification({ message: `Password ${passwordUser.email} berhasil diganti`, type: 'success' });
      setPasswordUser(null);
      setReplacementPassword('');
      setReplacementPasswordConfirm('');
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal mengganti password', type: 'error' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const sessionStr = localStorage.getItem('esuk_session');
      const token = sessionStr ? JSON.parse(sessionStr)?.access_token : '';
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned non-JSON: ${text.substring(0, 100)}...`);
      }
      
      if (res.ok) {
        setManageUsers(data.users);
      } else {
        throw new Error(data.error || 'Server error occurred');
      }
    } catch (e: any) {
       console.error(e);
       setNotification({ message: `Gagal mengambil data: ${e.message}`, type: 'error' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('ukk_settings');
    let parsedSettings = saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    
    // Auto-migration: if default industry is AGUNA COURSE, migrate it to Albee Tech
    if (parsedSettings.industries && parsedSettings.industries['default']) {
      if (parsedSettings.industries['default'].name === 'AGUNA COURSE' || parsedSettings.industryName === 'AGUNA COURSE') {
         parsedSettings.industries['default'].name = 'Albee Tech';
         parsedSettings.industries['default'].field = 'Technopreneur';
         parsedSettings.industries['default'].leader = 'Very Setiawan';
         parsedSettings.industries['default'].externalExaminer = 'Very Setiawan';
         
         // Also update legacy top-level values
         if (parsedSettings.industryName) parsedSettings.industryName = 'Albee Tech';
         if (parsedSettings.industryLeader) parsedSettings.industryLeader = 'Very Setiawan';
         
         // Fix the duplicate 'Albee Tech' that the user might have created accidentally
         // If there's an industry_xxx with name Albee Tech, keep it or let user delete it, we just fix default.
      }
    }
    
    return parsedSettings;
  });
  const saveSettingsToSupabase = async (customSettings?: AppSettings): Promise<boolean> => {
    if (!userRole || authLoading) return false;
    
    setSyncStatus('syncing');
    setSyncError(null);
    const settingsToSave = customSettings || settings;
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ 
          id: 1, 
          data: settingsToSave, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'id' });
      
      if (error) {
         console.warn("Gagal menyimpan pengaturan:", error.message);
         setSyncStatus('error');
         setSyncError(error.message);
         return false;
      } else {
         console.log("Pengaturan tersimpan");
         setSyncStatus('synced');
         return true;
      }
    } catch (err: any) {
      console.error("Critical error saving settings:", err);
      setSyncStatus('error');
      setSyncError(err.message || 'Unknown network error');
      return false;
    }
  };

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('ukk_students');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Connect Students & Settings to local backend
  useEffect(() => {
  const fetchData = async (showNotification = false) => {
     // Fetch Students
     setSyncStatus('syncing');
     const { data: studentData, error: studentError } = await supabase.from('students').select('*');
     
     if (studentError) {
        setSyncStatus('error');
        setSyncError(studentError.message);
        if (showNotification) setNotification({ message: 'Gagal mengambil data siswa: ' + studentError.message, type: 'error' });
        return;
     }

     if (studentData) {
       // ... existing migration logic ...
       setStudents(studentData.map(d => ({
          'Nama Siswa': d.nama_siswa,
          'Nomor Seri': d.nomor_seri,
          'Nomor Surat': d.nomor_surat,
          NISN: d.nisn,
          NIS: d.nis,
          Jurusan: d.jurusan === 'Bisnis Daring dan Pemasaran' ? 'Bisnis Digital' : d.jurusan,
          Kelas: d.kelas,
          'Tahun Lulus': d.tahun_lulus,
          Predikat: d.predikat,
	          'Penguji Internal': d.penguji_internal,
	          'NIP/Reg Met Penguji': d.nip_reg_met_penguji,
          'Penguji Eksternal': d.penguji_eksternal,
          'Mitra Industri': d.mitra_industri,
          competencies: Array.isArray(d.competencies) ? d.competencies : []
       })));
     }

     // Fetch Settings
     const { data: settingData, error: settingError } = await supabase
       .from('app_settings')
       .select('data')
       .eq('id', 1)
       .single();
     
     if (settingError) {
        setSyncStatus('error');
        setSyncError(settingError.message);
        if (showNotification) setNotification({ message: 'Gagal mengambil data pengaturan: ' + settingError.message, type: 'error' });
        return;
     }

     if (settingData && settingData.data) {
       // ... existing migration logic ...
       setSettings(settingData.data);
       console.log("Pengaturan dimuat");
       setSyncStatus('synced');
       if (showNotification) setNotification({ message: 'Data berhasil dimuat', type: 'success' });
     }
  };
    
    if (userRole) {
      fetchData();
      
      // Real-time subscription for settings
      const settingsChannel = supabase.channel('settings-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'app_settings', 
          filter: 'id=eq.1' 
        }, payload => {
          const newData = (payload.new as any)?.data;
          if (newData) {
            console.log("Pengaturan diperbarui");
            setSettings(newData);
            setSyncStatus('synced');
          }
        })
        .subscribe();

      // Real-time subscription for students
      const studentsChannel = supabase.channel('student-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'students' 
        }, () => {
          fetchData(); // Simplest way to sync student list
        })
        .subscribe();

      return () => {
        supabase.removeChannel(settingsChannel);
        supabase.removeChannel(studentsChannel);
      };
    }
  }, [userRole]);

  // Update Browser Icon
  useEffect(() => {
    if (settings.school.logo) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.school.logo;
    }
  }, [settings.school.logo, settings.school.name]);
  
  // Persist to localStorage and local backend (for Students)
  useEffect(() => {
    localStorage.setItem('ukk_students', JSON.stringify(students));
    
    // Background save with debounce
    const timer = setTimeout(async () => {
      if (!userRole || authLoading || students.length === 0) return;
      
      setSyncStatus('syncing');
      try {
         const formatted = students.map(s => ({
            nama_siswa: s['Nama Siswa'] || '',
            nomor_seri: s['Nomor Seri'] || '',
            nomor_surat: s['Nomor Surat'] || '',
            nisn: s.NISN || '',
            nis: s.NIS || '',
            jurusan: s.Jurusan || '',
            kelas: s.Kelas || '',
            tahun_lulus: s['Tahun Lulus'] || '',
            predikat: s.Predikat || '',
	            penguji_internal: s['Penguji Internal'] || null,
	            nip_reg_met_penguji: s['NIP/Reg Met Penguji'] || null,
            penguji_eksternal: s['Penguji Eksternal'] || null,
            mitra_industri: s['Mitra Industri'] || null,
            competencies: s.competencies || []
         }));
         
         const { error } = await supabase.from('students').upsert(formatted, { onConflict: 'nomor_seri' });
         if (error) {
           console.error("Gagal menyimpan data siswa:", error.message);
           setSyncStatus('error');
         } else {
           setSyncStatus('synced');
         }
      } catch (err) {
         console.error("Gagal menyimpan data:", err);
         setSyncStatus('error');
      }
    }, 3000); // 3 second debounce for students
    
    return () => clearTimeout(timer);
  }, [students, userRole, authLoading]);

  useEffect(() => {
    localStorage.setItem('ukk_settings', JSON.stringify(settings));
    
    // Auto-save settings with debounce
    const timer = setTimeout(() => {
      if (userRole && !authLoading) {
        saveSettingsToSupabase();
      }
    }, 2000); // 2 second debounce
    
    return () => clearTimeout(timer);
  }, [settings, userRole, authLoading]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('Semua Jurusan');
  const [selectedYear, setSelectedYear] = useState<string>('Semua Tahun');
  const [selectedCertificateFormat, setSelectedCertificateFormat] = useState<'all' | 'ukk' | 'lsp'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    'Nama Siswa': '',
    NISN: '',
    NIS: '',
    'Nomor Seri': '',
    'Nomor Surat': '',
    Jurusan: '',
    Kelas: '',
    Predikat: 'Sangat Kompeten',
    'Tahun Lulus': new Date().getFullYear().toString(),
	    'Penguji Internal': '',
	    'NIP/Reg Met Penguji': '',
    'Penguji Eksternal': '',
    'Mitra Industri': ''
  });


   const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `backgrounds/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const publicUrl = uploadData?.path || supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName).data.publicUrl;

      setSettings({...settings, layout: {...settings.layout, backgroundImage: publicUrl}});
      const success = await saveSettingsToSupabase({...settings, layout: {...settings.layout, backgroundImage: publicUrl}});
      
      if (success) {
        setNotification({message: 'Background berhasil terpasang & disimpan', type: 'success'});
      } else {
        setNotification({message: 'Gagal menyimpan', type: 'error'});
      }
    } catch(err: any) {
       console.error(err);
       setNotification({message: 'Gagal mengunggah background: ' + err.message, type: 'error'});
    } finally {
       setIsLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scoreFileInputRef = useRef<HTMLInputElement>(null);
  const compFileInputRef = useRef<HTMLInputElement>(null);

  // Check for verification URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifySerial = params.get('verify');
    if (verifySerial) {
      setVerifyMode({active: true, serial: verifySerial});
    }
  }, []);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Update Favicon and Title
  useEffect(() => {
    const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (link && settings.school.logo) {
      link.href = settings.school.logo;
    }
    document.title = 'My E-Skill';
  }, [settings.school.logo, settings.school.name]);

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.students) {
        // --- Auto-Migrate/Create Mitra Industri & Jurusan ---
        let updatedSettings = JSON.parse(JSON.stringify(settings)); // deep copy untuk mempermudah mutasi aman
        let settingsChanged = false;

        data.students.forEach((s: any) => {
            let indName = s['Mitra Industri'];
            const examiner = s['Penguji Eksternal'];
            const jurName = s['Jurusan'];
	            const intExaminerName = s['Penguji Internal'];
	            const intExaminerNip = s['NIP/Reg Met Penguji'];

            // --- Mitra Industri ---
            if (indName && String(indName).trim() !== '') {
                const normIndName = String(indName).replace(/\s+/g, ' ').trim().toLowerCase();
                const existingId = Object.keys(updatedSettings.industries).find(id => {
                    const existingName = String(updatedSettings.industries[id].name || '').replace(/\s+/g, ' ').trim().toLowerCase();
                    return existingName === normIndName || id.toLowerCase() === normIndName;
                });

                if (!existingId) {
                    const newId = `industry_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;
                    updatedSettings.industries[newId] = {
                        name: String(indName).trim(),
                        field: jurName ? String(jurName).trim() : 'Dibuat Otomatis',
                        leader: examiner ? String(examiner).trim() : 'Pimpinan Mitra',
                        externalExaminer: examiner ? String(examiner).trim() : 'Penguji',
                        logo: ''
                    };
                    settingsChanged = true;
                    s['Mitra Industri'] = newId;
                } else {
                    s['Mitra Industri'] = existingId;
                    // Auto-update leader/examiner if they are currently generic or empty
                    const existingInd = updatedSettings.industries[existingId];
                    const cleanEx = examiner ? String(examiner).trim() : "";
                    if (cleanEx !== "") {
                        // Update legacy field if empty
                        if (!existingInd.externalExaminer || existingInd.externalExaminer === 'Penguji' || existingInd.externalExaminer === 'VERY SETIAWAN, S.KOM') {
                            existingInd.externalExaminer = cleanEx;
                            settingsChanged = true;
                        }
                        
                        // Handle new multi-examiner array
                        if (!existingInd.externalExaminers) {
                            existingInd.externalExaminers = [{ name: cleanEx }];
                            settingsChanged = true;
                        } else if (!existingInd.externalExaminers.find(ex => String(ex.name || '').toLowerCase() === cleanEx.toLowerCase())) {
                            existingInd.externalExaminers.push({ name: cleanEx });
                            settingsChanged = true;
                        }
                    }
                }
            }

            // --- Jurusan & Penguji Internal ---
            if (jurName && String(jurName).trim() !== '') {
                const cleanJurName = String(jurName).trim();
                const normJurName = cleanJurName.replace(/\s+/g, ' ').toLowerCase();
                
                let matchedJurKey = Object.keys(updatedSettings.departments).find(k => {
                    const existingDeptName = String(updatedSettings.departments[k].name || '').replace(/\s+/g, ' ').toLowerCase();
                    return existingDeptName === normJurName || k.toLowerCase() === normJurName;
                });

                if (!matchedJurKey) {
                    // Create department if not exist
                    matchedJurKey = cleanJurName;
                    updatedSettings.departments[matchedJurKey] = {
                        name: cleanJurName,
                        assignmentTitleId: 'DAFTAR KOMPETENSI / SUB KOMPETENSI',
                        assignmentTitleEn: 'LIST OF COMPETENCIES / SUB COMPETENCIES',
                        competencies: [],
                        internalExaminers: [],
                        industryId: 'default'
                    };
                    settingsChanged = true;
                }
                
                // Normalize case to match exactly what is in settings
                s['Jurusan'] = updatedSettings.departments[matchedJurKey].name;

                // Add internal examiner to department if specified
                if (intExaminerName && String(intExaminerName).trim() !== '') {
                    const cleanExName = String(intExaminerName).trim();
                    
                    // Pastikan internalExaminers tidak undefined
                    if (!updatedSettings.departments[matchedJurKey].internalExaminers) {
                        updatedSettings.departments[matchedJurKey].internalExaminers = [];
                    }

                    const existingEx = updatedSettings.departments[matchedJurKey].internalExaminers.find(
                        (ex: any) => String(ex.name || '').toLowerCase() === cleanExName.toLowerCase()
                    );

                    if (!existingEx) {
                        updatedSettings.departments[matchedJurKey].internalExaminers.push({
	                            name: cleanExName,
	                            nip: intExaminerNip ? String(intExaminerNip).trim() : ''
	                        });
	                        settingsChanged = true;
	                    } else if (intExaminerNip && String(intExaminerNip).trim() !== '' && existingEx.nip !== String(intExaminerNip).trim()) {
	                        existingEx.nip = String(intExaminerNip).trim();
	                        settingsChanged = true;
	                    }
                }
            }
        });

        if (settingsChanged) {
            const finalSettings = { ...settings, industries: updatedSettings.industries, departments: updatedSettings.departments };
            setSettings(finalSettings);
            await saveSettingsToSupabase(finalSettings);
        }
        // ------------------------------------------

        const existingList = Array.isArray(students) ? students : [];
        const newItems = data.students.filter((newItem: any) => {
            // Cek duplikasi: Jika NISN atau Nomor Seri sama, anggap orang yang sama
            const isDuplicate = existingList.some(oldItem => 
                (newItem.NISN && oldItem.NISN && String(newItem.NISN) === String(oldItem.NISN)) ||
                (newItem['Nomor Seri'] && oldItem['Nomor Seri'] && String(newItem['Nomor Seri']) === String(oldItem['Nomor Seri']))
            );
            return !isDuplicate;
        });
        
        if (newItems.length === 0 && data.students.length > 0) {
            setNotification({ message: 'Semua siswa di file ini sudah ada di daftar', type: 'info' });
        } else {
            setStudents([...existingList, ...newItems]);
            setNotification({ 
                message: `Berhasil menambahkan ${newItems.length} siswa baru` + (data.students.length > newItems.length ? ` (${data.students.length - newItems.length} data duplikat diabaikan)` : ''), 
                type: 'success' 
            });
        }
      }
    } catch (error) {
      setNotification({ message: 'Gagal mengunggah file Excel', type: 'error' });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCompetencyExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingDept) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-competency-excel', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.competencies) {
        const newDepts = { ...settings.departments };
        
        // Cek duplikasi kode agar tidak ada baris yang sama persis
        const existingCodes = new Set(newDepts[editingDept].competencies.map(c => c.code.toLowerCase()));
        const uniqueNew = data.competencies.filter((c: any) => !existingCodes.has(c.code.toLowerCase()));
        
        newDepts[editingDept].competencies = [
          ...newDepts[editingDept].competencies,
          ...uniqueNew
        ];
        
        const finalSettings = { ...settings, departments: newDepts };
        setSettings(finalSettings);
        await saveSettingsToSupabase(finalSettings);
        setNotification({ 
          message: `${uniqueNew.length} kompetensi baru berhasil ditambahkan dan disimpan`, 
          type: 'success' 
        });
      } else {
        const fullError = data.details ? `${data.error}: ${data.details}` : (data.error || 'Gagal mengolah file');
        setNotification({ message: fullError, type: 'error' });
      }
    } catch (error) {
      setNotification({ message: 'Terjadi kesalahan saat mengunggah', type: 'error' });
    } finally {
      setIsLoading(false);
      if (compFileInputRef.current) compFileInputRef.current.value = '';
    }
  };

  const getScoreUnitColumns = () => {
    const columns: string[] = [];
    for (let i = 1; i <= 64; i++) {
      columns.push(`Unit ${i} Informasi`);
    }
    return columns;
  };

  const downloadStudentTemplate = () => {
    try {
      const headers = ['Nama Siswa', 'NISN', 'NIS', 'Jurusan', 'Kelas', 'Angkatan', 'Penguji', 'NIP/Reg Met Penguji'];
      const departmentNames = Object.keys(settings.departments);
      const exampleDepartment = departmentNames[0] || 'Teknik Komputer dan Jaringan';
      const exampleClass = `X ${getDepartmentAbbreviation(exampleDepartment)} 1`;
      const worksheet = XLSX.utils.aoa_to_sheet([
        headers,
        ['CONTOH NAMA SISWA', '0012345678', '1234/5678', exampleDepartment, exampleClass, new Date().getFullYear().toString(), 'Nama Penguji', 'NIP atau Reg Met']
      ]);

      worksheet['D1'].c = [{
        a: 'ESKILL',
        t: `Tuliskan nama jurusan persis seperti Data Jurusan. Pilihan yang tersedia:\n${departmentNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}`
      }];
      worksheet['E1'].c = [{
        a: 'ESKILL',
        t: 'Format kelas: [TINGKAT] [SINGKATAN JURUSAN] [NOMOR KELAS]. Tingkat bisa X, XI, atau XII. Contoh: X TKJ 1, XI TKR 2, XII KL 1.'
      }];
      worksheet['!cols'] = [
        { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 38 },
        { wch: 18 }, { wch: 12 }, { wch: 28 }, { wch: 24 }
      ];

      const guideRows: (string | number)[][] = [
        ['PETUNJUK PENGISIAN DATA SISWA'],
        [],
        ['Kolom', 'Ketentuan'],
        ['Jurusan', 'Harus ditulis persis sama dengan nama pada menu Data Jurusan.'],
        ['Kelas', 'Gunakan format [tingkat] [singkatan jurusan] [nomor kelas], contoh X TKJ 1, XI TKJ 2, atau XII TKJ 3.'],
        ['Penguji', 'Tuliskan nama penguji sesuai Data Jurusan.'],
        ['NIP/Reg Met Penguji', 'Boleh diisi NIP atau nomor Reg Met penguji.'],
        [],
        ['Nama Jurusan', 'Contoh Penulisan Kelas']
      ];
      departmentNames.forEach(name => {
        const abbreviation = getDepartmentAbbreviation(name);
        guideRows.push([name, `X ${abbreviation} 1 / XI ${abbreviation} 1 / XII ${abbreviation} 1`]);
      });
      const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
      guideSheet['!cols'] = [{ wch: 42 }, { wch: 72 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');
      XLSX.utils.book_append_sheet(workbook, guideSheet, 'Petunjuk');
      XLSX.writeFile(workbook, 'template_data_siswa.xlsx', { cellComments: true });
    } catch (error: any) {
      setNotification({ message: `Gagal membuat template: ${error.message}`, type: 'error' });
    }
  };

  const downloadScoreTemplate = () => {
    const rows = filteredStudents.length > 0 ? filteredStudents : students;
    const headers = ['Nama Siswa', 'Jurusan', 'Kelas', ...getScoreUnitColumns()];

    const dataRows = rows.map((student) => {
      const deptComps = settings.departments[student.Jurusan]?.competencies || [];
      const studentStatusByCode = new Map((student.competencies || []).map((c) => [c.code, c.status || '']));
      const row: Record<string, string | number> = {
        'Nama Siswa': student['Nama Siswa'] || '',
        Jurusan: student.Jurusan || '',
        Kelas: student.Kelas || '',
      };

      for (let i = 1; i <= 64; i++) {
        const comp = deptComps[i - 1];
        const status = comp ? (studentStatusByCode.get(comp.code) || comp.status || '') : '';
        row[`Unit ${i} Informasi`] = status ? (status.toLowerCase().includes('belum') ? 0 : 1) : '';
      }
      return row;
    });

    if (dataRows.length === 0) {
      const row: Record<string, string | number> = {
        'Nama Siswa': '',
        Jurusan: Object.keys(settings.departments)[0] || '',
        Kelas: '',
      };
      for (let i = 1; i <= 64; i++) {
        row[`Unit ${i} Informasi`] = '';
      }
      dataRows.push(row);
    }

    const ws = XLSX.utils.json_to_sheet(dataRows, { header: headers });
    ws['!cols'] = headers.map((h) => ({ wch: h.includes('Informasi') ? 14 : h === 'Nama Siswa' ? 28 : h === 'Jurusan' ? 36 : 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Siswa');
    XLSX.writeFile(wb, 'template_nilai_siswa.xlsx');
  };

  const handleScoreExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (rows.length === 0) {
        setNotification({ message: 'File nilai kosong.', type: 'error' });
        return;
      }

      let updatedCount = 0;
      const updatedStudents = students.map((student) => {
        const match = rows.find((row) => {
          const normalize = (value: any) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
          return normalize(row['Nama Siswa'] || row.nama_siswa) === normalize(student['Nama Siswa'])
            && normalize(row.Jurusan || row.jurusan) === normalize(student.Jurusan)
            && normalize(row.Kelas || row.kelas) === normalize(student.Kelas);
        });

        if (!match) return student;

        const deptComps = settings.departments[student.Jurusan]?.competencies || [];
        const competencies = [];
        for (let i = 1; i <= 64; i++) {
          const infoRaw = String(match[`Unit ${i} Informasi`] ?? '').trim();
          const comp = deptComps[i - 1];
          if (!comp || infoRaw === '') continue;
          if (infoRaw !== '0' && infoRaw !== '1') continue;
          competencies.push({
            code: comp.code,
            title: comp.title,
            status: infoRaw === '0' ? 'Belum Kompeten' : 'Kompeten',
          });
        }

        updatedCount++;
        return {
          ...student,
          competencies,
        };
      });

      if (updatedCount === 0) {
        setNotification({ message: 'Tidak ada siswa yang cocok berdasarkan Nama, Jurusan, dan Kelas.', type: 'error' });
        return;
      }

      setStudents(updatedStudents);
      setNotification({ message: `Nilai ${updatedCount} siswa berhasil diperbarui`, type: 'success' });
    } catch (err: any) {
      console.error(err);
      setNotification({ message: 'Gagal membaca file nilai siswa.', type: 'error' });
    } finally {
      setIsLoading(false);
      if (scoreFileInputRef.current) scoreFileInputRef.current.value = '';
    }
  };

  const isCompetentStatus = (status?: string) => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === '1' || normalized === 'kompeten';
  };

  const isAssessedStatus = (status?: string) => {
    const normalized = String(status || '').trim().toLowerCase();
    return normalized === '1' || normalized === '0' || normalized === 'kompeten' || normalized === 'belum kompeten';
  };

  const calculateFinalScore = (student: Student) => {
    const deptComps = settings.departments[student.Jurusan]?.competencies || [];
    if (deptComps.length === 0) return null;

    const studentStatusByCode = new Map((student.competencies || []).map((item) => [item.code, item.status || '']));
    const assessedCount = deptComps.filter((comp) => isAssessedStatus(studentStatusByCode.get(comp.code))).length;
    if (assessedCount === 0) return null;

    const competentCount = deptComps.filter((comp) => isCompetentStatus(studentStatusByCode.get(comp.code))).length;
    return Number(((competentCount / assessedCount) * 100).toFixed(2));
  };

  const formatFinalScore = (score: number | null) => {
    if (score === null || Number.isNaN(score)) return '-';
    return Number.isInteger(score) ? String(score) : score.toFixed(2);
  };

  const getPrintFilteredStudents = () => students.filter((student) => {
    const matchesDept = selectedDepartment === 'Semua Jurusan' || student.Jurusan === selectedDepartment;
    const matchesYear = selectedYear === 'Semua Tahun' || student['Tahun Lulus'] === selectedYear;
    return matchesDept && matchesYear;
  });

  const downloadScoreRecap = () => {
    const rows = getPrintFilteredStudents();
    if (rows.length === 0) {
      setNotification({ message: 'Tidak ada data siswa untuk direkap.', type: 'error' });
      return;
    }

    const dataRows = rows.map((student) => ({
      'Nama': student['Nama Siswa'] || '',
      'NISN': student.NISN || '',
      'NIS': student.NIS || '',
      'Jurusan': student.Jurusan || '',
      'Kelas': student.Kelas || '',
      'Nilai': calculateFinalScore(student) ?? '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows, { header: ['Nama', 'NISN', 'NIS', 'Jurusan', 'Kelas', 'Nilai'] });
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 34 },
      { wch: 16 },
      { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai');
    XLSX.writeFile(workbook, 'rekap_nilai_siswa.xlsx');
  };

  const downloadCompetencyTemplate = () => {
    try {
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Kode', 'Unit Kompetensi'],
        ['016.UK.01', 'Menerapkan Prosedur Kesehatan, Keselamatan dan Keamanan Kerja'],
        ['016.UK.02', 'Melakukan Persiapan Bahan Bakar dan Pelumas']
      ]);
      worksheet['!cols'] = [{ wch: 20 }, { wch: 70 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Unit Kompetensi');
      XLSX.writeFile(workbook, 'template_unit_kompetensi.xlsx');
    } catch (error: any) {
      setNotification({ message: `Gagal mengunduh template: ${error.message}`, type: 'error' });
    }
  };

  type UploadAssetType =
    | 'school' | 'province' | 'lsp' | 'bnsp' | 'industry' | 'ministry' | 'department'
    | 'principalSignature' | 'vicePrincipalSignature' | 'lspDirectorSignature' | 'certificationManagerSignature'
    | 'competencyHeadSignature' | 'examinerSignature';

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: UploadAssetType, id?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const uploadFolder = type.toLowerCase().includes('signature') ? 'signatures' : 'logos';
      const safeId = (id || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${uploadFolder}/${type}_${safeId}_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const publicUrl = uploadData?.path || supabase.storage
        .from('app-assets')
        .getPublicUrl(fileName).data.publicUrl;
      
      let newSettings = { ...settings };
      if (type === 'school') {
        newSettings = { ...settings, school: { ...settings.school, logo: publicUrl } };
      } else if (type === 'province') {
        newSettings = { ...settings, school: { ...settings.school, provinceLogo: publicUrl } };
      } else if (type === 'lsp') {
        newSettings = { ...settings, school: { ...settings.school, lspLogo: publicUrl } };
      } else if (type === 'bnsp') {
        newSettings = { ...settings, school: { ...settings.school, bnspLogo: publicUrl } };
      } else if (type === 'ministry') {
        newSettings = { ...settings, school: { ...settings.school, ministryLogo: publicUrl } };
      } else if (type === 'industry' && id) {
        newSettings = {
          ...settings,
          industries: {
            ...settings.industries,
            [id]: { ...settings.industries[id], logo: publicUrl }
          }
        };
      } else if (type === 'department' && id) {
        newSettings = {
          ...settings,
          departments: {
            ...settings.departments,
            [id]: { ...settings.departments[id], logo: publicUrl }
          }
        };
      } else if (type === 'principalSignature') {
        newSettings = { ...settings, school: { ...settings.school, signatorySignature: publicUrl } };
      } else if (type === 'vicePrincipalSignature') {
        newSettings = { ...settings, school: { ...settings.school, vicePrincipalCurriculumSignature: publicUrl } };
      } else if (type === 'lspDirectorSignature') {
        newSettings = { ...settings, school: { ...settings.school, lspDirectorSignature: publicUrl } };
      } else if (type === 'certificationManagerSignature') {
        newSettings = { ...settings, school: { ...settings.school, certificationManagerSignature: publicUrl } };
      } else if (type === 'competencyHeadSignature' && id) {
        newSettings = {
          ...settings,
          departments: {
            ...settings.departments,
            [id]: { ...settings.departments[id], competencyHeadSignature: publicUrl }
          }
        };
      } else if (type === 'examinerSignature' && id) {
        const [deptId, examinerIndex] = id.split('::');
        const idx = Number(examinerIndex);
        const currentDept = settings.departments[deptId];
        if (currentDept && Number.isInteger(idx) && idx >= 0) {
          const internalExaminers = [...(currentDept.internalExaminers || [])];
          internalExaminers[idx] = { ...(internalExaminers[idx] || { name: '', nip: '' }), signature: publicUrl };
          newSettings = {
            ...settings,
            departments: {
              ...settings.departments,
              [deptId]: { ...currentDept, internalExaminers }
            }
          };
        }
      }
      
      setSettings(newSettings);
      const syncSuccess = await saveSettingsToSupabase(newSettings);
      if (syncSuccess) {
        setNotification({ message: 'Gambar berhasil diperbarui & disimpan', type: 'success' });
      } else {
        setNotification({ message: 'Gambar berhasil diperbarui. Database lokal belum aktif, jadi pengaturan disimpan di server lokal.', type: 'success' });
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setNotification({ message: 'Gagal mengunggah gambar: ' + (err.message || 'Error tidak diketahui'), type: 'error' });
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const renderSignatureUploader = (
    title: string,
    value: string | undefined,
    uploadType: UploadAssetType,
    id?: string,
    onClear?: () => void
  ) => (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-app-bg/30 p-3">
      <div className="w-24 h-16 bg-white border border-border rounded-lg flex items-center justify-center overflow-hidden relative group shrink-0">
        {value ? (
          <img src={value} alt={title} className="w-full h-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : <ImageIcon className="text-text-muted opacity-20" size={22} />}
        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-bold uppercase">
          Unggah
          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, uploadType, id)} />
        </label>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-primary">{title}</p>
        <p className="text-[10px] text-text-muted mt-1">Kosong berarti tanda tangan tidak ditampilkan.</p>
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-600 underline underline-offset-2"
          >
            Hapus scan
          </button>
        )}
      </div>
    </div>
  );

  const generatePDF = async (student: Student, certificateType: 'ukk' | 'lsp' = 'ukk') => {
    try {
      const deptKey = student.Jurusan;
      const deptSettings = settings.departments[deptKey];
      
      const rawMitra = student['Mitra Industri'];
      let derivedIndustryName = '';
      let derivedIndustryLeader = '';
      let derivedIndustryLogo = '';
      let derivedIndustryField = '';

      const findIndustry = (idOrName: string) => {
        if (!idOrName) return null;
        const cleanName = idOrName.trim().toLowerCase();
        if (settings.industries[idOrName]) return settings.industries[idOrName];
        // Try matching by name (case-insensitive and trimmed)
        const found = (Object.values(settings.industries) as IndustrySettings[]).find(ind => 
          ind.name && ind.name.trim().toLowerCase() === cleanName
        );
        return found || null;
      };

      const indFound = findIndustry(rawMitra);
      if (indFound) {
        derivedIndustryName = indFound.name;
        derivedIndustryLeader = indFound.externalExaminer || indFound.leader;
        derivedIndustryLogo = indFound.logo || '';
        derivedIndustryField = indFound.field || '';
      } else if (rawMitra && rawMitra !== 'default' && !rawMitra.startsWith('industry_')) {
        derivedIndustryName = rawMitra;
        derivedIndustryLeader = student['Penguji Eksternal'] && student['Penguji Eksternal'] !== 'default' ? student['Penguji Eksternal'] : '';
      } else {
        const fallbackId = deptSettings?.industryId || 'default';
        const ind = settings.industries[fallbackId] || settings.industries['default'] || Object.values(settings.industries)[0];
        if (ind) {
           derivedIndustryName = ind.name;
           derivedIndustryLeader = ind.externalExaminer || ind.leader;
           derivedIndustryLogo = ind.logo || '';
           derivedIndustryField = ind.field || '';
        }
      }
      
      const finalLeader = student['Penguji Eksternal'] && student['Penguji Eksternal'] !== 'default' ? student['Penguji Eksternal'] : derivedIndustryLeader;

      const response = await fetch('/api/generate-certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student,
          certificateType,
          settings: {
            ...settings.school,
            origin: window.location.origin,
            schoolLogo: settings.school.logo,
            ministryLogo: settings.school.ministryLogo,
            city: settings.school.city,
            industryName: derivedIndustryName,
            industryLeader: finalLeader,
            industryLogo: derivedIndustryLogo,
            industryField: derivedIndustryField,
            date: settings.school.date,
            departments: settings.departments,
            industries: settings.industries, // Include industries
            layout: settings.layout,
            documentNumbering: settings.documentNumbering
          } 
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const safeName = (student['Nama Siswa'] || 'Skill Passport').replace(/[/\\?%*:|"<>]/g, '-');
        const safeNis = (student.NIS || '').replace(/[/\\?%*:|"<>]/g, '-');
        a.download = `Skill Passport_${certificateType.toUpperCase()}_${safeName}_${safeNis}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        // Slight delay before cleanup for better browser compatibility
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      } else {
        const text = await response.text().catch(() => '');
        let errorMsg = 'Server Error';
        try {
          const errData = JSON.parse(text);
          errorMsg = errData.details ? `${errData.error}: ${errData.details}` : (errData.error || errorMsg);
        } catch (e) {
          errorMsg = `HTTP ${response.status}: ${text.substring(0, 50)}...`;
        }
        setNotification({ 
          message: `Gagal membuat Skill Passport: ${errorMsg}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      setNotification({ message: 'Error generating PDF', type: 'error' });
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!confirm(`Hapus data ${student['Nama Siswa']}?`)) return;

    const newStudents = students.filter(item => item['Nomor Seri'] !== student['Nomor Seri']);
    const { error } = await supabase.from('students').delete().eq('nomor_seri', student['Nomor Seri']);

    setStudents(newStudents);
    if (error) {
      console.error("Delete failed:", error);
      setNotification({ message: 'Data dihapus dari daftar lokal. Database lokal belum aktif.', type: 'info' });
      return;
    }

    setNotification({ message: 'Data siswa berhasil dihapus', type: 'success' });
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s['Nama Siswa']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.NIS?.includes(searchTerm) ||
      s.NISN?.includes(searchTerm) ||
      s['Nomor Seri']?.includes(searchTerm);
    
    const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
    const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
    
    return matchesSearch && matchesDept && matchesYear;
  });

  const availableYears = Array.from(new Set(students.map(s => s['Tahun Lulus']))).sort();

  if (verifyMode.active) {
    const isScanMode = verifyMode.serial === null;
    const verifiedStudent = students.find(s => s['Nomor Seri'] === verifyMode.serial);

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="bg-primary p-8 text-center text-white relative">
            <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">
              E-Verify
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            >
              {settings.school.logo ? (
                <img src={settings.school.logo} alt="School Logo" className="w-14 h-14 object-contain" />
              ) : (
                <School className="text-white" size={40} />
              )}
            </motion.div>
            <h1 className="text-xl font-display font-bold mb-1">{settings.school.name}</h1>
            <p className="text-xs text-teal-100/70 font-medium">Validasi Skill Passport Uji Kompetensi</p>
          </div>

          <div className="p-8">
            {isScanMode ? (
                <div className="space-y-4">
                  <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200">
                     <Scanner 
                        onScan={(result) => {
                           const serial = result[0].rawValue;
                           setVerifyMode({active: true, serial: serial});
                        }} 
                     />
                  </div>
                  <button 
                    onClick={() => setVerifyMode({active: false, serial: null})}
                    className="w-full bg-slate-100 text-text-main py-3 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                  >
                    Batal Scan
                  </button>
                </div>
            ) : verifiedStudent ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-200 shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-green-800 font-bold text-sm">Skill Passport Valid</p>
                    <p className="text-green-600 text-[10px] font-medium uppercase tracking-tight">Data terdaftar di sistem pusat sekolah</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Nama Siswa</p>
                      <p className="font-bold text-sm text-slate-800">{verifiedStudent['Nama Siswa']}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">NISN</p>
                      <p className="font-bold text-sm text-slate-800">{verifiedStudent.NISN}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">NIS</p>
                       <p className="font-bold text-sm text-slate-800">{verifiedStudent.NIS}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Kelas</p>
                       <p className="font-bold text-sm text-slate-800">{verifiedStudent.Kelas}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Kompetensi Keahlian</p>
                    <p className="font-bold text-sm text-slate-800">{verifiedStudent.Jurusan}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Nomor Seri</p>
                      <p className="font-bold text-sm font-mono text-primary">{verifiedStudent['Nomor Seri']}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Predikat</p>
                      <span className="inline-block px-2.5 py-1 bg-accent text-white rounded-lg text-[10px] font-bold uppercase mt-1">
                        {verifiedStudent.Predikat}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 mb-4 italic">
                    Scan ini membuktikan keaslian dokumen fisik yang Anda pegang. 
                    Pastikan Data pada fisik Skill Passport sama dengan data digital di atas.
                  </p>
                  <button 
                    onClick={() => setVerifyMode({active: false, serial: null})}
                    className="text-xs font-bold text-primary hover:text-accent transition-colors flex items-center justify-center gap-2 mx-auto"
                  >
                    Kembali
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                  <Settings size={32} />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">Skill Passport Tidak Ditemukan</h2>
                <p className="text-sm text-slate-500 max-w-[250px] mx-auto mb-8">
                  Data dengan nomor seri <span className="font-mono font-bold text-red-500">{verifyMode.serial}</span> tidak terdaftar dalam database sekolah kami.
                </p>
                <button 
                  onClick={() => setVerifyMode({active: false, serial: null})}
                  className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-accent transition-all shadow-lg"
                >
                  Kembali
                </button>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Developed by kangphery - © 2026 Albee Tech
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-text-main font-sans selection:bg-accent selection:text-white overflow-x-hidden">
      {/* Sidebar Navigation */}
      <aside className={`fixed left-0 top-0 h-full bg-sidebar z-50 flex flex-col shadow-2xl transition-all duration-300 ${isSidebarExpanded ? 'w-[260px] p-6' : 'w-[80px] py-6 px-4 items-center'}`}>
        <div className={`flex items-center ${isSidebarExpanded ? 'gap-3 mb-8 px-1 w-full justify-start' : 'mb-8 justify-center w-full'} transition-all relative`}>
          <div className={`w-12 h-12 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-xl shrink-0 p-2 border border-white/10 transition-all ${isSidebarExpanded ? '' : 'scale-90'}`}>
            {settings.school.logo ? (
              <img src={settings.school.logo} alt="" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <School className="text-primary" size={24} />
            )}
          </div>
          {isSidebarExpanded && (
            <div className="overflow-hidden pr-6 whitespace-nowrap">
              <h1 className="font-display font-black text-2xl text-white leading-tight tracking-widest flex items-center gap-1">
                ESKILL
              </h1>
              <p className="text-[10px] text-teal-100/70 font-bold uppercase tracking-[0.05em]">E Skill Passport</p>
            </div>
          )}
        </div>

        <div className={`space-y-6 flex-grow overflow-y-auto no-scrollbar pb-4 ${isSidebarExpanded ? 'pr-2 w-full' : 'w-full flex flex-col items-center'}`}>
          {userRole && (
            <div className={!isSidebarExpanded ? 'w-full flex flex-col items-center' : 'w-full'}>
              {isSidebarExpanded ? (
                <p className="text-[10px] font-bold text-teal-100/60 uppercase tracking-[0.2em] mb-3 ml-1">Menu Utama</p>
              ) : (
                <div className="w-6 h-px bg-white/20 mb-3" />
              )}
              <div className="space-y-1 w-full flex flex-col items-center">
                {(userRole === 'admin' || userRole === 'entry' || userRole === 'lsp') && (
                  <NavItem 
                    expanded={isSidebarExpanded}
                    active={activeTab === 'dashboard'} 
                    onClick={() => handleTabChange('dashboard')} 
                    icon={<FileSpreadsheet size={18} />} 
                    label="Dashboard" 
                  />
                )}
                {userRole === 'admin' && (
                  <NavItem 
                    expanded={isSidebarExpanded}
                    active={activeTab === 'users'} 
                    onClick={() => handleTabChange('users')} 
                    icon={<Users size={18} />} 
                    label="Manajemen User" 
                  />
                )}
                {(userRole === 'admin' || userRole === 'entry' || userRole === 'lsp') && (
                  <>
                    {(userRole === 'admin' || userRole === 'entry') && (
                      <NavItem 
                        expanded={isSidebarExpanded}
                        active={activeTab === 'school'} 
                        onClick={() => handleTabChange('school')} 
                        icon={<School size={18} />} 
                        label="Data Sekolah" 
                      />
                    )}
                    <NavItem
                      expanded={isSidebarExpanded}
                      active={activeTab === 'certificate-signatures'}
                      onClick={() => handleTabChange('certificate-signatures')}
                      icon={<Factory size={18} />}
                      label="Data LSP"
                    />
                    <NavItem 
                      expanded={isSidebarExpanded}
                      active={activeTab === 'document-numbering'} 
                      onClick={() => handleTabChange('document-numbering')} 
                      icon={<FileText size={18} />} 
                      label="Nomor Surat" 
                    />
                  </>
                )}
                <NavItem 
                  expanded={isSidebarExpanded}
                  active={activeTab === 'departments'} 
                  onClick={() => handleTabChange('departments')} 
                  icon={<Filter size={18} />} 
                  label="Data Jurusan" 
                />
                <NavItem 
                  expanded={isSidebarExpanded}
                  active={activeTab === 'students'} 
                  onClick={() => handleTabChange('students')} 
                  icon={<UserPlus size={18} />} 
                  label="Data Siswa" 
                />
              </div>
            </div>
          )}

          <div className={!isSidebarExpanded ? 'w-full flex flex-col items-center' : 'w-full'}>
            {isSidebarExpanded ? (
               <p className="text-[10px] font-bold text-teal-100/60 uppercase tracking-[0.2em] mb-3 ml-1">Aksi</p>
            ) : (
               <div className="w-6 h-px bg-white/20 mb-3" />
            )}
            <div className="space-y-1 w-full flex flex-col items-center">
              <NavItem 
                expanded={isSidebarExpanded}
                active={activeTab === 'scores'} 
                onClick={() => handleTabChange('scores')} 
                icon={<FileSpreadsheet size={18} />} 
                label="Nilai Siswa" 
              />
              <NavItem 
                expanded={isSidebarExpanded}
                active={activeTab === 'certificates'} 
                onClick={() => handleTabChange('certificates')} 
                icon={<Printer size={18} />} 
                label="Cetak Skill Passport" 
              />
              {(userRole === 'admin' || userRole === 'entry' || userRole === 'lsp') && (
                <NavItem 
                  expanded={isSidebarExpanded}
                  active={activeTab === 'bulk-delete'} 
                  onClick={() => handleTabChange('bulk-delete')} 
                  icon={<Trash2 size={18} />} 
                  label="Hapus Data" 
                />
              )}
              {(userRole === 'admin' || userRole === 'entry') && (
                <NavItem 
                  expanded={isSidebarExpanded}
                  active={activeTab === 'settings'} 
                  onClick={() => handleTabChange('settings')} 
                  icon={<Settings size={18} />} 
                  label="Pengaturan" 
                />
              )}
              {userRole === 'admin' && (
                <NavItem
                  expanded={isSidebarExpanded}
                  active={activeTab === 'activity-logs'}
                  onClick={() => handleTabChange('activity-logs')}
                  icon={<ScrollText size={18} />}
                  label="Log Aktivitas"
                />
              )}
              {(userRole === 'admin' || userRole === 'kakonli' || userRole === 'entry' || userRole === 'lsp') && (
                <NavItem 
                  expanded={isSidebarExpanded}
                  active={activeTab === 'validation'} 
                  onClick={() => handleTabChange('validation')} 
                  icon={<CheckCircle2 size={18} />} 
                  label="Validasi Skill Passport" 
                />
              )}
            </div>
          </div>
        </div>

        <div className={`mt-auto pt-4 border-t border-white/10 transition-all flex flex-col items-center ${isSidebarExpanded ? 'w-full' : 'w-full'}`}>
          {isSidebarExpanded ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-white/10 border border-white/5 whitespace-nowrap w-full">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white font-display shrink-0">
                A
              </div>
              <div className="overflow-hidden pr-2">
                <p className="text-xs font-bold text-white font-display truncate capitalize">{userRole || 'User'}</p>
                <p className="text-[10px] text-teal-100/70 font-medium truncate">{userEmail}</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/5 flex items-center justify-center font-bold text-white font-display shrink-0 uppercase" title={userRole || 'User'}>
              {userRole ? userRole.charAt(0) : 'U'}
            </div>
          )}
          
          {isSidebarExpanded && (
            <div className="mt-4 px-2 whitespace-nowrap w-full">
              <div 
                className="group flex flex-col gap-1 transition-all"
              >
                <p className="text-[10px] font-bold text-teal-100/60 uppercase tracking-[0.1em]">Developed by <a href="https://lms.albee-tech.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white transition-colors">kangphery</a></p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] font-display font-medium text-teal-100/40">
                    © 2026
                  </p>
                  <p className="text-[10px] font-bold text-teal-100/50 bg-white/5 py-0.5 px-2 rounded-full">
                    V2.6.26
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'pl-[260px]' : 'pl-[80px]'}`}>
        <header className="sticky top-0 h-20 bg-app-bg/80 backdrop-blur-md px-4 lg:px-10 flex items-center justify-between z-30 border-b border-border/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="p-2 -ml-2 text-primary hover:bg-accent/10 rounded-xl transition-colors"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-lg lg:text-xl font-display font-bold text-primary tracking-tight">
                {activeTab === 'dashboard' && "ESKILL Dashboard"}
                {activeTab === 'school' && "Konfigurasi Sekolah"}
                {activeTab === 'certificate-signatures' && "Data LSP"}
                {activeTab === 'document-numbering' && "Nomor Surat Skill Passport"}
                {activeTab === 'departments' && "Manajemen Jurusan"}
                {activeTab === 'validation' && "Validasi Skill Passport Siswa"}
                {activeTab === 'industry' && "Mitra Industri"}
                {activeTab === 'students' && "Basis Data Siswa"}
                {activeTab === 'scores' && "Nilai Siswa"}
                {activeTab === 'certificates' && "Cetak Skill Passport"}
                {activeTab === 'bulk-delete' && "Hapus Data Masal"}
                {activeTab === 'users' && "Manajemen User"}
                {activeTab === 'settings' && "Pengaturan Aplikasi"}
                {activeTab === 'activity-logs' && "Log Aktivitas"}
              </h2>
              <p className="hidden md:block text-[11px] text-text-muted font-medium mt-0.5">Kelola dan terbitkan Skill Passport digital dengan mudah.</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {userRole && userRole !== 'admin' && (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                  className="flex items-center gap-2 p-2 md:px-3 md:py-2 bg-white border border-border rounded-xl text-primary shadow-sm hover:bg-app-bg transition-colors"
                  title="Profil pengguna"
                  aria-label="Profil pengguna"
                  aria-expanded={isProfileMenuOpen}
                >
                  <UserCircle size={21} />
                  <span className="hidden lg:block max-w-[150px] truncate text-xs font-bold">{userEmail}</span>
                  <ChevronDown size={14} className={`hidden md:block transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      className="absolute right-0 top-[calc(100%+10px)] w-72 bg-white border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                    >
                      <div className="px-5 py-4 border-b border-border bg-app-bg/60">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Profil Pengguna</p>
                        <p className="mt-1 text-sm font-bold text-primary truncate">{userEmail}</p>
                        <p className="mt-1 text-[11px] font-semibold text-text-muted capitalize">Role: {userRole === 'entry' ? 'Entry Data' : userRole === 'lsp' ? 'LSP' : 'Kakonli'}</p>
                      </div>
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setIsOwnPasswordModalOpen(true);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                        >
                          <Lock size={17} />
                          Ganti Password
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
            >
              Logout
            </button>
            <div className="hidden md:flex items-center gap-6 p-1.5 bg-white border border-border shadow-sm rounded-2xl">
              <div className="flex items-center gap-3 px-4 py-1.5">
                <Calendar size={16} className="text-accent" />
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider font-display">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="w-px h-6 bg-border"></div>
              <div className="flex items-center gap-3 px-4 py-1.5 bg-app-bg rounded-xl">
                <Clock size={16} className="text-accent" />
                <span className="text-[13px] font-bold text-primary font-mono tabular-nums">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'validation' && (
              <motion.div 
                key="validation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-xl mx-auto p-8 bg-white border border-border rounded-3xl shadow-sm"
              >
                <div className="text-center mb-8">
                  <h3 className="font-display font-bold text-2xl text-primary">Validasi Skill Passport Siswa</h3>
                  <p className="text-sm text-text-muted mt-2">Masukkan nomor seri Skill Passport untuk memastikan keaslian data.</p>
                </div>
                <div className="space-y-4">
                   <div className="relative">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                     <input 
                       id="serialInput"
                       type="text" 
                       placeholder="Masukkan Nomor Seri..."
                       className="w-full pl-12 pr-4 py-4 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold text-sm"
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                            const serialInput = document.getElementById('serialInput') as HTMLInputElement;
                            const serial = serialInput.value;
                            const student = students.find(s => s['Nomor Seri'] === serial);
                            setVerifyMode({active: true, serial: serial});
                         }
                       }}
                     />
                   </div>
                   <button 
                     onClick={() => {
                        const serialInput = document.getElementById('serialInput') as HTMLInputElement;
                        const serial = serialInput.value;
                        setVerifyMode({active: true, serial: serial});
                     }}
                     className="w-full bg-primary text-white py-4 rounded-xl font-bold text-sm hover:bg-primary/90 transition-all"
                   >
                     Cek Skill Passport
                   </button>
                   <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest pt-2">ATAU</p>
                   <button 
                     onClick={() => setVerifyMode({active: true, serial: null})}
                     className="w-full bg-slate-100 py-4 rounded-xl font-bold text-sm text-primary hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                   >
                     <QrCode size={18} /> Buka Scanner QR
                   </button>
                </div>
              </motion.div>
            )}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Main Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StatCard 
                    label="Total Siswa UKK" 
                    value={students.length.toString()} 
                    colorClass="bg-primary text-white border-none shadow-xl shadow-primary/20"
                  />
                  <StatCard 
                    label="Skill Passport Terbit" 
                    value={Math.floor(students.length * 0.8).toString()} 
                    colorClass="bg-white border-border border-b-4 border-b-emerald-500"
                  />
                </div>

                {/* Regional/Dept Stats */}
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Distribusi Peserta Per Jurusan</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    label="TKJ" 
                    value={students.filter(s => s.Jurusan === 'Teknik Komputer dan Jaringan').length.toString()} 
                    colorClass="bg-white border-l-4 border-l-yellow-400"
                  />
                  <StatCard 
                    label="TEI" 
                    value={students.filter(s => s.Jurusan === 'Teknik Elektronika Industri').length.toString()} 
                    colorClass="bg-white border-l-4 border-l-orange-500"
                  />
                  <StatCard 
                    label="TKR" 
                    value={students.filter(s => s.Jurusan === 'Teknik Kendaraan Ringan').length.toString()} 
                    colorClass="bg-white border-l-4 border-l-red-500"
                  />
                  <StatCard 
                    label="TSM" 
                    value={students.filter(s => s.Jurusan === 'Teknik Sepeda Motor').length.toString()} 
                    colorClass="bg-white border-l-4 border-l-slate-400"
                  />
                  <StatCard 
                    label="Kuliner" 
                    value={students.filter(s => s.Jurusan === 'Kuliner').length.toString()} 
                    colorClass="bg-white border-l-4 border-l-emerald-500"
                  />
                  <StatCard 
                    label="Bisnis Digital" 
                    value={students.filter(s => s.Jurusan === 'Bisnis Digital').length.toString()} 
                    colorClass="bg-white border-l-4 border-l-purple-500"
                  />
                  <StatCard 
                    label="Akuntansi" 
                    value={students.filter(s => s.Jurusan === 'Akuntansi Keuangan Lembaga').length.toString()} 
                    colorClass="bg-white border-l-4 border-l-blue-500"
                  />
                </div>

                {/* Dashboard Placeholder/Welcome */}
                <div className="bg-white rounded-3xl p-10 border border-border shadow-sm flex items-center gap-10 overflow-hidden relative">
                  <div className="flex-grow relative z-10">
                    <h3 className="text-2xl font-display font-bold mb-4 text-primary">Portal E Skill Passport</h3>
                    <p className="text-sm text-text-muted leading-relaxed max-w-xl">
                      Sistem manajemen Skill Passport UKK digital yang dirancang untuk efisiensi dan profesionalitas. 
                      Kelola <span className="text-accent font-bold">{Object.keys(settings.departments).length} Jurusan Utama</span> {settings.school.name || 'sekolah'} dengan mudah melalui antarmuka yang modern.
                    </p>
                    <div className="mt-8 flex gap-4">
                      <button 
                        onClick={() => setActiveTab('students')}
                        className="px-6 py-2.5 bg-accent text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-accent/80 transition-all shadow-lg shadow-accent/20"
                      >
                        Cek Nilai Siswa
                      </button>
                      <button 
                         onClick={() => handleTabChange('departments')}
                         className="px-6 py-2.5 bg-slate-200 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-300 transition-all"
                      >
                        Mulai Aplikasi
                      </button>
                    </div>
                  </div>
                  <div className="hidden lg:block relative z-10">
                    <div className="w-48 h-48 bg-accent/5 rounded-full flex items-center justify-center p-8 border border-accent/10">
                       <School size={80} className="text-accent opacity-40" />
                    </div>
                  </div>
                  {/* Decorative element */}
                  <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
                </div>
              </motion.div>
            )}

            {activeTab === 'school' && (
              <motion.div 
                key="school"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-white rounded-xl p-8 border border-border"
              >
                <div className="flex items-center gap-3 mb-8">
                  <School className="text-primary" size={22} />
                  <h3 className="text-lg font-bold">Data Sekolah</h3>
                </div>
                
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
                    {/* School Logo */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-app-bg border border-border rounded-xl flex items-center justify-center overflow-hidden relative group shrink-0">
                        {settings.school.logo ? (
                          <img src={settings.school.logo} alt="" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <ImageIcon className="text-text-muted opacity-20" size={24} />
                        )}
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-bold uppercase">
                          Ganti
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'school')} />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Logo Sekolah</p>
                        <p className="text-[10px] text-text-muted mt-1 leading-tight">Posisi: Logo Website & Icon Browser</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-app-bg border border-border rounded-xl flex items-center justify-center overflow-hidden relative group shrink-0">
                        {settings.school.provinceLogo ? (
                          <img src={settings.school.provinceLogo} alt="" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <ImageIcon className="text-text-muted opacity-20" size={24} />
                        )}
                        <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-bold uppercase">
                          Unggah
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'province')} />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm font-bold">Logo Provinsi</p>
                        <p className="text-[10px] text-text-muted mt-1 leading-tight">Posisi: Kop Surat Keterangan</p>
                      </div>
                    </div>
                  </div>

                  <Input label="Nama Sekolah" value={settings.school.name} onChange={(v) => setSettings({...settings, school: {...settings.school, name: v}})} />
                  <Input label="Nama Pemerintah Provinsi" value={settings.school.provinceName || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, provinceName: v}})} />
                  <Input label="Nama Dinas" value={settings.school.educationOffice || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, educationOffice: v}})} />
                  <Input label="Alamat Sekolah (Kop Surat)" value={settings.school.address} onChange={(v) => setSettings({...settings, school: {...settings.school, address: v}})} />
                  <Input label="Nomor Telepon" value={settings.school.phone || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, phone: v}})} />
                  <Input label="Pos-el / Email" value={settings.school.email || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, email: v}})} />
                  <Input label="Kota (Tanggal Surat Keterangan)" value={settings.school.city || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, city: v}})} />
                  <Input label="Tanggal Terbit (Contoh: 25 April 2025)" value={settings.school.date} onChange={(v) => setSettings({...settings, school: {...settings.school, date: v}})} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Nama Kepala Sekolah" value={settings.school.signatory} onChange={(v) => setSettings({...settings, school: {...settings.school, signatory: v}})} />
                    <Input label="NIP Kepala Sekolah" value={settings.school.signatoryNip} onChange={(v) => setSettings({...settings, school: {...settings.school, signatoryNip: v}})} />
                    <Input label="Nama Waka Kurikulum" value={settings.school.vicePrincipalCurriculum || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, vicePrincipalCurriculum: v}})} />
                    <Input label="NIP Waka Kurikulum" value={settings.school.vicePrincipalCurriculumNip || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, vicePrincipalCurriculumNip: v}})} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {renderSignatureUploader(
                      'Scan TTD Kepala Sekolah',
                      settings.school.signatorySignature,
                      'principalSignature',
                      undefined,
                      () => setSettings({...settings, school: {...settings.school, signatorySignature: ''}})
                    )}
                    {renderSignatureUploader(
                      'Scan TTD Waka Kurikulum',
                      settings.school.vicePrincipalCurriculumSignature,
                      'vicePrincipalSignature',
                      undefined,
                      () => setSettings({...settings, school: {...settings.school, vicePrincipalCurriculumSignature: ''}})
                    )}
                  </div>
                  <div className="pt-4">
                    <button 
                      onClick={async () => {
                        setIsLoading(true);
                        const success = await saveSettingsToSupabase();
                        setIsLoading(false);
                        if (success) {
                          setNotification({ message: 'Data sekolah berhasil diperbarui & disimpan', type: 'success' });
                        } else {
                          setNotification({ message: 'Data tersimpan lokal, tapi gagal menyimpan. Pastikan koneksi atau hubungi admin.', type: 'error' });
                        }
                      }}
                      disabled={isLoading}
                      className="bg-accent text-white px-8 py-2.5 rounded-lg font-bold hover:bg-accent/80 transition-all shadow-lg shadow-accent/10 disabled:opacity-50"
                    >
                      {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'certificate-signatures' && (userRole === 'admin' || userRole === 'entry' || userRole === 'lsp') && (
              <motion.div
                key="certificate-signatures"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-white rounded-xl p-8 border border-border"
              >
                <div className="flex items-center gap-3 mb-8">
                  <Factory className="text-primary" size={22} />
                  <div>
                    <h3 className="text-lg font-bold">Data LSP</h3>
                    <p className="text-xs text-text-muted mt-1">Kelola identitas dan penanggung jawab Lembaga Sertifikasi Profesi.</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <section>
                    <h4 className="text-sm font-bold text-primary mb-4">Logo Lembaga</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-app-bg border border-border rounded-xl flex items-center justify-center overflow-hidden relative group shrink-0">
                          {settings.school.lspLogo ? (
                            <img src={settings.school.lspLogo} alt="Logo LSP" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : <ImageIcon className="text-text-muted opacity-20" size={24} />}
                          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-bold uppercase">
                            Unggah
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'lsp')} />
                          </label>
                        </div>
                        <div>
                          <p className="text-sm font-bold">Logo LSP</p>
                          <p className="text-[10px] text-text-muted mt-1">Lembaga Sertifikasi Profesi</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-app-bg border border-border rounded-xl flex items-center justify-center overflow-hidden relative group shrink-0">
                          {settings.school.bnspLogo ? (
                            <img src={settings.school.bnspLogo} alt="Logo BNSP" className="w-full h-full object-contain p-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : <ImageIcon className="text-text-muted opacity-20" size={24} />}
                          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-bold uppercase">
                            Unggah
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'bnsp')} />
                          </label>
                        </div>
                        <div>
                          <p className="text-sm font-bold">Logo BNSP</p>
                          <p className="text-[10px] text-text-muted mt-1">Badan Nasional Sertifikasi Profesi</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="border-t border-border pt-8">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-primary">Identitas Kop LSP</h4>
                      <p className="text-[11px] text-text-muted mt-1">Data berikut digunakan khusus untuk kop Skill Passport versi LSP.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input label="Nama Lembaga" value={settings.school.lspHeaderName || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspHeaderName: v}})} placeholder="LEMBAGA SERTIFIKASI PROFESI (LSP)" />
                      <Input label="Nama LSP / Sekolah" value={settings.school.lspSchoolName || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspSchoolName: v}})} placeholder={settings.school.name} />
                      <Input label="Nomor Lisensi" value={settings.school.lspLicenseNumber || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspLicenseNumber: v}})} placeholder="BNSP-LSP-0000-ID" />
                      <Input label="Telepon / Faks" value={settings.school.lspPhoneFax || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspPhoneFax: v}})} placeholder="(0342) 000000" />
                      <div className="md:col-span-2">
                        <Input label="Alamat LSP" value={settings.school.lspAddress || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspAddress: v}})} placeholder="Alamat lengkap LSP" />
                      </div>
                      <Input label="Email LSP" value={settings.school.lspEmail || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspEmail: v}})} placeholder="lsp@sekolah.sch.id" />
                      <Input label="Website LSP" value={settings.school.lspWebsite || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspWebsite: v}})} placeholder="www.lsp.sekolah.sch.id" />
                    </div>
                  </section>

                  <section className="border-t border-border pt-8">
                    <h4 className="text-sm font-bold text-primary mb-4">Direktur LSP</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input label="Nama Direktur LSP" value={settings.school.lspDirector || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, lspDirector: v}})} />
                      {renderSignatureUploader(
                        'Scan TTD Direktur LSP',
                        settings.school.lspDirectorSignature,
                        'lspDirectorSignature',
                        undefined,
                        () => setSettings({...settings, school: {...settings.school, lspDirectorSignature: ''}})
                      )}
                    </div>
                  </section>

                  <section className="border-t border-border pt-8">
                    <h4 className="text-sm font-bold text-primary mb-4">Manajer Sertifikasi</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Input label="Nama Manajer Sertifikasi" value={settings.school.certificationManager || ''} onChange={(v) => setSettings({...settings, school: {...settings.school, certificationManager: v}})} />
                      {renderSignatureUploader(
                        'Scan TTD Manajer Sertifikasi',
                        settings.school.certificationManagerSignature,
                        'certificationManagerSignature',
                        undefined,
                        () => setSettings({...settings, school: {...settings.school, certificationManagerSignature: ''}})
                      )}
                    </div>
                  </section>

                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        setIsLoading(true);
                        const success = await saveSettingsToSupabase();
                        setIsLoading(false);
                        setNotification({
                          message: success ? 'Data LSP berhasil disimpan' : 'Gagal menyimpan Data LSP. Pastikan database aktif.',
                          type: success ? 'success' : 'error'
                        });
                      }}
                      disabled={isLoading}
                      className="bg-accent text-white px-8 py-2.5 rounded-lg font-bold hover:bg-accent/80 transition-all shadow-lg shadow-accent/10 disabled:opacity-50"
                    >
                      {isLoading ? 'Menyimpan...' : 'Simpan Data LSP'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'industry' && (
              <motion.div 
                key="industry"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl p-8 border border-border"
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Factory className="text-primary" size={22} />
                    <h3 className="text-lg font-bold">Manajemen Mitra Industri</h3>
                  </div>
                  <button 
                    onClick={() => {
                      const id = `industry_${Date.now()}`;
                      setSettings({
                        ...settings,
                        industries: {
                          ...settings.industries,
                          [id]: { name: 'Mitra Baru', field: '', leader: '', logo: '' }
                        }
                      });
                    }}
                    className="flex items-center gap-2 bg-slate-100 text-teal-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    <Plus size={16} />
                    Tambah Mitra
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.keys(settings.industries).map((id) => {
                    const item = settings.industries[id];
                    return (
                      <div key={id} className="p-6 border border-border rounded-2xl space-y-5 bg-app-bg/10 relative group">
                        {id !== 'default' && (
                          <button 
                            onClick={() => {
                              const newIndustries = { ...settings.industries };
                              delete newIndustries[id];
                              setSettings({ ...settings, industries: newIndustries });
                            }}
                            className="absolute top-4 right-4 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white border border-border rounded-xl flex items-center justify-center overflow-hidden relative group/logo shrink-0 shadow-sm">
                            {item.logo ? (
                              <img src={item.logo} alt={item.name} className="w-full h-full object-contain p-2" />
                            ) : (
                              <ImageIcon className="text-text-muted opacity-20" size={24} />
                            )}
                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-bold uppercase">
                              Ganti
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={(e) => handleLogoUpload(e, 'industry', id)} 
                              />
                            </label>
                          </div>
                          <div className="flex-grow">
                            <input 
                              className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0 placeholder:text-text-muted/40"
                              placeholder="Nama Industri..."
                              value={item.name}
                              onChange={(e) => {
                                const newInd = { ...settings.industries };
                                newInd[id].name = e.target.value;
                                setSettings({ ...settings, industries: newInd });
                              }}
                            />
                            <p className="text-[10px] text-text-muted font-medium uppercase mt-1">ID Mitra: {id}</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-teal-600/60 uppercase tracking-[0.15em] mb-2 block ml-1">Bidang Industri</label>
                            <select 
                              value={item.field}
                              onChange={(e) => {
                                const newInd = { ...settings.industries };
                                newInd[id].field = e.target.value;
                                setSettings({ ...settings, industries: newInd });
                              }}
                              className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium text-primary shadow-sm"
                            >
                               <option value="">-- Pilih Bidang (Jurusan) --</option>
                               {Object.keys(settings.departments).map(deptName => (
                                 <option key={deptName} value={deptName}>{deptName}</option>
                               ))}
                            </select>
                          </div>
                          <Input 
                            label="Nama Pimpinan (Penandatangan)" 
                            value={item.leader} 
                            onChange={(v) => {
                              const newInd = { ...settings.industries };
                              newInd[id].leader = v;
                              setSettings({ ...settings, industries: newInd });
                            }} 
                          />
                          <Input 
                            label="Jabatan Pimpinan Industri (Halaman Depan Top)" 
                            placeholder="Contoh: Direktur / Manajer / Penjamin Mutu"
                            value={item.industryLeadTitle || ''} 
                            onChange={(v) => {
                              const newInd = { ...settings.industries };
                              newInd[id].industryLeadTitle = v;
                              setSettings({ ...settings, industries: newInd });
                            }} 
                          />
                          <Input 
                            label="Jabatan Asesor (Halaman Depan Bottom)" 
                            placeholder="Contoh: Penguji Eksternal / Senior Engineer"
                            value={item.assessorPosition || ''} 
                            onChange={(v) => {
                              const newInd = { ...settings.industries };
                              newInd[id].assessorPosition = v;
                              setSettings({ ...settings, industries: newInd });
                            }} 
                          />
                          <Input 
                            label="NIP / No REK Asesor (Halaman Depan Bottom - Opsional)" 
                            placeholder="Isi jika ada, kosongkan jika tidak ingin tampil"
                            value={item.assessorNip || ''} 
                            onChange={(v) => {
                              const newInd = { ...settings.industries };
                              newInd[id].assessorNip = v;
                              setSettings({ ...settings, industries: newInd });
                            }} 
                          />
                          
                          {/* Multi External Examiners */}
                          <div className="space-y-3 pt-2">
                             <div className="flex items-center justify-between">
                               <label className="text-[10px] font-bold text-teal-600/60 uppercase tracking-[0.15em] ml-1">Daftar Penguji Eksternal</label>
                               <button 
                                 onClick={() => {
                                   const newInd = { ...settings.industries };
                                   if (!newInd[id].externalExaminers) {
                                     newInd[id].externalExaminers = item.externalExaminer ? [{ name: item.externalExaminer }] : [];
                                   }
                                   newInd[id].externalExaminers!.push({ name: '' });
                                   setSettings({ ...settings, industries: newInd });
                                 }}
                                 className="text-[9px] font-bold bg-primary/5 text-primary px-2 py-1 rounded hover:bg-primary/10 transition-all flex items-center gap-1"
                               >
                                 <Plus size={10} /> Tambah
                               </button>
                             </div>
                             
                             <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                               {(!item.externalExaminers || item.externalExaminers.length === 0) ? (
                                 <div className="p-3 bg-white border border-dashed border-border rounded-xl text-center">
                                    <p className="text-[10px] text-text-muted italic">Belum ada penguji.</p>
                                 </div>
                               ) : (
                                 item.externalExaminers.map((ex, exIdx) => (
                                   <div key={exIdx} className="flex items-center gap-2">
                                     <input 
                                       type="text"
                                       className="flex-grow px-3 py-2 bg-white border border-border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                       placeholder="Nama Penguji..."
                                       value={ex.name}
                                       onChange={(e) => {
                                         const newInd = { ...settings.industries };
                                         newInd[id].externalExaminers![exIdx].name = e.target.value;
                                         setSettings({ ...settings, industries: newInd });
                                       }}
                                     />
                                     <button 
                                       onClick={() => {
                                         const newInd = { ...settings.industries };
                                         newInd[id].externalExaminers!.splice(exIdx, 1);
                                         setSettings({ ...settings, industries: newInd });
                                       }}
                                       className="p-2 text-red-400 hover:text-red-600"
                                     >
                                       <Trash2 size={14} />
                                     </button>
                                   </div>
                                 ))
                               )}
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-10 pt-8 border-t border-border flex justify-end">
                  <button 
                    onClick={async () => {
                      setIsLoading(true);
                      const success = await saveSettingsToSupabase();
                      setIsLoading(false);
                      if (success) {
                        setNotification({ message: 'Seluruh data mitra industri berhasil disimpan & disimpan', type: 'success' });
                      } else {
                        setNotification({ message: 'Gagal menyimpan mitra industri. Coba lagi nanti.', type: 'error' });
                      }
                    }}
                    disabled={isLoading}
                    className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/80 transition-all shadow-xl shadow-accent/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} />
                    {isLoading ? 'Menyimpan...' : 'Simpan Seluruh Perubahan Mitra'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'document-numbering' && (
              <motion.div 
                key="document-numbering"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-white rounded-xl p-8 border border-border"
              >
                <div className="flex items-center gap-3 mb-8">
                  <FileText className="text-primary" size={22} />
                  <h3 className="text-lg font-bold">Pengaturan Nomor Surat</h3>
                </div>
                
                <div className="space-y-6">
                  <p className="text-xs text-text-muted bg-teal-50 p-4 rounded-xl border border-teal-100 leading-relaxed">
                    Atur format nomor surat sekolah untuk Skill Passport UKK dan format nomor surat LSP untuk Skill Passport LSP. Gunakan placeholder <span className="font-bold text-primary">{'{YEAR}'}</span> untuk tahun lulus dan <span className="font-bold text-primary">{'{SERIAL}'}</span> untuk nomor urut siswa. Jika format LSP dikosongkan, format LSP otomatis memakai nomor surat sekolah.
                  </p>

                  <Input 
                    label="Format Nomor Surat Sekolah" 
                    value={settings.documentNumbering?.format || ''} 
                    onChange={(v) => setSettings({...settings, documentNumbering: {...(settings.documentNumbering || { year: '' }), format: v}})} 
                  />

                  <Input
                    label="Format Nomor Surat LSP"
                    value={settings.documentNumbering?.lspFormat || ''}
                    onChange={(v) => setSettings({...settings, documentNumbering: {...(settings.documentNumbering || { format: '', year: '' }), lspFormat: v}})}
                  />

                  <Input 
                    label="Tahun Lulus Aktif" 
                    value={settings.documentNumbering?.year || ''} 
                    onChange={(v) => setSettings({...settings, documentNumbering: {...(settings.documentNumbering || { format: '' }), year: v}})} 
                  />

                  <div className="bg-app-bg p-4 rounded-2xl border border-border space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contoh Hasil:</p>
                    <p className="text-sm font-mono font-bold text-primary">
                      UKK: {(settings.documentNumbering?.format || '')
                        .replace('{YEAR}', settings.documentNumbering?.year || '2025')
                        .replace('{SERIAL}', '25UKK5240126172')}
                    </p>
                    <p className="text-sm font-mono font-bold text-primary">
                      LSP: {((settings.documentNumbering?.lspFormat || '').trim() || settings.documentNumbering?.format || '')
                        .replace('{YEAR}', settings.documentNumbering?.year || '2025')
                        .replace('{SERIAL}', '25UKK5240126172')}
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <button 
                      onClick={async () => {
                        setIsLoading(true);
                        const success = await saveSettingsToSupabase();
                        setIsLoading(false);
                        if (success) {
                          setNotification({ message: 'Pengaturan nomor surat berhasil disimpan & disimpan', type: 'success' });
                        } else {
                          setNotification({ message: 'Gagal menyimpan nomor surat.', type: 'error' });
                        }
                      }}
                      disabled={isLoading}
                      className="bg-accent text-white px-8 py-2.5 rounded-lg font-bold hover:bg-accent/80 transition-all shadow-lg shadow-accent/10 disabled:opacity-50"
                    >
                      {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'departments' && (
              <motion.div 
                key="departments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-xl p-8 border border-border"
              >
                {!editingDept ? (
                  <>
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold text-primary-dark">Manajemen Jurusan</h3>
                      <button 
                        onClick={() => {
                          const name = window.prompt('Masukkan Nama Jurusan Baru:');
                          if (name && name.trim()) {
                            const trimmedName = name.trim();
                            if (settings.departments[trimmedName]) {
                              alert('Nama jurusan sudah ada.');
                              return;
                            }
                            const newDepts = { ...settings.departments };
                            newDepts[trimmedName] = {
                              name: trimmedName,
                              assignmentTitleId: '-',
                              competencyHeadName: '',
                              competencyHeadNip: '',
                              skillProgram: '',
                              skillConcentration: trimmedName,
                              standardReferenceLSP: '',
                              expertiseField: '',
                              lspSchemeType: 'Skema',
                              lspSchemeName: '',
                              competencies: [],
                              internalExaminers: [],
                              industryId: Object.keys(settings.industries)[0] || 'default'
                            };
                            setSettings({ ...settings, departments: newDepts });
                          }
                        }}
                        className="flex items-center gap-2 bg-slate-100 text-teal-800 px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200"
                      >
                        <Plus size={16} />
                        Tambah Jurusan
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {Object.keys(settings.departments).map((key) => {
                        const dept = settings.departments[key];
                        return (
                          <div key={key} className="group p-5 border border-border rounded-xl flex flex-col items-center text-center bg-white hover:border-primary/50 transition-all hover:shadow-lg relative overflow-hidden">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Hapus jurusan ${key}? Semua data kompetensi di dalamnya akan hilang.`)) {
                                  const newDepts = { ...settings.departments };
                                  delete newDepts[key];
                                  setSettings({ ...settings, departments: newDepts });
                                }
                              }}
                              className="absolute top-3 right-3 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              title="Hapus Jurusan"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className="absolute top-0 left-0 w-full h-1 bg-primary/10 group-hover:bg-primary/30 transition-colors"></div>
                            <div className="w-16 h-16 bg-app-bg rounded-2xl flex items-center justify-center mb-4 border border-border group-hover:scale-105 transition-transform overflow-hidden">
                              {dept.logo ? (
                                <img src={dept.logo} alt={key} className="w-full h-full object-contain p-2" />
                              ) : (
                                <ImageIcon size={24} className="text-text-muted opacity-40" />
                              )}
                            </div>
                            <p className="text-sm font-bold text-text-main mb-1 line-clamp-2">{key}</p>
                            <p className="text-[10px] text-text-muted font-bold uppercase mb-4">
                              Mitra: {settings.industries[dept.industryId]?.name || 'Belum diatur'}
                            </p>
                            <button 
                              onClick={() => setEditingDept(key)}
                              className="w-full text-xs bg-primary text-white py-2.5 rounded-lg font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                            >
                              Kelola Kompetensi
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-10 pt-8 border-t border-border flex justify-end">
                      <button 
                        onClick={async () => {
                          setIsLoading(true);
                          const success = await saveSettingsToSupabase();
                          setIsLoading(false);
                          if (success) {
                            setNotification({ message: 'Seluruh data jurusan berhasil disimpan & disimpan', type: 'success' });
                          } else {
                            setNotification({ message: 'Gagal menyimpan data jurusan. Coba lagi nanti.', type: 'error' });
                          }
                        }}
                        disabled={isLoading}
                        className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-accent/80 transition-all shadow-xl shadow-accent/20 flex items-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        {isLoading ? 'Menyimpan...' : 'Simpan Seluruh Perubahan Jurusan'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="flex items-center justify-between border-b border-border pb-6">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setEditingDept(null)}
                          className="p-2 hover:bg-app-bg rounded-full text-text-muted transition-colors"
                        >
                          <ChevronRight size={20} className="rotate-180" />
                        </button>
                        <div>
                          <h3 className="text-lg font-bold text-primary-dark uppercase tracking-tight">{editingDept}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-text-muted font-medium">Mitra Industri:</p>
                            <select 
                              value={settings.departments[editingDept].industryId}
                              onChange={(e) => {
                                if (!editingDept) return;
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].industryId = e.target.value;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                              className="text-[10px] font-bold bg-app-bg border border-border rounded-md px-2 py-0.5 text-primary outline-none focus:ring-1 focus:ring-primary"
                            >
                              {Object.keys(settings.industries).map(id => (
                                <option key={id} value={id}>{settings.industries[id].name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          setIsLoading(true);
                          const success = await saveSettingsToSupabase();
                          setIsLoading(false);
                          if (success) {
                             setEditingDept(null);
                             setNotification({ message: 'Data jurusan berhasil disimpan & disimpan', type: 'success' });
                          } else {
                             setNotification({ message: 'Gagal menyimpan data jurusan.', type: 'error' });
                          }
                        }}
                        disabled={isLoading}
                        className="bg-accent text-white px-6 py-2 rounded-lg font-bold hover:bg-accent/80 transition-all disabled:opacity-50"
                      >
                        {isLoading ? 'Menyimpan...' : 'Selesai'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left: Metadata */}
                      <div className="lg:col-span-1 space-y-6">
                         <div className="bg-app-bg/30 p-6 rounded-2xl border border-border space-y-5">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Metadata Jurusan</h4>
                            
                            {/* Logo Upload */}
                            <div className="flex items-center gap-4">
                              <div className="w-20 h-20 bg-white border border-border rounded-xl flex items-center justify-center overflow-hidden relative group shrink-0 shadow-sm">
                                {settings.departments[editingDept].logo ? (
                                  <img src={settings.departments[editingDept].logo} alt="Logo Jurusan" className="w-full h-full object-contain p-2" />
                                ) : (
                                  <ImageIcon className="text-text-muted opacity-20" size={24} />
                                )}
                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[9px] font-bold uppercase">
                                  Unggah
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={(e) => handleLogoUpload(e, 'department', editingDept || undefined)} 
                                  />
                                </label>
                              </div>
                              <p className="text-xs font-bold leading-tight">Logo Jurusan<br/><span className="text-[10px] text-text-muted font-medium">Tampil di halaman 1</span></p>
                            </div>

                            <Input 
                              label="Judul Penugasan (IND)" 
                              value={settings.departments[editingDept].assignmentTitleId} 
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].assignmentTitleId = v;
                                setSettings({ ...settings, departments: newDepts });
                              }} 
                            />
                            <Input
                              label="Bidang Keahlian"
                              placeholder="Contoh: Teknologi Informasi dan Komunikasi"
                              value={settings.departments[editingDept].expertiseField || ''}
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].expertiseField = v;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                            />
                            <Input
                              label="Program Keahlian"
                              placeholder="Contoh: Teknik Jaringan Komputer dan Telekomunikasi"
                              value={settings.departments[editingDept].skillProgram || ''}
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].skillProgram = v;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                            />
                            <Input
                              label="Konsentrasi Keahlian"
                              placeholder="Contoh: Teknik Komputer dan Jaringan"
                              value={settings.departments[editingDept].skillConcentration || ''}
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].skillConcentration = v;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                            />
                            <Input
                              label="Acuan Standar LSP"
                              placeholder="Contoh: SKKNI Nomor 321 Tahun 2016"
                              value={settings.departments[editingDept].standardReferenceLSP || ''}
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].standardReferenceLSP = v;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                            />
                            <div>
                              <label className="text-[10px] font-bold text-teal-600/60 uppercase tracking-[0.15em] mb-2 block ml-1">Jenis Format Sertifikasi LSP</label>
                              <select
                                value={settings.departments[editingDept].lspSchemeType || 'Skema'}
                                onChange={(e) => {
                                  const newDepts = { ...settings.departments };
                                  newDepts[editingDept].lspSchemeType = e.target.value as 'Skema' | 'Okupasi' | 'Klaster';
                                  setSettings({ ...settings, departments: newDepts });
                                }}
                                className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-medium text-primary"
                              >
                                <option value="Skema">Skema</option>
                                <option value="Okupasi">Okupasi</option>
                                <option value="Klaster">Klaster</option>
                              </select>
                            </div>
                            <Input
                              label={`Nama ${settings.departments[editingDept].lspSchemeType || 'Skema'}`}
                              value={settings.departments[editingDept].lspSchemeName || ''}
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].lspSchemeName = v;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                              placeholder="Contoh: Sertifikasi KKNI Level II"
                            />
                            <Input
                              label="Nama Kepala Konsentrasi Keahlian"
                              placeholder="Contoh: Budi Santoso, S.Kom."
                              value={settings.departments[editingDept].competencyHeadName || ''}
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].competencyHeadName = v;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                            />
                            <Input
                              label="NIP Kepala Konsentrasi Keahlian"
                              placeholder="Contoh: 198001012005011001"
                              value={settings.departments[editingDept].competencyHeadNip || ''}
                              onChange={(v) => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].competencyHeadNip = v;
                                setSettings({ ...settings, departments: newDepts });
                              }}
                            />
                            {renderSignatureUploader(
                              'Scan TTD Kakonli',
                              settings.departments[editingDept].competencyHeadSignature,
                              'competencyHeadSignature',
                              editingDept,
                              () => {
                                const newDepts = { ...settings.departments };
                                newDepts[editingDept].competencyHeadSignature = '';
                                setSettings({ ...settings, departments: newDepts });
                              }
                            )}
                         </div>
                      </div>

                      {/* Right: Competencies */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <h4 className="text-sm font-bold text-primary-dark">Daftar Unit Kompetensi</h4>
                             <div className="flex items-center gap-2">
                               <button 
                                 onClick={downloadCompetencyTemplate}
                                 className="text-[10px] font-bold text-teal-600 hover:text-teal-700 underline underline-offset-2 flex items-center gap-1"
                                 title="Unduh Template Excel"
                               >
                                 <Download size={10} />
                                 Template
                               </button>
                               <span className="text-slate-300">|</span>
                               <button 
                                 onClick={() => compFileInputRef.current?.click()}
                                 className="text-[10px] font-bold text-accent hover:text-accent/80 underline underline-offset-2 flex items-center gap-1"
                                 title="Unggah dari Excel"
                               >
                                 <Upload size={10} />
                                 Unggah Excel
                               </button>
                               <input 
                                 type="file" 
                                 ref={compFileInputRef}
                                 className="hidden" 
                                 accept=".xlsx, .xls"
                                 onChange={handleCompetencyExcelUpload}
                               />
                             </div>
                           </div>
                           <button 
                             onClick={() => {
                               const newDepts = { ...settings.departments };
                               newDepts[editingDept].competencies.push({ code: '', title: '' });
                               setSettings({ ...settings, departments: newDepts });
                             }}
                             className="text-[11px] font-bold bg-slate-100 text-teal-800 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-all flex items-center gap-1.5 border border-slate-200"
                           >
                             <Plus size={14} />
                             Tambah Baris
                           </button>
                        </div>

                        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                           <table className="w-full text-left text-sm">
                             <thead className="bg-app-bg/50 border-b border-border">
                               <tr>
                                 <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-text-muted w-32">Kode</th>
                                 <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-text-muted">Unit Kompetensi</th>
                                 <th className="px-4 py-3 w-12"></th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-border">
                               {settings.departments[editingDept].competencies.length > 0 ? settings.departments[editingDept].competencies.map((comp, cIdx) => (
                                 <tr key={cIdx} className="hover:bg-app-bg/20">
                                   <td className="px-4 py-2">
                                     <input 
                                       type="text" 
                                       placeholder="Kode..."
                                       value={comp.code}
                                       onChange={(e) => {
                                          const newDepts = { ...settings.departments };
                                          newDepts[editingDept].competencies[cIdx].code = e.target.value.toUpperCase();
                                          setSettings({ ...settings, departments: newDepts });
                                       }}
                                       className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-2 py-1 font-mono text-[13px] font-bold text-primary"
                                     />
                                   </td>
                                   <td className="px-4 py-2">
                                     <input 
                                       type="text" 
                                       placeholder="Masukkan unit kompetensi..."
                                       value={comp.title}
                                       onChange={(e) => {
                                          const newDepts = { ...settings.departments };
                                          newDepts[editingDept].competencies[cIdx].title = e.target.value;
                                          setSettings({ ...settings, departments: newDepts });
                                       }}
                                       className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-2 py-1 font-medium"
                                     />
                                   </td>
                                   <td className="px-4 py-2 text-right">
                                     <button 
                                       onClick={() => {
                                          const newDepts = { ...settings.departments };
                                          newDepts[editingDept].competencies.splice(cIdx, 1);
                                          setSettings({ ...settings, departments: newDepts });
                                       }}
                                       className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                                     >
                                       <Trash2 size={16} />
                                     </button>
                                   </td>
                                 </tr>
                               )) : (
                                 <tr>
                                   <td colSpan={3} className="px-4 py-12 text-center">
                                      <p className="text-text-muted text-xs font-medium italic">Belum ada kompetensi yang ditambahkan.</p>
                                      <button 
                                        onClick={() => {
                                          const newDepts = { ...settings.departments };
                                          newDepts[editingDept].competencies.push({ code: '', title: '' });
                                          setSettings({ ...settings, departments: newDepts });
                                        }}
                                        className="text-primary font-bold text-xs mt-3 block mx-auto underline"
                                      >
                                        Mulai entri manual
                                      </button>
                                   </td>
                                 </tr>
                               )}
                             </tbody>
                           </table>
                        </div>
                        
                        {/* Right: Penguji Internal */}
                        <div className="flex items-center justify-between mt-6">
                           <h4 className="text-sm font-bold text-primary-dark">Daftar Penguji Internal</h4>
                           <button 
                             onClick={() => {
                               const newDepts = { ...settings.departments };
                               if (!newDepts[editingDept].internalExaminers) newDepts[editingDept].internalExaminers = [];
                               newDepts[editingDept].internalExaminers.push({ name: '', nip: '' });
                               setSettings({ ...settings, departments: newDepts });
                             }}
                             className="text-[11px] font-bold bg-slate-100 text-teal-800 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-all flex items-center gap-1.5 border border-slate-200"
                           >
                             <Plus size={14} />
                             Tambah Baris
                           </button>
                        </div>

                        <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                           <table className="w-full text-left text-sm">
                             <thead className="bg-app-bg/50 border-b border-border">
                               <tr>
                                 <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-text-muted">Nama Penguji</th>
                                 <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-text-muted">NIP/Reg Met Penguji</th>
                                 <th className="px-4 py-3 font-bold text-[10px] uppercase tracking-wider text-text-muted">Scan TTD</th>
                                 <th className="px-4 py-3 w-12"></th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-border">
                               {(settings.departments[editingDept].internalExaminers || []).map((ex, eIdx) => (
                                 <tr key={eIdx} className="hover:bg-app-bg/20">
                                   <td className="px-4 py-2">
                                     <input 
                                       type="text" 
                                       placeholder="Nama Penguji..."
                                       value={ex.name}
                                       onChange={(e) => {
                                          const newDepts = { ...settings.departments };
                                          if (!newDepts[editingDept].internalExaminers) newDepts[editingDept].internalExaminers = [];
                                          newDepts[editingDept].internalExaminers[eIdx].name = e.target.value;
                                          setSettings({ ...settings, departments: newDepts });
                                       }}
                                       className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-2 py-1 font-medium"
                                     />
                                   </td>
                                   <td className="px-4 py-2">
                                     <input
                                       type="text"
                                       placeholder="Masukkan NIP atau Reg Met..."
                                       value={ex.nip || ''}
                                       onChange={(e) => {
                                          const newDepts = { ...settings.departments };
                                          if (!newDepts[editingDept].internalExaminers) newDepts[editingDept].internalExaminers = [];
                                          newDepts[editingDept].internalExaminers[eIdx].nip = e.target.value;
                                          setSettings({ ...settings, departments: newDepts });
                                       }}
                                       className="w-full bg-transparent border-none focus:ring-1 focus:ring-primary rounded px-2 py-1 font-mono font-medium"
                                     />
                                   </td>
                                   <td className="px-4 py-2">
                                     {renderSignatureUploader(
                                       'TTD Penguji/Asesor',
                                       ex.signature,
                                       'examinerSignature',
                                       `${editingDept}::${eIdx}`,
                                       () => {
                                          const newDepts = { ...settings.departments };
                                          if (!newDepts[editingDept].internalExaminers) newDepts[editingDept].internalExaminers = [];
                                          newDepts[editingDept].internalExaminers[eIdx].signature = '';
                                          setSettings({ ...settings, departments: newDepts });
                                       }
                                     )}
                                   </td>
                                   <td className="px-4 py-2 text-right">
                                     <button 
                                       onClick={() => {
                                          const newDepts = { ...settings.departments };
                                          newDepts[editingDept].internalExaminers.splice(eIdx, 1);
                                          setSettings({ ...settings, departments: newDepts });
                                       }}
                                       className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                                     >
                                       <Trash2 size={16} />
                                     </button>
                                   </td>
                                 </tr>
                               ))}
                               {!settings.departments[editingDept].internalExaminers || settings.departments[editingDept].internalExaminers.length === 0 && (
                                 <tr>
                                   <td colSpan={4} className="px-4 py-12 text-center">
                                      <p className="text-text-muted text-xs font-medium italic">Belum ada penguji internal yang ditambahkan.</p>
                                      <button 
                                        onClick={() => {
                                          const newDepts = { ...settings.departments };
                                          if (!newDepts[editingDept].internalExaminers) newDepts[editingDept].internalExaminers = [];
                                          newDepts[editingDept].internalExaminers.push({ name: '', nip: '' });
                                          setSettings({ ...settings, departments: newDepts });
                                        }}
                                        className="text-primary font-bold text-xs mt-3 block mx-auto underline"
                                      >
                                        Mulai entri manual
                                      </button>
                                   </td>
                                 </tr>
                               )}
                             </tbody>
                           </table>
                        </div>
                        
                        <p className="text-[10px] text-text-muted italic px-2">
                          * Data kompetensi ini akan ditampilkan pada halaman belakang Skill Passport sesuai urutan entri.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'students' && (
              <motion.div 
                key="students"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Always show Upload Section */}
                <div className="bg-white rounded-xl p-8 border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
                  <div className="text-4xl mb-4 text-primary opacity-40">
                    <FileSpreadsheet size={48} />
                  </div>
                  <h3 className="text-lg font-bold mb-1">Impor / Update Data Siswa</h3>
                  <p className="text-text-muted text-xs mb-6 max-w-sm">
                    Unggah file Excel (.xlsx) untuk menambah atau memperbarui data siswa secara masal.<br/>
                    <button 
                      onClick={downloadStudentTemplate}
                      className="text-primary hover:underline font-bold mt-2 inline-block px-4 py-2 border border-primary rounded-lg uppercase tracking-wide text-xs"
                    >
                      Unduh Template Excel (.xlsx)
                    </button>
                  </p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="bg-accent hover:bg-accent/80 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-accent/10 flex items-center gap-2 text-sm"
                  >
                    {isLoading ? 'Memproses...' : 'Pilih File Excel'}
                  </button>
                </div>

                {/* Always show Table Section */}
                <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
                  <div className="px-8 py-6 border-b border-border bg-white flex justify-between items-center">
                    <div>
                      <h3 className="font-display font-bold text-lg text-primary tracking-tight">Database Siswa UKK</h3>
                      <p className="text-[11px] text-text-muted font-bold tracking-widest uppercase mt-0.5">TERDAFTAR {filteredStudents.length} PESERTA DIDIK</p>
                    </div>
                    <div className="flex gap-4 items-center">
                      <button 
                        onClick={() => {
                          setNewStudent({
                            'Nama Siswa': '',
                            NISN: '',
                            NIS: '',
                            'Nomor Seri': '',
                            Jurusan: Object.keys(settings.departments)[0] || '',
                            Kelas: '',
                            Predikat: 'Sangat Kompeten',
                            'Tahun Lulus': new Date().getFullYear().toString(),
	                            'Penguji Internal': '',
	                            'NIP/Reg Met Penguji': '',
                            'Penguji Eksternal': '',
                            'Mitra Industri': ''
                          });
                          setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
                      >
                        <Plus size={16} />
                        Tambah Siswa Manual
                      </button>
                      <div className="relative text-sm w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="Cari Siswa..."
                          className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-medium text-xs transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative text-sm w-40">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select 
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none font-bold text-xs truncate transition-all cursor-pointer"
                        >
                          <option>Semua Tahun</option>
                          {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative text-sm w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select 
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none font-bold text-xs truncate transition-all cursor-pointer"
                        >
                          <option>Semua Jurusan</option>
                          {Object.keys(settings.departments).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px] table-fixed text-left">
                      <thead className="bg-app-bg/50 border-b border-border">
                        <tr>
                          <th className="w-[90px] px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                          <th className="w-[170px] px-5 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                          <th className="w-[120px] px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">NISN</th>
                          <th className="w-[145px] px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">NIS</th>
                          <th className="w-[245px] px-5 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Jurusan</th>
                          <th className="w-[125px] px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kelas</th>
                          <th className="w-[105px] px-4 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Angkatan</th>
                          <th className="w-[250px] px-5 py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Penguji / NIP-Reg Met</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => (
                          <tr key={idx} className="hover:bg-app-bg/30 transition-all group">
                            <td className="px-4 py-5 align-middle">
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingStudent(s);
                                    setShowAddModal(true);
                                  }}
                                  className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-all"
                                  title="Edit Data"
                                >
                                  <Settings size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteStudent(s)}
                                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                                  title="Hapus"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="px-5 py-5 align-middle">
                              <p className="font-display font-bold text-sm leading-snug text-primary group-hover:text-accent transition-colors">{s['Nama Siswa'] || '-'}</p>
                            </td>
                            <td className="px-4 py-5 align-middle">
                              <span className="text-[11px] font-mono font-bold text-primary whitespace-nowrap">{s.NISN || '-'}</span>
                            </td>
                            <td className="px-4 py-5 align-middle">
                              <span className="text-[11px] font-mono font-bold text-primary whitespace-nowrap">{s.NIS || '-'}</span>
                            </td>
                            <td className="px-5 py-5 align-middle">
                              <p className="text-[11px] font-bold leading-relaxed text-primary">{s.Jurusan || '-'}</p>
                            </td>
                            <td className="px-4 py-5 align-middle">
                              <span className="inline-flex text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg whitespace-nowrap">{s.Kelas || '-'}</span>
                            </td>
                            <td className="px-4 py-5 align-middle">
                              <span className="inline-flex text-[11px] font-mono font-bold bg-white px-2 py-1 rounded border border-border whitespace-nowrap">{s['Tahun Lulus'] || '-'}</span>
                            </td>
                            <td className="px-5 py-5 align-middle">
                              <div className="space-y-1">
                                <p className="text-[10px] font-bold text-primary truncate">{s['Penguji Internal'] || s['Penguji Eksternal'] || s['Guru Mapel'] || '-'}</p>
                                <p className="text-[9px] font-mono font-semibold text-text-muted truncate">
                                  NIP/Reg Met: {s['NIP/Reg Met Penguji'] || settings.departments[s.Jurusan]?.internalExaminers?.find(ex => ex.name.trim().toLowerCase() === (s['Penguji Internal'] || '').trim().toLowerCase())?.nip || '-'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={8} className="px-6 py-20 text-center">
                              <div className="opacity-20 flex flex-col items-center">
                                <FileSpreadsheet className="mb-4" size={48} />
                                <p className="text-text-muted font-medium">Belum ada data siswa.</p>
                                <p className="text-[11px] text-text-muted mt-1 uppercase tracking-widest font-bold">Import file Excel untuk memulai</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'scores' && (
              <motion.div
                key="scores"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl p-8 border border-border shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div>
                      <h3 className="font-display font-bold text-xl text-primary">Nilai Siswa</h3>
                      <p className="text-sm text-text-muted mt-2 max-w-2xl">
                        Isi <span className="font-bold text-primary">1</span> untuk Kompeten dan <span className="font-bold text-primary">0</span> untuk Belum Kompeten. Apabila dikosongkan atau diisi selain 1 dan 0, unit kompetensi tersebut tidak ditampilkan pada sertifikat.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={downloadScoreTemplate}
                        className="bg-white border border-accent text-accent px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-accent/5 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={16} />
                        Unduh Template Nilai
                      </button>
                      <input
                        ref={scoreFileInputRef}
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={handleScoreExcelUpload}
                      />
                      <button
                        onClick={() => scoreFileInputRef.current?.click()}
                        disabled={isLoading}
                        className="bg-accent text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-accent/80 transition-all shadow-lg shadow-accent/10 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Upload size={16} />
                        {isLoading ? 'Memproses...' : 'Unggah Nilai'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
                  <div className="px-8 py-6 border-b border-border bg-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-primary tracking-tight">Rekap Nilai Unit Kompetensi</h3>
                      <p className="text-[11px] text-text-muted font-bold tracking-widest uppercase mt-0.5">
                        Maksimal 64 unit per siswa
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                      <div className="relative text-sm w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          placeholder="Cari Siswa..."
                          className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-medium text-xs transition-all"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="relative text-sm w-40">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none font-bold text-xs truncate transition-all cursor-pointer"
                        >
                          <option>Semua Tahun</option>
                          {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative text-sm w-48">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <select
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent appearance-none font-bold text-xs truncate transition-all cursor-pointer"
                        >
                          <option>Semua Jurusan</option>
                          {Object.keys(settings.departments).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1500px]">
                      <thead className="bg-app-bg/50 border-b border-border">
                        <tr>
                          <th className="sticky left-0 bg-app-bg px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest z-30 min-w-[220px] shadow-[8px_0_16px_rgba(15,23,42,0.04)]">Nama Siswa</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jurusan</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas</th>
                          {Array.from({ length: 64 }, (_, idx) => (
                            <th key={idx} className="px-3 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                              <span className="block">Unit {idx + 1}</span>
                              <span className="block mt-0.5">Informasi</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => (
                          <tr key={idx} className="hover:bg-app-bg/30 transition-all">
                            <td className="sticky left-0 bg-white px-6 py-4 z-30 min-w-[220px] shadow-[8px_0_16px_rgba(15,23,42,0.04)]">
                              <p className="font-display font-bold text-sm text-primary">{student['Nama Siswa'] || '-'}</p>
                              <div className="flex items-center gap-1 mt-2">
                                <button
                                  onClick={() => generatePDF(student, 'ukk')}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-accent/30 px-2 text-[9px] font-bold text-accent hover:bg-accent/10 transition-all"
                                  title="Unduh Skill Passport UKK"
                                >
                                  <Download size={13} /> UKK
                                </button>
                                <button
                                  onClick={() => generatePDF(student, 'lsp')}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-primary/30 px-2 text-[9px] font-bold text-primary hover:bg-primary/10 transition-all"
                                  title="Unduh Skill Passport LSP"
                                >
                                  <Download size={13} /> LSP
                                </button>
                                <span
                                  className="inline-flex h-8 items-center rounded-lg border border-teal-100 bg-teal-50 px-2 text-[9px] font-bold text-primary"
                                  title="Nilai akhir = jumlah unit kompeten / jumlah unit aktif x 100"
                                >
                                  Nilai {formatFinalScore(calculateFinalScore(student))}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingStudent(student);
                                    setShowAddModal(true);
                                  }}
                                  className="p-2 text-primary hover:bg-slate-100 rounded-lg transition-all"
                                  title="Edit Data"
                                >
                                  <Settings size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student)}
                                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                                  title="Hapus"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-primary max-w-[180px]">{student.Jurusan || '-'}</td>
                            <td className="px-6 py-4 text-xs font-bold text-primary">{student.Kelas || '-'}</td>
                            {Array.from({ length: 64 }, (_, unitIdx) => {
                              const deptComp = settings.departments[student.Jurusan]?.competencies?.[unitIdx];
                              const comp = student.competencies?.find(item => item.code === deptComp?.code);
                              const status = (comp?.status || '').trim();
                              const isKompeten = status !== 'Belum Kompeten';
                              return (
                                <td key={unitIdx} className="px-3 py-4 text-center">
                                  {comp && status ? (
                                    <span
                                      title={`${comp.code || `Unit ${unitIdx + 1}`} - ${comp.title || ''}: ${status}`}
                                      className={`inline-flex w-8 h-8 items-center justify-center rounded-lg text-[10px] font-bold border ${
                                        isKompeten
                                          ? 'bg-green-50 text-green-700 border-green-200'
                                          : 'bg-red-50 text-red-700 border-red-200'
                                      }`}
                                    >
                                      {isKompeten ? '1' : '0'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-[10px] font-bold text-slate-300 border border-slate-100">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={67} className="px-6 py-20 text-center">
                              <div className="opacity-30 flex flex-col items-center">
                                <FileSpreadsheet className="mb-4" size={48} />
                                <p className="text-text-muted font-medium">Belum ada data nilai siswa.</p>
                                <p className="text-[11px] text-text-muted mt-1 uppercase tracking-widest font-bold">Isi Data Siswa dan Data Jurusan terlebih dahulu</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'certificates' && (
              <motion.div 
                key="certificates"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left: Configuration & Filters */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-8 border border-border shadow-sm">
                      <h3 className="font-display font-bold text-lg text-primary mb-6 flex items-center gap-2">
                        <Filter size={20} className="text-accent" />
                        Kontrol Pencetakan
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Jurusan</label>
                          <select 
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full px-4 py-3 bg-app-bg border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold text-xs"
                          >
                            <option>Semua Jurusan</option>
                            {Object.keys(settings.departments).map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tahun Lulus</label>
                          <select 
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full px-4 py-3 bg-app-bg border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-bold text-xs"
                          >
                            <option>Semua Tahun</option>
                            {availableYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Format Skill Passport</label>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { value: 'all', label: 'Semua Format' },
                              { value: 'ukk', label: 'Format UKK' },
                              { value: 'lsp', label: 'Format LSP' }
                            ].map((format) => (
                              <button
                                key={format.value}
                                onClick={() => setSelectedCertificateFormat(format.value as 'all' | 'ukk' | 'lsp')}
                                className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left transition-all border ${
                                  selectedCertificateFormat === format.value
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white text-slate-500 border-border hover:bg-slate-50'
                                }`}
                              >
                                {format.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bulk Action Button */}
                        <div className="pt-6 border-t border-border mt-6 space-y-3">
                           <button
                             type="button"
                             onClick={downloadScoreRecap}
                             disabled={getPrintFilteredStudents().length === 0}
                             className="w-full bg-white border border-accent text-accent py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-accent/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                           >
                              <FileSpreadsheet size={18} />
                              Unduh Rekap Nilai
                           </button>
                           <button 
                             disabled={isLoading || students.filter(s => {
                               const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                               const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                               return matchesDept && matchesYear;
                             }).length === 0}
                             onClick={async () => {
                               const filtered = students.filter(s => {
                                 const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                                 const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                                 return matchesDept && matchesYear;
                               });
                               
                               const formatCount = selectedCertificateFormat === 'all' ? 2 : 1;
                               if (confirm(`Anda akan mengunduh ${filtered.length * formatCount} Skill Passport sekaligus. Lanjutkan?`)) {
                                 setIsLoading(true);
                                 try {
                                   const formats: Array<'ukk' | 'lsp'> = selectedCertificateFormat === 'all'
                                     ? ['ukk', 'lsp']
                                     : [selectedCertificateFormat];
                                   for (const student of filtered) {
                                     for (const format of formats) {
                                       await generatePDF(student, format);
                                       await new Promise(r => setTimeout(r, 500));
                                     }
                                   }
                                   setNotification({ message: `Berhasil memproses ${filtered.length * formats.length} Skill Passport`, type: 'success' });
                                 } catch (err) {
                                   setNotification({ message: 'Gagal melakukan cetak masal', type: 'error' });
                                 } finally {
                                   setIsLoading(false);
                                 }
                               }
                             }}
                             className="w-full bg-accent text-white py-4 rounded-2xl font-bold shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                           >
                              <Download size={20} />
                              <div className="text-left">
                                <p className="text-xs">Cetak ({students.filter(s => {
                                  const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                                  const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                                  return matchesDept && matchesYear;
                                }).length * (selectedCertificateFormat === 'all' ? 2 : 1)}) Dokumen</p>
                                <p className="text-[10px] opacity-60 font-medium">Download file terpisah otomatis</p>
                              </div>
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Certificate Preview */}
                  <div className="lg:col-span-8">
                     <div className="bg-white rounded-3xl p-8 border border-border shadow-sm h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                           <div>
                              <h3 className="font-display font-bold text-lg text-primary">Preview Skill Passport</h3>
                              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">ESTIMASI HASIL CETAK FISIK</p>
                           </div>
                           <div className="flex gap-2">
                             <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                LIVE PREVIEW
                             </div>
                           </div>
                        </div>

                        {/* Certificate Canvas Mockup */}
                        <div className="flex-grow flex flex-col items-center p-6 bg-slate-50 rounded-2xl border border-dashed border-border overflow-y-auto overflow-x-hidden relative h-full max-h-[760px] min-h-0">
                           {students.filter(s => {
                              const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                              const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                              return matchesDept && matchesYear;
                           }).length > 0 ? (
                           <div className="w-full flex justify-center pb-8 pt-4">
                             {(() => {
                               const s = students.filter(student => {
                                 const matchesDept = selectedDepartment === 'Semua Jurusan' || student.Jurusan === selectedDepartment;
                                 const matchesYear = selectedYear === 'Semua Tahun' || student['Tahun Lulus'] === selectedYear;
                                 return matchesDept && matchesYear;
                               })[0];
                               const department = settings.departments[s.Jurusan];
                               const competencies = department?.competencies || [];
                               const studentCompetencies = s.competencies || [];
                               const activeCompetencies = competencies.filter(comp =>
                                 Boolean(studentCompetencies.find(item => item.code === comp.code)?.status?.trim())
                               );
                               const examiner = department?.internalExaminers?.find(item =>
                                 item.name.trim().toLowerCase() === (s['Penguji Internal'] || '').trim().toLowerCase()
                               );
                               const acronym = getDepartmentAbbreviation(s.Jurusan);
                               const formatStatus = (code: string) => {
                                 const raw = studentCompetencies.find(item => item.code === code)?.status;
                                 if (raw === '1' || raw?.toLowerCase() === 'kompeten') return 'Kompeten';
                                 if (raw === '0' || raw?.toLowerCase() === 'belum kompeten') return 'Belum Kompeten';
                                 return '-';
                               };

                               const previewFormats: Array<'ukk' | 'lsp'> = selectedCertificateFormat === 'all'
                                 ? ['ukk', 'lsp']
                                 : [selectedCertificateFormat];

                               return (
                                <div className="w-full flex flex-col items-center gap-10">
                                 {previewFormats.map((format, pageIndex) => {
                                  const isLSPPreview = format === 'lsp';
                                  return (
                                 <div key={format} className="w-full flex flex-col items-center gap-2">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lembar {pageIndex + 1} - Format {format.toUpperCase()}</p>
                                 <div className="bg-white shadow-2xl relative overflow-hidden font-sans text-black w-full max-w-[620px] aspect-[1/1.414] shrink-0 px-[7%] pt-[6%] pb-[4.5%] leading-tight">
                                   {isLSPPreview ? (
                                     <div className="relative min-h-[88px] border-b-[3px] border-black pb-3">
                                       <div className="absolute left-0 top-0 w-[68px] h-[68px] flex items-center justify-center">
                                         {settings.school.lspLogo ? <img src={settings.school.lspLogo} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" /> : <Factory size={46} strokeWidth={1.2} />}
                                       </div>
                                       <div className="absolute right-0 top-0 w-[68px] h-[68px] flex items-center justify-center">
                                         {settings.school.bnspLogo ? <img src={settings.school.bnspLogo} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" /> : null}
                                       </div>
                                       <div className="text-center px-[72px]">
                                         <p className="text-[12px] font-bold uppercase">{settings.school.lspHeaderName || 'LEMBAGA SERTIFIKASI PROFESI (LSP)'}</p>
                                         <p className="text-[17px] font-bold uppercase">{settings.school.lspSchoolName || settings.school.name || 'NAMA LSP'}</p>
                                         <p className="text-[11px] font-bold text-red-600">No. Lisensi: {settings.school.lspLicenseNumber || '-'}</p>
                                         <p className="text-[8px] mt-1">{settings.school.lspAddress || '-'} Telp/Faks {settings.school.lspPhoneFax || '-'}</p>
                                         <p className="text-[8px] mt-0.5">Email: {settings.school.lspEmail || '-'} Website: {settings.school.lspWebsite || '-'}</p>
                                       </div>
                                     </div>
                                   ) : (
                                     <div className="relative min-h-[88px] border-b-[3px] border-black pb-3">
                                       <div className="absolute left-0 top-0 w-[78px] h-[78px] flex items-center justify-center">
                                         {settings.school.provinceLogo ? (
                                           <img src={settings.school.provinceLogo} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                                         ) : <School size={52} strokeWidth={1.2} />}
                                       </div>
                                       <div className="text-center px-[82px]">
                                         <p className="text-[12px]">{settings.school.provinceName || 'PEMERINTAH PROVINSI'}</p>
                                         <p className="text-[12px]">{settings.school.educationOffice || 'DINAS PENDIDIKAN'}</p>
                                         <p className="text-[17px] font-bold uppercase">{settings.school.name || 'NAMA SEKOLAH'}</p>
                                         <p className="text-[9px] mt-1">{settings.school.address || 'Alamat sekolah'}</p>
                                         <p className="text-[9px] mt-0.5">Telepon {settings.school.phone || '-'}, Pos-el {settings.school.email || '-'}</p>
                                       </div>
                                     </div>
                                   )}

                                   <div className="text-center mt-4">
                                     {isLSPPreview ? (
                                       <>
                                         <h2 className="text-[16px] font-bold italic uppercase">{department?.lspSchemeType || 'Skema'} {department?.lspSchemeName || 'Sertifikasi'}</h2>
                                         <h3 className="text-[12px] font-bold italic uppercase mt-4 whitespace-nowrap">Pada Kompetensi Keahlian {department?.skillConcentration || s.Jurusan || '-'}</h3>
                                         <p className="text-[11px] font-bold mt-2">NOMOR: {resolvePreviewDocumentNumber(s, settings.documentNumbering, 'lsp')}</p>
                                       </>
                                     ) : (
                                       <>
                                         <h2 className="text-[17px] font-bold">SURAT KETERANGAN (SKILL PASSPORT)</h2>
                                         <h3 className="text-[17px] font-bold">UJI KOMPETENSI KEAHLIAN</h3>
                                         <p className="text-[11px] font-bold mt-1">NOMOR: {resolvePreviewDocumentNumber(s, settings.documentNumbering, 'ukk')}</p>
                                       </>
                                     )}
                                   </div>

                                   <div className={`mt-6 ${isLSPPreview ? 'text-[9px]' : 'text-[10px]'}`}>
                                     <div className="grid grid-cols-[1fr_78px] gap-5 items-start">
                                       <div className="grid grid-cols-[118px_10px_1fr] gap-y-1.5">
                                         <span>Nama Asesi</span><span>:</span><span>{s['Nama Siswa'] || '-'}</span>
                                         {isLSPPreview ? (
                                           <>
                                             <span>Bidang Keahlian</span><span>:</span><span>{department?.expertiseField || '-'}</span>
                                           </>
                                         ) : (
                                           <><span>NIS/NISN</span><span>:</span><span>{s.NIS || '-'}/{s.NISN || '-'}</span></>
                                         )}
                                         <span>Program Keahlian</span><span>:</span><span>{department?.skillProgram || '-'}</span>
                                         <span>{isLSPPreview ? 'Kompetensi Keahlian' : 'Konsentrasi Keahlian'}</span><span>:</span><span>{department?.skillConcentration || s.Jurusan || '-'}</span>
                                         {!isLSPPreview && <><span>Kelas</span><span>:</span><span>{s.Kelas || '-'}</span></>}
                                         {isLSPPreview && <><span>Acuan Standar</span><span>:</span><span>{department?.standardReferenceLSP || '-'}</span></>}
                                       </div>
                                       <div className={`flex flex-col items-center text-center ${isLSPPreview ? '-mt-5' : ''}`}>
                                         <QrCode size={68} strokeWidth={1.7} />
                                         <p className="text-[7px] font-bold mt-1">Kode Sertifikat:</p>
                                         <p className="text-[7px] font-bold break-all">{s['Nomor Seri'] || '-'}</p>
                                       </div>
                                     </div>

                                     {!isLSPPreview && (
                                       <p className="mt-8 mb-3 leading-relaxed">
                                         Telah mengikuti Uji Kompetensi Keahlian pada penugasan {department?.assignmentTitleId || '-'} dengan keterangan pada unit di bawah ini :
                                       </p>
                                     )}
                                   </div>

                                   <table className="w-full mt-6 text-[8px] border-collapse border border-black">
                                     <thead>
                                       <tr className="bg-slate-200">
                                         <th className="border border-black py-1.5 px-1 w-[20%] whitespace-normal break-words align-middle">Kode Unit<br/><span className="italic font-normal">Unit Code</span></th>
                                         <th className="border border-black py-1.5 px-1 whitespace-normal break-words align-middle">Judul Unit<br/><span className="italic font-normal">Unit Title</span></th>
                                         <th className="border border-black py-1.5 px-1 w-[22%] whitespace-normal break-words align-middle">Keterangan<br/><span className="italic font-normal">Information</span></th>
                                       </tr>
                                     </thead>
                                     <tbody>
                                       {activeCompetencies.length > 0 ? activeCompetencies.slice(0, 5).map((comp, index) => (
                                         <tr key={`${comp.code}-${index}`}>
                                           <td className="border border-black px-1.5 py-1.5 whitespace-normal break-words align-top leading-snug">{comp.code || '-'}</td>
                                           <td className="border border-black px-1.5 py-1.5 whitespace-normal break-words align-top leading-snug">{comp.title || '-'}</td>
                                           <td className="border border-black px-1.5 py-1.5 text-center font-bold whitespace-normal break-words align-middle leading-snug">{formatStatus(comp.code)}</td>
                                         </tr>
                                       )) : (
                                         <tr>
                                           <td className="border border-black px-1.5 py-1.5 whitespace-normal break-words align-top">-</td>
                                           <td className="border border-black px-1.5 py-1.5 whitespace-normal break-words align-top">Belum ada unit yang digunakan pada Nilai Siswa</td>
                                           <td className="border border-black px-1.5 py-1.5 text-center font-bold whitespace-normal break-words align-middle">-</td>
                                         </tr>
                                       )}
                                       {activeCompetencies.length > 5 && (
                                         <tr><td colSpan={3} className="border border-black px-1.5 py-1 text-center italic">+ {activeCompetencies.length - 5} unit lainnya dicetak pada surat</td></tr>
                                       )}
                                     </tbody>
                                   </table>

                                   {!isLSPPreview && <p className="text-[10px] mt-4 leading-relaxed">Demikian surat keterangan ini kami sampaikan untuk dipergunakan sebagaimana mestinya.</p>}
                                   <div className="grid grid-cols-2 gap-x-16 gap-y-3 mt-2 text-[8px] font-bold">
                                     <div className="text-center">
                                       <p>{isLSPPreview ? 'Manajer Sertifikasi' : `Kakonli ${acronym}`}</p>
                                       <div className="h-16 flex items-start justify-center -mt-1">
                                         {(isLSPPreview ? settings.school.certificationManagerSignature : department?.competencyHeadSignature) && (
                                           <img src={isLSPPreview ? settings.school.certificationManagerSignature : department?.competencyHeadSignature} className="max-h-16 max-w-[210px] object-contain" />
                                         )}
                                       </div>
                                       <p>{isLSPPreview ? (settings.school.certificationManager || '-') : (department?.competencyHeadName || '-')}</p>
                                       {!isLSPPreview && <p>NIP. {department?.competencyHeadNip || '-'}</p>}
                                     </div>
                                     <div className="text-center">
                                       <p>{settings.school.city || '-'}, {settings.school.date || '-'}</p>
                                       <p>{isLSPPreview ? 'Asesor' : 'Penguji'}</p>
                                       <div className="h-16 flex items-start justify-center -mt-1">
                                         {examiner?.signature && <img src={examiner.signature} className="max-h-16 max-w-[210px] object-contain" />}
                                       </div>
                                       <p>{s['Penguji Internal'] || '-'}</p>
                                       <p>{isLSPPreview ? 'Reg MET.' : 'NIP.'} {s['NIP/Reg Met Penguji'] || examiner?.nip || '-'}</p>
                                     </div>
                                     <div className="text-center pt-5">
                                       <p>Mengetahui,</p>
                                       <p>Kepala Sekolah</p>
                                       <div className="h-16 flex items-start justify-center -mt-1">
                                         {settings.school.signatorySignature && <img src={settings.school.signatorySignature} className="max-h-16 max-w-[210px] object-contain" />}
                                       </div>
                                       <p>{settings.school.signatory || '-'}</p>
                                       <p>NIP. {settings.school.signatoryNip || '-'}</p>
                                     </div>
                                     <div className="text-center pt-5">
                                       <p className="invisible" aria-hidden="true">Mengetahui,</p>
                                       <p>{isLSPPreview ? 'Direktur LSP' : 'Waka Kurikulum'}</p>
                                       <div className="h-16 flex items-start justify-center -mt-1">
                                         {(isLSPPreview ? settings.school.lspDirectorSignature : settings.school.vicePrincipalCurriculumSignature) && (
                                           <img src={isLSPPreview ? settings.school.lspDirectorSignature : settings.school.vicePrincipalCurriculumSignature} className="max-h-16 max-w-[210px] object-contain" />
                                         )}
                                       </div>
                                       <p>{isLSPPreview ? (settings.school.lspDirector || '-') : (settings.school.vicePrincipalCurriculum || '-')}</p>
                                       {!isLSPPreview && <p>NIP. {settings.school.vicePrincipalCurriculumNip || '-'}</p>}
                                     </div>
                                   </div>
                                 </div>
                                 </div>
                                  );
                                 })}
                                </div>
                               );
                             })()}
                           </div>
                           ) : (
                             <div className="text-center text-slate-400">Pilih siswa untuk melihat preview</div>
                           )}
                        </div>

                        {/* List of affected students summary */}
                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                           <div className="p-4 bg-app-bg/50 rounded-2xl border border-border">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Terpilih</p>
                              <p className="text-xl font-display font-bold text-primary">{students.filter(s => {
                                const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                                const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                                return matchesDept && matchesYear;
                              }).length}</p>
                           </div>
                           <div className="p-4 bg-app-bg/50 rounded-2xl border border-border">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Format</p>
                              <p className="text-sm font-bold text-primary uppercase">{selectedCertificateFormat === 'all' ? 'UKK + LSP' : selectedCertificateFormat}</p>
                           </div>
                           <div className="p-4 bg-app-bg/50 rounded-2xl border border-border">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">QR Code</p>
                              <p className="text-sm font-bold text-emerald-600 uppercase">AKTIF</p>
                           </div>
                           <div className="p-4 bg-app-bg/50 rounded-2xl border border-border">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Ukuran</p>
                              <p className="text-sm font-bold text-primary">~{(students.filter(s => {
                                const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                                const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                                return matchesDept && matchesYear;
                              }).length * (selectedCertificateFormat === 'all' ? 2 : 1) * 0.4).toFixed(1)} MB</p>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'bulk-delete' && (
              <motion.div 
                key="bulk-delete"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-4xl space-y-8"
              >
                <div className="bg-white rounded-3xl p-8 border border-border shadow-sm">
                   <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                         <Trash2 size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-display font-bold text-primary">Pembersihan Database Skill Passport</h3>
                         <p className="text-sm text-text-muted">Hapus data siswa secara masal berdasarkan filter untuk mengosongkan ruang.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-app-bg/30 p-8 rounded-3xl border border-border/50">
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Filter Jurusan</label>
                        <select 
                          value={selectedDepartment}
                          onChange={(e) => setSelectedDepartment(e.target.value)}
                          className="w-full px-5 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 font-bold text-sm shadow-sm transition-all text-primary"
                        >
                          <option>Semua Jurusan</option>
                          {Object.keys(settings.departments).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Filter Tahun Lulus</label>
                        <select 
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                          className="w-full px-5 py-4 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 font-bold text-sm shadow-sm transition-all text-primary"
                        >
                          <option>Semua Tahun</option>
                          {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                   </div>

                   <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-red-50/50 rounded-2xl border border-red-100">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg">
                            {students.filter(s => {
                               const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                               const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                               return matchesDept && matchesYear;
                            }).length}
                         </div>
                         <div>
                            <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Data Terpilih</p>
                            <p className="text-[11px] text-red-600/70 font-medium">Siswa yang akan dihapus dari database.</p>
                         </div>
                      </div>

                      <button 
                        disabled={students.filter(s => {
                           const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                           const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                           return matchesDept && matchesYear;
                        }).length === 0}
                        onClick={async () => {
                           const toDelete = students.filter(s => {
                              const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                              const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                              return matchesDept && matchesYear;
                           });

                           if (toDelete.length === 0) return;

                           const message = selectedDepartment === 'Semua Jurusan' && selectedYear === 'Semua Tahun' 
                              ? `APAKAH ANDA YAKIN?\n\nTindakan ini akan MENGHAPUS SELURUH database (${toDelete.length} siswa).\nData yang telah dihapus tidak dapat dikembalikan.`
                              : `Hapus ${toDelete.length} data siswa untuk filter yang dipilih?\n\nTindakan ini tidak dapat dibatalkan.`;

                           if (confirm(message)) {
                              const remaining = students.filter(s => {
                                 const matchesDept = selectedDepartment === 'Semua Jurusan' || s.Jurusan === selectedDepartment;
                                 const matchesYear = selectedYear === 'Semua Tahun' || s['Tahun Lulus'] === selectedYear;
                                 return !(matchesDept && matchesYear);
                              });
                              
                              const deleteSerials = toDelete.map(s => s['Nomor Seri']).filter(Boolean);
                              if (deleteSerials.length > 0) {
                                 const { error } = await supabase.from('students').delete().in('nomor_seri', deleteSerials);
                                 if (error) {
                                    console.error("Bulk delete failed:", error);
                                    setNotification({ message: `Gagal hapus masal: ${error.message}`, type: 'error' });
                                    return;
                                 }
                              }

                              setStudents(remaining);
                              setNotification({ message: `${toDelete.length} data siswa telah dibersihkan`, type: 'success' });
                           }
                        }}
                        className="w-full md:w-auto px-10 py-4 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-200 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 flex items-center justify-center gap-3"
                      >
                        <Trash2 size={20} />
                        Konfirmasi Hapus Masal
                      </button>
                   </div>

                   <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 flex gap-3">
                         <div className="mt-1 text-blue-500 min-w-[16px]"><CheckCircle2 size={16} /></div>
                         <div>
                            <p className="text-xs font-bold text-blue-900">Tips Perawatan</p>
                            <p className="text-[10px] text-blue-800/60 leading-relaxed">Sebaiknya lakukan pembersihan data siswa dari tahun-tahun sebelumnya yang sudah tidak diperlukan untuk menjaga performa aplikasi tetap optimal.</p>
                         </div>
                      </div>
                      <div className="p-4 bg-orange-50/30 rounded-xl border border-orange-100 flex gap-3">
                         <div className="mt-1 text-orange-500 min-w-[16px]"><Settings size={16} /></div>
                         <div>
                            <p className="text-xs font-bold text-orange-900">Pencadangan Data</p>
                            <p className="text-[10px] text-orange-800/60 leading-relaxed">Pastikan Anda telah memiliki salinan file Excel dari data yang akan dihapus sebelum melakukan aksi ini sebagai cadangan.</p>
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'users' && userRole === 'admin' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left: Add New User */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl p-8 border border-border shadow-sm">
                      <h3 className="font-display font-bold text-lg text-primary mb-6 flex items-center gap-2">
                        <UserPlus size={20} className="text-accent" />
                        Tambah Pengguna
                      </h3>
                      
                      <form onSubmit={handleCreateUser} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email / Username</label>
                          <input 
                            type="email"
                            required
                            value={newUserEmail}
                            onChange={e => setNewUserEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                            placeholder="admin@sekolah.com"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                          <input 
                            type="password"
                            required
                            minLength={8}
                            value={newUserPassword}
                            onChange={e => setNewUserPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm"
                            placeholder="Minimal 8 karakter"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Hak Akses Role</label>
                          <select 
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as RoleType)}
                            className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-bold"
                          >
                            <option value="entry">Entry Data</option>
                            <option value="kakonli">Kakonli (Kelola Data Jurusan & Siswa)</option>
                            <option value="lsp">LSP (Semua kecuali User, Sekolah, dan Pengaturan)</option>
                            <option value="admin">Administrator (Akses Penuh)</option>
                          </select>
                        </div>

                        <button 
                             type="submit"
                             disabled={isCreatingUser}
                             className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-all font-display tracking-wide shadow-lg shadow-primary/10 disabled:opacity-50"
                        >
                             {isCreatingUser ? 'Memproses...' : 'Buat Pengguna'}
                        </button>
                      </form>
                      
                      <div className="mt-8 p-4 bg-app-bg/50 rounded-xl border border-border">
                        <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-2">Penjelasan Role</h4>
                        <ul className="text-xs space-y-2 text-text-muted">
                           <li><span className="font-bold text-primary">Admin:</span> Akses penuh kontrol aplikasi.</li>
                           <li><span className="font-bold text-primary">Entry Data:</span> Semua menu kecuali Manajemen User.</li>
                           <li><span className="font-bold text-primary">Kakonli:</span> Data Jurusan, Data Siswa, Nilai Siswa, Cetak Skill Passport, Hapus Data, dan Validasi.</li>
                           <li><span className="font-bold text-primary">LSP:</span> Semua menu kecuali Manajemen User, Data Sekolah, dan Pengaturan.</li>
                        </ul>
                      </div>
                      <div className="mt-4 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                        <h4 className="text-[10px] font-bold uppercase text-blue-700 mb-2">Jika Lupa Password</h4>
                        <p className="text-xs text-blue-900/70 leading-relaxed">Admin dapat membuat password baru melalui tombol kunci pada daftar pengguna. Untuk produksi, gunakan sedikitnya dua akun Admin agar pemulihan tetap dapat dilakukan jika satu Admin lupa password.</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: User List */}
                  <div className="lg:col-span-8">
                     <div className="bg-white rounded-3xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                           <div>
                              <h3 className="font-display font-bold text-lg text-primary">Daftar Pengguna Aktif</h3>
                              <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">MANAJEMEN OTORISASI SISTEM</p>
                           </div>
                           <button onClick={fetchUsers} className="text-primary hover:bg-slate-100 p-2 rounded-lg transition-colors">
                              <Search size={18} />
                           </button>
                        </div>
                        <div className="p-0 overflow-x-auto flex-grow">
                           <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                   <th className="px-8 py-4 font-bold text-[10px] uppercase tracking-wider text-slate-400">Email Login</th>
                                   <th className="px-8 py-4 font-bold text-[10px] uppercase tracking-wider text-slate-400">Tingkat Akses (Role)</th>
                                   <th className="px-8 py-4 font-bold text-[10px] uppercase tracking-wider text-slate-400">ID</th>
                                   <th className="px-8 py-4 text-right">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 font-medium">
                                 {loadingUsers ? (
                                    <tr><td colSpan={4} className="text-center py-8 text-text-muted">Memuat data pengguna...</td></tr>
                                 ) : manageUsers.length > 0 ? (
                                    manageUsers.map(user => (
                                       <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                                          <td className="px-8 py-5 text-sm font-bold text-primary">{user.email}</td>
                                          <td className="px-8 py-5">
                                             <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${user.role === 'admin' ? 'bg-primary/10 text-primary' : user.role === 'entry' ? 'bg-accent/10 text-accent' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {user.role}
                                             </span>
                                          </td>
                                          <td className="px-8 py-5 text-text-muted text-xs truncate max-w-[120px]">{user.id}</td>
                                          <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                             <button
                                                onClick={() => {
                                                  setPasswordUser(user);
                                                  setReplacementPassword('');
                                                  setReplacementPasswordConfirm('');
                                                }}
                                                className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                                                title="Ganti Password"
                                             >
                                                <KeyRound size={14} />
                                             </button>
                                             <button 
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                                title="Hapus Pengguna"
                                             >
                                                <Trash2 size={14} />
                                             </button>
                                            </div>
                                          </td>
                                       </tr>
                                    ))
                                 ) : (
                                    <tr><td colSpan={4} className="text-center py-8 text-text-muted">Tidak ada pengguna ditemukan.</td></tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity-logs' && userRole === 'admin' && (
              <motion.div
                key="activity-logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-primary flex items-center gap-2">
                        <ScrollText size={20} className="text-accent" />
                        Log Aktivitas Pengguna
                      </h3>
                      <p className="text-xs text-text-muted mt-1">Menampilkan maksimal 100 aktivitas terbaru dari seluruh pengguna.</p>
                    </div>
                    <button
                      type="button"
                      onClick={generateActivityLogs}
                      disabled={activityLogsLoading}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                    >
                      <RefreshCw size={17} className={activityLogsLoading ? 'animate-spin' : ''} />
                      {activityLogsLoading ? 'Mengambil Log...' : 'Generate Log'}
                    </button>
                  </div>

                  {!activityLogsGenerated ? (
                    <div className="min-h-[320px] flex flex-col items-center justify-center text-center px-6">
                      <ScrollText size={42} className="text-primary/20 mb-4" />
                      <p className="font-bold text-primary">Log belum ditampilkan</p>
                      <p className="text-xs text-text-muted mt-1">Tekan Generate Log untuk melihat aktivitas terbaru.</p>
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <div className="min-h-[320px] flex items-center justify-center text-sm text-text-muted">Belum ada aktivitas yang tercatat.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-border text-[10px] uppercase tracking-widest text-slate-500">
                            <th className="px-5 py-4 font-bold whitespace-nowrap">Waktu</th>
                            <th className="px-5 py-4 font-bold">Pengguna</th>
                            <th className="px-5 py-4 font-bold">Role</th>
                            <th className="px-5 py-4 font-bold">Aktivitas</th>
                            <th className="px-5 py-4 font-bold">Status</th>
                            <th className="px-5 py-4 font-bold whitespace-nowrap">Alamat IP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activityLogs.map((entry) => (
                            <tr key={entry.id} className="border-b border-border/70 last:border-0 hover:bg-app-bg/40">
                              <td className="px-5 py-4 text-xs text-text-muted whitespace-nowrap">
                                {new Date(entry.created_at).toLocaleString('id-ID', {
                                  day: '2-digit', month: 'short', year: 'numeric',
                                  hour: '2-digit', minute: '2-digit', second: '2-digit'
                                })}
                              </td>
                              <td className="px-5 py-4 font-bold text-primary whitespace-nowrap">{entry.user_email}</td>
                              <td className="px-5 py-4">
                                <span className="inline-flex px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">{entry.user_role}</span>
                              </td>
                              <td className="px-5 py-4 min-w-[260px]">
                                <p className="font-bold text-text-main">{entry.action}</p>
                                <p className="text-[10px] text-text-muted mt-1 font-mono">{entry.method} {entry.path}</p>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${entry.status_code < 400 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  {entry.status_code}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-xs font-mono text-text-muted whitespace-nowrap">{entry.ip_address || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (userRole === 'admin' || userRole === 'entry') && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-white rounded-xl p-8 border border-border"
              >
                <div className="flex items-center gap-3 mb-8">
                  <Settings className="text-primary" size={22} />
                  <h3 className="text-lg font-bold">Pengaturan Skill Passport</h3>
                </div>
                
                <div className="space-y-8">
                  {/* Background Upload and Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Background Upload */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Desain Background</label>
                      <div className="w-full aspect-[1.414/1] bg-app-bg border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center relative group overflow-hidden transition-all hover:border-primary/50">
                        {settings.layout.backgroundImage ? (
                          <div className="relative w-full h-full">
                            <img src={settings.layout.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="text-center p-6">
                            <ImageIcon size={32} className="mx-auto mb-2 text-text-muted opacity-30" />
                            <p className="text-xs font-bold text-text-muted uppercase">Klik untuk unggah</p>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white font-bold text-sm">
                          {settings.layout.backgroundImage ? 'Ganti' : 'Unggah'}
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleBackgroundUpload}
                          />
                        </label>
                      </div>
                      {settings.layout.backgroundImage && (
                          <button 
                            onClick={async () => {
                               const newSettings = {...settings, layout: {...settings.layout, backgroundImage: ''}};
                               setSettings(newSettings);
                               await saveSettingsToSupabase(newSettings);
                               setNotification({message: 'Background dihapus & disimpan', type: 'success'});
                            }}
                            className="text-[10px] uppercase font-bold text-red-500 hover:text-red-700 underline"
                          >
                            Hapus Background
                          </button>
                      )}
                    </div>

                    {/* Live Preview */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Live Preview</label>
                      <div className="w-full aspect-[1/1.414] bg-slate-100 rounded-2xl border border-border p-2 flex items-center justify-center overflow-hidden">
                        {settings.layout.backgroundImage ? (
                          <img 
                            src={settings.layout.backgroundImage} 
                            alt="Preview" 
                            className={`w-full h-full object-contain ${
                              settings.layout.orientation === 'landscape' ? 'rotate-90' : ''
                            }`}
                          />
                        ) : (
                          <p className="text-[10px] text-text-muted font-bold uppercase">Background belum diunggah</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Page Size */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Ukuran Kertas</label>
                      <div className="flex gap-2">
                        {['A4', 'Folio'].map((size) => (
                          <button
                            key={size}
                            onClick={() => setSettings({...settings, layout: {...settings.layout, pageSize: size as 'A4' | 'Folio'}})}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all ${
                              settings.layout.pageSize === size 
                                ? 'bg-primary border-primary text-white shadow-md' 
                                : 'bg-white border-border text-text-main hover:bg-app-bg'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orientation */}
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-muted">Orientasi</label>
                      <div className="flex gap-2">
                        {['landscape', 'portrait'].map((orient) => (
                          <button
                            key={orient}
                            onClick={() => setSettings({...settings, layout: {...settings.layout, orientation: orient as 'landscape' | 'portrait'}})}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all capitalize ${
                              settings.layout.orientation === orient 
                                ? 'bg-primary border-primary text-white shadow-md' 
                                : 'bg-white border-border text-text-main hover:bg-app-bg'
                            }`}
                          >
                            {orient}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border mt-8">
                    <button 
                      onClick={async () => {
                        setIsLoading(true);
                        const success = await saveSettingsToSupabase();
                        setIsLoading(false);
                        if (success) {
                          setNotification({ message: 'Pengaturan tata letak berhasil disimpan & disimpan', type: 'success' });
                        } else {
                          setNotification({ message: 'Gagal menyimpan tata letak.', type: 'error' });
                        }
                      }}
                      disabled={isLoading}
                      className="w-full bg-accent text-white py-4 rounded-2xl font-bold shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan Tata Letak'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 font-bold text-sm ${
              notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <Trash2 size={18} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Own Account Password Modal */}
      <AnimatePresence>
        {isOwnPasswordModalOpen && userRole !== 'admin' && (
          <div className="fixed inset-0 z-[115] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeOwnPasswordModal}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form
              onSubmit={handleOwnPasswordChange}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="px-7 py-6 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-lg text-primary">Ganti Password</h3>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{userEmail}</p>
                </div>
              </div>
              <div className="p-7 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Password Saat Ini</label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newOwnPassword}
                    onChange={(e) => setNewOwnPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Ulangi Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={newOwnPasswordConfirm}
                    onChange={(e) => setNewOwnPasswordConfirm(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>
              <div className="px-7 py-5 bg-slate-50 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isUpdatingOwnPassword}
                  onClick={closeOwnPasswordModal}
                  className="px-5 py-2.5 rounded-xl border border-border bg-white text-text-muted text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingOwnPassword}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isUpdatingOwnPassword ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {passwordUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isChangingPassword && setPasswordUser(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.form
              onSubmit={handleChangePassword}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="px-7 py-6 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-primary">Ganti Password</h3>
                  <p className="text-xs text-text-muted mt-0.5">{passwordUser.email}</p>
                </div>
              </div>
              <div className="p-7 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={replacementPassword}
                    onChange={(e) => setReplacementPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Ulangi Password Baru</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={replacementPasswordConfirm}
                    onChange={(e) => setReplacementPasswordConfirm(e.target.value)}
                    placeholder="Ketik ulang password"
                    className="w-full px-4 py-3 bg-app-bg border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>
              </div>
              <div className="px-7 py-5 bg-slate-50 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isChangingPassword}
                  onClick={() => setPasswordUser(null)}
                  className="px-5 py-2.5 rounded-xl border border-border bg-white text-text-muted text-sm font-bold hover:bg-slate-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                >
                  {isChangingPassword ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Student Entry/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setEditingStudent(null);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="bg-primary p-6 text-white flex justify-between items-center">
                <div>
                   <h3 className="text-xl font-display font-bold">{editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Manual'}</h3>
                   <p className="text-xs text-teal-100/60 mt-0.5">Lengkapi formulir di bawah untuk memperbarui database.</p>
                </div>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStudent(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Input 
                      label="Nama Lengkap Siswa" 
                      value={editingStudent ? editingStudent['Nama Siswa'] : (newStudent['Nama Siswa'] || '')} 
                      onChange={(v) => editingStudent ? setEditingStudent({...editingStudent, 'Nama Siswa': v}) : setNewStudent({...newStudent, 'Nama Siswa': v})} 
                   />
                   <Input 
                      label="NISN" 
                      value={editingStudent ? editingStudent.NISN : (newStudent.NISN || '')} 
                      onChange={(v) => editingStudent ? setEditingStudent({...editingStudent, NISN: v}) : setNewStudent({...newStudent, NISN: v})} 
                   />
                   <Input 
                      label="NIS" 
                      value={editingStudent ? editingStudent.NIS : (newStudent.NIS || '')} 
                      onChange={(v) => editingStudent ? setEditingStudent({...editingStudent, NIS: v}) : setNewStudent({...newStudent, NIS: v})} 
                   />
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-teal-600/60 uppercase tracking-[0.15em] mb-2 block ml-1">Jurusan</label>
                       <select 
                          value={editingStudent ? editingStudent.Jurusan : (newStudent.Jurusan || '')}
                          onChange={(e) => editingStudent ? setEditingStudent({...editingStudent, Jurusan: e.target.value, Kelas: ''}) : setNewStudent({...newStudent, Jurusan: e.target.value, Kelas: ''})}
                          className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium text-primary shadow-sm"
                       >
                          {Object.keys(settings.departments).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                       </select>
                   </div>
                   <div className="space-y-2">
                       <label className="text-[10px] font-bold text-teal-600/60 uppercase tracking-[0.15em] mb-2 block ml-1">Kelas</label>
                       <select 
                          value={editingStudent ? editingStudent.Kelas : (newStudent.Kelas || '')}
                          onChange={(e) => editingStudent ? setEditingStudent({...editingStudent, Kelas: e.target.value}) : setNewStudent({...newStudent, Kelas: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium text-primary shadow-sm"
                       >
                          <option value="">-- Pilih Kelas --</option>
                          {(() => {
                              const dept = editingStudent ? editingStudent.Jurusan : newStudent.Jurusan;
                              const classes = getClassOptionsForDepartment(dept || '');
                              
                              return classes.map(c => <option key={c} value={c}>{c}</option>);
                          })()}
                       </select>
                   </div>
                   <Input 
                      label="Angkatan" 
                      value={editingStudent ? editingStudent['Tahun Lulus'] : (newStudent['Tahun Lulus'] || '')} 
                      onChange={(v) => editingStudent ? setEditingStudent({...editingStudent, 'Tahun Lulus': v}) : setNewStudent({...newStudent, 'Tahun Lulus': v})} 
                   />
	                   <Input 
	                      label="Penguji" 
                      value={editingStudent ? (editingStudent['Penguji Internal'] || editingStudent['Penguji Eksternal'] || '') : (newStudent['Penguji Internal'] || newStudent['Penguji Eksternal'] || '')} 
	                      onChange={(v) => editingStudent ? setEditingStudent({...editingStudent, 'Penguji Internal': v, 'Penguji Eksternal': ''}) : setNewStudent({...newStudent, 'Penguji Internal': v, 'Penguji Eksternal': ''})} 
	                   />
	                   <Input
	                      label="NIP/Reg Met Penguji"
	                      value={editingStudent ? (editingStudent['NIP/Reg Met Penguji'] || '') : (newStudent['NIP/Reg Met Penguji'] || '')}
	                      onChange={(v) => editingStudent ? setEditingStudent({...editingStudent, 'NIP/Reg Met Penguji': v}) : setNewStudent({...newStudent, 'NIP/Reg Met Penguji': v})}
	                   />
                </div>

              {/* Unit Kompetensi Section */}
              {(() => {
                const dept = (editingStudent ? editingStudent.Jurusan : newStudent.Jurusan) || '';
                const deptComps = settings.departments[dept]?.competencies || [];
                if (deptComps.length === 0) return null;

                // Use student's own competencies or initialize from dept with empty status.
                const currentComps: import('../types').Competency[] =
                  (editingStudent ? editingStudent.competencies : newStudent.competencies)?.length
                    ? ((editingStudent ? editingStudent.competencies : newStudent.competencies) as import('../types').Competency[])
                    : deptComps.map(c => ({ ...c, status: '' }));

                const updateComps = (updated: import('../types').Competency[]) => {
                  if (editingStudent) {
                    setEditingStudent({ ...editingStudent, competencies: updated });
                  } else {
                    setNewStudent({ ...newStudent, competencies: updated });
                  }
                };

                const setAllStatus = (status: string) => {
                  updateComps(currentComps.map(c => ({ ...c, status })));
                };

                return (
                  <div className="px-8 pb-8 pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-teal-600/60 uppercase tracking-[0.15em] ml-1">
                        Unit Kompetensi ({deptComps.length} unit)
                      </label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setAllStatus('Kompeten')}
                          className="text-[11px] font-bold text-green-600 hover:text-green-700 underline-offset-2 hover:underline transition-all"
                        >
                          ✓ Semua Kompeten
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllStatus('Belum Kompeten')}
                          className="text-[11px] font-bold text-red-500 hover:text-red-600 underline-offset-2 hover:underline transition-all"
                        >
                          ✗ Semua Belum
                        </button>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-border bg-white p-2">
                      {currentComps.map((comp, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                            comp.status === 'Belum Kompeten'
                              ? 'bg-red-50 border border-red-100'
                              : comp.status === 'Kompeten'
                                ? 'bg-green-50 border border-green-100'
                                : 'bg-slate-50 border border-slate-100'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            {comp.code && (
                              <p className="text-[9px] font-mono text-text-muted leading-tight">{comp.code}</p>
                            )}
                            <p className="text-[11px] font-medium text-text-main leading-snug">{comp.title}</p>
                          </div>
                          <select
                            value={comp.status || ''}
                            onChange={(e) => {
                              const updated = currentComps.map((c, i) =>
                                i === idx ? { ...c, status: e.target.value } : c
                              );
                              updateComps(updated);
                            }}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border cursor-pointer focus:outline-none flex-shrink-0 ${
                              comp.status === 'Belum Kompeten'
                                ? 'bg-red-100 border-red-300 text-red-700'
                                : comp.status === 'Kompeten'
                                  ? 'bg-green-100 border-green-300 text-green-700'
                                  : 'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <option value="">Belum Diisi</option>
                            <option value="Kompeten">Kompeten</option>
                            <option value="Belum Kompeten">Belum Kompeten</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

              <div className="p-8 bg-slate-50 border-t border-border flex justify-end gap-4">
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStudent(null);
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold bg-white text-text-muted hover:bg-slate-100 transition-all border border-border text-sm"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    if (editingStudent) {
                      // Cek duplikasi NISN jika diubah
                      const isDuplicate = students.some(s => 
                        s['Nomor Seri'] !== editingStudent['Nomor Seri'] && 
                        editingStudent.NISN && s.NISN === editingStudent.NISN
                      );
                      
                      if (isDuplicate) {
                        setNotification({ message: 'NISN sudah digunakan oleh siswa lain', type: 'error' });
                        return;
                      }

                      setStudents(students.map(s => s['Nomor Seri'] === editingStudent['Nomor Seri'] ? editingStudent : s));
                      setNotification({ message: 'Data siswa berhasil diperbarui', type: 'success' });
                    } else {
                      if (!newStudent['Nama Siswa']) {
                        setNotification({ message: 'Nama wajib diisi', type: 'error' });
                        return;
                      }

                      // Cek duplikasi NISN
                      const isDuplicate = students.some(s => 
                        newStudent.NISN && s.NISN === newStudent.NISN
                      );

                      if (isDuplicate) {
                        setNotification({ message: 'Siswa dengan NISN tersebut sudah ada dalam database', type: 'error' });
                        return;
                      }

                      // Auto generate Nomor Surat format: 420.5/UKK/{YEAR}/{SERIAL}
                      const year = newStudent['Tahun Lulus'] || new Date().getFullYear().toString();
                      let highestSerial = 0;
                      students.forEach(s => {
                        if (s['Tahun Lulus'] === year && s['Nomor Surat']) {
                          const parts = s['Nomor Surat'].split('/');
                          const lastPart = parts[parts.length - 1];
                          if (lastPart && !isNaN(parseInt(lastPart, 10))) {
                            highestSerial = Math.max(highestSerial, parseInt(lastPart, 10));
                          }
                        }
                      });
                      const nextSerialStr = (highestSerial + 1).toString().padStart(4, '0');
                      const autoSerialNumber = settings.documentNumbering.format
                        .replace('{YEAR}', year)
                        .replace('{SERIAL}', nextSerialStr);
                        
                      const randomID = Math.random().toString(36).substring(2, 8).toUpperCase();
                      const validationKode = `${year}UKK${randomID}`;
                      
                      const readyStudent = { ...newStudent, 'Nomor Surat': autoSerialNumber, 'Nomor Seri': validationKode } as Student;
                      setStudents([...students, readyStudent]);
                      setNotification({ message: 'Siswa berhasil ditambahkan manual', type: 'success' });
                    }
                    setShowAddModal(false);
                    setEditingStudent(null);
                  } }
                  className="px-8 py-2.5 rounded-xl font-bold bg-accent text-white hover:bg-accent/80 transition-all shadow-lg shadow-accent/20 text-sm"
                >
                  {editingStudent ? 'Simpan Perubahan' : 'Tambahkan Siswa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// NavItem with refined dark theme styles
function NavItem({ active, onClick, icon, label, expanded = true }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, expanded?: boolean }) {
  return (
    <button 
      onClick={onClick}
      title={!expanded ? label : undefined}
      className={`flex items-center gap-3 cursor-pointer rounded-xl font-bold transition-all text-sm group ${
        expanded ? 'w-full px-3.5 py-2.5' : 'w-10 h-10 justify-center'
      } ${
        active 
          ? 'bg-white text-primary shadow-xl shadow-black/5 scale-[1.02]' 
          : 'text-teal-50/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <span className={`${active ? 'text-primary' : 'text-teal-200 group-hover:text-white'} transition-colors`}>{icon}</span>
      {expanded && <span className="font-display tracking-tight whitespace-nowrap">{label}</span>}
    </button>
  );
}

function StatCard({ label, value, colorClass }: { label: string, value: string, colorClass?: string }) {
  return (
    <div className={`p-6 rounded-2xl border transition-all hover:shadow-md ${colorClass || 'bg-white border-border'}`}>
      <p className={`text-3xl font-display font-bold mb-1 ${colorClass && colorClass.includes('text-white') ? 'text-white' : 'text-primary'}`}>{value}</p>
      <p className={`text-[12px] font-bold uppercase tracking-widest ${colorClass && colorClass.includes('text-white') ? 'opacity-80' : 'text-text-muted'}`}>{label}</p>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-teal-600/60 uppercase tracking-[0.15em] mb-2 block ml-1">{label}</label>
      <input 
        type="text" 
        value={value} 
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all font-medium text-primary placeholder:text-teal-900/40"
      />
    </div>
  );
}
