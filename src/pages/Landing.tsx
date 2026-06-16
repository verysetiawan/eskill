import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { School, Search, QrCode, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Landing() {
  const [activeTab, setActiveTab] = useState<'validate' | 'login'>('validate');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Validate State
  const [serialNumber, setSerialNumber] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [studentData, setStudentData] = useState<any | null>(null);

  // Sync settings for School Name & Logo
  const [schoolName, setSchoolName] = useState('SMK N 1 CONTOH');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('ukk_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.school?.name) setSchoolName(parsed.school.name);
        if (parsed?.school?.logo) {
          setSchoolLogo(parsed.school.logo);
          // Sync Favicon
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = parsed.school.logo;
        }
      } catch (e) {}
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // If success, App.tsx router will automatically redirect
    } catch (err: any) {
      setLoginError(err.message || 'Login gagal, periksa kredensial Anda');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleValidation = async (serial: string) => {
    console.log('handleValidation called with:', serial);
    if (!serial) return;
    
    // Parse serial if it comes formatted as a validation URL
    let searchSerial = serial;
    if (serial.includes('verify=')) {
      try {
        const urlObj = new URL(serial);
        searchSerial = urlObj.searchParams.get('verify') || serial;
      } catch (e) {
        if (serial.includes('?verify=')) {
          searchSerial = new URLSearchParams(serial.split('?')[1]).get('verify') || serial;
        }
      }
    }
    console.log('Searching for serial:', searchSerial);

    setSerialNumber(searchSerial); // Keep the UI in sync
    setSearchLoading(true);
    setSearchError('');
    setStudentData(null);
    setScanMode(false); // turn off camera once scanned

    try {
      // Query from Supabase Database (will call custom Go backend via mockup client)
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('nomor_seri', searchSerial)
        .single();

      if (error || !data) {
        throw new Error("Skill Passport tidak ditemukan atau tidak valid.");
      }

      setStudentData(data);
    } catch (error: any) {
      setSearchError(error.message);
    } finally {
      setSearchLoading(false);
    }
  };

  // Auto-validate if opened from QR code scan
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyParam = params.get('verify');
    if (verifyParam) {
      setActiveTab('validate');
      handleValidation(verifyParam);
    }
  }, []);

  return (
    <div className="min-h-screen bg-app-bg text-text-main font-sans selection:bg-accent selection:text-white flex flex-col md:flex-row">
      {/* Left panel - Branding / Hero */}
      <div className="md:w-1/2 bg-sidebar p-12 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-accent blur-[100px]" />
          <div className="absolute bottom-[10%] -right-[20%] w-[60%] h-[60%] rounded-full bg-teal-500 blur-[80px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center md:items-start">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 p-1 border border-white/10 overflow-hidden">
            {schoolLogo ? (
               <img src={schoolLogo} alt="Logo Sekolah" className="w-full h-full object-contain p-1" />
            ) : (
               <School className="text-primary w-full h-full p-2" />
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-black text-white leading-tight uppercase tracking-tight mb-2 flex flex-row flex-wrap items-center justify-center md:justify-start gap-4">
            ESKILL <span className="text-xl md:text-3xl font-bold text-white bg-white/20 px-4 py-1.5 rounded-full w-fit max-w-full truncate">{schoolName}</span>
          </h1>
          <h2 className="text-lg md:text-xl text-teal-200 font-bold uppercase tracking-widest mb-4">E Skill Passport UKK</h2>
          <p className="text-teal-50/70 font-medium max-w-md text-center md:text-left leading-relaxed">
            Sistem penerbitan dan validasi Skill Passport Uji Kompetensi Keahlian digital yang aman dan terintegrasi langsung dengan database sekolah.
          </p>

          <div className="mt-12 flex flex-col gap-1 items-center md:items-start">
             <p className="text-[10px] font-bold text-teal-100/60 uppercase tracking-[0.1em]">Developed by <a href="https://lms.albee-tech.com" target="_blank" rel="noopener noreferrer" className="text-white hover:underline transition-all">kangphery</a></p>
             <div className="flex items-center gap-3 mt-1">
               <p className="text-[11px] font-display font-medium text-teal-100/40">
                 © 2026
               </p>
               <p className="text-[10px] font-bold text-teal-100/50 bg-white/10 py-1 px-3 rounded-full">
                 V2.6.26
               </p>
             </div>
          </div>
        </div>
      </div>

      {/* Right panel - Auth & Validation Tabs */}
      <div className="md:w-1/2 bg-app-bg flex items-center justify-center p-6 md:p-12 relative z-10 shadow-[-20px_0_40px_rgba(0,0,0,0.05)]">
        <div className="w-full max-w-md space-y-8">
          
          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setActiveTab('validate')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'validate' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <CheckCircle2 size={16} /> Validasi Skill Passport
            </button>
            <button 
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex justify-center items-center gap-2 ${activeTab === 'login' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Lock size={16} /> Login Admin
            </button>
          </div>

          {activeTab === 'validate' && (
            <div className="bg-white rounded-2xl p-8 border border-border shadow-sm space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="text-xl font-display font-bold text-primary">Cek Validitas Skill Passport</h2>
                <p className="text-xs text-text-muted mt-2">Pindai QR Code di Skill Passport atau masukkan nomor seri secara manual.</p>
              </div>

              {!scanMode ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Masukkan Nomor Seri (Contoh: 2026UKK)"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-medium"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleValidation(serialNumber)}
                      disabled={searchLoading || !serialNumber}
                      className="flex-1 bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-all font-display tracking-wide disabled:opacity-50"
                    >
                      {searchLoading ? 'Mencari...' : 'Cek Manual'}
                    </button>
                    <button 
                      onClick={() => setScanMode(true)}
                      className="px-4 bg-slate-100 text-primary py-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                      title="Scan QR Code"
                    >
                      <QrCode size={20} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden relative border border-slate-200">
                     <Scanner 
                        onScan={(result) => handleValidation(result[0].rawValue)} 
                     />
                  </div>
                  <button 
                    onClick={() => setScanMode(false)}
                    className="w-full bg-slate-100 text-text-main py-3 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                  >
                    Batal Scan
                  </button>
                </div>
              )}

              {searchError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-sm font-bold text-red-800">Tidak Ditemukan</h4>
                    <p className="text-xs text-red-600 mt-1">{searchError}</p>
                  </div>
                </div>
              )}

              {studentData && (
                <div className="p-5 bg-green-50 border border-green-100 rounded-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-green-200/50 pb-3">
                    <CheckCircle2 className="text-green-600" size={20} />
                    <h4 className="font-display font-bold text-green-800">Skill Passport Valid</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                    <div>
                      <p className="text-green-700/60 font-bold uppercase tracking-widest text-[9px]">Nama Siswa</p>
                      <p className="font-medium text-green-900 mt-0.5">{studentData.nama_siswa || studentData['Nama Siswa']}</p>
                    </div>
                    <div>
                      <p className="text-green-700/60 font-bold uppercase tracking-widest text-[9px]">Nomor Seri</p>
                      <p className="font-medium text-green-900 mt-0.5">{studentData.nomor_seri || studentData['Nomor Seri']}</p>
                    </div>
                    <div>
                      <p className="text-green-700/60 font-bold uppercase tracking-widest text-[9px]">NIS/NISN</p>
                      <p className="font-medium text-green-900 mt-0.5">{studentData.nis || studentData['NIS']} / {studentData.nisn || studentData['NISN']}</p>
                    </div>
                    <div>
                      <p className="text-green-700/60 font-bold uppercase tracking-widest text-[9px]">Kelas</p>
                      <p className="font-medium text-green-900 mt-0.5">{studentData.kelas || studentData['Kelas']}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-green-700/60 font-bold uppercase tracking-widest text-[9px]">Jurusan</p>
                      <p className="font-medium text-green-900 mt-0.5">{studentData.jurusan || studentData['Jurusan']}</p>
                    </div>
                    <div>
                      <p className="text-green-700/60 font-bold uppercase tracking-widest text-[9px]">Tahun Lulus</p>
                      <p className="font-medium text-green-900 mt-0.5">{studentData.tahun_lulus || studentData['Tahun Lulus']}</p>
                    </div>
                    <div>
                      <p className="text-green-700/60 font-bold uppercase tracking-widest text-[9px]">Predikat</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-green-200/50 text-green-800 rounded font-bold text-[10px] uppercase tracking-wider">
                        {studentData.predikat || studentData['Predikat']}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'login' && (
            <div className="bg-white rounded-2xl p-8 border border-border shadow-sm space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="text-center">
                <h2 className="text-xl font-display font-bold text-primary">Login Administrator</h2>
                <p className="text-xs text-text-muted mt-2">Masuk untuk mengelola data dan menerbitkan Skill Passport.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email" 
                      placeholder="Username / Email"
                      value={email}
                      required
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-medium"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      placeholder="Password"
                      value={password}
                      required
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-sm font-medium"
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg text-center">
                    {loginError}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-all font-display tracking-wide shadow-lg shadow-primary/10 disabled:opacity-50"
                >
                  {isLoggingIn ? 'Memproses...' : 'Masuk ke Dashboard'}
                </button>
              </form>

              <div className="mt-6 text-center text-[10px] text-slate-400 font-medium">
                Sistem dilindungi dan dipantau. Dilarang masuk tanpa hak.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
