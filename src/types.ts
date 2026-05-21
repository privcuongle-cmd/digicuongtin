export interface Product {
  id: string;
  name: string;
  price: number;
  importPrice: number;
  stock: number | null;
  hasSerial: boolean;
  isService: boolean;
  color: string;
  warrantyMonths?: number;
  unit?: string;
  category?: string;
  brand?: string;
  expectedOutOfStock?: string;
  image?: string;
  lowStockThreshold?: number;
  status: 'Đang kinh doanh' | 'Ngừng kinh doanh';
  description?: string;
  createdAt?: string;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  phone2?: string;
  address?: string;
  location?: string;
  note?: string;
  createdBy?: string;
  createdAt?: string;
  totalSpent?: number;
  debt?: number;
  image?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalBuy?: number;
  totalDebt?: number;
}

export interface InvoiceItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  sn?: string;
  importPriceTotal?: number;
  warrantyExpiry?: string;
  unit?: string;
}

export interface Invoice {
  id: string;
  date: string;
  customerId?: string;
  customer: string;
  phone: string;
  address?: string;
  total: number;
  paid: number;
  debt: number;
  oldDebt?: number;
  totalDebt?: number;
  items: InvoiceItem[];
  discount?: number;
  note?: string;
  taskId?: string;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CARD' | 'WALLET';
  walletId?: string;
}

export interface ImportItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  sn?: string[];
  unit?: string;
}

export interface ImportOrder {
  id: string;
  date: string;
  supplier: string;
  status: 'DRAFT' | 'DONE' | 'Còn nợ' | 'Hoàn tất';
  items: ImportItem[];
  total: number;
  paid: number;
  debt: number;
  discount?: number;
  returnCost?: number;
  shippingFee?: number;
  otherCost?: number;
  note?: string;
  returned?: boolean;
  walletId?: string;
}

export interface CashTransaction {
  id: string;
  date: string;
  type: 'RECEIPT' | 'PAYMENT'; // THU | CHI
  amount: number;
  category: 'SALE' | 'IMPORT' | 'DEBT_COLLECTION' | 'DEBT_PAYMENT' | 'SALES_REVENUE' | 'IMPORT_PAYMENT' | 'OTHER';
  partner: string;
  note: string;
  refId?: string; // ID of Invoice or ImportOrder
  walletId?: string;
}

export interface POSDraft {
  activeTab: number;
  tabs: {
    id: number;
    name: string;
    cart: (InvoiceItem & { hasSerial?: boolean; serials?: string[] })[];
    discount: number;
    paid: number | '';
    selectedCustomer: Customer | null;
    note: string;
    paymentMethod: 'CASH' | 'TRANSFER' | 'CARD' | 'WALLET';
    walletId?: string;
  }[];
}

export interface ImportDraft {
  editingId?: string;
  cart: ImportItem[];
  selectedSupplier: Supplier | null;
  paid: number | '';
  isExplicitIntent?: boolean;
  walletId?: string;
  transactionDate?: string;
  note?: string;
  orderCode?: string;
  returnCost?: number;
  shippingFee?: number;
  otherCost?: number;
  overallDiscount?: number;
}

export interface MaintenanceTransfer {
  id: string;
  maintenanceRecordId: string;
  supplierName: string; // Tên nhà cung cấp (nơi chuyển đến)
  accessories: string;
  status: 'Đóng hàng' | 'Đã chuyển' | 'Xử lý xong' | 'Hoàn thành nhận lại';
  repairCost: number; // Chi phí sửa chữa
  shippingCost: number; // Chi phí vận chuyển (gửi đi gửi về)
  transferDate: string;
  returnDate: string;
  note: string;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  serialNumber?: string;
  issue: string;
  status: 'RECEIVING' | 'REPAIRING' | 'COMPLETED' | 'RETURNED';
  cost: number;
  paidAmount?: number;
  oldDebt?: number;
  newDebt?: number;
  note: string;
  returnDate?: string;
  transferId?: string; // ID của phiếu chuyển tuyến
  feedback?: string;
  warrantyRemainingInfo?: string;
  invoiceId?: string;
  taskId?: string;
}

export interface ReturnImportOrder {
  id: string;
  date: string;
  supplier: string;
  items: ImportItem[];
  totalGoods: number;
  discount: number;
  total: number; // NCC cần trả
  received: number; // NCC đã trả
  status: 'DONE' | 'DRAFT';
  note?: string;
}

export interface ReturnSalesOrder {
  id: string;
  date: string;
  customerId?: string;
  customer: string;
  items: InvoiceItem[];
  totalGoods: number;
  discount: number;
  total: number; // Cần trả khách
  paid: number; // Đã trả khách
  status: 'DONE' | 'DRAFT';
  note?: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'ADMIN' | 'CASHIER' | 'STOCKKEEPER';
}

export interface Serial {
  prodId: string;
  sn: string;
  supplier: string;
  importPrice: number;
  date: string;
  refId: string;
  status?: 'AVAILABLE' | 'SOLD';
}

export interface StockCard {
  prodId: string;
  type: 'NHAP' | 'XUAT' | 'TRA_NHAP' | 'TRA_BAN';
  qty: number;
  partner: string;
  date: string;
  price: number;
  refId: string;
  sn: string[];
}

export interface PrintSettings {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  bankInfo: string;
  footNote: string;
}

export interface TelegramSettings {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'OPEN' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  customerId?: string;
  customerPhone?: string;
  customerAddress?: string;
  taskType?: string;
  relatedId?: string;
  completedAt?: string;
  purchaseId?: string;
  repairId?: string;
  feedback?: string;
  feedbackHistory?: FeedbackEntry[];
  updatedAt?: string;
}

export interface FeedbackEntry {
  id: string;
  message: string;
  timestamp: string;
  userName?: string;
}

export interface Wallet {
  id: string;
  name: string; // e.g. Tiền mặt, MB Bank, Vietcombank
  type: 'CASH' | 'BANK' | 'EWALLET';
  balance: number;
  accountNumber?: string;
  bankName?: string;
  ownerName?: string;
  isActive: boolean;
  icon?: string;
  color?: string;
  backgroundImage?: string;
}

export interface ExternalSerial {
  id: string;
  date: string;
  product: string;
  sn: string;
  customer?: string;
  source?: string;
  createdBy?: string;
  note?: string;
}

export interface WifiRecord {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  wifiName: string;
  wifiPassword?: string;
  createdAt: string;
  createdBy: string;
  note?: string;
}

export interface CameraAccountRecord {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  accountName: string;
  accountPassword?: string;
  cameraBrand?: string;
  createdAt: string;
  createdBy: string;
  note?: string;
}

export interface CameraInstallation {
  id: string;
  qrCode?: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  installationDate: string;
  productName?: string;
  installationImages?: string[];
  manufacturer?: string;
  wifiId?: string;
  wifiName?: string;
  accountId?: string;
  accountName?: string;
  installationType: 'Cường Tín Lắp' | 'Lắp Lấy công' | 'Khách mua tự lắp';
  details?: string;
  createdAt: string;
  createdBy: string;
  note?: string;
}

export interface ImageItem {
  timestamp: string;
  name: string;
  id: string;
  url: string;
  fileType: string;
  category: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  brands: Category[]; // Using Category for now since it's just id/name
  categories: Category[];
  invoices: Invoice[];
  importOrders: ImportOrder[];
  returnImportOrders: ReturnImportOrder[];
  returnSalesOrders: ReturnSalesOrder[];
  cashTransactions: CashTransaction[];
  maintenanceRecords: MaintenanceRecord[];
  maintenanceTransfers: MaintenanceTransfer[];
  images: ImageItem[];
  serials: Serial[];
  stockCards: StockCard[];
  externalSerials: ExternalSerial[];
  wifiRecords: WifiRecord[];
  cameraAccounts: CameraAccountRecord[];
  cameraInstallations: CameraInstallation[];
  tasks: Task[];
  telegramSettings: TelegramSettings;
  posDraft?: POSDraft;
  importDraft?: ImportDraft;
  printSettings: PrintSettings;
  wallets: Wallet[];
  isSyncing: boolean;
  lastSync: string | null;
}
