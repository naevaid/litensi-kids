// ============================================================
// DAFTAR PAGE HALAMAN UTAMA (Top-level di App.tsx)
// NOTE: Tambah nilai BARU di sini jika ada halaman utama baru,
// beserta mapping URL Hash (lihat src/lib/hashRouter.ts)
// ============================================================
export type Page =
  // Publik (tidak butuh login)
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot'
  | 'privacy'
  | 'terms'
  // Setelah login (di dalam AdminDashboard tabs wrapper)
  | 'dashboard'
  | 'anak'
  | 'monitor'
  | 'aplikasi'
  | 'geofence'
  | 'notifikasi'
  | 'inbox'
  | 'pengumuman'
  | 'profil_saya'
  | 'pengaturan'
  // Master / Owner Only
  | 'master_paket'
  | 'master_pengguna'
  | 'master_pendapatan'
  | 'master_sistem';

// ============================================================
// Sub-tab Pengaturan (di dalam halaman /#/pengaturan/<subtab>)
// ============================================================
export type PengaturanSubTab = 'hak_akses' | 'langganan_saya';

export interface User {
  id?: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  activePlan?: string;
  activePlanLabel?: string;
  childrenCount?: number;
  devicesCount?: number;
  expiresAt?: string;
  status?: string;
  phone?: string;
  lastActive?: string;
  pinMasterExists?: boolean; // true jika user sudah set PIN Master (JANGAN kirim actual pin value!)
  pinMaster?: string | null; // HANYA untuk keperluan form input, NEVER disimpan / dikembalikan dari API
}

export interface StatItem {
  label: string;
  value: string;
  subLabel: string;
  change: string;
  isPositive: boolean;
  percentage: string;
}

export interface Transaction {
  id: string;
  date: string;
  orderNo?: string;
  type: string; // 'Omset' | 'Dana Masuk' | 'Tagihan HPP' | 'Pengeluaran'
  management?: string;
  division?: string;
  shopName?: string;
  manager?: string;
  marketplace?: string;
  productSku?: string;
  qty?: number | string;
  amount: number;
  description: string;
  status: 'Selesai' | 'Diproses' | 'Tertunda' | 'Dibatalkan';
}

export interface TopShop {
  id: string;
  name: string;
  channel?: string;
  omset: number;
  incoming: number;
  adsCost: number;
  profit: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sku?: string;
  variant?: string;
  unitSold: number;
  totalSales: number;
  category: string;
}

export interface FilterState {
  dateRange: string;
  management: string;
  division: string;
  staff: string;
  customStartDate?: string;
  customEndDate?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'admin' | 'system';
  senderName?: string;
  text: string;
  timestamp: string;
  productCard?: {
    name: string;
    price: number;
    code: string;
  };
  orderCard?: {
    orderNo: string;
    status: string;
    total: number;
  };
}

export interface ChatThread {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  marketplace: 'Shopee' | 'Lazada' | 'Tiktok Shop';
  shopName: string;
  shopCode: string;
  status: 'belum_dibalas' | 'selesai';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatarColor: string;
  orderNo?: string;
  messages: ChatMessage[];
}

export interface Order {
  id: string;
  orderNo: string;
  marketplace: 'Tiktok Shop' | 'Shopee' | 'Lazada' | 'Blibli';
  status: 'Pending' | 'Sedang Dikirim' | 'Selesai' | 'Dibatalkan';
  date: string;
  productName: string;
  productCode: string;
  quantity: number;
  price: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  shopName: string;
  shopGroup: string;
  shopStaff: string;
  warehouse: string;
  courier: string;
  trackingNo: string;
  isInstant?: boolean;
  management: string;
  division: string;
}

export interface TokoItem {
  id: string;
  namaToko: string;
  marketplace: 'Shopee' | 'Lazada' | 'TikTok Shop' | 'Tokopedia' | 'Blibli' | 'Bukalapak';
  manajemen: string;
  divisi: string;
  pengelola: string;
  status: 'Aktif' | 'Non-Aktif' | 'Moderasi';
  code?: string;
  connectionStatus?: 'Tersambung' | 'Belum Tersambung';
  connectedAt?: string;
  lastSyncAt?: string;
  autoCatatPenjualan?: boolean;
  autoCatatDanaMasuk?: boolean;
  kelolaChatToko?: boolean;
  autoSyncStok?: boolean;
  autoSyncResi?: boolean;
}

export interface CancellationReturnRequest {
  id: string;
  orderId?: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  shopName: string;
  marketplace: string;
  type: 'Pembatalan' | 'Return';
  reason: string;
  date: string;
  status: 'Menunggu Persetujuan' | 'Disetujui' | 'Ditolak';
  refundAmount: number;
  warehouse: string;
  rejectionReason?: string;
  notes?: string;
  productName?: string;
  quantity?: number;
}

export interface OrderComplaint {
  id: string;
  orderId?: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  shopName: string;
  marketplace: string;
  complaintCategory: 'Barang Kurang' | 'Barang Rusak' | 'Salah Kirim Produk' | 'Paket Hilang / Rusak Kurir';
  resolutionType: 'Kirim Kekurangan' | 'Kirim Barang Pengganti' | 'Refund Dana' | 'Lainnya';
  description: string;
  proofImages: string[];
  date: string;
  status: 'Menunggu Verifikasi' | 'Diproses (Kirim Ulang)' | 'Selesai' | 'Ditolak';
  productName: string;
  quantityAffected: number;
  warehouse: string;
  reshipmentTrackingNo?: string;
  adminNote?: string;
  rejectionReason?: string;
}

export interface ManagementItem {
  id: string;
  name: string;
  headName?: string;
  description?: string;
}

export interface DivisionItem {
  id: string;
  name: string;
  managementId?: string;
  headName?: string;
}

export interface EmployeeItem {
  id: string;
  name: string;
  position?: string;
  division?: string;
}

export interface FinancialCategoryItem {
  id: string;
  name?: string;
  type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  description?: string;
  kodeKategori?: string;
  namaKategori?: string;
  tipe?: 'Income' | 'Expense' | 'Transfer' | string;
  tampilkanKe?: string;
  allowedManagements?: string[];
  allowedDivisions?: string[];
  memerlukanApproval?: boolean;
  wajibPilihToko?: boolean;
  wajibPilihAkunBankTujuan?: boolean;
  keterangan?: string;
  status?: string;
  isSystem?: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountHolder?: string;
  balance: number;
  isDefault?: boolean;
}

export type BankAccountItem = BankAccount;

export interface BankAccountMutationItem {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amount: number;
  description: string;
  referenceNumber?: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  amount: number;
  description: string;
  accountName: string;
  referenceNumber?: string;
  recordedBy?: string;
  status?: 'PENDING' | 'APPROVED' | 'CANCELLED';
}

export type FinancialTransactionItem = FinancialTransaction;

export interface FixedAssetItem {
  id: string;
  kodeAset: string;
  namaAset: string;
  kategoriAset: string;
  lokasiAset: string;
  penanggungJawab: string;
  kondisiAset: string;
  tanggalPerolehan: string;
  hargaPerolehan: number;
  nilaiResidu: number;
  masaManfaatTahun: number;
  metodePenyusutan: string;
  akumulasiPenyusutan: number;
  nilaiBuku: number;
  status: string;
  keterangan?: string;
}

export interface TagihanHppDivisiItem {
  id: string;
  divisiName: string;
  totalBill: number;
  paidBill: number;
  unpaidBill: number;
}

export interface TagihanHppTokoDetail {
  id: string;
  shopName: string;
  marketplace: string;
  totalBill: number;
  unpaidBill: number;
}

export interface HppInvoiceItem {
  id: string;
  noTagihan: string;
  namaSupplier: string;
  tanggalTagihan: string;
  jatuhTempo: string;
  totalTagihan: number;
  terbayar: number;
  sisaTagihan: number;
  status: string;
  itemDescription: string;
}

export interface SupplierItem {
  id: string;
  namaSupplier: string;
  kontak?: string;
  telepon?: string;
  alamat?: string;
}

export interface SatuanItem {
  id: string;
  namaSatuan: string;
  kodeSatuan: string;
  biayaPacking?: number | null;
  keterangan?: string;
}

export interface BrandItem {
  id: string;
  namaBrand: string;
  kodeBrand?: string;
  deskripsi?: string;
  totalSku?: string | number;
}

export interface KategoriItem {
  id: string;
  namaKategori: string;
  kodeKategori: string;
  totalProduk?: string | number;
  keterangan?: string;
}

export interface GudangItem {
  id: string;
  namaGudang: string;
  kodeGudang: string;
  manager?: string;
  telepon?: string;
  alamat?: string;
  keterangan?: string;
  totalItem?: string | number;
  status?: 'Aktif' | 'Nonaktif';
}

export interface TransferStokItem {
  id: string;
  nomorRef: string;
  tanggal: string;
  gudangAsal: string;
  gudangTujuan: string;
  namaProduk: string;
  sku: string;
  jumlah: number;
  satuan: string;
  pemohon: string;
  penyetuju?: string;
  status: 'Pending' | 'Disetujui' | 'Ditolak' | 'Selesai' | 'Dibatalkan';
  alasanTransfer?: string;
  catatanPenolakan?: string;
  tanggalDisetujui?: string;
  tanggalSelesai?: string;
}

export interface StockOpnameItem {
  id: string;
  nomorRef: string;
  tanggal: string;
  gudang: string;
  namaProduk: string;
  sku: string;
  stokSistem: number;
  stokFisik: number;
  selisih: number;
  satuan: string;
  tipeSelisih: 'Barang Rusak' | 'Selisih Kurang (Hilang)' | 'Selisih Lebih' | 'Expired / Kadaluarsa' | 'Koreksi Data';
  auditor: string;
  penyetuju?: string;
  status: 'Pending Approval' | 'Disetujui' | 'Ditolak';
  keterangan: string;
  catatanPenolakan?: string;
  tanggalDisetujui?: string;
}

export interface ProductVariantItem {
  id: string;
  namaVarian: string;
  sku: string;
  hpp: number;
  het: number;
  rewardPoin: number;
  bonusPenjualan: number;
}

export interface MasterProductItem {
  id: string;
  namaProduk: string;
  merek: string;
  kategori: string;
  satuan: string;
  deskripsi: string;
  hasVariants: boolean;
  rewardPoin: number;
  bonusPenjualan: number;
  sku: string;
  hpp: number;
  het: number;
  namaVarianLabel?: string;
  nilaiVarianInput?: string;
  variants: ProductVariantItem[];
  photos: string[];
  isAvailableToAllManagement: boolean;
  allowedManagements: string[];
  status: 'Aktif' | 'Non-Aktif';
  totalStok?: number;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  badgeText?: string;
  badgeColor?: 'amber' | 'emerald' | 'indigo' | 'rose' | 'blue' | 'purple';
  contentType: 'text' | 'image' | 'video' | 'combined';
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  displayTarget: 'modal' | 'header' | 'both';
  startDate: string;
  endDate: string;
  isActive: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
  createdAt: string;
  author?: string;
}

export interface ManagementData {
  id: string;
  name: string;
  code: string;
  type: string;
  status: 'Aktif' | 'Non-Aktif';
  assignedDivisionIds: string[];
  totalKaryawan?: number;
}

export interface DivisionData {
  id: string;
  name: string;
  head: string;
  count: number;
}

export interface EmployeeData {
  id: string;
  name: string;
  position: string;
  email: string;
  phone?: string;
  status: 'Aktif' | 'Cuti' | 'Non-Aktif';
  divisionId?: string;
  joinDate?: string;
}

export interface RewardSchemeItem {
  id: string;
  tierName: string;
  minPoints: number;
  maxPoints: number;
  targetRole: string;
  rewardType: 'Barang' | 'Cash / Bonus %' | 'Voucher' | 'Emas' | 'Wisata';
  rewardItem: string;
  commissionPercent: number;
  period: 'Bulanan' | 'Triwulan' | 'Tahunan' | 'Tanpa Batas';
  isActive: boolean;
  description: string;
}

export interface AllocationRule {
  id: string;
  priorityOrder: number;
  namaAlokasi: string;
  tipeFormula: 'FIXED_AMOUNT' | 'PERCENT_OMSET' | 'PERCENT_RUNNING_BALANCE' | 'PAYROLL_COMPONENT' | 'REMAINDER_SPLIT';
  nilai: number; // nominal fixed (e.g. 2000000) or percentage (e.g. 5 for 5%)
  targetRoleOrPerson?: string;
  isActive: boolean;
  keterangan?: string;
}

export interface SalesCommissionItem {
  id: string;
  namaPerson: string;
  role: string;
  omset: number;
  omsetPercent: number;
  hasilBersih: number;
  gajiPokok: number;
  uangMakan: number;
  tagihanMakan: number;
  tunjanganWadah: number;
  tunjanganBensin: number;
  bonusLainnya: number;
  totalTerima: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  category: 'safe' | 'danger' | 'warning' | 'school' | 'home';
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  assignedChildren: string[];
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
  status: 'active' | 'inactive';
  color: string;
  lastTriggered?: string;
  createdAt: string;
}

export interface GeofenceLog {
  id: string;
  childName: string;
  deviceName: string;
  zoneName: string;
  zoneType: 'safe' | 'danger' | 'warning' | 'school' | 'home';
  eventType: 'enter' | 'exit' | 'dwell';
  timestamp: string;
  locationCoordinates: string;
  batteryStatus?: string;
  accuracy: string;
}

export interface SubscriptionLimits {
  maxChildrenDevices: number;
  maxChildrenDevicesLabel: string;
  locationTracking: 'dasar' | 'realtime_7d' | 'realtime_30d_sos';
  locationTrackingLabel: string;
  appRestriction: 'terbatas_3' | 'unlimited_jadwal' | 'unlimited_ai';
  appRestrictionLabel: string;
  oneWayAudio: boolean;
  oneWayAudioLabel: string;
  liveCamera: boolean;
  liveCameraLabel: string;
  maxGeofences: number | 'unlimited';
  maxGeofencesLabel: string;
  readMessageNotifications: boolean;
  readMessageNotificationsLabel: string;
  remoteScreenLock: boolean;
  remoteScreenLockLabel: string;
}

export interface SubscriptionPlan {
  id: 'free' | 'premium' | 'family_pro' | string;
  name: string;
  badge?: string;
  popular?: boolean;
  tagline: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  limits: SubscriptionLimits;
  highlightFeatures: string[];
  activeUsersCount?: number;
  status: 'active' | 'archived';
}

export interface ForwardedNotification {
  id: string;
  childName: string;
  deviceName: string;
  appName: string;
  appPackage: string;
  appCategory: 'chat' | 'sms' | 'social' | 'system' | 'games' | 'other' | string;
  senderOrTitle: string;
  content: string;
  timestamp: string;
  isRead?: boolean;
  isStarred?: boolean;
  starred?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  isSensitive?: boolean;
  sensitiveCategory?: string;
}

export interface MasterUserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Orang Tua' | 'Maste';
  activePlan: 'free' | 'premium' | 'family_pro';
  activePlanLabel: string;
  childrenCount: number;
  devicesCount: number;
  registeredAt: string;
  expiresAt: string;
  status: 'active' | 'suspended' | 'trial';
  lastActive: string;
}

export interface MasterRevenueRecord {
  id: string; // ID Pesanan
  userName: string; // Pengguna (Nama)
  userEmail: string; // Email Pengguna
  userPhone?: string;
  item: string; // Item yang dibeli / dilanggan
  amount: number; // Jumlah (Rupiah)
  provider: string; // Penyedia Pembayaran (e.g. Midtrans, Xendit, QRIS, BCA VA, Google Play)
  status: 'sukses' | 'menunggu' | 'kadaluwarsa' | 'gagal' | 'refund'; // Status Transaksi
  date: string; // Tanggal transaksi
  invoiceNo?: string;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  gender: 'laki-laki' | 'perempuan';
  deviceName: string;
  deviceModel?: string;
  osVersion?: string;
  batteryLevel?: number;
  isOnline?: boolean;
  status: 'active' | 'restricted' | 'locked';
  avatar: string;
  qrPairingCode?: string;
  pairingPin?: string;
  pairedAt?: string;
  lastActive?: string;
  usedToday?: string;
  notes?: string;
}

export interface MasterSystemConfig {
  appName: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceNotice: string;
  registrationOpen: boolean;
  maxTrialDays: number;
  serverRegion: string;
  serverStatus: 'optimal' | 'maintenance' | 'degraded';
  fcmPushStatus: 'connected' | 'disconnected';
  databaseStatus: 'healthy' | 'backup_in_progress';
  smsGatewayActive: boolean;
  whatsappGatewayActive: boolean;
  supportEmail: string;
  supportPhone: string;
}




