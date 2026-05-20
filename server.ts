import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cron from "node-cron";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'https://script.google.com/macros/s/AKfycbw9fB9wBGPiHkoO4qmVxyBl69VcDHyhObmYZnq8vew6wBoXn72AILTGw3KBWOuSvjGLnQ/exec';
const IMAGE_API_URL = 'https://script.google.com/macros/s/AKfycbxd7cJ1aMqNOkw0qwHT4pzVZQ59xilIa_IpR5gkvSTAnKOQVXpWNoiHtGA6NnplRgzdew/exec';
const IMAGE_SHEET_ID = '1BvCMwAq5zItV3fEqAy1saP7eTMQ66orrZ4CG6H_ecgM';

/**
 * Hàm phân tích số liệu linh hoạt
 */
const parseNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).trim().replace(/[^\d.,-]/g, '');
  if (!str) return 0;
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(str.replace(/,/g, '')) || 0;
  }
  if (str.includes(',')) {
    const parts = str.split(',');
    if (parts[parts.length - 1].length === 3) return parseFloat(str.replace(/,/g, '')) || 0;
    return parseFloat(str.replace(',', '.')) || 0;
  }
  if (str.includes('.')) {
    const parts = str.split('.');
    if (parts[parts.length - 1].length === 3) return parseFloat(str.replace(/\./g, '')) || 0;
  }
  return parseFloat(str) || 0;
};

/**
 * Hàm phân tích ngày tháng múi giờ Việt Nam
 */
/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm key dễ dàng hơn
 */
const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const parseDateHCM = (dateVal: any): Date => {
  if (!dateVal) return new Date(0);
  if (dateVal instanceof Date) return dateVal;
  const str = String(dateVal).trim();
  
  let d = new Date(0);
  let parsedByParts = false;

  if (/^\d{10,}$/.test(str)) {
    d = new Date(Number(str));
  } else {
    const tokens = str.split(/[\s,T]+/);
    const datePart = tokens[0];
    const timePart = tokens[1] || '00:00:00';
    let y = 0, m = 0, dNum = 0;
    const sep = datePart.includes('/') ? '/' : '-';
    const parts = datePart.split(sep);
    if (parts.length === 3) {
      if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]); dNum = parseInt(parts[2]); }
      else if (parts[2].length === 4) { y = parseInt(parts[2]); m = parseInt(parts[1]); dNum = parseInt(parts[0]); }
      else if (parts[2].length === 2 && parseInt(parts[2]) > 20) { y = 2000 + parseInt(parts[2]); m = parseInt(parts[1]); dNum = parseInt(parts[0]); }
    }
    if (y > 0) {
      if (m > 12) {
        const temp = m; m = dNum; dNum = temp;
      }
      d = new Date(y, m - 1, dNum);
      const tParts = timePart.split(':');
      d.setHours(parseInt(tParts[0] || '0'), parseInt(tParts[1] || '0'), parseInt(tParts[2] || '0'));
      parsedByParts = true;
    } else {
      d = new Date(str);
    }
  }

  if (isNaN(d.getTime())) return new Date(0);

  // Kiểm tra hoán đổi tương lai (Giảm thiểu lỗi DD/MM bị nhầm thành MM/DD do Google Sheets)
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const buffer = new Date(now);
  buffer.setDate(buffer.getDate() + 1);

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  if (d.getTime() > buffer.getTime() && day <= 12 && month <= 12) {
    const swapped = new Date(year, day - 1, month);
    swapped.setHours(d.getHours(), d.getMinutes(), d.getSeconds());
    if (swapped.getTime() <= buffer.getTime()) {
      d = swapped;
    }
  }

  return d;
};

/**
 * Hàm tìm giá trị từ nhiều khóa khác nhau (Case-insensitive, không dấu)
 */
const getValByKeys = (obj: any, keys: string[]) => {
  if (!obj) return undefined;
  const objKeys = Object.keys(obj);
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== '') return obj[k];
    const targetLow = removeAccents(k).toLowerCase().replace(/[\s_]+/g, '');
    const found = objKeys.find(ok => {
      const currentLow = removeAccents(ok).toLowerCase().replace(/[\s_]+/g, '');
      return currentLow === targetLow;
    });
    if (found && obj[found] !== undefined && obj[found] !== '') return obj[found];
  }
  return undefined;
};

async function sendDailyReport(forceToday = false) {
  console.log(`[Report] Starting... (ForceToday: ${forceToday})`);
  const fetchData = async (sheet: string) => {
    try {
      const res = await fetch(`${API_URL}?action=read&sheet=${sheet}`);
      const json = await res.json() as any;
      return json.data || [];
    } catch { return []; }
  };

  const [settingsList, invoices] = await Promise.all([fetchData('TelegramSettings'), fetchData('Invoices')]);
  const settings = settingsList?.[0] || {};
  if (!settings.enabled || String(settings.enabled) === 'false' || !settings.botToken || !settings.chatId) {
    throw new Error("Telegram chưa cấu hình hoặc bị tắt.");
  }

  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const targetDate = new Date(now);
  if (!forceToday) targetDate.setDate(targetDate.getDate() - 1);

  const tY = targetDate.getFullYear(), tM = targetDate.getMonth(), tD = targetDate.getDate();
  const dateStr = `${tD.toString().padStart(2, '0')}/${(tM + 1).toString().padStart(2, '0')}/${tY}`;

  const targetInvoices = invoices.filter((inv: any) => {
    const rawDate = getValByKeys(inv, ['date', 'createdAt', 'Ngày', 'Ngày bán', 'Ngày tạo', 'Thoigian', 'Thời gian', 'Ngay_ban', 'Created_At', 'Timestamp']);
    const d = parseDateHCM(rawDate);
    return d.getFullYear() === tY && d.getMonth() === tM && d.getDate() === tD;
  });

  const revenue = targetInvoices.reduce((s: number, i: any) => s + parseNumber(getValByKeys(i, ['finalAmount', 'total', 'Tổng tiền', 'Tong_tien', 'Amount', 'Tổng cộng', 'Khách cần trả', 'Thành tiền', 'Doanh thu'])), 0);
  const paid = targetInvoices.reduce((s: number, i: any) => s + parseNumber(getValByKeys(i, ['paidAmount', 'paid', 'Đã thanh toán', 'Thanh_toán', 'Paid', 'Khách thanh toán', 'Khách trả', 'Khách đưa', 'Thực thu'])), 0);

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
  let msg = `📊 *BÁO CÁO DOANH THU ${forceToday ? 'HÔM NAY' : 'TỔNG KẾT'} ${dateStr}*\n\n`;
  msg += `💰 Tổng doanh thu: *${fmt(revenue)}đ*\n`;
  msg += `💸 Thực thu: *${fmt(paid)}đ*\n`;
  msg += `🧾 Số hóa đơn: *${targetInvoices.length}*\n`;
  
  if (targetInvoices.length > 0) {
    msg += `\n--- Top 5 hóa đơn ---\n`;
    targetInvoices.sort((a, b) => parseNumber(getValByKeys(b, ['finalAmount', 'total', 'Tổng tiền', 'Tong_tien', 'Amount', 'Tổng cộng', 'Thành tiền'])) - parseNumber(getValByKeys(a, ['finalAmount', 'total', 'Tổng tiền', 'Tong_tien', 'Amount', 'Tổng cộng', 'Thành tiền'])))
      .slice(0, 5).forEach((i, idx) => {
        const cust = getValByKeys(i, ['customerID', 'customerName', 'customer', 'Khách hàng', 'Khách lẻ', 'Tên khách hàng', 'Khách']) || 'Khách lẻ';
        const val = parseNumber(getValByKeys(i, ['finalAmount', 'total', 'Tổng tiền', 'Tong_tien', 'Amount', 'Tổng cộng', 'Thành tiền']));
        msg += `${idx + 1}. ${cust}: ${fmt(val)}đ\n`;
      });
  } else {
    msg += `\n_(Không có dữ liệu hóa đơn nào được tìm thấy ngày ${dateStr})_`;
  }
  msg += `\n\n🕒 Gửi lúc: ${now.toLocaleTimeString('vi-VN')}`;

  const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: settings.chatId, text: msg, parse_mode: 'Markdown' })
  });
  const result = await res.json() as any;
  if (!result.ok) throw new Error("Telegram Error: " + result.description);
  
  return { 
    success: true, 
    count: targetInvoices.length, 
    revenue, 
    paid,
    debug: { 
      totalInvoicesParsed: invoices.length, 
      sampleMatching: targetInvoices.slice(0, 1),
      sampleAll: invoices.slice(0, 1)
    } 
  };
}

async function sendStockAlert() {
  console.log("[Stock] Checking inventory...");
  const fetchData = async (sheet: string) => {
    try {
      const res = await fetch(`${API_URL}?action=read&sheet=${sheet}`);
      const json = await res.json() as any;
      return json.data || [];
    } catch { return []; }
  };

  const [settingsList, products] = await Promise.all([fetchData('TelegramSettings'), fetchData('Products')]);
  const settings = settingsList?.[0] || {};
  if (!settings.enabled || String(settings.enabled) === 'false' || !settings.botToken || !settings.chatId) {
    throw new Error("Telegram chưa cấu hình hoặc bị tắt.");
  }

  const lowStockItems = products.filter((p: any) => {
    const status = String(getValByKeys(p, ['status', 'Trạng thái', 'Trang_thai']) || '').toLowerCase();
    if (status.includes('ngừng') || status.includes('stop')) return false;
    
    // Tìm tồn kho hiện tại
    const stockRaw = getValByKeys(p, ['stock', 'Tồn', 'Inventory', 'Số lượng', 'Tồn kho hiện tại', 'Ton_kho', 'Số_lượng']);
    const stock = parseNumber(stockRaw !== undefined ? stockRaw : 0);
    
    // Tìm ngưỡng cảnh báo
    const thresholdRaw = getValByKeys(p, ['lowStockThreshold', 'Ngưỡng tối thiểu', 'Mức cảnh báo', 'Threshold', 'MinStock', 'Ngưỡng', 'Dinh_muc', 'Định mức']);
    
    // Nếu không có ngưỡng thiết lập, mặc định không cảnh báo (tránh gửi toàn bộ)
    if (thresholdRaw === undefined) return false;
    
    const threshold = parseNumber(thresholdRaw);
    
    // Chỉ gửi nếu tồn kho thực sự NHỎ HƠN ngưỡng (theo yêu cầu người dùng)
    return stock < threshold;
  });

  if (lowStockItems.length === 0) return { count: 0 };

  const CHUNK_SIZE = 25; // Chia nhỏ để không bị lỗi text too long (Telegram limit 4096 chars)
  for (let i = 0; i < lowStockItems.length; i += CHUNK_SIZE) {
    const chunk = lowStockItems.slice(i, i + CHUNK_SIZE);
    const page = Math.floor(i / CHUNK_SIZE) + 1;
    const totalPages = Math.ceil(lowStockItems.length / CHUNK_SIZE);

    let msg = `⚠️ *CẢNH BÁO TỒN KHO (Phần ${page}/${totalPages})*\n`;
    msg += `📅 Ngày: ${new Date().toLocaleDateString('vi-VN')}\n\n`;
    
    chunk.forEach((p: any, idx: number) => {
      const overallIdx = i + idx + 1;
      const name = getValByKeys(p, ['name', 'Tên sản phẩm', 'Tên', 'Product_Name', 'Ten_SP', 'Tên_sản_phẩm']) || 'Sản phẩm';
      const id = getValByKeys(p, ['id', 'Mã sản phẩm', 'Mã SP', 'code', 'Ma_SP', 'barcode']) || '';
      const stock = parseNumber(getValByKeys(p, ['stock', 'Tồn', 'Inventory', 'Số lượng', 'Tồn kho hiện tại', 'Ton_kho', 'Số_lượng', 'Số_lượng_tồn']));
      const unit = getValByKeys(p, ['unit', 'Đơn vị', 'Don_vi', 'ĐVT']) || '';
      const threshold = parseNumber(getValByKeys(p, ['lowStockThreshold', 'Ngưỡng tối thiểu', 'Mức cảnh báo', 'Threshold', 'MinStock', 'Ngưỡng', 'Dinh_muc', 'Định mức']));
      
      msg += `${overallIdx}. *${name}* ${id ? `(\`${id}\`)` : ''}\n`;
      msg += `   - Tồn hiện tại: *${stock}* ${unit} (Ngưỡng: ${threshold})\n`;
    });
    
    if (page === totalPages) {
      msg += `\n🚀 Vui lòng kiểm tra và nhập hàng ngay!`;
    }

    const res = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: settings.chatId, text: msg, parse_mode: 'Markdown' })
    });
    const result = await res.json() as any;
    if (!result.ok) throw new Error("Telegram Error: " + result.description);
  }

  return { success: true, count: lowStockItems.length };
}

async function startServer() {
  const app = express();
  
  console.log("[Server] Initializing scheduled tasks (Asia/Ho_Chi_Minh)...");
  
  // Gửi báo cáo doanh thu lúc 19:00 hàng ngày (Tất toán cuối ngày)
  cron.schedule("0 19 * * *", async () => {
    console.log("[Cron] 19:00 Triggered: Sending daily report...");
    try {
      // Ở v7:00pm, thường người dùng muốn báo cáo của CHÍNH NGÀY HÔM ĐÓ
      const r = await sendDailyReport(true); 
      console.log("[Cron] 19:00 Success:", r.count, "invoices processed.");
    } catch (e) {
      console.error("[Cron] 19:00 Error:", e);
    }
  }, { timezone: "Asia/Ho_Chi_Minh" });

  // Gửi cảnh báo tồn kho lúc 07:00 sáng hàng ngày
  cron.schedule("0 7 * * *", async () => {
    console.log("[Cron] 07:00 Triggered: Checking inventory stock alerts...");
    try {
      const r = await sendStockAlert();
      console.log("[Cron] 07:00 Success:", r.count, "items flagged.");
    } catch (e) {
      console.error("[Cron] 07:00 Error:", e);
    }
  }, { timezone: "Asia/Ho_Chi_Minh" });

  console.log("[Server] Crons scheduled: 07:00 (Stock) and 19:00 (Report)");

  app.get("/api/telegram/test-report", async (req, res) => {
    try { const r = await sendDailyReport(true); res.json(r); } 
    catch (e: any) { console.error(e); res.status(500).json({ success: false, error: e.message }); }
  });

  app.get("/api/telegram/test-stock", async (req, res) => {
    try { 
      const r = await sendStockAlert(); 
      res.json({ success: true, count: r?.count || 0, message: r?.count === 0 ? 'Tồn kho vẫn an toàn, không có hàng sắp hết.' : 'Đã gửi cảnh báo tồn kho thành công!' }); 
    } catch (e: any) { console.error(e); res.status(500).json({ success: false, error: e.message }); }
  });

  app.use(express.json({ limit: '10mb' }));

  app.post("/api/upload-url-to-drive", async (req, res) => {
    const { url, fileName, category } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "Thiếu URL ảnh" });

    try {
      console.log(`[Upload] Processing external URL: ${url}`);
      
      // 1. Tải ảnh về
      const imageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!imageRes.ok) {
        throw new Error(`Không thể tải ảnh từ link này (HTTP ${imageRes.status}). Một số trang web chặn việc tải ảnh tự động.`);
      }
      
      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      const buffer = await imageRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      // 2. Gửi sang App Script để upload lên Drive
      const payload = {
        fileName: fileName || `image_${Date.now()}.jpg`,
        fileType: contentType,
        base64: base64,
        sheetId: IMAGE_SHEET_ID,
        category: category || 'SanPham'
      };

      console.log(`[Upload] Sending ${base64.length} bytes to App Script`);
      const gasRes = await fetch(IMAGE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const textResponse = await gasRes.text();
      console.log(`[Upload] GAS Raw Response: ${textResponse.substring(0, 1000)}`);

      let gasData;
      try {
        gasData = JSON.parse(textResponse);
      } catch (parseErr) {
        // Một số lỗi GAS trả về HTML (như lỗi quyền truy cập hoặc quá tải)
        if (textResponse.includes('<!DOCTYPE') || textResponse.includes('<html')) {
          throw new Error("Lỗi hệ thống Google Script (có thể do lỗi quyền hoặc script bị quá tải).");
        }
        throw new Error("Dữ liệu từ Google Script không hợp lệ.");
      }

      // Một số script trả về success kiểu 1/0 hoặc string "true"
      const isSuccess = gasData.success === true || gasData.success === 1 || gasData.success === 'true' || gasData.status === 'success';

      // Kiểm tra tất cả các trường có thể chứa URL hoặc ID
      const driveUrl = gasData.url || 
                       gasData.data || 
                       gasData.link || 
                       gasData.fileUrl ||
                       (typeof gasData.result === 'string' && gasData.result.startsWith('http') ? gasData.result : null);

      if (driveUrl || isSuccess) {
        const finalUrl = driveUrl || (gasData.result && typeof gasData.result === 'string' ? gasData.result : null);
        
        if (finalUrl) {
          console.log(`[Upload] Success: ${finalUrl}`);
          return res.json({ success: true, driveUrl: finalUrl });
        }
      }
      
      // Nếu không tìm thấy URL nhưng có ID (ví dụ file vừa tạo)
      if (gasData.id || gasData.fileId) {
        const id = gasData.id || gasData.fileId;
        const generatedUrl = `https://drive.google.com/uc?export=view&id=${id}`;
        console.log(`[Upload] Success (Generated): ${generatedUrl}`);
        return res.json({ success: true, driveUrl: generatedUrl });
      }

      const errorDetail = JSON.stringify(gasData);
      const errorMsg = gasData.message || gasData.error || gasData.msg || `App Script không trả về link Drive (Response: ${errorDetail.substring(0, 100)})`;
      throw new Error(errorMsg);
    } catch (e: any) {
      console.error("[Upload] Final Error:", e.message);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(3000, "0.0.0.0", () => console.log("Server listening at port 3000"));
}

startServer();
