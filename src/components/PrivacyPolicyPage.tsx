import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowLeft, 
  Eye, 
  FileText, 
  Server, 
  UserCheck, 
  Share2, 
  Clock, 
  Database, 
  Mail, 
  Phone, 
  Building2, 
  TrendingUp, 
  Search, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { Page } from '../types';
import { useTheme } from './ThemeContext';

interface PrivacyPolicyPageProps {
  onNavigate: (page: Page) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<string>('sec-1');

  const sections = [
    {
      id: 'sec-1',
      title: '1. Pendahuluan & Cakupan Kebijakan',
      icon: <Building2 className="w-4 h-4 text-indigo-500" />,
      summary: 'Prinsip dasar transparansi PT Level Up Indonesia dalam mengelola data bisnis pengguna.'
    },
    {
      id: 'sec-2',
      title: '2. Informasi yang Kami Kumpulkan',
      icon: <Database className="w-4 h-4 text-sky-500" />,
      summary: 'Kategori data identitas, transaksi keuangan, mutasi stok, dan log sistem.'
    },
    {
      id: 'sec-3',
      title: '3. Penggunaan & Pemrosesan Data',
      icon: <FileText className="w-4 h-4 text-emerald-500" />,
      summary: 'Bagaimana data digunakan untuk analisis omset, kalkulasi ROI, dan otomatisasi.'
    },
    {
      id: 'sec-4',
      title: '4. Keamanan & Enkripsi Data Transaksi',
      icon: <Lock className="w-4 h-4 text-indigo-500" />,
      summary: 'Standar keamanan TLS 1.3, enkripsi AES-256 bit, dan isolasi multi-tenant.'
    },
    {
      id: 'sec-5',
      title: '5. Hak-Hak Pengguna & Akses Data',
      icon: <UserCheck className="w-4 h-4 text-amber-500" />,
      summary: 'Hak mengunduh, mengoreksi, serta menghapus data bisnis secara permanen.'
    },
    {
      id: 'sec-6',
      title: '6. Integrasi API Marketplace & Pihak Ketiga',
      icon: <Share2 className="w-4 h-4 text-rose-500" />,
      summary: 'Kebijakan privasi koneksi Shopee, Tokopedia, TikTok Shop, dan perbankan.'
    },
    {
      id: 'sec-7',
      title: '7. Retensi Data & Penyimpanan Center',
      icon: <Server className="w-4 h-4 text-violet-500" />,
      summary: 'Lokasi data center Tier-3 di Indonesia dan skema backup otomatis harian.'
    },
    {
      id: 'sec-8',
      title: '8. Kebijakan Cookie & Sesi Login',
      icon: <Eye className="w-4 h-4 text-teal-500" />,
      summary: 'Penggunaan token autentikasi aman dan cookie analitik internal.'
    },
    {
      id: 'sec-9',
      title: '9. Kontak Petugas Perlindungan Data (DPO)',
      icon: <Mail className="w-4 h-4 text-indigo-500" />,
      summary: 'Saluran resmi komunikasi tim Data Protection Officer LEVEL UP.'
    }
  ];

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('landing')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Kembali ke Beranda</span>
          </button>
          
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate('landing')}>
            <img
              src="/logo/litensilogo.png"
              alt="Litensi Kids Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-xl shadow-xs"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                const fallback = document.getElementById('privacy-header-logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'block';
                const fallback = document.getElementById('privacy-header-logo-fallback');
                if (fallback) fallback.style.display = 'none';
              }}
            />
            <div
              id="privacy-header-logo-fallback"
              style={{ display: 'none' }}
              className="items-center justify-center p-1 bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 rounded-xl text-white shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="brand-text-shine text-xs sm:text-sm font-medium tracking-wider block leading-none">
                LITENSI KIDS
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-normal block tracking-wide mt-0.5 leading-none">
                Bimbingan Digital Anak
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition-all cursor-pointer"
            title="Ganti Tema"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            onClick={handlePrint}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="Cetak Kebijakan"
          >
            <Printer className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">Cetak Dokumen</span>
          </button>

          <button 
            onClick={() => onNavigate('login')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer"
          >
            Masuk Akun
          </button>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className="bg-gradient-to-b from-indigo-50/80 via-slate-50 to-slate-50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-extrabold border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            DOKUMEN RESMI PERLINDUNGAN DATA USG
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Kebijakan Privasi LEVEL UP
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Komitmen mutlak PT Level Up Indonesia dalam menjaga kerahasiaan data keuangan, omset penjualan, mutasi persediaan gudang, dan identitas bisnis Anda.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Terakhir Diperbarui: <strong>5 Agustus 2026</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sesuai UU PDP No. 27 Tahun 2022</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-sky-500" />
              <span>Enkripsi TLS 1.3 & AES-256 Bit</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-12 gap-8">
        
        {/* Left Sticky Sidebar Navigation */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
            
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari topik privasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Daftar Isi Kebijakan</span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{sections.length} Bagian</span>
            </div>

            <nav className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {sections
                .filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.summary.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                      activeSection === sec.id 
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-medium'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{sec.icon}</div>
                    <div className="space-y-0.5">
                      <p className="text-xs leading-snug">{sec.title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">{sec.summary}</p>
                    </div>
                  </button>
                ))}
            </nav>

            {/* Need Help Card */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs">
                <HelpCircle className="w-4 h-4" />
                Pertanyaan Privasi?
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Tim Data Protection Officer (DPO) siap membantu verifikasi dan pengelolaan data Anda.
              </p>
              <a 
                href="mailto:dpo@levelup.co.id" 
                className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
              >
                dpo@levelup.co.id
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </aside>

        {/* Right Article Body */}
        <div className="lg:col-span-8 space-y-8 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          {/* Summary Banner */}
          <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 border border-indigo-500/20 rounded-2xl space-y-2">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Ringkasan Komitmen Perlindungan Data LEVEL UP
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Kami memperlakukan data transaksi bisnis, rekap omset, mutasi stok, serta akun usaha Anda sebagai rahasia paling bernilai. Kami <strong>TIDAK PERNAH memperjualbelikan</strong>, menyewakan, atau membagikan data keuangan Anda kepada pihak ketiga manapun untuk kepentingan periklanan atau komersial tanpa persetujuan eksplisit Anda.
            </p>
          </div>

          {/* Section 1 */}
          <section id="sec-1" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">1. Pendahuluan & Cakupan Kebijakan</h2>
                <p className="text-xs text-slate-400 font-medium">Ketentuan umum pengoperasian platform LEVEL UP</p>
              </div>
            </div>

            <p>
              Kebijakan Privasi ini menerangkan secara komprehensif bagaimana <strong>PT Level Up Indonesia</strong> (&quot;Kami&quot;, &quot;LEVEL UP&quot;, atau &quot;Platform&quot;) mengumpulkan, menyimpan, mengolah, menggunakan, dan melindungi Data Pribadi serta Data Bisnis Pengguna (&quot;Anda&quot;) saat mengakses aplikasi web dan layanan sistem manajemen bisnis online LEVEL UP.
            </p>
            <p>
              Dengan mendaftar, mengakses, atau menggunakan layanan LEVEL UP, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan dalam Kebijakan Privasi ini. Ketentuan ini disusun berdasarkan Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) serta standar internasional perlindungan data.
            </p>
          </section>

          {/* Section 2 */}
          <section id="sec-2" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">2. Informasi yang Kami Kumpulkan</h2>
                <p className="text-xs text-slate-400 font-medium">Klasifikasi jenis data yang diproses oleh sistem</p>
              </div>
            </div>

            <p>
              Untuk memberikan performa rekap operasional dan analisis keuangan secara akurat, sistem LEVEL UP mengumpulkan beberapa kategori data berikut:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  A. Data Identitas & Akun
                </span>
                <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
                  <li>Nama lengkap pemilik akun & staff</li>
                  <li>Alamat email usaha & nomor WhatsApp</li>
                  <li>Jabatan (Owner, Supervisor, CS, Admin Gudang)</li>
                  <li>Foto profil avatar & kredensial terenkripsi</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  B. Data Bisnis & Keuangan
                </span>
                <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 list-disc list-inside">
                  <li>Pencatatan Omset & Dana Masuk harian</li>
                  <li>Nilai HPP, Biaya Iklan (FB/TikTok Ads), & Pengeluaran</li>
                  <li>Mutasi persediaan stok multi-gudang & SKU</li>
                  <li>Rekap performa omset tim sales & komisi</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                <Server className="w-4 h-4 text-violet-500" />
                C. Data Teknis & Audit Trail
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Informasi perangkat, alamat IP, tipe peramban, jam akses log masuk/keluar, serta riwayat perubahan data (audit log) yang bertujuan menjaga integritas keamanan internal organisasi Anda dari tindakan manipulasi internal.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section id="sec-3" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">3. Penggunaan & Pemrosesan Data</h2>
                <p className="text-xs text-slate-400 font-medium">Tujuan spesifik pemrosesan data oleh sistem</p>
              </div>
            </div>

            <p>
              Seluruh data yang dikumpulkan diproses semata-mata untuk mendukung kelancaran operasional bisnis Anda:
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Penyajian Dashboard Real-Time:</strong> Mengagregasi grafik tren omset, rasio biaya iklan, margin keuntungan, dan sisa kas berjalan.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Otomatisasi Gamifikasi & Leaderboard:</strong> Menghitung pencapaian poin, ranking CS, serta alokasi bonus tim secara transparan.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Notifikasi & Keamanan Sesi:</strong> Mengirimkan kode verifikasi OTP, pengingat tagihan HPP, serta peringatan percobaan login mencurigakan.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Peningkatan Kualitas Fitur:</strong> Menganalisis pola penggunaan secara anonim untuk mempercepat pemrosesan query dan kalkulator ROI.</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="sec-4" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">4. Keamanan & Enkripsi Data Transaksi</h2>
                <p className="text-xs text-slate-400 font-medium">Standar proteksi level perbankan yang diterapkan</p>
              </div>
            </div>

            <p>
              Kami mengimplementasikan standar keamanan teknis dan organisasional tingkat tinggi untuk mencegah akses tidak sah, kebocoran, atau perusakan data:
            </p>

            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center space-y-1">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto" />
                <span className="font-extrabold text-xs block text-slate-900 dark:text-white">TLS 1.3 Transport</span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">Enkripsi lalu lintas data in-transit</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center space-y-1">
                <Lock className="w-5 h-5 text-sky-500 mx-auto" />
                <span className="font-extrabold text-xs block text-slate-900 dark:text-white">AES-256 Storage</span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">Enkripsi database at-rest</span>
              </div>
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl text-center space-y-1">
                <Server className="w-5 h-5 text-emerald-500 mx-auto" />
                <span className="font-extrabold text-xs block text-slate-900 dark:text-white">Multi-Tenant Isolation</span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">Pemisahan data antar organisasi</span>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section id="sec-5" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">5. Hak-Hak Pengguna & Akses Data</h2>
                <p className="text-xs text-slate-400 font-medium">Kendali penuh di tangan pemilik akun usaha</p>
              </div>
            </div>

            <p>Sesuai dengan UU Pelindungan Data Pribadi, Anda memiliki hak-hak utama sebagai berikut:</p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <Download className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">Hak Portabilitas & Unduh Data</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Anda berhak mengeksport seluruh riwayat transaksi, mutasi kas, dan laporan stok dalam format Excel, CSV, atau PDF kapan saja melalui menu Pengaturan.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-xs text-slate-900 dark:text-white block">Hak Penghapusan Permanen (Right to be Forgotten)</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">Jika Anda memutuskan untuk berhenti berlangganan, Anda dapat mengajukan permohonan penghapusan seluruh data bisnis dari server utama LEVEL UP.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="sec-6" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">6. Integrasi API Marketplace & Pihak Ketiga</h2>
                <p className="text-xs text-slate-400 font-medium">Batas otorisasi akses API e-commerce & perbankan</p>
              </div>
            </div>

            <p>
              LEVEL UP menyediakan integrasi API resmi ke berbagai kanal marketplace (Shopee, Tokopedia, TikTok Shop, Lazada) dan gerbang pembayaran. Integrasi ini beroperasi berdasarkan token otorisasi OAuth yang dapat Anda cabut sewaktu-waktu.
            </p>
            <p>
              Akses API terbatas pada sinkronisasi status pesanan, nominal omset, dan persediaan barang. LEVEL UP tidak pernah meminta atau menyimpan kata sandi akun marketplace maupun akun perbankan Anda.
            </p>
          </section>

          {/* Section 7 */}
          <section id="sec-7" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 rounded-xl">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">7. Retensi Data & Pusat Penyimpanan</h2>
                <p className="text-xs text-slate-400 font-medium">Infrastruktur cloud data center tersertifikasi</p>
              </div>
            </div>

            <p>
              Seluruh data bisnis pengguna disimpan di infrastruktur server cloud bersertifikat ISO/IEC 27001 yang berlokasi fisik di wilayah hukum Republik Indonesia (Jakarta Region).
            </p>
            <p>
              Sistem kami menjalankan backup data terenkripsi secara otomatis setiap 24 jam sekali ke dua zonasi fisik terpisah untuk menjamin ketersediaan data (disaster recovery) jika terjadi kegagalan infrastruktur.
            </p>
          </section>

          {/* Section 8 */}
          <section id="sec-8" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-xl">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">8. Kebijakan Cookie & Sesi Login</h2>
                <p className="text-xs text-slate-400 font-medium">Pengelolaan token autentikasi lokal peramban</p>
              </div>
            </div>

            <p>
              Kami menggunakan cookie fungsional dan penyimpanan lokal (`localStorage`) untuk menjaga status login Anda tetap aktif, mengingat preferensi mode gelap/terang, dan menyimpan filter tanggal aktif. Cookie ini dilindungi atribut `Secure` dan `SameSite` untuk mencegah serangan CSRF.
            </p>
          </section>

          {/* Section 9 */}
          <section id="sec-9" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">9. Kontak Petugas Perlindungan Data (DPO)</h2>
                <p className="text-xs text-slate-400 font-medium">Saluran komunikasi khusus isu privasi & audit data</p>
              </div>
            </div>

            <p>
              Jika Anda memiliki pertanyaan, keluhan, permintaan koreksi, atau permohonan penghapusan data, silakan hubungi tim Data Protection Officer (DPO) PT Level Up Indonesia melalui:
            </p>

            <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-3 font-medium text-xs">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-indigo-500" />
                <span>Email DPO: <strong>dpo@levelup.co.id</strong> / <strong>privacy@levelup.co.id</strong></span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-emerald-500" />
                <span>WhatsApp Priority Support: <strong>+62 812-8888-9900</strong> (Khusus Isu Privasi)</span>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                <span>Kantor Pusat: <strong>PT Level Up Indonesia - Tower 8, Suite 12B, Jalan Jendral Sudirman Kav. 52-53, Jakarta Selatan, 12190</strong></span>
              </div>
            </div>
          </section>

          {/* Bottom Back Button Banner */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-indigo-600 text-white rounded-2xl shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <span className="font-extrabold text-sm block">Siap Melanjutkan Pengelolaan Bisnis?</span>
              <p className="text-xs text-indigo-100 font-medium">Akses seluruh fitur manajemen omset, stok gudang, dan leaderboard sales kami secara terenkripsi.</p>
            </div>
            <button
              onClick={() => onNavigate('landing')}
              className="px-6 py-3 bg-white text-indigo-700 hover:bg-indigo-50 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </button>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 py-8 px-4 text-center text-xs text-slate-400 font-semibold">
        <p>&copy; {new Date().getFullYear()} PT LEVEL UP INDONESIA. Hak Cipta Dilindungi Undang-Undang.</p>
      </footer>
    </div>
  );
};
