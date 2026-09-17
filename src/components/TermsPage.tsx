import React, { useState } from 'react';
import { 
  FileText, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Scale, 
  CreditCard, 
  UserCheck, 
  Lock, 
  Building2, 
  Clock, 
  Printer, 
  Search, 
  HelpCircle, 
  ExternalLink, 
  Sun, 
  Moon, 
  TrendingUp, 
  Zap, 
  Slash,
  Server
} from 'lucide-react';
import { Page } from '../types';
import { useTheme } from './ThemeContext';

interface TermsPageProps {
  onNavigate: (page: Page) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigate }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState<string>('sec-1');

  const sections = [
    {
      id: 'sec-1',
      title: '1. Penerimaan Syarat & Ketentuan',
      icon: <FileText className="w-4 h-4 text-indigo-500" />,
      summary: 'Persetujuan ikatan hukum penggunaan platform LEVEL UP.'
    },
    {
      id: 'sec-2',
      title: '2. Ketentuan Akun & Kredensial Staff',
      icon: <UserCheck className="w-4 h-4 text-sky-500" />,
      summary: 'Tanggung jawab keamanan akun owner dan hirarki otorisasi tim.'
    },
    {
      id: 'sec-3',
      title: '3. Lisensi, Paket Berlangganan & Pembayaran',
      icon: <CreditCard className="w-4 h-4 text-emerald-500" />,
      summary: 'Sistem lisensi Software-as-a-Service (SaaS), uji coba & perpanjangan.'
    },
    {
      id: 'sec-4',
      title: '4. Kepemilikan Data & Hak Kekayaan Intelektual',
      icon: <ShieldCheck className="w-4 h-4 text-indigo-500" />,
      summary: 'Kepemilikan penuh data bisnis pengguna & hak cipta perangkat lunak.'
    },
    {
      id: 'sec-5',
      title: '5. Batasan Penggunaan & Kebijakan Fair Use',
      icon: <Slash className="w-4 h-4 text-amber-500" />,
      summary: 'Larangan peretasan, scraping, pemalsuan data, & penyalahgunaan API.'
    },
    {
      id: 'sec-6',
      title: '6. SLA Uptime 99.9% & Pemeliharaan Sistem',
      icon: <Server className="w-4 h-4 text-violet-500" />,
      summary: 'Jaminan ketersediaan server & jadwal maintenance berkala.'
    },
    {
      id: 'sec-7',
      title: '7. Pembatasan Tanggung Jawab (Liability)',
      icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
      summary: 'Batas kewajiban ganti rugi atas risiko operasional bisnis.'
    },
    {
      id: 'sec-8',
      title: '8. Pemutusan Layanan & Portabilitas Data',
      icon: <Zap className="w-4 h-4 text-teal-500" />,
      summary: 'Prosedur penutupan akun & batas waktu pengunduhan berkas data.'
    },
    {
      id: 'sec-9',
      title: '9. Perubahan Ketentuan & Yurisdiksi Hukum',
      icon: <Scale className="w-4 h-4 text-indigo-500" />,
      summary: 'Penyelesaian perselisihan berdasarkan hukum Republik Indonesia.'
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
      {/* Sticky Header Navbar */}
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
                const fallback = document.getElementById('terms-header-logo-fallback');
                if (fallback) fallback.style.display = 'flex';
              }}
              onLoad={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'block';
                const fallback = document.getElementById('terms-header-logo-fallback');
                if (fallback) fallback.style.display = 'none';
              }}
            />
            <div
              id="terms-header-logo-fallback"
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
            title="Cetak Dokumen"
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
            <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            DOKUMEN PERJANJIAN LISENSI APLIKASI SAAS
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Syarat & Ketentuan Layanan
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            Perjanjian mengikat antara pengguna dengan PT Level Up Indonesia mengenai hak, kewajiban, dan lisensi penggunaan sistem manajemen bisnis online.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Berlaku Efektif: <strong>5 Agustus 2026</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Lisensi Resmi PT Level Up Indonesia</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>Uptime SLA Server 99.9%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid Content Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar Table of Contents */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs sticky top-20 space-y-4">
            
            {/* Search Filter Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pasal ketentuan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Daftar Pasal Layanan</span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-extrabold">{sections.length} Pasal</span>
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

            {/* Support Help Box */}
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs">
                <HelpCircle className="w-4 h-4" />
                Pertanyaan Lisensi?
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Hubungi tim legal kami untuk penyesuaian lisensi khusus perusahaan (Enterprise Agreement).
              </p>
              <a 
                href="mailto:legal@levelup.co.id" 
                className="inline-flex items-center gap-1 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
              >
                legal@levelup.co.id
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </aside>

        {/* Right Article Body */}
        <div className="lg:col-span-8 space-y-8 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
          
          {/* Summary Box */}
          <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 border border-indigo-500/20 rounded-2xl space-y-2">
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Poin Penting Perjanjian Layanan LEVEL UP
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              Dokumen ini mengatur penggunaan platform LEVEL UP. Anda bertanggung jawab penuh atas keamanan kredensial akun usaha, akurasi input omset dan stok gudang, serta ketaatan atas aturan penggunaan wajar (fair use).
            </p>
          </div>

          {/* Section 1 */}
          <section id="sec-1" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">1. Penerimaan Syarat & Ketentuan</h2>
                <p className="text-xs text-slate-400 font-medium">Dasar hukum persetujuan penggunaan platform</p>
              </div>
            </div>

            <p>
              Dengan mendaftar, membuat akun, mengunduh, atau menggunakan platform manajemen bisnis LEVEL UP yang dikembangkan oleh <strong>PT Level Up Indonesia</strong> (&quot;LEVEL UP&quot;), Anda mengakui bahwa Anda telah membaca, memahami, dan secara hukum terikat oleh seluruh isi dari Syarat & Ketentuan ini.
            </p>
            <p>
              Apabila Anda menggunakan platform atas nama badan usaha, perusahaan, atau organisasi, Anda menyatakan dan menjamin bahwa Anda memiliki wewenang hukum penuh untuk mengikat badan usaha tersebut pada ketentuan ini.
            </p>
          </section>

          {/* Section 2 */}
          <section id="sec-2" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-xl">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">2. Ketentuan Akun & Kredensial Staff</h2>
                <p className="text-xs text-slate-400 font-medium">Tanggung jawab pengelolaan hak akses & tim</p>
              </div>
            </div>

            <p>
              Untuk mengakses fitur LEVEL UP, Anda diwajibkan mendaftarkan akun utama (&quot;Owner Account&quot;) dengan informasi yang akurat, mutakhir, dan valid.
            </p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Keamanan Kredensial:</strong> Anda bertanggung jawab penuh untuk menjaga kerahasiaan kata sandi, kata sandi staff, serta seluruh aktivitas yang terjadi di bawah akun Anda.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Hirarki Akses Tim (Role RBAC):</strong> Pemilik akun berhak mengatur tingkat akses terbatas untuk role Supervisor, Admin Gudang, Customer Service (CS), dan Kurir. LEVEL UP tidak bertanggung jawab atas kerugian akibat kesalahan pemberian izin akses internal organisasi Anda.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Pemberitahuan Pelanggaran:</strong> Anda wajib segera memberitahukan tim support LEVEL UP jika menemukan indikasi peretasan atau penggunaan tanpa izin atas akun Anda.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="sec-3" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">3. Lisensi, Paket Berlangganan & Pembayaran</h2>
                <p className="text-xs text-slate-400 font-medium">Model lisensi SaaS, siklus penagihan, & kebijakan pengembalian</p>
              </div>
            </div>

            <p>
              LEVEL UP menyediakan lisensi penggunaan platform berbasis langganan (SaaS - Software as a Service) yang ditagihkan secara bulanan atau tahunan sesuai paket pilihan Anda (Starter, Professional, atau Enterprise).
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Masa Uji Coba Gratis 14 Hari
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Pengguna baru berhak mendapatkan akses penuh fitur LEVEL UP selama 14 hari tanpa biaya. Setelah masa uji coba berakhir, sistem memerlukan konfirmasi pembayaran untuk melanjutkan operasional.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-2">
                <span className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  Perpanjangan & Pengembalian Dana
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Tagihan perpanjangan diproses secara otomatis pada tanggal jatuh tempo. Pengembalian dana (refund) hanya berlaku jika terdapat gangguan sistem mayor yang dikonfirmasi oleh tim audit teknis LEVEL UP.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section id="sec-4" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">4. Kepemilikan Data & Hak Kekayaan Intelektual</h2>
                <p className="text-xs text-slate-400 font-medium">Batas kepemilikan materi konten & kode program</p>
              </div>
            </div>

            <p>
              <strong>Data Anda Adalah Milik Anda:</strong> Seluruh data keuangan, daftar produk, catatan omset, nama pelanggan, serta laporan persediaan gudang yang diunggah ke platform LEVEL UP sepenuhnya merupakan milik mutlak Anda.
            </p>
            <p>
              <strong>HAKI Platform LEVEL UP:</strong> Seluruh hak cipta, merek dagang, kode sumber (source code), desain antarmuka (UI/UX), algoritma gamifikasi, serta konten bawaan LEVEL UP merupakan hak kekayaan intelektual milik PT Level Up Indonesia dan dilindungi oleh undang-undang hak cipta Republik Indonesia.
            </p>
          </section>

          {/* Section 5 */}
          <section id="sec-5" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <Slash className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">5. Batasan Penggunaan & Kebijakan Fair Use</h2>
                <p className="text-xs text-slate-400 font-medium">Hal-hal yang dilarang keras saat menggunakan layanan</p>
              </div>
            </div>

            <p>Saat mengakses dan menggunakan layanan LEVEL UP, Anda dilarang keras untuk:</p>

            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
              <li>Melakukan reverse engineering, dekompilasi, atau mencoba membongkar kode sumber aplikasi.</li>
              <li>Menggunakan bot, crawler, atau skrip otomatis tanpa izin tertulis untuk mengambil data sistem secara masif.</li>
              <li>Menginput data transaksi fiktif atau melakukan pencucian uang melalui pencatatan dana masuk.</li>
              <li>Menjual kembali, menyewakan, atau mendistribusikan ulang akun lisensi kepada pihak ketiga tanpa izin resmi.</li>
              <li>Mencoba menembus barikade enkripsi atau memicu serangan Denial of Service (DoS/DDoS) pada server cloud LEVEL UP.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section id="sec-6" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 rounded-xl">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">6. SLA Uptime 99.9% & Pemeliharaan Sistem</h2>
                <p className="text-xs text-slate-400 font-medium">Jaminan keandalan infrastruktur cloud & pemeliharaan rutin</p>
              </div>
            </div>

            <p>
              LEVEL UP berkomitmen memberikan Service Level Agreement (SLA) ketersediaan server sebesar <strong>99.9%</strong> setiap bulannya. Pemeliharaan rutin sistem (scheduled maintenance) akan diinformasikan sekurangnya 24 jam sebelumnya dan dijadwalkan pada jam-jam minim aktivitas transaksi (biasanya pukul 01.00 - 04.00 WIB).
            </p>
          </section>

          {/* Section 7 */}
          <section id="sec-7" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">7. Pembatasan Tanggung Jawab (Limitation of Liability)</h2>
                <p className="text-xs text-slate-400 font-medium">Garis batas tanggung jawab hukum operasional</p>
              </div>
            </div>

            <p>
              Sejauh diizinkan oleh hukum yang berlaku, PT Level Up Indonesia beserta jajaran direksi, karyawan, dan mitranya tidak bertanggung jawab atas kerugian tidak langsung, kerugian potensi keuntungan bisnis, atau gangguan operasional yang disebabkan oleh:
            </p>

            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 list-disc list-inside">
              <li>Kesalahan input data omset atau stok oleh staff internal pengguna.</li>
              <li>Gangguan koneksi internet lokal atau perangkat keras pengguna.</li>
              <li>Kondisi Force Majeure (bencana alam, huru-hara, atau gangguan jaringan ISP skala nasional).</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section id="sec-8" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-xl">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">8. Pemutusan Layanan & Portabilitas Data</h2>
                <p className="text-xs text-slate-400 font-medium">Prosedur penghentian langganan & pengambilan arsip data</p>
              </div>
            </div>

            <p>
              Anda berhak menghentikan langganan kapan saja melalui menu Pengaturan Akun. Setelah pemutusan layanan, LEVEL UP memberikan waktu tenggang <strong>30 hari</strong> bagi Anda untuk mengunduh seluruh arsip laporan bisnis Anda sebelum data dihapus secara permanen dari server aktif.
            </p>
          </section>

          {/* Section 9 */}
          <section id="sec-9" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">9. Perubahan Ketentuan & Yurisdiksi Hukum</h2>
                <p className="text-xs text-slate-400 font-medium">Aturan pembaruan pasal & penyelesaian sengketa</p>
              </div>
            </div>

            <p>
              Syarat & Ketentuan ini diatur dan ditafsirkan berdasarkan hukum Republik Indonesia. Setiap perselisihan yang timbul dari penggunaan platform LEVEL UP akan diselesaikan secara musyawarah untuk mufakat, atau melalui pengadilan yang berwenang di Pengadilan Negeri Jakarta Selatan.
            </p>
            <p>
              LEVEL UP berhak memperbarui ketentuan ini dari waktu ke waktu. Perubahan signifikan akan diinformasikan melalui notifikasi di dalam dashboard aplikasi atau pesan email resmi.
            </p>
          </section>

          {/* Bottom Back Button Banner */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-indigo-600 text-white rounded-2xl shadow-xl">
            <div className="space-y-1 text-center sm:text-left">
              <span className="font-extrabold text-sm block">Siap Mengembangkan Bisnis Bersama LEVEL UP?</span>
              <p className="text-xs text-indigo-100 font-medium">Mulai gratis 14 hari dan nikmati sistem manajemen omset & stok terintegrasi.</p>
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
