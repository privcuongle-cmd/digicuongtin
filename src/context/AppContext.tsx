import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { AppState, Product, Customer, Supplier, Invoice, ImportOrder, CashTransaction, POSDraft, ImportDraft, MaintenanceRecord, MaintenanceTransfer, ReturnImportOrder, ReturnSalesOrder, User, Serial, StockCard, PrintSettings, ExternalSerial, ImageItem, Task, TelegramSettings, WifiRecord, CameraAccountRecord, CameraInstallation, Wallet } from '../types';
import { apiService } from '../services/api';
import { generateId } from '../lib/idUtils';
import { formatDateTime, padPhone, formatSnForDb, parseSnFromDb, parseFormattedNumber } from '../lib/utils';
import { sendNotification, sendTelegramMessage } from '../lib/notification';

interface AppContextProps extends AppState {
  login: (user: User) => void;
  logout: () => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>, skipStockCard?: boolean) => void;
  addCustomer: (customer: Customer) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  addSupplier: (supplier: Supplier) => void;
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  addImportOrder: (order: ImportOrder) => void;
  updateImportOrder: (id: string, updates: Partial<ImportOrder>) => void;
  addReturnImportOrder: (order: ReturnImportOrder) => void;
  addReturnSalesOrder: (order: ReturnSalesOrder) => void;
  addStockCard: (card: StockCard) => void;
  addSerial: (serial: Serial) => void;
  removeSerial: (sn: string) => void;
  addCashTransaction: (transaction: CashTransaction) => void;
  setPOSDraft: (draft: POSDraft) => void;
  setImportDraft: (draft: ImportDraft | undefined | null) => void;
  addMaintenanceRecord: (record: MaintenanceRecord) => void;
  updateMaintenanceRecord: (id: string, updates: Partial<MaintenanceRecord>) => void;
  addMaintenanceTransfer: (transfer: MaintenanceTransfer) => void;
  updateMaintenanceTransfer: (id: string, updates: Partial<MaintenanceTransfer>) => void;
  addExternalSerial: (serial: ExternalSerial) => void;
  updateExternalSerial: (id: string, updates: Partial<ExternalSerial>) => void;
  deleteExternalSerial: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTelegramSettings: (settings: TelegramSettings) => Promise<void>;
  addWifiRecord: (record: WifiRecord) => void;
  updateWifiRecord: (id: string, updates: Partial<WifiRecord>) => void;
  deleteWifiRecord: (id: string) => void;
  addCameraAccount: (record: CameraAccountRecord) => void;
  updateCameraAccount: (id: string, updates: Partial<CameraAccountRecord>) => void;
  deleteCameraAccount: (id: string) => void;
  addCameraInstallation: (record: CameraInstallation) => void;
  updateCameraInstallation: (id: string, updates: Partial<CameraInstallation>) => void;
  deleteCameraInstallation: (id: string) => void;
  images: ImageItem[];
  uploadImage: (base64: string, filename: string, type: string) => Promise<ImageItem | null>;
  deleteImage: (id: string) => Promise<boolean>;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  updatePrintSettings: (settings: PrintSettings) => void;
  addWallet: (wallet: Wallet) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;
  addCategory: (category: { name: string }) => Promise<void>;
  addBrand: (brand: { name: string }) => Promise<void>;
  syncData: () => Promise<void>;
}

const defaultPrintSettings: PrintSettings = {
  storeName: 'TIN HỌC CƯỜNG TÍN - ĐẮK SONG',
  address: 'Số 22, Thôn Tân Bình - xã Đắk Song - tỉnh Lâm Đồng',
  phone: '0931.113.048',
  email: 'hotro@cuongtin.vn',
  bankInfo: 'VPBank - STK: 9790357 - Chủ thể Lê Ngọc Cường',
  footNote: 'Cảm ơn quý khách đã sử dụng dịch vụ & sản phẩm Cường Tín!'
};

const defaultTelegramSettings: TelegramSettings = {
  botToken: '',
  chatId: '',
  enabled: false
};

const initialState: AppState = {
  currentUser: null,
  users: [],
  products: [],
  brands: [],
  categories: [],
  customers: [],
  suppliers: [],
  invoices: [],
  importOrders: [],
  returnImportOrders: [],
  returnSalesOrders: [],
  cashTransactions: [],
  maintenanceRecords: [],
  maintenanceTransfers: [],
  images: [],
  serials: [],
  stockCards: [],
  externalSerials: [],
  wifiRecords: [],
  cameraAccounts: [],
  cameraInstallations: [],
  tasks: [],
  telegramSettings: defaultTelegramSettings,
  printSettings: defaultPrintSettings,
  wallets: [],
  isSyncing: false,
  lastSync: null
};

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('cuongtin_erp_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...initialState,
          ...parsed,
          // Ensure arrays exist and are actually arrays
          users: Array.isArray(parsed.users) ? parsed.users : [],
          cashTransactions: Array.isArray(parsed.cashTransactions) ? parsed.cashTransactions : [],
          serials: Array.isArray(parsed.serials) ? parsed.serials : initialState.serials,
          stockCards: Array.isArray(parsed.stockCards) ? parsed.stockCards : initialState.stockCards,
          importOrders: Array.isArray(parsed.importOrders) ? parsed.importOrders : initialState.importOrders,
          returnImportOrders: Array.isArray(parsed.returnImportOrders) ? parsed.returnImportOrders : [],
          returnSalesOrders: Array.isArray(parsed.returnSalesOrders) ? parsed.returnSalesOrders : [],
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : initialState.invoices,
          products: Array.isArray(parsed.products) ? parsed.products : initialState.products,
          brands: Array.isArray(parsed.brands) ? parsed.brands : initialState.brands,
          categories: Array.isArray(parsed.categories) ? parsed.categories : initialState.categories,
          customers: Array.isArray(parsed.customers) ? parsed.customers : initialState.customers,
          suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : initialState.suppliers,
          images: Array.isArray(parsed.images) ? parsed.images : [],
          maintenanceRecords: Array.isArray(parsed.maintenanceRecords) ? parsed.maintenanceRecords : [],
          wifiRecords: Array.isArray(parsed.wifiRecords) ? parsed.wifiRecords : [],
          cameraAccounts: Array.isArray(parsed.cameraAccounts) ? parsed.cameraAccounts : [],
          cameraInstallations: Array.isArray(parsed.cameraInstallations) ? parsed.cameraInstallations : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          wallets: Array.isArray(parsed.wallets) ? parsed.wallets : [],
          telegramSettings: parsed.telegramSettings || initialState.telegramSettings,
          lastSync: parsed.lastSync || null,
        };
      }
    } catch (e) {
      console.error("Error loading state from localStorage", e);
    }
    return initialState;
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('cuongtin_erp_state', JSON.stringify(state));
  }, [state]);

  const isSyncingRef = useRef(false);

  const syncData = useCallback(async (forceRefresh = false) => {
    if (isSyncingRef.current) return;

    try {
      isSyncingRef.current = true;
      // Only show full loading if no data in local store
      if (state.products.length === 0 && state.customers.length === 0 && state.invoices.length === 0) {
        setIsLoading(true);
      }
      
      setState(prev => ({ ...prev, isSyncing: true }));
      
      // Batch fetches slightly to improve performance while staying within GAS limits
      const fetchGroup1 = Promise.all([
        apiService.readSheet('Products', forceRefresh),
        apiService.readSheet('Customers', forceRefresh, 4),
        apiService.readSheet('Suppliers', forceRefresh),
        apiService.readSheet('Brands', forceRefresh),
        apiService.readSheet('Categories', forceRefresh),
      ]);

      const fetchGroup2 = Promise.all([
        apiService.readSheet('Maintenance', forceRefresh),
        apiService.readSheet('Users', forceRefresh),
        apiService.readSheet('Settings', forceRefresh),
        apiService.readSheet('Invoices', forceRefresh, 10),
        apiService.readSheet('InvoiceDetails', forceRefresh),
      ]);

      const fetchGroup3 = Promise.all([
        apiService.readSheet('Imports', forceRefresh),
        apiService.readSheet('ImportDetails', forceRefresh),
        apiService.readSheet('ReturnImports', forceRefresh),
        apiService.readSheet('ReturnImportDetails', forceRefresh),
        apiService.readSheet('ReturnSales', forceRefresh),
      ]);

      const fetchGroup4 = Promise.all([
        apiService.readSheet('ReturnSalesDetails', forceRefresh),
        apiService.readSheet('Serials', forceRefresh),
        apiService.readSheet('StockCards', forceRefresh),
        apiService.readSheet('CashLedger', forceRefresh),
        apiService.readSheet('Wallets', forceRefresh),
      ]);

      const fetchGroup5 = Promise.all([
        apiService.readSheet('ExternalSerials', forceRefresh),
        apiService.readSheet('MaintenanceTransfers', forceRefresh),
        apiService.readSheet('Image', forceRefresh),
        apiService.readSheet('Tasks', forceRefresh),
        apiService.readSheet('TelegramSettings', forceRefresh),
        apiService.readSheet('WifiRecords', forceRefresh),
        apiService.readSheet('CameraAccounts', forceRefresh),
        apiService.readSheet('CameraInstallations', forceRefresh),
      ]);

      const [
        [apiProducts, apiCustomers, apiSuppliers, apiBrands, apiCategories],
        [apiMaintenance, apiUsers, apiSettings, apiInvoices, apiInvoiceDetails],
        [apiImports, apiImportDetails, apiReturnImports, apiReturnImportDetails, apiReturnSales],
        [apiReturnSalesDetails, apiSerials, apiStockCards, apiCash, apiWallets],
        [apiExternalSerials, apiMaintenanceTransfers, apiImages, apiTasks, apiTelegramSettings, apiWifiRecords, apiCameraAccounts, apiCameraInstallations]
      ] = await Promise.all([fetchGroup1, fetchGroup2, fetchGroup3, fetchGroup4, fetchGroup5]);


        const mappedProducts = apiProducts.length > 0 ? apiProducts.map((p: any) => ({
          id: String(p.id || ''),
          name: String(p.name || ''),
          price: parseFormattedNumber(p.salePrice),
          importPrice: parseFormattedNumber(p.costPrice),
          stock: Number(p.stock) || 0,
          hasSerial: p.hasSerial === true || p.hasSerial === 'TRUE' || p.hasSerial === 'true' || p.hasSerial === 1,
          isService: p.isService === true || p.isService === 'TRUE' || p.isService === 'true' || p.isService === 1,
          color: 'bg-blue-600',
          category: String(p.category || ''),
          unit: String(p.unit || ''),
          image: String(p.image || p.imageUrl || p.link_anh || p.AnhText || ''),
          warrantyMonths: p.warrantyMonths || p.warranty || p.BaoHanh || p.warranty_months || p.wa ? Number(p.warrantyMonths || p.warranty || p.BaoHanh || p.warranty_months || p.wa) : undefined,
          expectedOutOfStock: String(p.expectedOutOfStock || ''),
          lowStockThreshold: Number(p.lowStockThreshold) || 0,
          status: (p.status === 'Ngừng kinh doanh' || p.status === 'DISCONTINUED') ? 'Ngừng kinh doanh' : 'Đang kinh doanh',
          createdAt: String(p.createdAt || p.date || p.timestamp || '')
        })) : [];

        const extractItems = (record: any, details: any[], parentIdKeys: string[], snAsString: boolean = false) => {
          // 1. Ưu tiên kiểm tra và xử lý dữ liệu từ cột JSON 'items'/'chitiet' trong bảng cha trước
          // Đây là nguồn dữ liệu nguyên tử, luôn cam kết đầy đủ sản phẩm, số lượng, SN và giá bán từ lúc thanh toán
          const itemsKey = Object.keys(record).find(k => k.toLowerCase().includes('item') || k.toLowerCase().includes('chitiet'));
          if (itemsKey && record[itemsKey] && record[itemsKey] !== '') {
            try {
              const parsed = typeof record[itemsKey] === 'string' ? JSON.parse(record[itemsKey]) : record[itemsKey];
              const itemsArray = Array.isArray(parsed) ? parsed : [];
              
              if (itemsArray.length > 0) {
                return itemsArray.map((item: any) => {
                  const prodId = String(item.id || item.productId || item.productID || '');
                  const product = mappedProducts.find((p: any) => p.id === prodId);
                  const snArray = parseSnFromDb(item.sn || item.serials || []);
                  
                  return {
                    ...item,
                    id: prodId,
                    name: item.name || product?.name || 'Sản phẩm',
                    price: parseFormattedNumber(item.price || 0),
                    qty: Number(item.qty || item.quantity || item.quan || item.Quan || 0),
                    sn: snAsString ? (Array.isArray(snArray) ? snArray.join(', ') : String(snArray || '')) : (Array.isArray(snArray) ? snArray : (typeof snArray === 'string' ? snArray.split(',').map(s => s.trim()).filter(Boolean) : [])),
                    importPriceTotal: parseFormattedNumber(item.importPriceTotal || (product?.importPrice || 0) * (item.qty || 1))
                  };
                });
              }
            } catch (e) {
              console.error('Parse items error, falling back to separate details list', e);
            }
          }

          // 2. Dự phòng: Nếu không có hoặc lỗi cột JSON, lấy từ bảng chi tiết phụ (InvoiceDetails / ImportDetails)
          const recordId = String(record.id || '');
          const matchingDetails = details.filter((d: any) => {
            const parentId = parentIdKeys.map(k => d[k]).find(v => v !== undefined);
            return String(parentId || '') === recordId;
          });

          if (matchingDetails.length > 0) {
            return matchingDetails.map((d: any) => {
              const prodId = String(d.productId || d.productID || d.ProductID || d.productid || '');
              const product = mappedProducts.find((p: any) => p.id === prodId);
              const qty = Number(d.quantity || d.qty || d.Quantity || d.Qty || d.quan || d.Quan || 0);
              
              const rawSn = parseSnFromDb(d.sn || d.SN || d.serial || d.Serial || d.serials || d.Serials);
              const snArray = rawSn ? (typeof rawSn === 'string' ? rawSn.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(rawSn) ? rawSn : [])) : [];

              return {
                id: prodId,
                name: product?.name || 'Sản phẩm',
                price: parseFormattedNumber(d.price || d.Price || 0),
                qty: qty,
                sn: snAsString ? snArray.join(', ') : snArray,
                unit: d.unit || d.Unit || undefined,
                warrantyExpiry: d.warrantyExpiry || d.WarrantyExpiry || undefined,
                importPriceTotal: parseFormattedNumber(d.importPriceTotal || d.ImportPriceTotal || (product?.importPrice || 0) * qty)
              };
            });
          }

          return [];
        };

        const mappedInvoices = apiInvoices.length > 0 ? apiInvoices.map((inv: any) => {
            const total = parseFormattedNumber(inv.finalAmount || inv.total || 0);
            const paid = parseFormattedNumber(inv.paidAmount || inv.paid || 0);
            const debt = inv.debt !== undefined ? parseFormattedNumber(inv.debt) : (total - paid);
            return {
              id: String(inv.id || ''),
              date: formatDateTime(inv.createdAt || inv.date),
              customer: String(inv.customerID || inv.customer || ''),
              phone: padPhone(inv.phone),
              address: String(inv.address || ''),
              total,
              paid,
              debt,
              oldDebt: inv.oldDebt !== undefined ? parseFormattedNumber(inv.oldDebt) : undefined,
              totalDebt: inv.totalDebt !== undefined ? parseFormattedNumber(inv.totalDebt) : undefined,
              discount: parseFormattedNumber(inv.discount || 0),
              note: String(inv.note || ''),
              taskId: String(inv.taskId || inv.taskID || inv.TaskID || ''),
              paymentMethod: (inv.paymentMethod as any) || 'CASH',
              walletId: String(inv.walletId || ''),
              items: extractItems(inv, apiInvoiceDetails, ['invoiceID', 'invoiceId', 'InvoiceID', 'invoiceid'], true)
            };
          }) : [];

        const mappedReturnSales = apiReturnSales.length > 0 ? apiReturnSales.map((ret: any) => {
            return {
              id: String(ret.id || ''),
              date: formatDateTime(ret.createdAt || ret.date),
              customer: String(ret.customerID || ret.customer || ''),
              totalGoods: parseFormattedNumber(ret.totalGoods || 0),
              discount: parseFormattedNumber(ret.discount || 0),
              total: parseFormattedNumber(ret.totalAmount || ret.totalRefund || ret.total || 0),
              paid: parseFormattedNumber(ret.paidAmount || ret.paid || 0),
              status: ret.status || 'DONE',
              note: String(ret.note || ''),
              items: extractItems(ret, apiReturnSalesDetails, ['returnID', 'returnId', 'ReturnID', 'returnid', 'returnSalesId'], true)
            };
          }) : [];

        const mappedReturnImports = apiReturnImports.length > 0 ? apiReturnImports.map((ret: any) => {
            return {
              id: String(ret.id || ''),
              date: formatDateTime(ret.createdAt || ret.date),
              supplier: String(ret.supplierId || ret.supplier || ''),
              totalGoods: parseFormattedNumber(ret.totalGoods || 0),
              discount: parseFormattedNumber(ret.discount || 0),
              total: parseFormattedNumber(ret.totalAmount || ret.totalRefund || ret.total || 0),
              received: parseFormattedNumber(ret.receivedAmount || ret.received || 0),
              status: ret.status || 'DONE',
              note: String(ret.note || ''),
              items: extractItems(ret, apiReturnImportDetails, ['returnID', 'returnId', 'ReturnID', 'returnid', 'returnImportId'])
            };
          }) : [];

        const soldSerials = new Set<string>();
        const processSerials = (items: any[], action: 'add' | 'delete') => {
          items.forEach((item: any) => {
            let sns: string[] = [];
            if (Array.isArray(item.sn)) {
              sns = item.sn;
            } else if (typeof item.sn === 'string' && item.sn.trim() !== '') {
              // Handle comma-separated serials from invoices
              sns = item.sn.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            
            sns.forEach(s => {
              if (action === 'add') soldSerials.add(s);
              else soldSerials.delete(s);
            });
          });
        };

        mappedInvoices.forEach((inv: any) => processSerials(inv.items, 'add'));
        mappedReturnImports.forEach((ret: any) => processSerials(ret.items, 'add')); // Return back to supplier = remove from available
        mappedReturnSales.forEach((ret: any) => processSerials(ret.items, 'delete')); // Return from customer = add back to available

        setState(prev => ({
          ...prev,
          products: mappedProducts,
          brands: apiBrands.length > 0 ? apiBrands.map((b: any) => ({
            id: String(b.id || ''),
            name: String(b.name || '')
          })) : [],
          categories: apiCategories.length > 0 ? apiCategories.map((c: any) => ({
            id: String(c.id || ''),
            name: String(c.name || '')
          })) : [],
          customers: apiCustomers.length > 0 ? apiCustomers.map((c: any) => ({
            id: String(c.id || ''),
            name: String(c.name || ''),
            phone: padPhone(c.phone),
            phone2: padPhone(c.phone2),
            address: String(c.address || ''),
            location: String(c.location || ''),
            note: String(c.note || ''),
            createdBy: String(c.createdBy || ''),
            createdAt: String(c.createdAt || ''),
            totalSpent: parseFormattedNumber(c.totalSpent),
            debt: parseFormattedNumber(c.debt),
            image: String(c.image || '')
          })) : [],
          suppliers: apiSuppliers.length > 0 ? apiSuppliers.map((s: any) => ({
            id: String(s.id || ''),
            name: String(s.name || ''),
            phone: padPhone(s.phone),
            address: String(s.address || ''),
            totalDebt: parseFormattedNumber(s.debt)
          })) : [],
          serials: apiSerials.length > 0 ? apiSerials.map((s: any) => {
            const sn = parseSnFromDb(s.sn)?.trim() || '';
            return {
              prodId: String(s.prodId || ''),
              sn,
              supplier: String(s.supplier || ''),
              importPrice: parseFormattedNumber(s.importPrice),
              date: formatDateTime(s.createdAt || s.date),
              refId: String(s.refId || ''),
              status: soldSerials.has(sn) ? 'SOLD' : 'AVAILABLE'
            };
          }) : [],
          stockCards: apiStockCards.length > 0 ? apiStockCards.map((c: any) => {
            const snVal = parseSnFromDb(c.sn);
            return {
              ...c,
              sn: snVal ? (typeof snVal === 'string' ? snVal.split(',') : snVal) : []
            };
          }) : [],
          invoices: mappedInvoices,
          importOrders: apiImports.length > 0 ? apiImports.map((imp: any) => {
            const total = parseFormattedNumber(imp.totalAmount || imp.total || 0);
            const paid = parseFormattedNumber(imp.paidAmount || imp.paid || 0);
            // Calculate debt based on total and paid, ignore the debt field from API if it's 0 but total > paid
            let debt = total - paid;
            if (imp.debt !== undefined && imp.debt !== '' && imp.debt !== null) {
                const apiDebt = parseFormattedNumber(imp.debt);
                // Only use API debt if it makes sense (e.g., if total is 0, or if apiDebt is not 0 when total > paid)
                if (apiDebt !== 0 || total === paid) {
                    debt = apiDebt;
                }
            }
            
            return {
              id: String(imp.id || ''),
              date: formatDateTime(imp.createdAt || imp.date),
              supplier: String(imp.supplierId || imp.supplier || ''),
              status: imp.status || 'DONE',
              total,
              paid,
              debt,
              discount: parseFormattedNumber(imp.discount || 0),
              returnCost: parseFormattedNumber(imp.returnCost || 0),
              shippingFee: parseFormattedNumber(imp.shippingFee || 0),
              otherCost: parseFormattedNumber(imp.otherCost || 0),
              note: String(imp.note || ''),
              walletId: String(imp.walletId || ''),
              items: extractItems(imp, apiImportDetails, ['importID', 'importId', 'ImportID', 'importid'])
            };
          }) : [],
          returnImportOrders: mappedReturnImports,
          returnSalesOrders: mappedReturnSales,
          cashTransactions: apiCash.length > 0 ? apiCash.map((c: any) => ({
            id: String(c.id || ''),
            date: formatDateTime(c.createdAt || c.date),
            type: c.type as 'RECEIPT' | 'PAYMENT',
            amount: parseFormattedNumber(c.amount || 0),
            category: c.category as any,
            partner: String(c.partner || ''),
            note: String(c.note || ''),
            refId: String(c.referenceId || c.refId || ''),
            walletId: c.walletId ? String(c.walletId) : undefined
          })) : [],
          maintenanceRecords: apiMaintenance.length > 0 ? apiMaintenance.map((m: any) => ({
            id: String(m.id || ''),
            date: formatDateTime(m.createdAt || m.date),
            customerName: String(m.customerName || ''),
            customerPhone: padPhone(m.customerPhone),
            productName: String(m.productName || ''),
            serialNumber: String(m.serialNumber || ''),
            issue: String(m.issue || ''),
            status: m.status || 'RECEIVING',
            cost: parseFormattedNumber(m.cost || 0),
            note: String(m.note || ''),
            returnDate: String(m.returnDate || ''),
            transferId: m.transferId ? String(m.transferId) : undefined,
            feedback: String(m.feedback || ''),
            warrantyRemainingInfo: String(m.warrantyRemainingInfo || ''),
            invoiceId: m.invoiceId ? String(m.invoiceId) : undefined,
            taskId: String(m.taskId || m.taskID || m.TaskID || '')
          })) : [],
          maintenanceTransfers: apiMaintenanceTransfers && apiMaintenanceTransfers.length > 0 ? apiMaintenanceTransfers.map((t: any) => ({
            id: String(t.id || ''),
            maintenanceRecordId: String(t.maintenanceRecordId || ''),
            supplierName: String(t.supplierName || ''),
            accessories: String(t.accessories || ''),
            status: t.status || 'Đóng hàng',
            repairCost: parseFormattedNumber(t.repairCost || 0),
            shippingCost: parseFormattedNumber(t.shippingCost || t.shippingcost || 0),
            transferDate: String(t.transferDate || ''),
            returnDate: String(t.returnDate || ''),
            note: String(t.note || '')
          })) : [],
          externalSerials: apiExternalSerials && apiExternalSerials.length > 0 ? apiExternalSerials.map((e: any) => ({
            id: String(e.id || ''),
            date: String(e.date || ''),
            customer: String(e.customer || ''),
            product: String(e.product || ''),
            sn: parseSnFromDb(e.sn) || '',
            source: String(e.source || ''),
            createdBy: String(e.createdBy || ''),
            note: String(e.note || '')
          })) : [],
          users: apiUsers.length > 0 ? apiUsers : [],
          printSettings: apiSettings.length > 0 ? {
            storeName: apiSettings[0].storeName || defaultPrintSettings.storeName,
            address: apiSettings[0].address || defaultPrintSettings.address,
            phone: apiSettings[0].phone || defaultPrintSettings.phone,
            email: apiSettings[0].email || defaultPrintSettings.email,
            bankInfo: apiSettings[0].bankInfo || defaultPrintSettings.bankInfo,
            footNote: apiSettings[0].footNote || defaultPrintSettings.footNote
          } : prev.printSettings,
          tasks: apiTasks && apiTasks.length > 0 ? apiTasks.map((t: any) => ({
            id: String(t.id || ''),
            title: String(t.title || ''),
            description: String(t.description || ''),
            status: (t.status || 'TODO') as any,
            priority: (t.priority || 'MEDIUM') as any,
            dueDate: String(t.dueDate || ''),
            assignedTo: String(t.assignedTo || ''),
            createdBy: String(t.createdBy || ''),
            createdAt: String(t.createdAt || ''),
            customerId: String(t.customerId || ''),
            customerPhone: String(t.customerPhone || ''),
            customerAddress: String(t.customerAddress || ''),
            taskType: String(t.taskType || ''),
            relatedId: String(t.relatedId || ''),
            completedAt: String(t.completedAt || ''),
            purchaseId: String(t.purchaseId || ''),
            repairId: String(t.repairId || ''),
            feedback: String(t.feedback || ''),
            feedbackHistory: t.feedbackHistory ? (typeof t.feedbackHistory === 'string' ? JSON.parse(t.feedbackHistory) : t.feedbackHistory) : undefined
          })) : [],
          wifiRecords: apiWifiRecords && apiWifiRecords.length > 0 ? apiWifiRecords.map((w: any) => ({
            id: String(w.id || ''),
            customerName: String(w.customerName || ''),
            customerPhone: String(w.customerPhone || ''),
            customerAddress: String(w.customerAddress || ''),
            wifiName: String(w.wifiName || ''),
            createdAt: String(w.createdAt || ''),
            createdBy: String(w.createdBy || ''),
            note: String(w.note || '')
          })) : [],
          cameraAccounts: apiCameraAccounts && apiCameraAccounts.length > 0 ? apiCameraAccounts.map((c: any) => ({
            id: String(c.id || ''),
            customerName: String(c.customerName || ''),
            customerPhone: String(c.customerPhone || ''),
            customerAddress: String(c.customerAddress || ''),
            accountName: String(c.accountName || ''),
            cameraBrand: String(c.cameraBrand || ''),
            createdAt: String(c.createdAt || ''),
            createdBy: String(c.createdBy || ''),
            note: String(c.note || '')
          })) : [],
          cameraInstallations: apiCameraInstallations && apiCameraInstallations.length > 0 ? apiCameraInstallations.map((ci: any) => ({
            id: String(ci.id || ''),
            qrCode: String(ci.qrCode || ''),
            customerName: String(ci.customerName || ''),
            customerPhone: String(ci.customerPhone || ''),
            installationDate: String(ci.installationDate || ''),
            manufacturer: String(ci.manufacturer || ''),
            wifiId: String(ci.wifiId || ''),
            wifiName: String(ci.wifiName || ''),
            accountId: String(ci.accountId || ''),
            accountName: String(ci.accountName || ''),
            installationType: ci.installationType as any,
            details: String(ci.details || ''),
            productName: String(ci.productName || ''),
            installationImages: ci.installationImages ? (typeof ci.installationImages === 'string' ? ci.installationImages.split(',').filter(Boolean) : ci.installationImages) : [],
            createdAt: String(ci.createdAt || ''),
            createdBy: String(ci.createdBy || ''),
            note: String(ci.note || '')
          })) : [],
          telegramSettings: apiTelegramSettings && apiTelegramSettings.length > 0 ? {
            botToken: String(apiTelegramSettings[0].botToken || ''),
            chatId: String(apiTelegramSettings[0].chatId || ''),
            enabled: apiTelegramSettings[0].enabled === true || apiTelegramSettings[0].enabled === 'TRUE' || apiTelegramSettings[0].enabled === 'true'
          } : prev.telegramSettings,
          images: (apiImages || []).map((img: any) => ({
            timestamp: String(img.timestamp || img['Thời gian'] || img.time || ''),
            name: String(img.name || img['Tên'] || ''),
            id: String(img.id || img['ID'] || ''),
            url: String(img.url || img['URL'] || ''),
            fileType: String(img.fileType || img['Định dạng'] || img.format || ''),
            category: String(img.category || img['Loại'] || img.type || 'KHÁC')
          })),
          wallets: (() => {
            const tempWallets = apiWallets && apiWallets.length > 0 ? apiWallets.map((w: any) => ({
              id: String(w.id || ''),
              name: String(w.name || ''),
              type: (w.type === 'CASH' || w.type === 'BANK' || w.type === 'EWALLET') ? w.type : 'CASH',
              balance: parseFormattedNumber(w.balance || 0),
              accountNumber: w.accountNumber ? String(w.accountNumber) : undefined,
              bankName: w.bankName ? String(w.bankName) : undefined,
              ownerName: w.ownerName ? String(w.ownerName) : undefined,
              isActive: w.isActive === true || w.isActive === 'TRUE' || w.isActive === 'true' || String(w.isActive).toLowerCase() === 'true',
              icon: String(w.icon || ''),
              color: String(w.color || ''),
              backgroundImage: String(w.backgroundImage || w.background || '')
            })) : [];
            const uniqueMap = new Map();
            tempWallets.forEach((w: any) => {
              if (!uniqueMap.has(w.id)) {
                uniqueMap.set(w.id, w);
              }
            });
            return Array.from(uniqueMap.values());
          })(),
          isSyncing: false,
          lastSync: new Date().toISOString()
        }));
      } catch (error) {
        console.error("Failed to load data from Google Sheets:", error);
        setState(prev => ({ ...prev, isSyncing: false }));
      } finally {
        isSyncingRef.current = false;
        setIsLoading(false);
      }
    }, [state.products.length, state.customers.length, state.invoices.length]);

  // Fetch data from Google Sheets on mount
  useEffect(() => {
    syncData();
  }, []);

  // Polling for new invoices to support notifications
  useEffect(() => {
    if (!state.currentUser) return;

    const pollInvoices = async () => {
      try {
        const apiInvoices = await apiService.readSheet('Invoices');
        if (apiInvoices && apiInvoices.length > 0) {
          setState(prev => {
            const currentIds = new Set(prev.invoices.map(inv => inv.id));
            const newInvoicesFromApi = apiInvoices.filter((inv: any) => !currentIds.has(String(inv.id)));
            
            if (newInvoicesFromApi.length > 0) {
              // Notify about the latest new invoice
              const latest = newInvoicesFromApi[newInvoicesFromApi.length - 1];
              sendNotification(
                'Đơn hàng mới!',
                `Có ${newInvoicesFromApi.length} đơn hàng mới. Tổng: ${latest.finalAmount || latest.total || 0}đ`
              );

              // Map new invoices and add to state
              const mappedNew = newInvoicesFromApi.map((inv: any) => ({
                id: String(inv.id || ''),
                date: formatDateTime(inv.createdAt || inv.date),
                customer: String(inv.customerID || inv.customer || ''),
                phone: padPhone(inv.phone),
                address: String(inv.address || ''),
                total: parseFormattedNumber(inv.finalAmount || inv.total || 0),
                paid: parseFormattedNumber(inv.paidAmount || inv.paid || 0),
                debt: parseFormattedNumber(inv.debt || 0),
                discount: parseFormattedNumber(inv.discount || 0),
                note: String(inv.note || ''),
                taskId: String(inv.taskId || ''),
                paymentMethod: (inv.paymentMethod as any) || 'CASH',
                walletId: String(inv.walletId || ''),
                items: [] // Polling only fetches header, details would need another call
              }));

              return {
                ...prev,
                invoices: [...prev.invoices, ...mappedNew]
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Polling invoices failed:", error);
      }
    };

    const interval = setInterval(pollInvoices, 120000); // Poll every 2 minutes
    return () => clearInterval(interval);
  }, [state.currentUser, state.invoices.length]);

  const login = (user: User) => {
    setState(prev => ({ ...prev, currentUser: user }));
  };

  const logout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
  };

  const addProduct = async (product: Product) => {
    // Optimistic update
    setState(prev => ({ ...prev, products: [...(prev.products || []), product] }));

    // API Call in background
    apiService.createRecord('Products', {
      id: product.id,
      name: product.name,
      salePrice: product.price,
      costPrice: product.importPrice,
      stock: product.stock,
      hasSerial: product.hasSerial,
      isService: product.isService,
      category: product.category || '',
      unit: product.unit || '',
      brand: product.brand || '',
      warranty: product.warrantyMonths || 0,
      expectedOutOfStock: product.expectedOutOfStock || '',
      image: product.image || '',
      lowStockThreshold: product.lowStockThreshold || 0,
      status: product.status || 'Đang kinh doanh',
      createdAt: product.createdAt || ''
    }).then(result => {
      if (!result.success) {
        console.error("[AppContext] Background save failed for product:", product.id);
      }
    });
  };

  const updateProduct = async (id: string, updates: Partial<Product>, skipStockCard?: boolean) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    // Optimistic update
    setState(prev => ({
      ...prev,
      products: (prev.products || []).map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    
    // Record stock adjustment if stock changed manually and skipStockCard is not true
    if (!skipStockCard && updates.stock !== undefined && product.stock !== updates.stock) {
      const diff = Number(updates.stock) - (product.stock || 0);
      const card: StockCard = {
        prodId: id,
        type: diff > 0 ? 'NHAP' : 'XUAT',
        qty: Math.abs(diff),
        partner: 'Điều chỉnh kho',
        date: formatDateTime(new Date()),
        price: product.importPrice || 0,
        refId: 'ADJ' + Date.now().toString().slice(-6),
        sn: []
      };
      
      const cardWithId = { ...card, id: `SC${Date.now()}` };
      setState(prev => ({ ...prev, stockCards: [...(prev.stockCards || []), cardWithId] }));
      apiService.createRecord('StockCards', {
        ...cardWithId,
        productName: product.name,
        sn: ''
      });
    }
    
    // Convert updates to API format and save in background
    const apiUpdates: any = {};
    if (updates.name !== undefined) apiUpdates.name = updates.name;
    if (updates.price !== undefined) apiUpdates.salePrice = updates.price;
    if (updates.importPrice !== undefined) apiUpdates.costPrice = updates.importPrice;
    if (updates.stock !== undefined) apiUpdates.stock = updates.stock;
    if (updates.hasSerial !== undefined) apiUpdates.hasSerial = updates.hasSerial;
    if (updates.isService !== undefined) apiUpdates.isService = updates.isService;
    if (updates.category !== undefined) apiUpdates.category = updates.category;
    if (updates.unit !== undefined) apiUpdates.unit = updates.unit;
    if (updates.brand !== undefined) apiUpdates.brand = updates.brand;
    if (updates.warrantyMonths !== undefined) apiUpdates.warranty = updates.warrantyMonths;
    if (updates.expectedOutOfStock !== undefined) apiUpdates.expectedOutOfStock = updates.expectedOutOfStock;
    if (updates.lowStockThreshold !== undefined) apiUpdates.lowStockThreshold = updates.lowStockThreshold;
    if (updates.status !== undefined) apiUpdates.status = updates.status;
    if (updates.image !== undefined) apiUpdates.image = updates.image;

    apiService.updateRecord('Products', id, apiUpdates).then(result => {
      if (!result.success) {
        console.error("[AppContext] Background update failed for product:", id);
      }
    });
  };

  const updateCustomerStats = async (customerName: string) => {
    setState(prev => {
      const customer = prev.customers.find(c => c.name === customerName);
      if (!customer) return prev;

      const customerInvoices = prev.invoices.filter(inv => inv.customer === customerName);
      const customerReturns = prev.returnSalesOrders.filter(ret => ret.customer === customerName);
      
      const totalSpent = customerInvoices.reduce((sum, inv) => sum + inv.total, 0) - 
                         customerReturns.reduce((sum, ret) => sum + ret.total, 0);
      
      const debt = customerInvoices.reduce((sum, inv) => sum + inv.debt, 0) - 
                   customerReturns.reduce((sum, ret) => sum + (ret.total - ret.paid), 0);

      const updatedCustomer = { ...customer, totalSpent, debt };

      // Sync to API in background
      if (customer.id) {
        apiService.updateRecord('Customers', customer.id, { totalSpent, debt });
      }

      return {
        ...prev,
        customers: prev.customers.map(c => c.name === customerName ? updatedCustomer : c)
      };
    });
  };

  const updateSupplierStats = async (supplierName: string) => {
    setState(prev => {
      const supplier = prev.suppliers.find(s => s.name === supplierName);
      if (!supplier) return prev;

      const supplierOrders = prev.importOrders.filter(ord => ord.supplier === supplierName && ord.status !== 'DRAFT');
      const supplierReturns = prev.returnImportOrders.filter(ret => ret.supplier === supplierName);
      
      const totalBuy = supplierOrders.reduce((sum, ord) => sum + ord.total, 0) - 
                         supplierReturns.reduce((sum, ret) => sum + ret.total, 0);
      
      const debt = supplierOrders.reduce((sum, ord) => sum + (ord.debt || 0), 0) - 
                   supplierReturns.reduce((sum, ret) => sum + ((ret.total || 0) - (ret.received || 0)), 0);

      const updatedSupplier = { ...supplier, totalBuy, totalDebt: debt };

      // Sync to API in background
      if (supplier.id) {
        apiService.updateRecord('Suppliers', supplier.id, { 
          totalBuy: totalBuy || 0,
          debt: debt || 0
        });
      }

      return {
        ...prev,
        suppliers: prev.suppliers.map(s => s.name === supplierName ? updatedSupplier : s)
      };
    });
  };

  const addCustomer = (customer: Customer) => {
    const paddedPhone = padPhone(customer.phone);
    const paddedPhone2 = padPhone(customer.phone2);
    const newCustomer = { 
      ...customer, 
      phone: paddedPhone,
      phone2: paddedPhone2,
      id: customer.id || generateId('KH', state.customers || []),
      createdAt: customer.createdAt || formatDateTime(new Date()),
      createdBy: customer.createdBy || state.currentUser?.name || 'Admin'
    };
    setState(prev => ({ ...prev, customers: [...(prev.customers || []), newCustomer] }));
    
    // API Call in background
    apiService.createRecord('Customers', {
      id: newCustomer.id,
      name: newCustomer.name,
      phone: paddedPhone ? `'${paddedPhone}` : '',
      phone2: paddedPhone2 ? `'${paddedPhone2}` : '',
      address: newCustomer.address || '',
      location: newCustomer.location || '',
      note: newCustomer.note || '',
      image: newCustomer.image || '',
      createdBy: newCustomer.createdBy,
      createdAt: newCustomer.createdAt,
      totalSpent: 0,
      debt: 0
    });

    return newCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const apiUpdates: any = { ...updates };
    if (updates.phone !== undefined) {
      const paddedPhone = padPhone(updates.phone);
      apiUpdates.phone = paddedPhone ? `'${paddedPhone}` : '';
      updates.phone = paddedPhone;
    }
    if (updates.phone2 !== undefined) {
      const paddedPhone2 = padPhone(updates.phone2);
      apiUpdates.phone2 = paddedPhone2 ? `'${paddedPhone2}` : '';
      updates.phone2 = paddedPhone2;
    }
    
    setState(prev => ({
      ...prev,
      customers: (prev.customers || []).map(c => c.id === id ? { ...c, ...updates } : c)
    }));
    await apiService.updateRecord('Customers', id, apiUpdates);
  };

  const addSupplier = async (supplier: Supplier) => {
    const paddedPhone = padPhone(supplier.phone);
    const newSupplier = { ...supplier, phone: paddedPhone, id: supplier.id || generateId('NCC', state.suppliers || []) };
    setState(prev => ({ ...prev, suppliers: [...(prev.suppliers || []), newSupplier] }));
    await apiService.createRecord('Suppliers', {
      id: newSupplier.id,
      name: newSupplier.name,
      phone: paddedPhone ? `'${paddedPhone}` : paddedPhone,
      address: newSupplier.address || '',
      totalBuy: 0,
      debt: 0,
      createdAt: new Date().toISOString()
    });
  };

  const addInvoice = async (invoice: Invoice) => {
    // Check if this is an update or a new invoice
    const existingInvoice = state.invoices.find(inv => inv.id === invoice.id);
    const isUpdate = !!existingInvoice;

    // Find current customer to get old debt
    const customer = state.customers.find(c => c.name === invoice.customer);
    const oldDebt = customer?.debt || 0;
    const totalDebt = oldDebt + invoice.debt;

    const newInvoice = {
      ...invoice,
      id: invoice.id || generateId('HDN', state.invoices || []),
      oldDebt: isUpdate ? (existingInvoice.oldDebt || 0) : oldDebt,
      totalDebt: isUpdate ? (existingInvoice.oldDebt || 0) + invoice.debt : totalDebt
    };

    // Optimistic update
    setState(prev => {
      const soldSns = new Set<string>();
      newInvoice.items.forEach(item => {
        if (item.sn && typeof item.sn === 'string') {
          item.sn.split(',').forEach(s => soldSns.add(s.trim()));
        }
      });
      
      const oldSns = new Set<string>();
      if (isUpdate && existingInvoice) {
        existingInvoice.items.forEach(item => {
          if (item.sn && typeof item.sn === 'string') {
            item.sn.split(',').forEach(s => oldSns.add(s.trim()));
          }
        });
      }
      
      const newStockCards: StockCard[] = newInvoice.items.map((item, i) => ({
        id: `SC_${newInvoice.id}_${i}`,
        prodId: item.id,
        type: 'XUAT',
        qty: item.qty,
        partner: newInvoice.customer,
        date: newInvoice.date,
        price: item.price,
        refId: newInvoice.id,
        sn: item.sn ? item.sn.split(',').map(s => s.trim()) : []
      }));

      // Find original cash/wallet transaction to modify if needed
      let updatedCashTransactions = prev.cashTransactions || [];
      const txToUpdate = isUpdate ? updatedCashTransactions.find(t => t.refId === newInvoice.id && t.category === 'SALES_REVENUE') : null;
      if (txToUpdate) {
        updatedCashTransactions = updatedCashTransactions.map(t => 
          t.id === txToUpdate.id ? { ...t, amount: newInvoice.paid } : t
        );
      }

      // Update products stock in state
      const updatedProducts = (prev.products || []).map(p => {
        let newStock = p.stock || 0;
        
        // 1. Revert old stock if update
        if (isUpdate && !p.isService && existingInvoice) {
          const oldItem = existingInvoice.items.find(i => i.id === p.id);
          if (oldItem) newStock += oldItem.qty;
        }
        
        // 2. Subtract new stock
        const newItem = newInvoice.items.find(i => i.id === p.id);
        if (newItem && !p.isService) {
          newStock -= newItem.qty;
        }
        
        return { ...p, stock: newStock };
      });

      // Filter out old invoice if updating
      const otherInvoices = isUpdate 
        ? prev.invoices.filter(inv => inv.id !== newInvoice.id)
        : (prev.invoices || []);

      return { 
        ...prev, 
        invoices: [...otherInvoices, newInvoice],
        serials: (prev.serials || []).map(s => {
          if (soldSns.has(s.sn)) return { ...s, status: 'SOLD' };
          if (isUpdate && oldSns.has(s.sn)) return { ...s, status: 'AVAILABLE' };
          return s;
        }),
        stockCards: [...prev.stockCards.filter(sc => sc.refId !== newInvoice.id), ...newStockCards],
        products: updatedProducts,
        cashTransactions: updatedCashTransactions
      };
    });
    
    // Background sync
    (async () => {
      try {
        const syncData = {
          id: newInvoice.id,
          createdAt: newInvoice.date,
          customerID: newInvoice.customer,
          phone: (newInvoice.phone || '').startsWith('0') ? `'${newInvoice.phone}` : (newInvoice.phone || ''),
          address: newInvoice.address || '',
          totalAmount: newInvoice.total + (newInvoice.discount || 0),
          totalQuantity: newInvoice.items.reduce((sum, item) => sum + item.qty, 0),
          itemCount: newInvoice.items.length,
          discount: newInvoice.discount || 0,
          finalAmount: newInvoice.total,
          paidAmount: newInvoice.paid,
          debt: newInvoice.debt,
          oldDebt: newInvoice.oldDebt,
          totalDebt: newInvoice.totalDebt,
          taskId: newInvoice.taskId || '',
          paymentMethod: newInvoice.paymentMethod || 'CASH',
          walletId: newInvoice.walletId || '',
          walletName: newInvoice.walletId ? state.wallets.find(w => w.id === newInvoice.walletId)?.name || '' : '',
          status: newInvoice.debt > 0 ? 'Còn nợ' : 'Hoàn tất',
          note: newInvoice.note || '',
          items: JSON.stringify(newInvoice.items)
        };

        if (isUpdate) {
          await apiService.updateRecord('Invoices', newInvoice.id, syncData);
          
          // Also update CashLedger/Wallet if they exist
          const cashTx = state.cashTransactions.find(t => t.refId === newInvoice.id && t.category === 'SALES_REVENUE');
          if (cashTx) {
            await apiService.updateRecord('CashLedger', cashTx.id, { amount: newInvoice.paid });
          }
        } else {
          await apiService.createRecord('Invoices', syncData);
        }

        // Handle Details and Stock updates
        // To prevent "new lines" on update, we update existing ones.
        const maxItems = Math.max(newInvoice.items.length, isUpdate ? existingInvoice.items.length : 0);
        
        const detailPromises = [];
        for (let i = 0; i < maxItems; i++) {
          const newItem = newInvoice.items[i];
          const oldItem = isUpdate ? existingInvoice.items[i] : null;
          const detailId = `${newInvoice.id}_${i}`;
          const scId = `SC_${newInvoice.id}_${i}`;

          if (newItem) {
            // Upsert detail
            const detailData = {
              id: detailId,
              invoiceID: newInvoice.id,
              productId: newItem.id,
              productName: newItem.name,
              quantity: newItem.qty,
              quan: newItem.qty,
              price: newItem.price,
              subTotal: newItem.qty * newItem.price,
              sn: formatSnForDb(newItem.sn),
              warrantyExpiry: newItem.warrantyExpiry || ''
            };
            
            // Stock card data
            const stockCardData = {
              id: scId,
              prodId: newItem.id,
              productName: newItem.name,
              type: 'XUAT',
              qty: newItem.qty,
              partner: newInvoice.customer,
              date: newInvoice.date,
              price: newItem.price,
              refId: newInvoice.id,
              sn: formatSnForDb(newItem.sn)
            };
            
            if (isUpdate && i < existingInvoice.items.length) {
              detailPromises.push(apiService.updateRecord('InvoiceDetails', detailId, detailData));
              detailPromises.push(apiService.updateRecord('StockCards', scId, stockCardData));
            } else {
              detailPromises.push(apiService.createRecord('InvoiceDetails', detailData));
              detailPromises.push(apiService.createRecord('StockCards', stockCardData));
            }

            // Sync product stock to DB
            const p = state.products.find(prod => prod.id === newItem.id);
            if (p && !p.isService) {
              const adjustedStock = p.stock + (isUpdate && existingInvoice ? (existingInvoice.items.find(old => old.id === p.id)?.qty || 0) : 0) - newItem.qty;
              detailPromises.push(apiService.updateRecord('Products', newItem.id, { stock: adjustedStock }));
            }
          } else if (isUpdate && oldItem) {
            // Item removed in edit: Delete detail row
            detailPromises.push(apiService.deleteRecord('InvoiceDetails', detailId));
            detailPromises.push(apiService.deleteRecord('StockCards', scId));
            
            // Revert stock in DB for removed item
            const p = state.products.find(prod => prod.id === oldItem.id);
            if (p && !p.isService) {
              detailPromises.push(apiService.updateRecord('Products', p.id, { stock: p.stock + oldItem.qty }));
            }
          }
        }
        
        await Promise.all(detailPromises);
      } catch (error) {
        console.error("Failed to sync invoice to cloud:", error);
      }
    })();

    updateCustomerStats(newInvoice.customer);
    return newInvoice;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const currentInvoice = state.invoices?.find(inv => inv.id === id);
    let calculatedDebt: number | undefined;

    if (currentInvoice) {
      const newTotal = updates.total !== undefined ? updates.total : currentInvoice.total;
      const newPaid = updates.paid !== undefined ? updates.paid : currentInvoice.paid;
      calculatedDebt = newTotal - newPaid;
    }

    setState(prev => {
      const invoices = prev.invoices || [];
      return {
        ...prev,
        invoices: invoices.map(inv => {
          if (inv.id === id) {
            const newDebt = calculatedDebt !== undefined ? calculatedDebt : inv.debt;
            return { ...inv, ...updates, debt: newDebt };
          }
          return inv;
        })
      };
    });
    
    // Map updates to sheet headers
    const apiUpdates: any = {};
    if (updates.date) apiUpdates.createdAt = updates.date;
    if (updates.customer) apiUpdates.customerID = updates.customer;
    if (updates.phone) {
      apiUpdates.phone = updates.phone.startsWith('0') ? `'${updates.phone}` : updates.phone;
    }
    if (updates.address) apiUpdates.address = updates.address;
    if (updates.total !== undefined) apiUpdates.finalAmount = updates.total;
    if (updates.paid !== undefined) apiUpdates.paidAmount = updates.paid;
    if (updates.discount !== undefined) apiUpdates.discount = updates.discount;
    if (updates.note !== undefined) apiUpdates.note = updates.note;
    if (updates.taskId !== undefined) apiUpdates.taskId = updates.taskId;
    if (updates.paymentMethod !== undefined) apiUpdates.paymentMethod = updates.paymentMethod;
    if (updates.walletId !== undefined) {
      apiUpdates.walletId = updates.walletId;
      const walletObj = state.wallets.find(w => w.id === updates.walletId);
      apiUpdates.walletName = walletObj ? walletObj.name : '';
    }

    if (calculatedDebt !== undefined) {
      apiUpdates.debt = calculatedDebt;
      apiUpdates.status = calculatedDebt > 0 ? 'Còn nợ' : 'Hoàn tất';
    } else if (updates.debt !== undefined) {
      apiUpdates.debt = updates.debt;
      apiUpdates.status = updates.debt > 0 ? 'Còn nợ' : 'Hoàn tất';
    }

    await apiService.updateRecord('Invoices', id, apiUpdates);
    if (currentInvoice) {
      updateCustomerStats(currentInvoice.customer);
    }
  };

  const deleteInvoice = async (id: string) => {
    const invoice = state.invoices.find(inv => inv.id === id);
    if (!invoice) return;

    // 1. Revert Stock and Serials
    const soldSns = new Set<string>();
    invoice.items.forEach(item => {
      if (item.sn && typeof item.sn === 'string') {
        item.sn.split(',').forEach(s => soldSns.add(s.trim()));
      }
    });

    setState(prev => ({
      ...prev,
      invoices: prev.invoices.filter(inv => inv.id !== id),
      serials: prev.serials.map(s => soldSns.has(s.sn) ? { ...s, status: 'AVAILABLE' } : s),
      stockCards: prev.stockCards.filter(sc => sc.refId !== id),
      products: prev.products.map(p => {
        const item = invoice.items.find(i => i.id === p.id);
        if (item && !p.isService) {
          return { ...p, stock: (p.stock || 0) + item.qty };
        }
        return p;
      })
    }));

    // 2. Sync to API
    (async () => {
      try {
        await apiService.deleteRecord('Invoices', id);
        
        // Parallelize product updates for performance
        const stockPromises = invoice.items.map(async (item) => {
          const prod = state.products.find(p => p.id === item.id);
          if (prod && !prod.isService) {
            return apiService.updateRecord('Products', prod.id, { stock: (prod.stock || 0) + item.qty });
          }
        });
        await Promise.all(stockPromises);
        
        // Also clean up StockCards in API if possible by refId (assuming deleteRecord support or similar)
      } catch (e) {
        console.error("Failed to delete invoice from API", e);
      }
    })();

    updateCustomerStats(invoice.customer);
  };

  const addImportOrder = async (order: ImportOrder) => {
    const existingOrder = state.importOrders?.find(o => o.id === order.id);
    const isUpdate = !!existingOrder;

    const newOrder = {
      ...order,
      id: order.id || generateId('NHN', state.importOrders || [])
    };

    const newStockCards: StockCard[] = newOrder.items.map((item, i) => ({
      id: `SC_${newOrder.id}_${i}`,
      prodId: item.id,
      type: 'NHAP',
      qty: item.qty,
      partner: newOrder.supplier,
      date: newOrder.date,
      price: item.price,
      refId: newOrder.id,
      sn: item.sn || []
    }));

    setState(prev => {
      const otherOrders = isUpdate 
        ? (prev.importOrders || []).filter(o => o.id !== newOrder.id)
        : (prev.importOrders || []);

      let updatedCashTransactions = prev.cashTransactions || [];
      const txToUpdate = isUpdate ? updatedCashTransactions.find(t => t.refId === newOrder.id && t.category === 'IMPORT_PAYMENT') : null;
      if (txToUpdate) {
        updatedCashTransactions = updatedCashTransactions.map(t => 
          t.id === txToUpdate.id ? { ...t, amount: newOrder.paid, walletId: newOrder.walletId } : t
        );
      }
        
      const updatedProducts = (prev.products || []).map(p => {
        let newStock = p.stock || 0;
        
        // Reverse old stock if update
        if (isUpdate && existingOrder && !p.isService) {
          const oldItem = existingOrder.items.find(i => i.id === p.id);
          if (oldItem) newStock -= oldItem.qty; // Reverse the previous import meaning we subtract the previously added amount
        }
        
        // Apply new stock
        const newItem = newOrder.items.find(i => i.id === p.id);
        if (newItem && !p.isService) {
          newStock += newItem.qty;
        }
        
        return { ...p, stock: newStock, importPrice: newItem ? newItem.price : p.importPrice };
      });
        
      return { 
        ...prev, 
        importOrders: [...otherOrders, newOrder],
        stockCards: [...(prev.stockCards || []).filter(sc => sc.refId !== newOrder.id), ...newStockCards],
        products: updatedProducts,
        cashTransactions: updatedCashTransactions
      };
    });
    
    (async () => {
      try {
        const walletObj = state.wallets.find(w => w.id === newOrder.walletId);
        
        const syncData = {
          id: newOrder.id,
          createdAt: newOrder.date,
          supplierId: newOrder.supplier,
          totalAmount: newOrder.total,
          totalQuantity: newOrder.items.reduce((sum, item) => sum + item.qty, 0),
          itemCount: newOrder.items.length,
          discount: newOrder.discount || 0,
          returnCost: newOrder.returnCost || 0,
          shippingFee: newOrder.shippingFee || 0,
          otherCost: newOrder.otherCost || 0,
          paidAmount: newOrder.paid,
          debt: newOrder.debt,
          status: newOrder.status,
          note: newOrder.note || '',
          walletId: newOrder.walletId || '',
          walletName: walletObj ? walletObj.name : '',
          items: JSON.stringify(newOrder.items)
        };

        if (isUpdate) {
          await apiService.updateRecord('Imports', newOrder.id, syncData);
          
          const cashTx = state.cashTransactions.find(t => t.refId === newOrder.id && t.category === 'IMPORT_PAYMENT');
          if (cashTx) {
            await apiService.updateRecord('CashLedger', cashTx.id, { amount: newOrder.paid, walletId: newOrder.walletId || '' });
          }
        } else {
          await apiService.createRecord('Imports', syncData);
        }

        const maxItems = Math.max(newOrder.items.length, isUpdate && existingOrder ? existingOrder.items.length : 0);

        const detailPromises = [];
        for (let i = 0; i < maxItems; i++) {
          const newItem = newOrder.items[i];
          const oldItem = isUpdate && existingOrder ? existingOrder.items[i] : null;
          const detailId = `${newOrder.id}_${i}`;
          const scId = `SC_${newOrder.id}_${i}`;

          if (newItem) {
            const detailData = {
              id: detailId,
              importID: newOrder.id,
              productId: newItem.id,
              productName: newItem.name,
              quantity: newItem.qty,
              quan: newItem.qty,
              price: newItem.price,
              subTotal: newItem.qty * newItem.price,
              sn: formatSnForDb(newItem.sn)
            };
            
            const stockCardData = {
              id: scId,
              prodId: newItem.id,
              productName: newItem.name,
              type: 'NHAP',
              qty: newItem.qty,
              partner: newOrder.supplier,
              date: newOrder.date,
              price: newItem.price,
              refId: newOrder.id,
              sn: formatSnForDb(newItem.sn)
            };

            if (isUpdate && i < (existingOrder?.items.length || 0)) {
              detailPromises.push(apiService.updateRecord('ImportDetails', detailId, detailData));
              detailPromises.push(apiService.updateRecord('StockCards', scId, stockCardData));
            } else {
              detailPromises.push(apiService.createRecord('ImportDetails', detailData));
              detailPromises.push(apiService.createRecord('StockCards', stockCardData));
            }

            const p = state.products.find(prod => prod.id === newItem.id);
            if (p && !p.isService) {
              detailPromises.push(apiService.updateRecord('Products', newItem.id, { 
                stock: p.stock - (existingOrder?.items.find(old => old.id === p.id)?.qty || 0) + newItem.qty, // Estimate new stock or we can ignore perfect async match and use the computed state later, but let's carefully compute it
                costPrice: newItem.price
              }));
            }
          } else if (isUpdate && oldItem) {
            detailPromises.push(apiService.deleteRecord('ImportDetails', detailId));
            detailPromises.push(apiService.deleteRecord('StockCards', scId));
            
            const p = state.products.find(prod => prod.id === oldItem.id);
            if (p && !p.isService) {
              detailPromises.push(apiService.updateRecord('Products', p.id, { 
                stock: p.stock - oldItem.qty 
              }));
            }
          }
        }
        await Promise.all(detailPromises);
      } catch (error) {
        console.error("Failed to sync import to cloud:", error);
      }
    })();
    updateSupplierStats(newOrder.supplier);
  };

  const updateImportOrder = async (id: string, updates: Partial<ImportOrder>) => {
    const currentOrder = state.importOrders?.find(o => o.id === id);
    let calculatedDebt: number | undefined;

    if (currentOrder) {
      const newTotal = updates.total !== undefined ? updates.total : currentOrder.total;
      const newPaid = updates.paid !== undefined ? updates.paid : currentOrder.paid;
      calculatedDebt = newTotal - newPaid;
    }

    setState(prev => {
      return {
        ...prev,
        importOrders: (prev.importOrders || []).map(o => {
          if (o.id === id) {
            const newDebt = calculatedDebt !== undefined ? calculatedDebt : o.debt;
            return { ...o, ...updates, debt: newDebt, status: newDebt > 0 ? 'Còn nợ' : 'Hoàn tất' };
          }
          return o;
        })
      };
    });
    
    const apiUpdates: any = {};
    if (updates.date) apiUpdates.createdAt = updates.date;
    if (updates.supplier) apiUpdates.supplierId = updates.supplier;
    if (updates.total !== undefined) apiUpdates.totalAmount = updates.total;
    if (updates.paid !== undefined) apiUpdates.paidAmount = updates.paid;
    if (updates.discount !== undefined) apiUpdates.discount = updates.discount;
    if (updates.returnCost !== undefined) apiUpdates.returnCost = updates.returnCost;
    if (updates.shippingFee !== undefined) apiUpdates.shippingFee = updates.shippingFee;
    if (updates.otherCost !== undefined) apiUpdates.otherCost = updates.otherCost;
    if (updates.note !== undefined) apiUpdates.note = updates.note;

    if (calculatedDebt !== undefined) {
      apiUpdates.debt = calculatedDebt;
      apiUpdates.status = calculatedDebt > 0 ? 'Còn nợ' : 'Hoàn tất';
    } else if (updates.debt !== undefined) {
      apiUpdates.debt = updates.debt;
      apiUpdates.status = updates.debt > 0 ? 'Còn nợ' : 'Hoàn tất';
    } else if (updates.status !== undefined) {
      apiUpdates.status = updates.status;
    }
    
    if (updates.walletId !== undefined) {
      apiUpdates.walletId = updates.walletId;
      const walletObj = state.wallets.find(w => w.id === updates.walletId);
      apiUpdates.walletName = walletObj ? walletObj.name : '';
    }
    
    await apiService.updateRecord('Imports', id, apiUpdates);

    if (currentOrder) {
      updateSupplierStats(currentOrder.supplier);
    }
  };

  const addReturnImportOrder = async (order: ReturnImportOrder) => {
    setState(prev => {
      const returnedSns = new Set<string>();
      order.items.forEach(item => {
        if (item.sn) {
          item.sn.forEach(s => returnedSns.add(s.trim()));
        }
      });
      
      const newStockCards: StockCard[] = order.items.map(item => ({
        prodId: item.id,
        type: 'TRA_NHAP',
        qty: item.qty,
        partner: order.supplier,
        date: order.date,
        price: item.price,
        refId: order.id,
        sn: item.sn || []
      }));

      return { 
        ...prev, 
        returnImportOrders: [...(prev.returnImportOrders || []), order],
        serials: (prev.serials || []).map(s => returnedSns.has(s.sn) ? { ...s, status: 'SOLD' } : s),
        stockCards: [...(prev.stockCards || []), ...newStockCards]
      };
    });
    
    (async () => {
      try {
        await apiService.createRecord('ReturnImports', {
          id: order.id,
          createdAt: order.date,
          date: order.date, // Fallback
          supplierId: order.supplier,
          totalGoods: order.totalGoods,
          discount: order.discount,
          totalAmount: order.total,
          totalRefund: order.total, // Match user's sheet
          receivedAmount: order.received,
          status: order.status,
          note: order.note || '',
          items: JSON.stringify(order.items)
        });

        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          await apiService.createRecord('ReturnImportDetails', {
            id: `${order.id}_${i}`,
            returnID: order.id,
            returnImportId: order.id, // Match user's sheet
            productId: item.id,
            quantity: item.qty,
            quan: item.qty,
            price: item.price,
            subTotal: item.qty * item.price,
            sn: formatSnForDb(item.sn)
          });

          await apiService.createRecord('StockCards', {
            id: `SC${Date.now()}${i}`,
            prodId: item.id,
            type: 'TRA_NHAP',
            qty: item.qty,
            partner: order.supplier,
            date: order.date,
            price: item.price,
            refId: order.id,
            sn: formatSnForDb(item.sn)
          });
        }
      } catch (error) {
        console.error("Failed to sync return import to cloud:", error);
      }
    })();
    updateSupplierStats(order.supplier);
  };

  const addReturnSalesOrder = async (order: ReturnSalesOrder) => {
    setState(prev => {
      const returnedSns = new Set<string>();
      order.items.forEach(item => {
        if (item.sn && typeof item.sn === 'string') {
          item.sn.split(',').forEach(s => returnedSns.add(s.trim()));
        }
      });
      
      const newStockCards: StockCard[] = order.items.map(item => ({
        prodId: item.id,
        type: 'TRA_BAN',
        qty: item.qty,
        partner: order.customer,
        date: order.date,
        price: item.price,
        refId: order.id,
        sn: item.sn ? item.sn.split(',').map(s => s.trim()) : []
      }));

      return { 
        ...prev, 
        returnSalesOrders: [...(prev.returnSalesOrders || []), order],
        serials: (prev.serials || []).map(s => returnedSns.has(s.sn) ? { ...s, status: 'AVAILABLE' } : s),
        stockCards: [...(prev.stockCards || []), ...newStockCards]
      };
    });
    
    (async () => {
      try {
        await apiService.createRecord('ReturnSales', {
          id: order.id,
          createdAt: order.date,
          date: order.date, // Fallback
          customerID: order.customer,
          totalGoods: order.totalGoods,
          discount: order.discount,
          totalAmount: order.total,
          totalRefund: order.total, // Fallback
          paidAmount: order.paid,
          status: order.status,
          note: order.note || '',
          items: JSON.stringify(order.items)
        });

        for (let i = 0; i < order.items.length; i++) {
          const item = order.items[i];
          await apiService.createRecord('ReturnSalesDetails', {
            id: `${order.id}_${i}`,
            returnID: order.id,
            returnSalesId: order.id, // Fallback
            productId: item.id,
            quantity: item.qty,
            quan: item.qty,
            price: item.price,
            subTotal: item.qty * item.price,
            sn: formatSnForDb(item.sn)
          });

          await apiService.createRecord('StockCards', {
            id: `SC${Date.now()}${i}`,
            prodId: item.id,
            type: 'TRA_BAN',
            qty: item.qty,
            partner: order.customer,
            date: order.date,
            price: item.price,
            refId: order.id,
            sn: formatSnForDb(item.sn)
          });
        }
      } catch (error) {
        console.error("Failed to sync return sales to cloud:", error);
      }
    })();

    updateCustomerStats(order.customer);
  };

  const addStockCard = async (card: StockCard) => {
    const cardWithId = { ...card, id: `SC${Date.now()}${Math.floor(Math.random() * 1000)}` };
    setState(prev => ({ ...prev, stockCards: [...(prev.stockCards || []), cardWithId] }));
    await apiService.createRecord('StockCards', {
      ...cardWithId,
      sn: formatSnForDb(card.sn)
    });
  };

  const addSerial = async (serial: Serial) => {
    setState(prev => ({ ...prev, serials: [...(prev.serials || []), serial] }));
    const formattedSn = formatSnForDb(serial.sn);
    await apiService.createRecord('Serials', { ...serial, sn: formattedSn, id: formattedSn });
  };

  const removeSerial = async (sn: string) => {
    setState(prev => ({ ...prev, serials: (prev.serials || []).filter(s => s.sn !== sn) }));
    // Note: deleteRecord usually needs an ID, but Serials might not have a unique ID other than SN
    // For now, we'll just update local state or assume SN is the ID if the API supports it
    await apiService.deleteRecord('Serials', sn);
  };

  const addCashTransaction = async (transaction: CashTransaction) => {
    setState(prev => ({ ...prev, cashTransactions: [...(prev.cashTransactions || []), transaction] }));
    await apiService.createRecord('CashLedger', { 
      id: transaction.id || `CT${Date.now()}`,
      createdAt: transaction.date,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      referenceId: transaction.refId || '',
      partner: transaction.partner || '',
      note: transaction.note || '',
      walletId: transaction.walletId || ''
    });

    if (transaction.walletId) {
      setState(prev => {
        const updatedWallets = (prev.wallets || []).map(w => {
          if (w.id === transaction.walletId) {
            const newBalance = transaction.type === 'RECEIPT' ? w.balance + transaction.amount : w.balance - transaction.amount;
            return { ...w, balance: newBalance };
          }
          return w;
        });
        return { ...prev, wallets: updatedWallets };
      });

      const wallet = state.wallets.find(w => w.id === transaction.walletId);
      if (wallet) {
        const newBalance = transaction.type === 'RECEIPT' ? wallet.balance + transaction.amount : wallet.balance - transaction.amount;
        await apiService.updateRecord('Wallets', wallet.id, { balance: newBalance });
      }
    }

    if (transaction.category === 'DEBT_COLLECTION' && transaction.partner) {
      updateCustomerStats(transaction.partner);
    }
  };

  const setPOSDraft = React.useCallback((draft: POSDraft) => {
    setState(prev => ({ ...prev, posDraft: draft }));
  }, []);

  const setImportDraft = React.useCallback((draft: ImportDraft | undefined | null) => {
    setState(prev => ({ ...prev, importDraft: draft || undefined }));
  }, []);

  const addMaintenanceRecord = async (record: MaintenanceRecord) => {
    setState(prev => ({ ...prev, maintenanceRecords: [...(prev.maintenanceRecords || []), record] }));
    
    apiService.createRecord('Maintenance', {
      id: record.id,
      createdAt: record.date,
      customerName: record.customerName,
      customerPhone: record.customerPhone?.startsWith('0') ? `'${record.customerPhone}` : record.customerPhone,
      productName: record.productName,
      serialNumber: record.serialNumber || '',
      issue: record.issue,
      status: record.status,
      cost: record.cost,
      note: record.note,
      returnDate: record.returnDate || '',
      feedback: record.feedback || '',
      warrantyRemainingInfo: record.warrantyRemainingInfo || '',
      invoiceId: record.invoiceId || '',
      taskId: record.taskId || ''
    });
  };

  const updateMaintenanceRecord = async (id: string, updates: Partial<MaintenanceRecord>) => {
    setState(prev => ({
      ...prev,
      maintenanceRecords: (prev.maintenanceRecords || []).map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    
    const apiUpdates: any = {};
    if (updates.date) apiUpdates.createdAt = updates.date;
    if (updates.customerName) apiUpdates.customerName = updates.customerName;
    if (updates.customerPhone) {
      apiUpdates.customerPhone = updates.customerPhone.startsWith('0') ? `'${updates.customerPhone}` : updates.customerPhone;
    }
    if (updates.productName) apiUpdates.productName = updates.productName;
    if (updates.serialNumber !== undefined) apiUpdates.serialNumber = updates.serialNumber;
    if (updates.issue) apiUpdates.issue = updates.issue;
    if (updates.status) apiUpdates.status = updates.status;
    if (updates.cost !== undefined) apiUpdates.cost = updates.cost;
    if (updates.note !== undefined) apiUpdates.note = updates.note;
    if (updates.returnDate !== undefined) apiUpdates.returnDate = updates.returnDate;
    if (updates.transferId !== undefined) apiUpdates.transferId = updates.transferId;
    if (updates.feedback !== undefined) apiUpdates.feedback = updates.feedback;
    if (updates.warrantyRemainingInfo !== undefined) apiUpdates.warrantyRemainingInfo = updates.warrantyRemainingInfo;
    if (updates.invoiceId !== undefined) apiUpdates.invoiceId = updates.invoiceId;
    if (updates.taskId !== undefined) apiUpdates.taskId = updates.taskId;

    apiService.updateRecord('Maintenance', id, apiUpdates);
  };

  const addMaintenanceTransfer = async (transfer: MaintenanceTransfer) => {
    setState(prev => ({ ...prev, maintenanceTransfers: [...(prev.maintenanceTransfers || []), transfer] }));
    await apiService.createRecord('MaintenanceTransfers', transfer);
  };

  const updateMaintenanceTransfer = async (id: string, updates: Partial<MaintenanceTransfer>) => {
    setState(prev => ({
      ...prev,
      maintenanceTransfers: (prev.maintenanceTransfers || []).map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    await apiService.updateRecord('MaintenanceTransfers', id, updates);
  };

  const addExternalSerial = async (serial: ExternalSerial) => {
    setState(prev => ({ ...prev, externalSerials: [...(prev.externalSerials || []), serial] }));
    const formattedSn = formatSnForDb(serial.sn);
    await apiService.createRecord('ExternalSerials', {
      id: serial.id,
      date: serial.date,
      product: serial.product,
      sn: formattedSn,
      customer: serial.customer || '',
      source: serial.source || '',
      createdBy: serial.createdBy || '',
      note: (serial as any).note || ''
    });
  };

  const updateExternalSerial = async (id: string, updates: Partial<ExternalSerial>) => {
    setState(prev => ({
      ...prev,
      externalSerials: (prev.externalSerials || []).map(s => s.id === id ? { ...s, ...updates } : s)
    }));
    await apiService.updateRecord('ExternalSerials', id, {
      ...updates,
      sn: updates.sn !== undefined ? formatSnForDb(updates.sn) : undefined
    });
  };

  const deleteExternalSerial = async (id: string) => {
    setState(prev => ({
      ...prev,
      externalSerials: (prev.externalSerials || []).filter(s => s.id !== id)
    }));
    await apiService.deleteRecord('ExternalSerials', id);
  };

  const addTask = async (task: Task) => {
    const newTask = {
      ...task,
      id: task.id || generateId('CV', state.tasks || [])
    };
    setState(prev => ({ ...prev, tasks: [...(prev.tasks || []), newTask] }));
    await apiService.createRecord('Tasks', newTask);

    // Telegram Notification
    if (state.telegramSettings.enabled && state.telegramSettings.botToken && state.telegramSettings.chatId) {
      const priorityEmoji = {
        'LOW': '🟢',
        'MEDIUM': '🟡',
        'HIGH': '🟠',
        'CRITICAL': '🔴'
      }[newTask.priority] || '📝';

      const message = `
🚀 <b>CÔNG VIỆC MỚI</b>
━━━━━━━━━━━━━
<b>Tiêu đề:</b> ${newTask.title}
<b>Mô tả:</b> ${newTask.description}
<b>Khách hàng:</b> ${state.customers.find(c => c.id === newTask.customerId)?.name || '---'}
<b>Ưu tiên:</b> ${priorityEmoji} ${newTask.priority}
<b>Hạn chót:</b> ${newTask.dueDate || '---'}
<b>Giao cho:</b> ${newTask.assignedTo || '---'}
<b>Người tạo:</b> ${newTask.createdBy}
`;
      sendTelegramMessage(state.telegramSettings.botToken, state.telegramSettings.chatId, message);
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!updates) return;
    const existingTask = state.tasks.find(t => t.id === id);
    
    setState(prev => ({
      ...prev,
      tasks: (prev.tasks || []).map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    await apiService.updateRecord('Tasks', id, updates);

    // Telegram Notification on status change or order added
    const statusChanged = updates.status && existingTask && existingTask.status !== updates.status;
    const orderAdded = (updates.purchaseId && existingTask && existingTask.purchaseId !== updates.purchaseId) ||
                       (updates.relatedId && existingTask && existingTask.relatedId !== updates.relatedId) ||
                       (updates.repairId && existingTask && existingTask.repairId !== updates.repairId);

    if (statusChanged || orderAdded) {
      if (state.telegramSettings.enabled && state.telegramSettings.botToken && state.telegramSettings.chatId) {
        const priorityEmoji = {
          'LOW': '🟢',
          'MEDIUM': '🟡',
          'HIGH': '🟠',
          'CRITICAL': '🔴'
        }[existingTask?.priority || 'MEDIUM'] || '📝';
        
        const statusMap: any = {
          'TODO': 'Mới',
          'IN_PROGRESS': 'Đang làm',
          'COMPLETED': 'Hoàn thành',
          'CANCELLED': 'Đã hủy'
        };
        
        const currentStatus = updates.status || existingTask?.status || 'TODO';
        const statusStr = statusMap[currentStatus] || currentStatus;

        let actionText = "🔄 <b>CẬP NHẬT CÔNG VIỆC</b>";
        if (statusChanged && orderAdded) actionText = "✅ <b>HOÀN THÀNH & TẠO ĐƠN HÀNG</b>";
        else if (statusChanged) actionText = "🔄 <b>CẬP NHẬT TRẠNG THÁI</b>";
        else if (orderAdded) actionText = "🛒 <b>THÊM ĐƠN HÀNG VÀO CÔNG VIỆC</b>";

        const message = `
${actionText}
━━━━━━━━━━━━━
<b>Tiêu đề:</b> ${existingTask?.title}
<b>Khách hàng:</b> ${state.customers.find(c => c.id === existingTask?.customerId)?.name || '---'}
<b>Trạng thái:</b> ${statusStr}
${updates.purchaseId ? `<b>Đơn hàng liên kết:</b> ${updates.purchaseId}\n` : ''}${updates.repairId ? `<b>Phiếu nhận liên kết:</b> ${updates.repairId}\n` : ''}<b>Giao cho:</b> ${existingTask?.assignedTo || '---'}
`;
        sendTelegramMessage(state.telegramSettings.botToken, state.telegramSettings.chatId, message);
      }
    }
  };

  const addWifiRecord = async (record: WifiRecord) => {
    setState(prev => ({ ...prev, wifiRecords: [...(prev.wifiRecords || []), record] }));
    await apiService.createRecord('WifiRecords', record);
  };

  const updateWifiRecord = async (id: string, updates: Partial<WifiRecord>) => {
    setState(prev => ({
      ...prev,
      wifiRecords: (prev.wifiRecords || []).map(r => r.id === id ? { ...r, ...updates } : r)
    }));
    await apiService.updateRecord('WifiRecords', id, updates);
  };

  const deleteWifiRecord = async (id: string) => {
    setState(prev => ({ ...prev, wifiRecords: (prev.wifiRecords || []).filter(r => r.id !== id) }));
    await apiService.deleteRecord('WifiRecords', id);
  };

  const addCameraAccount = async (record: CameraAccountRecord) => {
    setState(prev => ({ ...prev, cameraAccounts: [...(prev.cameraAccounts || []), record] }));
    await apiService.createRecord('CameraAccounts', record);
  };

  const updateCameraAccount = async (id: string, updates: Partial<CameraAccountRecord>) => {
    setState(prev => ({
      ...prev,
      cameraAccounts: (prev.cameraAccounts || []).map(a => a.id === id ? { ...a, ...updates } : a)
    }));
    await apiService.updateRecord('CameraAccounts', id, updates);
  };

  const deleteCameraAccount = async (id: string) => {
    setState(prev => ({ ...prev, cameraAccounts: (prev.cameraAccounts || []).filter(a => a.id !== id) }));
    await apiService.deleteRecord('CameraAccounts', id);
  };

  const addCameraInstallation = async (record: CameraInstallation) => {
    setState(prev => ({ ...prev, cameraInstallations: [...(prev.cameraInstallations || []), record] }));
    const apiRecord = {
      ...record,
      installationImages: record.installationImages ? record.installationImages.join(',') : ''
    };
    const result = await apiService.createRecord('CameraInstallations', apiRecord);
    if (!result.success && result.message) {
      alert(`Lỗi khi thêm: ${result.message}`);
    }
  };

  const updateCameraInstallation = async (id: string, updates: Partial<CameraInstallation>) => {
    setState(prev => ({
      ...prev,
      cameraInstallations: (prev.cameraInstallations || []).map(ci => ci.id === id ? { ...ci, ...updates } : ci)
    }));
    const apiUpdates: any = { ...updates };
    if (updates.installationImages) {
      apiUpdates.installationImages = updates.installationImages.join(',');
    }
    const result = await apiService.updateRecord('CameraInstallations', id, apiUpdates);
    if (!result.success && result.message) {
      alert(`Lỗi khi cập nhật: ${result.message}`);
    }
  };

  const deleteCameraInstallation = async (id: string) => {
    setState(prev => ({ ...prev, cameraInstallations: (prev.cameraInstallations || []).filter(ci => ci.id !== id) }));
    await apiService.deleteRecord('CameraInstallations', id);
  };

  const deleteTask = async (id: string) => {
    setState(prev => ({ ...prev, tasks: (prev.tasks || []).filter(t => t.id !== id) }));
    await apiService.deleteRecord('Tasks', id);
  };

  const updateTelegramSettings = async (settings: TelegramSettings) => {
    setState(prev => ({ ...prev, telegramSettings: settings }));
    try {
      const res = await apiService.updateRecord('TelegramSettings', 'tg_settings', {
        id: 'tg_settings',
        botToken: settings.botToken,
        chatId: settings.chatId,
        enabled: settings.enabled
      });
      // If update fails (e.g. record doesn't exist), try creating it
      if (!res || !res.success || res.status === 'error') {
        await apiService.createRecord('TelegramSettings', {
          id: 'tg_settings',
          botToken: settings.botToken,
          chatId: settings.chatId,
          enabled: settings.enabled
        });
      }
    } catch (e) {
      console.error('Failed to sync Telegram settings', e);
    }
  };

  const addUser = async (user: User) => {
    setState(prev => ({ ...prev, users: [...(prev.users || []), user] }));
    await apiService.createRecord('Users', user);
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    setState(prev => ({
      ...prev,
      users: (prev.users || []).map(u => u.id === id ? { ...u, ...updates } : u)
    }));
    await apiService.updateRecord('Users', id, updates);
  };

  const deleteUser = async (id: string) => {
    setState(prev => ({ ...prev, users: (prev.users || []).filter(u => u.id !== id) }));
    await apiService.deleteRecord('Users', id);
  };

  const updatePrintSettings = (settings: PrintSettings) => {
    setState(prev => ({ ...prev, printSettings: settings }));
    
    // Save to Google Sheets in background
    const syncSettings = async () => {
      try {
        await apiService.updateRecord('Settings', 'main_settings', {
          id: 'main_settings',
          storeName: settings.storeName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          bankInfo: settings.bankInfo,
          footNote: settings.footNote
        });
        console.log('Successfully synced settings to Google Sheets');
      } catch (e) {
        console.error('Error syncing settings to Google Sheets', e);
        // Fallback: If update fails (e.g. record doesn't exist), try create or ignore
        // Usually updateRecord handles creation if it's missing in some logic, 
        // but here we just want it to be backgrounded.
      }
    };
    
    syncSettings();
  };

  const uploadImage = async (base64: string, filename: string, category: string): Promise<ImageItem | null> => {
    try {
      const result = await apiService.uploadImage(base64, filename, category);
      // The user's new script returns { status: "success", fileId: fileId } on POST
      // We'll need the full metadata which might require another read or constructing it
      if (result.status === 'success' || result.success) {
        const newItem: ImageItem = {
          timestamp: formatDateTime(new Date()),
          name: filename,
          id: result.fileId || result.id || String(Date.now()),
          url: result.url || `https://lh3.googleusercontent.com/d/${result.fileId || result.id}`,
          fileType: 'image/jpeg',
          category: category
        };
        setState(prev => ({ ...prev, images: [newItem, ...prev.images] }));
        return newItem;
      }
      return null;
    } catch (e) {
      console.error('Upload image failed', e);
      return null;
    }
  };

  const deleteImage = async (id: string): Promise<boolean> => {
    try {
      const result = await apiService.deleteRecord('Image', id);
      if (result.success) {
        setState(prev => ({ ...prev, images: prev.images.filter(img => img.id !== id) }));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Delete image failed', e);
      return false;
    }
  };

  const addWallet = async (wallet: Wallet) => {
    setState(prev => ({ ...prev, wallets: [...(prev.wallets || []), wallet] }));
    await apiService.createRecord('Wallets', wallet);
  };

  const updateWallet = async (id: string, updates: Partial<Wallet>) => {
    setState(prev => ({
      ...prev,
      wallets: (prev.wallets || []).map(w => w.id === id ? { ...w, ...updates } : w)
    }));
    await apiService.updateRecord('Wallets', id, updates);
  };

  const deleteWallet = async (id: string) => {
    setState(prev => ({ ...prev, wallets: (prev.wallets || []).filter(w => w.id !== id) }));
    await apiService.deleteRecord('Wallets', id);
  };

  const addCategory = async (category: { name: string }) => {
    const id = generateId('NH', state.categories);
    const newCategory = { id, name: category.name };
    setState(prev => ({ ...prev, categories: [...prev.categories, newCategory] }));
    await apiService.createRecord('Categories', newCategory);
  };

  const addBrand = async (brand: { name: string }) => {
    const id = generateId('TH', state.brands);
    const newBrand = { id, name: brand.name };
    setState(prev => ({ ...prev, brands: [...prev.brands, newBrand] }));
    await apiService.createRecord('Brands', newBrand);
  };

  return (
    <AppContext.Provider value={{ 
      ...state, 
      login,
      logout,
      addProduct, 
      updateProduct,
      addCustomer, 
      updateCustomer,
      addSupplier,
      addInvoice, 
      updateInvoice,
      deleteInvoice,
      addImportOrder,
      updateImportOrder,
      addReturnImportOrder,
      addReturnSalesOrder,
      addStockCard,
      addSerial,
      removeSerial,
      addCashTransaction,
      setPOSDraft,
      setImportDraft,
      addMaintenanceRecord,
      updateMaintenanceRecord,
      addMaintenanceTransfer,
      updateMaintenanceTransfer,
      addExternalSerial,
      updateExternalSerial,
      deleteExternalSerial,
      addTask,
      updateTask,
      deleteTask,
      updateTelegramSettings,
      addWifiRecord,
      updateWifiRecord,
      deleteWifiRecord,
      addCameraAccount,
      updateCameraAccount,
      deleteCameraAccount,
      addCameraInstallation,
      updateCameraInstallation,
      deleteCameraInstallation,
      uploadImage,
      deleteImage,
      addUser,
      updateUser,
      deleteUser,
      updatePrintSettings,
      addWallet,
      updateWallet,
      deleteWallet,
      addCategory,
      addBrand,
      syncData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

