import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Zap, 
  CheckCircle, 
  ArrowRight, 
  Sparkles, 
  Menu, 
  X,
  Heart,
  ChevronDown,
  Lock,
  Smartphone,
  Star,
  MapPin,
  Mic,
  Camera,
  Navigation,
  MessageSquare,
  Clock,
  Radio,
  Eye,
  Sliders,
  AlertTriangle,
  Volume2,
  Calendar,
  Layers,
  BatteryMedium,
  Wifi,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Video,
  Send,
  BellRing,
  User,
  Headphones,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { Page } from '../types';

interface LandingPageProps {
  onNavigate: (page: Page) => void;
}

interface GpsCoordinate {
  id: number;
  title: string;
  location: string;
  time: string;
  speedNum: number;
  lat: number;
  lon: number;
  x: number; // percentage in map
  y: number; // percentage in map
  inGeofence: boolean;
  status: string;
  note: string;
}

const GPS_COORDINATES: GpsCoordinate[] = [
  {
    id: 0,
    title: "Titik Awal: Rumah",
    location: "Jl. Teuku Umar No. 12, Menteng",
    time: "06:45 WIB",
    speedNum: 0,
    lat: -6.1924,
    lon: 106.8331,
    x: 15,
    y: 75,
    inGeofence: false,
    status: "Bersiap berangkat dari Rumah",
    note: "Sinyal GPS Akurat • Baterai 92%"
  },
  {
    id: 1,
    title: "Dalam Perjalanan: Jl. Teuku Umar",
    location: "Jl. Teuku Umar (Menuju Sekolah)",
    time: "06:55 WIB",
    speedNum: 28,
    lat: -6.1912,
    lon: 106.8348,
    x: 34,
    y: 60,
    inGeofence: false,
    status: "Bergerak menuju arah Sekolah",
    note: "Kecepatan berkendara normal"
  },
  {
    id: 2,
    title: "Titik Transit: Taman Suropati",
    location: "Perempatan Taman Suropati",
    time: "07:05 WIB",
    speedNum: 18,
    lat: -6.1903,
    lon: 106.8365,
    x: 52,
    y: 45,
    inGeofence: false,
    status: "Melintasi area Taman Suropati",
    note: "Rute harian terverifikasi"
  },
  {
    id: 3,
    title: "Masuk Perimeter: Gerbang Sekolah",
    location: "Jl. Besuki No. 8 (Gerbang Depan)",
    time: "07:15 WIB",
    speedNum: 8,
    lat: -6.1896,
    lon: 106.8382,
    x: 70,
    y: 35,
    inGeofence: true,
    status: "Memasuki Perimeter Geofence Aman",
    note: "🔔 Notifikasi instan terkirim ke HP Orang Tua"
  },
  {
    id: 4,
    title: "Tiba di Tujuan: SDN Menteng 01",
    location: "Gedung Utama SDN Menteng 01",
    time: "07:20 WIB",
    speedNum: 0,
    lat: -6.1890,
    lon: 106.8395,
    x: 82,
    y: 26,
    inGeofence: true,
    status: "Tiba dengan Selamat di Sekolah",
    note: "Zona Aman Aktif • Jam Belajar Dimulai"
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);
  
  // Interactive Showcase Tab
  const [activeTab, setActiveTab] = useState<'gps' | 'audio_camera' | 'screentime' | 'notifications'>('gps');

  // Ultra-Smooth Continuous GPS Tracking State
  const [gpsProgress, setGpsProgress] = useState<number>(0);

  // Interactive Digital Health Calculator
  const [childrenCount, setChildrenCount] = useState<number>(2);
  const [dailyScreenHours, setDailyScreenHours] = useState<number>(5);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Interactive Demo States inside Showcase
  const [demoLocked, setDemoLocked] = useState<boolean>(false);
  const [demoAudioActive, setDemoAudioActive] = useState<boolean>(true);
  const [activeCameraMode, setActiveCameraMode] = useState<'audio' | 'camera_front' | 'camera_back'>('audio');
  const [simulatedDecibel, setSimulatedDecibel] = useState<number>(42);

  // Jakarta Vector Map Interactive Controls State
  const [landingMapMode, setLandingMapMode] = useState<'vektor' | 'satelit' | 'street'>('vektor');
  const [isLandingGpsPaused, setIsLandingGpsPaused] = useState<boolean>(false);
  const [landingMapZoom, setLandingMapZoom] = useState<number>(1);

  // Calculations for Screen Health & Focus Recovery
  const protectedHoursPerMonth = Math.round(childrenCount * (dailyScreenHours - 2 > 0 ? (dailyScreenHours - 2) * 30 : 15));
  const focusRecoveryRate = Math.min(96, Math.max(70, 75 + (childrenCount * 4) + (dailyScreenHours * 2)));

  // Continuous 60fps GPS Animation Loop (Natural and Smooth)
  useEffect(() => {
    if (isLandingGpsPaused) return;
    let animationFrameId: number;
    let lastTime = performance.now();
    const TRIP_DURATION = 14000; // 14 seconds full trip
    const PAUSE_AT_DESTINATION = 2500; // 2.5 seconds pause at school
    const TOTAL_CYCLE = TRIP_DURATION + PAUSE_AT_DESTINATION;

    const animateLoop = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      setGpsProgress((prev) => {
        const currentElapsedMs = prev * TRIP_DURATION + delta;
        const cycleElapsedMs = currentElapsedMs % TOTAL_CYCLE;
        if (cycleElapsedMs > TRIP_DURATION) {
          return 1; // Pause briefly at destination
        }
        return cycleElapsedMs / TRIP_DURATION;
      });

      animationFrameId = requestAnimationFrame(animateLoop);
    };

    animationFrameId = requestAnimationFrame(animateLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isLandingGpsPaused]);

  // Calculate dynamic coordinates, speed, and status smoothly
  const currentGpsData = React.useMemo(() => {
    const points = GPS_COORDINATES;
    if (!points || points.length === 0) {
      return {
        x: 15,
        y: 75,
        lat: "-6.1924",
        lon: "106.8331",
        speed: 0,
        inGeofence: false,
        activeWaypointIdx: 0,
        activeWaypoint: null,
        status: "Bersiap Berangkat dari Rumah",
        location: "Jl. Teuku Umar No. 12, Menteng",
        time: "06:45 WIB",
        battery: 92
      };
    }

    const segments = Math.max(1, points.length - 1);
    const clampedProgress = Math.max(0, Math.min(1, isNaN(gpsProgress) ? 0 : gpsProgress));
    const rawIdx = clampedProgress * segments;
    const segIdx = Math.min(Math.floor(rawIdx), segments - 1);
    const localT = Math.max(0, Math.min(1, rawIdx - segIdx));

    // Hermite smoothstep for natural fluid easing
    const t = localT * localT * (3 - 2 * localT);

    const p0 = points[segIdx] || points[0];
    const p1 = points[Math.min(segIdx + 1, points.length - 1)] || p0;

    const currentX = p0.x + (p1.x - p0.x) * t;
    const currentY = p0.y + (p1.y - p0.y) * t;
    const currentLat = (p0.lat + (p1.lat - p0.lat) * t).toFixed(4);
    const currentLon = (p0.lon + (p1.lon - p0.lon) * t).toFixed(4);

    // Compute continuous dynamic speed
    let dynamicSpeed = 0;
    if (clampedProgress > 0.02 && clampedProgress < 0.96) {
      const peakSpeed = segIdx === 0 ? 26 : (segIdx === 1 ? 20 : (segIdx === 2 ? 14 : 7));
      dynamicSpeed = Math.max(4, Math.round(peakSpeed * Math.sin(localT * Math.PI) + 6));
    }

    const inGeofence = currentX >= 68;
    const activeWaypointIdx = Math.min(Math.max(0, Math.round(rawIdx)), points.length - 1);
    const activeWaypoint = points[activeWaypointIdx] || points[0];

    return {
      x: currentX,
      y: currentY,
      lat: currentLat,
      lon: currentLon,
      speed: dynamicSpeed,
      inGeofence,
      activeWaypointIdx,
      activeWaypoint,
      status: inGeofence
        ? (clampedProgress > 0.92 ? "Tiba dengan Selamat di SDN Menteng 01" : "Memasuki Radius Geofence SDN Menteng 01")
        : (clampedProgress < 0.05 ? "Bersiap Berangkat dari Rumah" : `Sedang Melintasi ${activeWaypoint.location}`),
      location: activeWaypoint.location,
      time: activeWaypoint.time,
      battery: Math.max(84, Math.round(92 - clampedProgress * 4))
    };
  }, [gpsProgress]);

  // Audio Decibel fluctuating animation
  useEffect(() => {
    if (!demoAudioActive) return;
    const interval = setInterval(() => {
      setSimulatedDecibel(Math.floor(38 + Math.random() * 18));
    }, 600);
    return () => clearInterval(interval);
  }, [demoAudioActive]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const features = [
    {
      icon: <MapPin className="w-5 h-5 text-emerald-500" />,
      badge: "Real-time GPS",
      title: "Pelacakan Lokasi & Riwayat Rute",
      desc: "Ketahui posisi presisi anak saat sekolah, bermain, atau les dilengkapi rekam jejak jalur rute harian hingga 30 hari."
    },
    {
      icon: <Mic className="w-5 h-5 text-indigo-500" />,
      badge: "Audio Monitor",
      title: "Dengarkan Suara Sekitar 1 Arah",
      desc: "Dengarkan suara lingkungan sekitar gadget anak secara langsung dari jarak jauh tanpa membunyikan dering HP anak."
    },
    {
      icon: <Camera className="w-5 h-5 text-purple-500" />,
      badge: "Live Monitor",
      title: "Streaming Kamera Depan & Belakang",
      desc: "Lihat visual lingkungan sekitar anak saat situasi darurat untuk memastikan anak berada di tempat yang aman."
    },
    {
      icon: <Lock className="w-5 h-5 text-rose-500" />,
      badge: "Kontrol Layar",
      title: "Kunci Layar Jarak Jauh & Jam Belajar",
      desc: "Kunci gadget anak seketika saat jam tidur, ibadah, atau waktu belajar dengan jadwal otomatis tanpa perdebatan."
    },
    {
      icon: <Navigation className="w-5 h-5 text-amber-500" />,
      badge: "Geofence Alert",
      title: "Zona Aman & Peringatan Otomatis",
      desc: "Buat radius area aman (Rumah, Sekolah) dan area bahaya dengan notifikasi instan saat anak masuk atau keluar zona."
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
      badge: "Pesan & AI",
      title: "Teruskan Notifikasi & AI SafeFilter",
      desc: "Pantau pesan chat WhatsApp, SMS, alert OTP yang masuk dan filter otomatis kata-kata kasar atau konten sensitif."
    }
  ];

  const pricingPlans = [
    {
      id: "free",
      name: "Free (Dasar)",
      price: "Gratis",
      period: "selamanya",
      rawPrice: 0,
      desc: "Pengawasan esensial untuk 1 perangkat anak tanpa biaya bulanan.",
      features: [
        "1 Perangkat Anak Terhubung",
        "Lacak Lokasi GPS Dasar (Riwayat 24 Jam)",
        "Pembatasan Maksimal 3 Aplikasi",
        "1 Area Geofence Aman & Bahaya",
        "Kunci Layar Jarak Jauh (Manual)",
        "Dashboard Kontrol Orang Tua",
        "Audio Monitor 1 Arah (Nonaktif)",
        "Live Kamera Monitor (Nonaktif)"
      ],
      popular: false,
      cta: "Mulai Registrasi Gratis"
    },
    {
      id: "premium",
      name: "Premium",
      price: isAnnual ? "Rp 39.000" : "Rp 49.000",
      period: "bulan",
      rawPrice: isAnnual ? 39000 : 49000,
      desc: "Pengawasan terarah & audio monitor 1 arah untuk 1-3 perangkat anak.",
      features: [
        "Hingga 3 Perangkat Anak Terhubung",
        "Lacak Lokasi GPS Real-time & Riwayat 7 Hari",
        "Dengarkan Suara Sekitar 1 Arah (Audio Monitor)",
        "Pembatasan Aplikasi Bebas & Terjadwal",
        "5 Area Geofence Notifikasi Masuk/Keluar",
        "Baca & Teruskan Notifikasi SMS & Chat",
        "Kunci Layar Seketika & Otomatis Jam Belajar",
        "Live Kamera Monitor (Nonaktif)"
      ],
      popular: true,
      cta: `Pilih Paket Premium (${isAnnual ? 'Rp 39.000' : 'Rp 49.000'})`
    },
    {
      id: "family_pro",
      name: "Family Pro",
      price: isAnnual ? "Rp 79.000" : "Rp 99.000",
      period: "bulan",
      rawPrice: isAnnual ? 79000 : 99000,
      desc: "Solusi perlindungan total keluarga dengan live monitor kamera 360° dan filter AI.",
      features: [
        "Hingga 10 Perangkat Anak Terhubung",
        "Lacak GPS Presisi Tinggi + Riwayat 30 Hari + SOS",
        "Live Monitor Kamera Depan & Belakang",
        "Dengarkan Suara 1 Arah Kualitas HD Unlimited",
        "Geofence Tanpa Batas (Unlimited Geofences)",
        "Baca Notifikasi Lengkap (WhatsApp, SMS & OTP)",
        "AI SafeFilter Konten Dewasa & Kata Sensitif",
        "Kunci Layar Jarak Jauh + Modus Darurat"
      ],
      popular: false,
      cta: `Pilih Family Pro (${isAnnual ? 'Rp 79.000' : 'Rp 99.000'})`
    }
  ];

  const testimonials = [
    {
      name: "Bunda Ratih Pratama",
      role: "Ibu 2 Anak (SD & SMP) - Surabaya",
      content: "Fitur Kunci Layar dan Jam Belajar otomatis membuat anak-anak saya tidak lagi begadang bermain game. Saat jam tidur jam 21.00, otomatis layar terkunci rapi tanpa perlu adu argumen.",
      rating: 5,
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ratih"
    },
    {
      name: "Ayah Hendra Wijaya",
      role: "Wiraswasta & Ayah 3 Anak - Jakarta",
      content: "Pelacakan GPS dan Geofence-nya sangat akurat. Saya langsung dapat notifikasi saat anak tiba di sekolah dan saat pulang ke rumah. Fitur audio 1 arah juga sangat menenangkan ketika anak sedang di luar.",
      rating: 5,
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Hendra"
    },
    {
      name: "Ibu Dr. Maya Kartika, M.Psi",
      role: "Psikolog Anak & Konsultan Parenting",
      content: "Litensi Kids memberikan batasan digital yang sehat tanpa kesan membatasi ruang gerak anak. AI SafeFilter dan pembatasan aplikasi mendorong pembentukan disiplin gadget sejak dini.",
      rating: 5,
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=Maya"
    }
  ];

  const faqs = [
    {
      q: "Bagaimana cara menghubungkan gadget anak ke Litensi Kids?",
      a: "Sangat mudah! Setelah orang tua mendaftar, unduh aplikasi pendamping anak (Litensi Kids Companion) di HP anak, lalu scan kode QR pairing dari dashboard orang tua. Tidak memerlukan rooting ataupun jailbreak."
    },
    {
      q: "Apakah fitur Audio Monitor dan Kamera membunyikan suara di HP anak?",
      a: "Tidak. Fitur pemantauan audio 1 arah dan live streaming kamera dirancang berjalan hening untuk keperluan keamanan darurat orang tua, sehingga tidak mengganggu kegiatan belajar anak di kelas."
    },
    {
      q: "Bagaimana jika anak mencoba menghapus atau uninstall aplikasi dari HP-nya?",
      a: "Litensi Kids dilindungi oleh proteksi Device Administrator & PIN Akses Khusus Orang Tua. Aplikasi tidak dapat di-uninstall atau dihentikan paksa tanpa memasukkan PIN master orang tua."
    },
    {
      q: "Apakah data lokasi, audio, dan riwayat pesan anak terjamin keamanannya?",
      a: "Keamanan privasi keluarga adalah komitmen tertinggi kami. Seluruh transmisi data dienkripsi dengan protokol TLS 256-bit tingkat perbankan dan data hanya dapat diakses secara eksklusif oleh akun orang tua terdaftar."
    },
    {
      q: "Berapa banyak perangkat anak yang bisa diawasi dalam 1 akun keluarga?",
      a: "Paket Free mendukung 1 perangkat, Paket Premium mendukung hingga 3 perangkat, dan Paket Family Pro mendukung hingga 10 perangkat anak dalam satu dasbor terpadu."
    }
  ];

  const handleSelectPlan = (planId: string) => {
    localStorage.setItem('selected_plan', planId);
    onNavigate('register');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Branding (Consistent with Dashboard) */}
            <div
              className="flex items-center gap-2.5 shrink-0 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="flex items-center justify-center">
                <img
                  src="/logo/litensilogo.png"
                  alt="Litensi Kids Logo"
                  className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl shadow-xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const fallback = document.getElementById('landing-header-logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                  onLoad={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'block';
                    const fallback = document.getElementById('landing-header-logo-fallback');
                    if (fallback) fallback.style.display = 'none';
                  }}
                />
                <div
                  id="landing-header-logo-fallback"
                  style={{ display: 'none' }}
                  className="items-center justify-center p-1.5 sm:p-2 bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 rounded-xl text-white shadow-md shadow-orange-500/20"
                >
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <span className="brand-text-shine text-xs sm:text-sm font-medium tracking-wider block drop-shadow-xs leading-none">
                  LITENSI KIDS
                </span>
                <span className="text-[9.5px] sm:text-[10.5px] text-slate-500 dark:text-slate-400 font-normal block tracking-wide mt-0.5 leading-none">
                  Bimbingan Digital Anak
                </span>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-6 text-xs font-normal">
              <a href="#fitur" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Fitur Proteksi</a>
              <a href="#showcase" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Simulasi Live</a>
              <a href="#kalkulator" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Kalkulator Waktu Layar</a>
              <a href="#harga" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Paket Langganan</a>
              <a href="#faq" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">FAQ</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3 text-xs">
              <button 
                onClick={() => onNavigate('login')}
                id="landing-login-btn"
                className="px-4 py-2 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-normal transition-colors cursor-pointer"
              >
                Masuk Orang Tua
              </button>
              <button 
                onClick={() => onNavigate('register')}
                id="landing-register-btn"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-normal shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Coba Gratis Sekarang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                id="landing-mobile-menu-btn"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-2 pb-4 space-y-2 text-xs font-normal"
            >
              <a href="#fitur" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600">Fitur Proteksi</a>
              <a href="#showcase" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600">Simulasi Live</a>
              <a href="#kalkulator" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600">Kalkulator Waktu Layar</a>
              <a href="#harga" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600">Paket Langganan</a>
              <a href="#faq" onClick={() => setIsMenuOpen(false)} className="block py-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600">FAQ</a>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <button 
                  onClick={() => onNavigate('login')}
                  className="w-full py-2.5 text-center text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Masuk Akun Orang Tua
                </button>
                <button 
                  onClick={() => onNavigate('register')}
                  className="w-full py-2.5 text-center bg-indigo-600 text-white rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Daftar Gratis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* HERO SECTION WITH ANIMATED BADGES & MOCKUP */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-14 sm:pb-20">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            
            {/* Left Hero Copy */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-6 space-y-4 sm:space-y-6 text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 rounded-full text-xs text-indigo-700 dark:text-indigo-300 font-normal">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span>Sistem Pengawasan Digital & Keamanan Anak #1</span>
              </div>

              <h1 className="text-base sm:text-base font-medium tracking-tight text-slate-900 dark:text-white leading-relaxed">
                Lindungi Aktivitas Digital Anak, Pantau Lokasi Real-time & Cegah Kecanduan Gadget
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                Litensi Kids menghadirkan kendali penuh bagi orang tua untuk mengunci layar jarak jauh, melacak GPS presisi, mendengarkan audio sekitar, membatasi jam belajar, dan memfilter konten berbahaya dengan aman.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button 
                  onClick={() => onNavigate('register')}
                  id="hero-cta-register"
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-medium shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Mulai Lindungi Gadget Anak (Gratis)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button 
                  onClick={() => {
                    const el = document.getElementById('showcase');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  id="hero-cta-demo"
                  className="px-4 py-3 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lihat Simulasi Gerak GPS</span>
                </button>
              </div>

              {/* Trust Micro-Badges */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80 grid grid-cols-3 gap-3 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Tanpa Perlu Root</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Enkripsi TLS 256-bit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Setup &lt; 2 Menit</span>
                </div>
              </div>
            </motion.div>

            {/* Right Hero Interactive Mockup with Floating Micro-Alerts */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-6 relative"
            >
              {/* Floating Dynamic Alert Chip 1 */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [-4, 4, -4] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="hidden sm:flex absolute -top-4 -left-4 z-20 items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-xl shadow-md text-[11px] text-slate-700 dark:text-slate-200"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-medium text-emerald-600">Geofence:</span>
                <span>Rayyan tiba di SDN Menteng</span>
              </motion.div>

              {/* Floating Dynamic Alert Chip 2 */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: [4, -4, 4] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                className="hidden sm:flex absolute -bottom-4 -right-2 z-20 items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-xl shadow-md text-[11px] text-slate-700 dark:text-slate-200"
              >
                <Lock className="w-3 h-3 text-rose-500" />
                <span>Jam Belajar 19.00 - 20.30 Aktif</span>
              </motion.div>

              <div className="relative mx-auto max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xs text-left">
                {/* Phone Header Status Bar */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 text-xs font-normal">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium text-slate-900 dark:text-white">HP Rayyan (Samsung A54)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <div className="flex items-center gap-1">
                      <BatteryMedium className="w-3.5 h-3.5 text-emerald-500" />
                      <span>84%</span>
                    </div>
                    <Wifi className="w-3 h-3 text-indigo-500" />
                  </div>
                </div>

                {/* Location Quick Card */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-2xl mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600 animate-bounce" />
                      <span>Lokasi Terkini (Real-time GPS)</span>
                    </span>
                    <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] rounded-md font-medium">
                      Dalam Zona Aman
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-900 dark:text-white">
                    SDN Menteng 01 Jakarta Pusat
                  </p>
                  <p className="text-[11px] text-slate-500 font-normal">
                    Akurasi 4 meter • Diperbarui 10 detik yang lalu
                  </p>
                </div>

                {/* Quick Action Grid */}
                <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs">
                  {/* Remote Screen Lock Widget */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-normal">Kunci Layar</span>
                      <Lock className={`w-3.5 h-3.5 ${demoLocked ? 'text-rose-500' : 'text-slate-400'}`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setDemoLocked(!demoLocked)}
                      className={`w-full py-1.5 px-2 rounded-lg text-xs font-normal transition-all cursor-pointer ${
                        demoLocked 
                          ? 'bg-rose-600 text-white' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {demoLocked ? 'Layar Terkunci (Buka)' : 'Kunci Seketika'}
                    </button>
                  </div>

                  {/* 1-Way Audio Monitor Widget */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-normal">Audio Sekitar</span>
                      <Mic className={`w-3.5 h-3.5 ${demoAudioActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setDemoAudioActive(!demoAudioActive)}
                      className={`w-full py-1.5 px-2 rounded-lg text-xs font-normal transition-all cursor-pointer ${
                        demoAudioActive 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300'
                      }`}
                    >
                      {demoAudioActive ? 'Mendengarkan...' : 'Dengar 1 Arah'}
                    </button>
                  </div>
                </div>

                {/* App Screen Time Today */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-normal">Waktu Layar Hari Ini</span>
                    <span className="font-medium text-slate-900 dark:text-white">1 Jam 45 Mnt / Batas 2 Jam</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: '87%' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-normal">
                    <span>YouTube Kids (45m)</span>
                    <span>Roblox (30m)</span>
                    <span>Ruangguru (30m)</span>
                  </div>
                </div>

                {/* Live Alert Ticker */}
                <div className="mt-3 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-300 font-normal">
                  <Radio className="w-3 h-3 text-emerald-500 shrink-0 animate-ping" />
                  <span>Notifikasi WA & SMS diteruskan secara real-time ke orang tua</span>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* CORE 6 FEATURES SECTION */}
      <section id="fitur" className="py-12 sm:py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs rounded-md uppercase font-medium">
              FITUR PROTEKSI UTAMA
            </span>
            <h2 className="text-base font-medium text-slate-900 dark:text-white">
              Perlindungan Digital Komprehensif untuk Buah Hati
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Seluruh kebutuhan pemantauan, pembatasan waktu layar, dan pencegahan risiko internet dirancang dalam satu dasbor orang tua yang ramah dan mudah digunakan.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          >
            {features.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-indigo-500/40 transition-all text-left space-y-3 shadow-2xs group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-2xs group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] rounded-md font-medium">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* INTERACTIVE PRODUCT SHOWCASE SIMULATION WITH ANIMATED GPS TRACKING */}
      <section id="showcase" className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs rounded-md uppercase font-medium">
              SIMULASI INTERAKTIF LIVE
            </span>
            <h2 className="text-base font-medium text-slate-900 dark:text-white">
              Simulasi Live: Pantau Gerakan GPS & Proteksi Seketika
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Pilih tab fitur di bawah untuk melihat animasi pergerakan GPS anak secara real-time dan mekanisme kerja fitur perlindungan Litensi Kids.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {[
              { id: 'gps', label: '1. Lacak GPS & Geofence (Live Tracking)', icon: <MapPin className="w-3.5 h-3.5" /> },
              { id: 'audio_camera', label: '2. Audio 1 Arah & Kamera', icon: <Mic className="w-3.5 h-3.5" /> },
              { id: 'screentime', label: '3. Kunci Layar & Jadwal', icon: <Lock className="w-3.5 h-3.5" /> },
              { id: 'notifications', label: '4. Forward Notifikasi & AI', icon: <MessageSquare className="w-3.5 h-3.5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-normal transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Interactive Simulation Frame */}
          <div className="max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xs text-left">
            
            {/* TAB 1: ANIMATED GPS & GEOFENCE TRACKING */}
            {activeTab === 'gps' && (
              <div className="grid lg:grid-cols-12 gap-6 items-center">
                
                {/* Left Controls & Step Explanation */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-md font-medium uppercase inline-block">
                      Pemantauan Satelit GPS Real-time
                    </span>
                    <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                      Pelacakan Jalur Perjalanan & Radius Geofence
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                      Satelit GPS membaca posisi dan rute anak secara terus menerus. Saat anak melintasi gerbang dan masuk radius zona aman, notifikasi otomatis terkirim seketika ke HP orang tua.
                    </p>
                  </div>

                  {/* Real-time Telemetry Status Card (Real & Authentic, No Manual Control Buttons) */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-medium">
                        <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                        <span>Status Telemetri GPS Live</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] rounded font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        5G Streaming Aktif
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px]">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Kecepatan Live</span>
                        <span className="text-slate-800 dark:text-slate-100 font-medium">
                          {currentGpsData.speed} km/jam
                        </span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Presisi Satelit</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ± 2.5m (Dual GPS)
                        </span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Baterai Perangkat</span>
                        <span className="text-slate-800 dark:text-slate-100 font-medium flex items-center gap-1">
                          <BatteryMedium className="w-3 h-3 text-emerald-500" />
                          {currentGpsData.battery}%
                        </span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Perimeter Geofence</span>
                        <span className={`font-medium ${currentGpsData.inGeofence ? 'text-emerald-500' : 'text-slate-500 dark:text-slate-400'}`}>
                          {currentGpsData.inGeofence ? 'Zona SDN Menteng' : 'Luar Perimeter'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Waypoint Journey Log */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                      Log Titik Lintasan Rute:
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {GPS_COORDINATES.map((wp, idx) => {
                        const isCurrent = currentGpsData.activeWaypointIdx === idx;
                        return (
                          <div
                            key={wp.id}
                            className={`p-2 rounded-xl text-left transition-all border text-xs flex items-center justify-between ${
                              isCurrent
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500/60 shadow-2xs'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full transition-all ${isCurrent ? 'bg-indigo-600 ring-4 ring-indigo-200 dark:ring-indigo-900' : 'bg-slate-300 dark:bg-slate-600'}`} />
                              <div>
                                <span className={`font-medium block text-[11px] ${isCurrent ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {wp.title}
                                </span>
                                <span className="text-[10px] text-slate-400 block">{wp.time} • {wp.note}</span>
                              </div>
                            </div>
                            {wp.inGeofence && (
                              <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] rounded font-medium">
                                Geofence
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Interactive Animated Map Stage (Jakarta Vector Map Realistis) */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden text-white shadow-inner">
                  
                  {/* Top Bar on Map: Title, Mode Toggle & Live Coordinates */}
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 mb-3 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '16s' }} />
                      <span className="font-medium text-slate-200">Radar GPS Satelit Live • Jakarta, Indonesia</span>
                    </div>

                    {/* Interactive Map Style Switcher */}
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setLandingMapMode('vektor')}
                        className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer font-medium ${
                          landingMapMode === 'vektor' 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Vektor Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setLandingMapMode('satelit')}
                        className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer font-medium ${
                          landingMapMode === 'satelit' 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Satelit Hybrid
                      </button>
                      <button
                        type="button"
                        onClick={() => setLandingMapMode('street')}
                        className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer font-medium ${
                          landingMapMode === 'street' 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Street Map
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[10.5px]">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono border border-emerald-500/30">
                        LAT: {currentGpsData.lat}° • LON: {currentGpsData.lon}°
                      </span>
                    </div>
                  </div>

                  {/* MAP CANVAS: JAKARTA INDONESIA VECTOR MAP */}
                  <div className={`h-72 sm:h-80 w-full rounded-xl relative overflow-hidden border border-slate-800/90 transition-all ${
                    landingMapMode === 'satelit' 
                      ? 'bg-slate-950' 
                      : (landingMapMode === 'street' ? 'bg-slate-900' : 'bg-slate-950')
                  }`}>
                    
                    {/* SVG Map Layer: Realistic Vector Features of Jakarta Pusat */}
                    <svg 
                      className="w-full h-full absolute inset-0 transition-transform duration-300" 
                      style={{ transform: `scale(${landingMapZoom})` }}
                      viewBox="0 0 600 350"
                      preserveAspectRatio="xMidYMid slice"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        {/* Grid pattern for Vektor mode */}
                        <pattern id="jakarta-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.6" opacity="0.6" />
                        </pattern>
                        {/* Satellite texture pattern */}
                        <pattern id="jakarta-satelit-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                          <rect width="40" height="40" fill="#020617" />
                          <circle cx="10" cy="10" r="1.5" fill="#1e293b" opacity="0.4" />
                          <circle cx="30" cy="25" r="2" fill="#0f172a" opacity="0.5" />
                          <path d="M 0 20 L 40 20" stroke="#0f172a" strokeWidth="0.5" />
                        </pattern>
                        {/* Route Gradient */}
                        <linearGradient id="jakarta-route-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="40%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        <linearGradient id="ciliwung-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0284c7" />
                          <stop offset="100%" stopColor="#0369a1" />
                        </linearGradient>
                      </defs>

                      {/* Map Canvas Background */}
                      <rect 
                        width="100%" 
                        height="100%" 
                        fill={
                          landingMapMode === 'satelit' 
                            ? 'url(#jakarta-satelit-pattern)' 
                            : (landingMapMode === 'street' ? '#0f172a' : 'url(#jakarta-grid-pattern)')
                        } 
                      />

                      {/* Green Spaces & Parks in Jakarta (Monas, Suropati, GBK) */}
                      {/* Monas Park Perimeter */}
                      <rect x="80" y="10" width="110" height="80" rx="8" fill="#064e3b" opacity={landingMapMode === 'satelit' ? '0.75' : '0.45'} stroke="#10b981" strokeWidth="0.8" />
                      <rect x="110" y="30" width="50" height="40" rx="4" fill="#022c22" opacity="0.6" />
                      
                      {/* Taman Suropati Oval Park */}
                      <ellipse cx="348" cy="147" rx="28" ry="18" fill="#064e3b" opacity={landingMapMode === 'satelit' ? '0.8' : '0.5'} stroke="#10b981" strokeWidth="0.8" />
                      
                      {/* Taman Menteng & GBK Zones */}
                      <rect x="20" y="260" width="70" height="70" rx="10" fill="#064e3b" opacity="0.35" />
                      <rect x="480" y="220" width="100" height="90" rx="12" fill="#064e3b" opacity="0.3" />

                      {/* Sungai Ciliwung Water Vector Stream */}
                      <path 
                        d="M 580 -20 Q 440 90 320 180 T 100 370" 
                        stroke="url(#ciliwung-gradient)" 
                        strokeWidth="12" 
                        fill="none" 
                        strokeLinecap="round" 
                        opacity="0.85"
                      />
                      <path 
                        d="M 580 -20 Q 440 90 320 180 T 100 370" 
                        stroke="#38bdf8" 
                        strokeWidth="2" 
                        fill="none" 
                        strokeDasharray="12 8" 
                        opacity="0.6"
                      />

                      {/* Urban Building Footprint Blocks (Realistis Jakarta Blocks) */}
                      <g opacity="0.25">
                        {/* Grand Indonesia & Plaza Indonesia Block */}
                        <rect x="190" y="170" width="30" height="45" rx="3" fill="#64748b" />
                        <rect x="235" y="215" width="40" height="30" rx="3" fill="#64748b" />
                        {/* Stasiun Gambir Block */}
                        <rect x="255" y="35" width="35" height="30" rx="3" fill="#64748b" />
                        {/* Gedung Menteng Blocks */}
                        <rect x="130" y="250" width="35" height="25" rx="3" fill="#64748b" />
                        <rect x="420" y="90" width="30" height="30" rx="3" fill="#64748b" />
                      </g>

                      {/* Secondary Jakarta Street Grid Network */}
                      <g stroke="#334155" strokeWidth="2.5" fill="none" opacity="0.7">
                        <path d="M 0 150 H 600" />
                        <path d="M 0 250 H 600" />
                        <path d="M 135 0 V 350" />
                        <path d="M 270 0 V 350" />
                        <path d="M 420 0 V 350" />
                        <path d="M 0 50 Q 300 80 600 50" />
                      </g>

                      {/* Main Arteries: Jl. M.H. Thamrin & Jl. Jend. Sudirman (Central Boulevard) */}
                      <path 
                        d="M 190 0 L 260 350" 
                        stroke={landingMapMode === 'street' ? '#cbd5e1' : '#38bdf8'} 
                        strokeWidth="8" 
                        fill="none" 
                        opacity="0.8"
                      />
                      <path 
                        d="M 190 0 L 260 350" 
                        stroke="#0284c7" 
                        strokeWidth="1.5" 
                        strokeDasharray="8 4" 
                        fill="none" 
                      />

                      {/* Ring Road Monas (Jl. Medan Merdeka) */}
                      <rect x="75" y="5" width="120" height="90" rx="12" stroke="#64748b" strokeWidth="4" fill="none" opacity="0.8" />

                      {/* Menteng Arterial Road Network (Teuku Umar -> Imam Bonjol -> Besuki) */}
                      <path 
                        d="M 108 273 L 228 203 L 348 147 L 444 112 L 510 84" 
                        stroke="#334155" 
                        strokeWidth="7" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none" 
                      />

                      {/* Tol Dalam Kota Overpass (Elevated Highway Overlay) */}
                      <path 
                        d="M -20 180 Q 280 120 620 90" 
                        stroke="#f59e0b" 
                        strokeWidth="3.5" 
                        strokeDasharray="8 4" 
                        fill="none" 
                        opacity="0.75"
                      />

                      {/* Dynamic Active Route Path with Glowing Gradient (Rayyan Journey Trail) */}
                      <path 
                        d="M 108 273 L 228 203 L 348 147 L 444 112 L 510 84" 
                        stroke="url(#jakarta-route-gradient)" 
                        strokeWidth="4" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="8 6"
                        fill="none" 
                        className="animate-pulse"
                      />

                      {/* Past Trajectory Solid Covered Path (Progress Trail) */}
                      <path 
                        d="M 108 273 L 228 203 L 348 147 L 444 112 L 510 84" 
                        stroke="#10b981" 
                        strokeWidth="4.5" 
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="435"
                        strokeDashoffset={Math.max(0, 435 * (1 - (isNaN(gpsProgress) ? 0 : gpsProgress)))}
                        fill="none" 
                        opacity="0.9"
                      />
                    </svg>

                    {/* GEOFENCE ZONE 1: Rumah Menteng (Radius 100m) */}
                    <div 
                      className="absolute rounded-full border border-dashed border-indigo-500/50 bg-indigo-500/10 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                      style={{ left: '18%', top: '78%', width: '80px', height: '80px' }}
                    >
                      <span className="absolute -top-3 text-[8px] bg-slate-900/90 text-indigo-300 px-1 py-0.2 rounded border border-indigo-500/40">
                        Perimeter Rumah
                      </span>
                    </div>

                    {/* GEOFENCE ZONE 2: SDN Menteng 01 (Radius 250m) with Pulsing Radar Waves */}
                    <div 
                      className="absolute rounded-full border-2 border-emerald-500/70 bg-emerald-500/15 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
                      style={{ left: '85%', top: '24%', width: '130px', height: '130px' }}
                    >
                      <div className="absolute inset-0 rounded-full border border-emerald-400/50 animate-ping" style={{ animationDuration: '3s' }} />
                      <span className="absolute -top-4 text-[9px] bg-emerald-700 text-white px-2 py-0.5 rounded-md font-medium shadow-md">
                        Zona Aman: SDN Menteng 01 (250m)
                      </span>
                    </div>

                    {/* LANDMARK PINS (Jakarta Landmarks) */}
                    {/* 1. Monas */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ left: '22%', top: '15%' }}>
                      <div className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/50 rounded-md flex items-center gap-1 shadow-xs backdrop-blur-xs">
                        <span className="text-[10px]">🏛️</span>
                        <span className="text-[9px] text-amber-300 font-medium">Monas</span>
                      </div>
                    </div>

                    {/* 2. Bundaran HI */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ left: '38%', top: '58%' }}>
                      <div className="px-1.5 py-0.5 bg-sky-500/20 border border-sky-500/50 rounded-md flex items-center gap-1 shadow-xs backdrop-blur-xs">
                        <span className="text-[10px]">⛲</span>
                        <span className="text-[9px] text-sky-300 font-medium">Bundaran HI</span>
                      </div>
                    </div>

                    {/* 3. Stasiun Gambir */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ left: '45%', top: '15%' }}>
                      <div className="px-1.5 py-0.5 bg-slate-800/80 border border-slate-700 rounded-md flex items-center gap-1 shadow-xs">
                        <span className="text-[10px]">🚆</span>
                        <span className="text-[8.5px] text-slate-300">Gambir</span>
                      </div>
                    </div>

                    {/* 4. Taman Suropati */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ left: '58%', top: '42%' }}>
                      <div className="px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-800 rounded-md flex items-center gap-1 shadow-xs">
                        <span className="text-[10px]">🌳</span>
                        <span className="text-[8.5px] text-emerald-300">Taman Suropati</span>
                      </div>
                    </div>

                    {/* 5. Rumah Menteng */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ left: '18%', top: '78%' }}>
                      <div className="p-1 rounded-full bg-indigo-600 text-white shadow-md">
                        <span className="text-[10px] block leading-none">🏠</span>
                      </div>
                      <span className="text-[8.5px] text-slate-200 bg-slate-900/90 px-1 rounded mt-0.5 border border-slate-700">Rumah</span>
                    </div>

                    {/* 6. SDN Menteng 01 */}
                    <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none" style={{ left: '85%', top: '24%' }}>
                      <div className="p-1 rounded-full bg-emerald-600 text-white shadow-md">
                        <span className="text-[10px] block leading-none">🏫</span>
                      </div>
                      <span className="text-[8.5px] text-emerald-300 bg-slate-900/90 px-1 rounded mt-0.5 border border-emerald-700">Sekolah</span>
                    </div>

                    {/* LIVE ANIMATED CHILD PIN (Rayyan Moving Pin in Jakarta) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${currentGpsData.x}%`,
                        top: `${currentGpsData.y}%`,
                        transform: 'translate(-50%, -50%)',
                        willChange: 'left, top',
                        transition: 'none'
                      }}
                      className="z-30 flex flex-col items-center pointer-events-none"
                    >
                      {/* Pulse Radar Wave Rings */}
                      <div className="absolute -inset-3 rounded-full bg-indigo-500/40 animate-ping" />
                      <div className="absolute -inset-1.5 rounded-full bg-indigo-400/30 animate-pulse" />
                      
                      {/* Avatar Pin Container */}
                      <div className="relative flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center shadow-lg relative overflow-hidden">
                          <img 
                            src="https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&q=80&w=120" 
                            alt="Rayyan"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <MapPin className="w-4 h-4 text-white absolute" />
                        </div>
                        {/* Live Online Dot */}
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 shadow-xs" />
                      </div>

                      {/* Floating Real-time Speed & Name Tag */}
                      <div className="bg-slate-900/95 border border-indigo-400/60 text-white text-[10px] font-medium px-2 py-0.5 rounded-md shadow-md mt-1 whitespace-nowrap flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Rayyan</span>
                        <span className="text-indigo-300 font-mono">({currentGpsData.speed} km/j)</span>
                      </div>
                    </div>

                    {/* MAP SIDE CONTROLS OVERLAY (Play/Pause, Reset, Zoom) */}
                    <div className="absolute bottom-3 right-3 z-40 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsLandingGpsPaused(!isLandingGpsPaused)}
                        title={isLandingGpsPaused ? "Lanjutkan Animasi Live" : "Jeda Animasi Live"}
                        className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        {isLandingGpsPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGpsProgress(0)}
                        title="Ulangi Rute dari Rumah"
                        className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLandingMapZoom(prev => Math.min(1.4, prev + 0.15))}
                        title="Perbesar Peta (Zoom In)"
                        className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-medium leading-none block">+</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLandingMapZoom(prev => Math.max(1, prev - 0.15))}
                        title="Perkecil Peta (Zoom Out)"
                        className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-medium leading-none block">-</span>
                      </button>
                    </div>

                  </div>

                  {/* Bottom Live Tracking Telemetry Banner */}
                  <div className="mt-3 p-2.5 bg-slate-950/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${currentGpsData.inGeofence ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        {currentGpsData.inGeofence ? <BellRing className="w-4 h-4 animate-bounce" /> : <Navigation className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="text-[11px] font-medium text-white block">
                          {currentGpsData.status}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {currentGpsData.location} • {currentGpsData.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        currentGpsData.inGeofence 
                          ? 'bg-emerald-600 text-white animate-pulse' 
                          : 'bg-indigo-600/30 text-indigo-300'
                      }`}>
                        {currentGpsData.inGeofence ? '🛡️ Masuk Geofence Aman' : '📍 Dalam Perjalanan Jakarta'}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: AUDIO 1 ARAH & LIVE VIDEO KAMERA */}
            {activeTab === 'audio_camera' && (
              <div className="grid md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 space-y-3">
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-md font-medium uppercase">
                    Transmisi Audio 1 Arah & Kamera Jarak Jauh
                  </span>
                  <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                    Orang Tua Mendengarkan Suara Anak Secara Hening
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                    Saat anak tidak menjawab panggilan atau berada dalam situasi darurat, orang tua dapat mendengarkan kondisi sekitar anak secara 1 arah tanpa membuat HP anak berdering, menyala, atau terganggu.
                  </p>
                  
                  <div className="space-y-1.5 pt-1 text-xs text-slate-700 dark:text-slate-300 font-normal">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Aliran suara 1 arah: HP orang tua mendengarkan audio anak</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>100% Senyap: Mikrofon HP anak aktif tanpa dering atau notifikasi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Opsi streaming kamera depan & belakang secara real-time</span>
                    </div>
                  </div>

                  {/* Mode Toggles */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveCameraMode('audio')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeCameraMode === 'audio' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Mode Audio 1 Arah</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCameraMode('camera_front')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeCameraMode === 'camera_front' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamera Depan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCameraMode('camera_back')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-normal transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeCameraMode === 'camera_back' 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Kamera Belakang</span>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-7 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/70 dark:border-slate-700/60">
                    <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                      <span>Visualisasi Jalur Audio 1 Arah (Orang Tua & Anak)</span>
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] rounded font-medium">
                      {demoAudioActive ? '🔴 Audio Aktif' : 'Standby'}
                    </span>
                  </div>

                  {/* DIRECT USER INTERACTION DIAGRAM: KIRI ORANG TUA, KANAN ANAK */}
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl relative overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      
                      {/* SISI KIRI: ORANG TUA (MENDENGARKAN SUARA ANAK) */}
                      <div className="col-span-4 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-center flex flex-col items-center relative">
                        <div className="relative mb-1.5">
                          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          {demoAudioActive && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center text-[8px] text-white">
                                <Headphones className="w-2.5 h-2.5" />
                              </span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-900 dark:text-white block">
                          Orang Tua
                        </span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-medium block">
                          (Ayah / Ibu)
                        </span>
                        <div className="mt-2 px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900 rounded-md text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Headphones className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="leading-tight">Mendengarkan</span>
                        </div>
                      </div>

                      {/* JALUR TENGAH: ALIRAN TRANSMISI AUDIO 1 ARAH DARI KIRI KE KANAN */}
                      <div className="col-span-4 flex flex-col items-center justify-center text-center px-1">
                        <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">
                          Aliran Suara
                        </span>
                        
                        {/* Animated Wave Direction Arrows Flowing LEFT TO RIGHT */}
                        <div className="w-full py-1.5 px-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center gap-1 relative overflow-hidden border border-slate-200 dark:border-slate-700">
                          {demoAudioActive ? (
                            <motion.div 
                              animate={{ x: [-20, 20] }}
                              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                              className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <ArrowRight className="w-3.5 h-3.5" />
                              <ArrowRight className="w-3.5 h-3.5" />
                            </motion.div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400">
                              <ArrowRight className="w-3.5 h-3.5" />
                              <ArrowRight className="w-3.5 h-3.5" />
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
                          1 Arah (Senyap)
                        </span>
                        <span className="text-[8px] text-slate-400 block leading-tight">
                          HP anak 100% hening
                        </span>
                      </div>

                      {/* SISI KANAN: ANAK (SUMBER SUARA / MIKROFON AKTIF) */}
                      <div className="col-span-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center flex flex-col items-center relative">
                        <div className="relative mb-1.5">
                          <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          {demoAudioActive && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 items-center justify-center text-[8px] text-white">
                                <Mic className="w-2.5 h-2.5" />
                              </span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-900 dark:text-white block">
                          Anak
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">
                          (Rayyan - 10 th)
                        </span>
                        <div className="mt-2 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Mic className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="leading-tight">Suara Sekitar</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Soundwave Simulation Box OR Camera Viewport */}
                  {activeCameraMode === 'audio' ? (
                    <div className="h-32 bg-slate-950 rounded-xl p-3 flex flex-col justify-between items-center text-white relative overflow-hidden border border-slate-800">
                      <div className="w-full flex items-center justify-between text-[10px] text-slate-400 z-10">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Suara Lingkungan yang Didengar Orang Tua:</span>
                        </span>
                        <span className="text-emerald-400 font-mono font-medium">
                          {demoAudioActive ? `${simulatedDecibel} dB (Suara Ruang Kelas)` : '0 dB (Mute)'}
                        </span>
                      </div>

                      {/* 16 Dynamic Animated Frequency Bars */}
                      <div className="flex items-center gap-1 h-12 z-10">
                        {[14, 28, 42, 18, 52, 34, 22, 46, 20, 38, 16, 32, 48, 24, 18, 30].map((h, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              height: demoAudioActive ? [h * 0.4, h, h * 0.6, h * 0.9] : 6,
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.8 + (i % 4) * 0.2,
                              ease: "easeInOut"
                            }}
                            className={`w-1.5 rounded-full ${demoAudioActive ? 'bg-indigo-400' : 'bg-slate-800'}`}
                          />
                        ))}
                      </div>

                      <span className="text-[10px] text-slate-400 z-10 text-center">
                        {demoAudioActive 
                          ? '🎧 Orang tua sedang mendengarkan suara sekitar HP Rayyan secara real-time' 
                          : 'Klik tombol di bawah untuk mulai simulasi mendengarkan suara'}
                      </span>
                    </div>
                  ) : (
                    <div className="h-32 bg-slate-950 rounded-xl p-3 flex flex-col justify-between text-white relative overflow-hidden border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] z-10">
                        <span className="flex items-center gap-1.5 text-rose-400">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          <span>STREAM {activeCameraMode === 'camera_front' ? 'KAMERA DEPAN' : 'KAMERA BELAKANG'}</span>
                        </span>
                        <span className="text-slate-400">FPS: 30 • 720p HD Senyap</span>
                      </div>

                      {/* Mockup Camera View Graphic */}
                      <div className="my-auto flex flex-col items-center justify-center text-center text-slate-400 text-xs">
                        <Camera className="w-5 h-5 text-indigo-400 mb-1 animate-pulse" />
                        <span className="text-[11px] text-slate-300">
                          {activeCameraMode === 'camera_front' ? 'Tampilan Kamera Depan (Wajah Rayyan)' : 'Tampilan Kamera Belakang (Ruang Kelas SDN Menteng)'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 z-10 border-t border-slate-800/80 pt-1">
                        <span>Enkripsi TLS 256-bit</span>
                        <span>Mode Senyap 100% (Tanpa Preview di HP Anak)</span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setDemoAudioActive(!demoAudioActive)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>{demoAudioActive ? 'Hentikan Pemantauan Audio' : 'Mulai Dengarkan Suara Anak (1 Arah)'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: KUNCI LAYAR & JADWAL */}
            {activeTab === 'screentime' && (
              <div className="grid md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-6 space-y-3">
                  <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] rounded-md font-medium uppercase">
                    Screen Time & Remote Lock
                  </span>
                  <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                    Kunci Layar Jarak Jauh & Jadwal Waktu Belajar Otomatis
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                    Batasi akses game dan media sosial dengan aturan jadwal harian. Kunci layar seketika saat makan malam atau jam tidur dengan satu sentuhan dari smartphone orang tua.
                  </p>
                  <div className="space-y-1.5 pt-1 text-xs text-slate-700 dark:text-slate-300 font-normal">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Kunci layar instan atau terjadwal otomatis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Blokir aplikasi game spesifik (Roblox, MLBB, TikTok)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Pesan edukatif ramah saat layar terkunci</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-6 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900 dark:text-white">Panel Kunci Layar HP Anak</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded font-medium ${demoLocked ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                      {demoLocked ? 'Terkunci' : 'Layar Aktif'}
                    </span>
                  </div>

                  {/* Phone Screen Mock */}
                  <div className={`h-36 rounded-xl border p-4 flex flex-col items-center justify-center text-center transition-all ${
                    demoLocked 
                      ? 'bg-rose-950/90 border-rose-800 text-rose-100' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100'
                  }`}>
                    {demoLocked ? (
                      <motion.div 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="space-y-1.5"
                      >
                        <Lock className="w-6 h-6 text-rose-400 mx-auto animate-pulse" />
                        <span className="text-xs font-medium text-white block">Waktunya Belajar & Istirahat!</span>
                        <p className="text-[10px] text-rose-200 max-w-xs">
                          Layar dikunci oleh Bunda Sarah sampai pukul 20.00 WIB.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="space-y-1.5">
                        <Smartphone className="w-6 h-6 text-indigo-500 mx-auto" />
                        <span className="text-xs font-medium block">Perangkat Aktif Digunakan</span>
                        <p className="text-[10px] text-slate-400">
                          Sisa waktu layar hari ini: 15 menit tersisa.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setDemoLocked(!demoLocked)}
                    className={`w-full py-2 rounded-xl text-xs font-normal transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs ${
                      demoLocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{demoLocked ? 'Buka Kunci Layar Anak' : 'Kunci Layar Seketika'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: FORWARD NOTIFIKASI & AI SAFETY */}
            {activeTab === 'notifications' && (
              <div className="grid md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-6 space-y-3">
                  <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] rounded-md font-medium uppercase">
                    Message Forwarder & AI Safety
                  </span>
                  <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                    Teruskan Notifikasi Chat & Filter Konten Berbahaya
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                    Setiap pesan baru dari WhatsApp, SMS, dan notifikasi aplikasi game diteruskan ke dasbor orang tua. AI SafeFilter mendeteksi kata-kata ancaman bullying, konten dewasa, dan link mencurigakan.
                  </p>
                  <div className="space-y-1.5 pt-1 text-xs text-slate-700 dark:text-slate-300 font-normal">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Baca pesan chat masuk tanpa perlu pinjam HP anak</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Deteksi kata sensitif (bullying, kekerasan, pornografi)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Alert kode OTP untuk mencegah transaksi game liar</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-6 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Inbox Notifikasi Diteruskan (Real-Time)</span>
                    </span>
                    <span className="text-[10px] text-indigo-600 font-medium">3 Pesan Baru</span>
                  </div>

                  <div className="space-y-2">
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-emerald-600 text-[11px] flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>WhatsApp • Grup Kelas 6B</span>
                        </span>
                        <span className="text-[10px] text-slate-400">10:15</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        "Jangan lupa bawa buku tugas matematika halaman 45 besok ya teman-teman."
                      </p>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-amber-600 text-[11px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>SMS • Notifikasi OTP Bank / Top-Up</span>
                        </span>
                        <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[8px] rounded font-medium">AI Alert</span>
                      </div>
                      <p className="text-[11px] text-slate-700 dark:text-slate-200">
                        "Kode OTP Top-Up Game: 839201. JANGAN berikan kode ini kepada siapapun."
                      </p>
                    </motion.div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SCREEN TIME & PARENTAL HEALTH CALCULATOR */}
      <section id="kalkulator" className="py-12 sm:py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-5 space-y-3 text-left">
              <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs rounded-md uppercase font-medium">
                KALKULATOR KESEHATAN DIGITAL
              </span>
              <h2 className="text-base font-medium text-slate-900 dark:text-white">
                Hitung Waktu Belajar & Fokus yang Diselamatkan Setiap Bulan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                Kecanduan gadget berlebihan dapat menurunkan konsentrasi dan interaksi sosial anak. Sesuaikan parameter di sebelah kanan untuk melihat dampak proteksi Litensi Kids bagi keluarga Anda.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-900 dark:text-white">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>Manfaat Nyata Disiplin Gadget Sejak Dini:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-normal">
                  <li>• Jam tidur malam lebih teratur tanpa radiasi blue-light larut malam.</li>
                  <li>• Prestasi akademik meningkat karena waktu belajar bebas distraksi game.</li>
                  <li>• Komunikasi tatap muka keluarga lebih harmonis dan hangat.</li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xs text-left space-y-6">
              {/* Slider 1: Children Count */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Jumlah Perangkat / Gadget Anak:
                  </label>
                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-medium">
                    {childrenCount} Perangkat
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1 Anak</span>
                  <span>2 Anak</span>
                  <span>3 Anak</span>
                  <span>4 Anak</span>
                  <span>5 Anak</span>
                </div>
              </div>

              {/* Slider 2: Daily Screen Hours */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Rata-rata Waktu Main Gadget Anak Saat Ini:
                  </label>
                  <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-xs font-medium">
                    {dailyScreenHours} Jam / Hari
                  </span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={dailyScreenHours}
                  onChange={(e) => setDailyScreenHours(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>1 Jam</span>
                  <span>3 Jam</span>
                  <span>5 Jam</span>
                  <span>7 Jam</span>
                  <span>10 Jam</span>
                </div>
              </div>

              {/* Calculation Output Cards */}
              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-medium uppercase text-indigo-600 dark:text-indigo-400 block">
                    WAKTU BELAJAR & INTERAKSI TERSELAMATKAN
                  </span>
                  <div className="text-base font-medium text-slate-900 dark:text-white">
                    ~ {protectedHoursPerMonth} Jam / Bulan
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Bebas kecanduan game & scrolling media sosial
                  </span>
                </div>

                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl space-y-1">
                  <span className="text-[10px] font-medium uppercase text-emerald-600 dark:text-emerald-400 block">
                    PENINGKATAN FOKUS & KESEHATAN DIGITAL
                  </span>
                  <div className="text-base font-medium text-emerald-600 dark:text-emerald-400">
                    + {focusRecoveryRate}% Lebih Sehat
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Terlindungi dari paparan konten negatif
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PRICING PLANS SECTION (8 LIMITATIONS ALIGNED) */}
      <section id="harga" className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs rounded-md uppercase font-medium">
              PILIHAN PAKET KELUARGA
            </span>
            <h2 className="text-base font-medium text-slate-900 dark:text-white">
              Investasi Terbaik untuk Masa Depan & Keamanan Anak
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Pilih paket langganan sesuai jumlah anak dalam keluarga Anda. Nikmati hemat 20% untuk opsi tagihan tahunan.
            </p>

            {/* Billing Cycle Switch */}
            <div className="flex items-center justify-center gap-3 pt-3">
              <span className={`text-xs ${!isAnnual ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-400'}`}>
                Tagihan Bulanan
              </span>
              <button
                type="button"
                onClick={() => setIsAnnual(!isAnnual)}
                id="landing-pricing-switch"
                className="w-11 h-6 bg-indigo-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full p-0.5 relative transition-colors cursor-pointer"
              >
                <div className={`w-5 h-5 bg-indigo-600 rounded-full transition-transform ${isAnnual ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs flex items-center gap-1.5 ${isAnnual ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-400'}`}>
                <span>Tagihan Tahunan</span>
                <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] rounded-md font-medium">Hemat 20%</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 items-stretch">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 flex flex-col justify-between border relative transition-all text-left shadow-2xs ${
                  plan.popular 
                    ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-600/20' 
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-indigo-600 text-white text-[9px] font-medium uppercase rounded-full tracking-wider">
                    Paling Banyak Dipilih
                  </span>
                )}

                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm sm:text-base font-medium text-slate-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1 leading-relaxed">
                      {plan.desc}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-medium text-indigo-600 dark:text-indigo-400">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-400 font-normal">
                      /{plan.period}
                    </span>
                  </div>

                  {/* Feature Limits List */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-medium uppercase text-slate-400 tracking-wider block">
                      BATASAN FITUR & PROTEKSI:
                    </span>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-normal">
                      {plan.features.map((feat, idx) => {
                        const isNonActive = feat.includes('(Nonaktif)');
                        return (
                          <li key={idx} className="flex items-start gap-2">
                            {isNonActive ? (
                              <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            )}
                            <span className={isNonActive ? 'text-slate-400 dark:text-slate-500' : ''}>{feat}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{plan.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-12 sm:py-16 bg-white dark:bg-slate-900/60 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs rounded-md uppercase font-medium">
              TESTIMONI ORANG TUA
            </span>
            <h2 className="text-base font-medium text-slate-900 dark:text-white">
              Dipercaya Ribuan Orang Tua & Praktisi Parenting di Indonesia
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Cerita nyata bagaimana Litensi Kids membantu menjaga keamanan dan kedisiplinan gadget anak.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-left space-y-3 shadow-2xs"
              >
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-normal leading-relaxed italic">
                  "{t.content}"
                </p>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <img 
                    src={t.avatar} 
                    alt={t.name} 
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full bg-indigo-100" 
                  />
                  <div>
                    <span className="font-medium text-xs text-slate-900 dark:text-white block">{t.name}</span>
                    <span className="text-[10.5px] text-slate-400 font-normal block">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ ACCORDION SECTION */}
      <section id="faq" className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 space-y-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs rounded-md uppercase font-medium">
              PERTANYAAN UMUM (FAQ)
            </span>
            <h2 className="text-base font-medium text-slate-900 dark:text-white">
              Hal-Hal yang Sering Ditanyakan Orang Tua
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Informasi lengkap seputar instalasi, privasi data, dan cara penggunaan Litensi Kids.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden text-left"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 flex items-center justify-between gap-3 text-xs font-medium text-slate-900 dark:text-white hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4 pt-1 text-xs text-slate-500 dark:text-slate-400 font-normal leading-relaxed border-t border-slate-100 dark:border-slate-800/60"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="py-12 sm:py-16 bg-indigo-600 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 relative z-10">
          <span className="px-3 py-1 bg-white/20 text-white text-[11px] rounded-full uppercase font-medium">
            Mulai Pengawasan Sekarang
          </span>
          <h2 className="text-base sm:text-base font-medium leading-relaxed max-w-xl mx-auto">
            Berikan Masa Depan Digital yang Aman, Sehat, dan Terarah untuk Anak Anda
          </h2>
          <p className="text-xs text-indigo-100 font-normal max-w-lg mx-auto">
            Daftarkan akun orang tua dalam 2 menit. Tanpa biaya pendaftaran untuk paket Free.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('register')}
              id="landing-bottom-register-btn"
              className="px-6 py-3 bg-white text-indigo-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-medium shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Daftar Akun Orang Tua Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('login')}
              id="landing-bottom-login-btn"
              className="px-5 py-3 bg-indigo-700/60 hover:bg-indigo-700 text-white rounded-xl text-xs font-normal border border-indigo-400/40 transition-all cursor-pointer"
            >
              Sudah Punya Akun? Masuk
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800 text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo/litensilogo.png"
                  alt="Litensi Kids Logo"
                  className="w-8 h-8 object-contain rounded-xl shadow-xs"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                    const fallback = document.getElementById('landing-footer-logo-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                  onLoad={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'block';
                    const fallback = document.getElementById('landing-footer-logo-fallback');
                    if (fallback) fallback.style.display = 'none';
                  }}
                />
                <div
                  id="landing-footer-logo-fallback"
                  style={{ display: 'none' }}
                  className="items-center justify-center p-1.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-emerald-400 rounded-xl text-white"
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="brand-text-shine text-xs sm:text-sm font-medium tracking-wider block leading-none">
                    LITENSI KIDS
                  </span>
                  <span className="text-[9.5px] sm:text-[10.5px] text-slate-400 font-normal block tracking-wide mt-0.5 leading-none">
                    Bimbingan Digital Anak
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                Platform perlindungan digital anak dan pengawasan waktu layar terpercaya dengan teknologi GPS, live monitor audio, dan AI SafeFilter.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-white text-xs font-medium block">Fitur Proteksi</span>
              <ul className="space-y-1.5 text-[11px] font-normal">
                <li><a href="#fitur" className="hover:text-white transition-colors">Pelacakan Lokasi GPS</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors">Audio Monitor 1 Arah</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors">Live Streaming Kamera</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors">Kunci Layar Jarak Jauh</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors">AI SafeFilter Pesan</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-white text-xs font-medium block">Paket & Layanan</span>
              <ul className="space-y-1.5 text-[11px] font-normal">
                <li><a href="#harga" className="hover:text-white transition-colors">Paket Free (Dasar)</a></li>
                <li><a href="#harga" className="hover:text-white transition-colors">Paket Premium</a></li>
                <li><a href="#harga" className="hover:text-white transition-colors">Paket Family Pro</a></li>
                <li><button onClick={() => onNavigate('register')} className="hover:text-white transition-colors cursor-pointer text-left">Registrasi Akun Baru</button></li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-white text-xs font-medium block">Kebijakan & Privasi</span>
              <ul className="space-y-1.5 text-[11px] font-normal">
                <li><button onClick={() => onNavigate('terms')} className="hover:text-white transition-colors cursor-pointer text-left">Syarat & Ketentuan</button></li>
                <li><button onClick={() => onNavigate('privacy')} className="hover:text-white transition-colors cursor-pointer text-left">Kebijakan Privasi Data Anak</button></li>
                <li><span className="text-emerald-400">Enkripsi Data TLS 256-bit</span></li>
                <li><span className="text-slate-400">Server Lokal Terproteksi</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-normal text-slate-500">
            <span>© {new Date().getFullYear()} Litensi Kids Parental Control System. Hak Cipta Dilindungi.</span>
            <span>Versi Aplikasi v2.4.0 (Build Stable)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
