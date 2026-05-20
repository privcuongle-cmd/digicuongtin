const API_URL = 'https://script.google.com/macros/s/AKfycbw9fB9wBGPiHkoO4qmVxyBl69VcDHyhObmYZnq8vew6wBoXn72AILTGw3KBWOuSvjGLnQ/exec';
const IMAGE_API_URL = 'https://script.google.com/macros/s/AKfycbxd7cJ1aMqNOkw0qwHT4pzVZQ59xilIa_IpR5gkvSTAnKOQVXpWNoiHtGA6NnplRgzdew/exec';
const IMAGE_SHEET_ID = '1BvCMwAq5zItV3fEqAy1saP7eTMQ66orrZ4CG6H_ecgM';

// Cấu hình CACHE
const CACHE_TTL = 5 * 60 * 1000; // 5 phút
const CACHE_PREFIX = 'DIGIKIOT_CACHE_';

const getCache = (key: string) => {
  try {
    const cached = localStorage.getItem(CACHE_PREFIX + key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
};

const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('[CACHE] Out of storage space');
  }
};

const clearCache = (sheetName?: string) => {
  if (sheetName) {
    localStorage.removeItem(CACHE_PREFIX + sheetName);
    // Xóa thêm các cache liên quan có thể bị ảnh hưởng (ví dụ: Invoices ảnh hưởng tới Inventory)
    if (sheetName === 'Invoices' || sheetName === 'ReturnSales' || sheetName === 'Import' || sheetName === 'ReturnImport') {
      localStorage.removeItem(CACHE_PREFIX + 'Inventory');
      localStorage.removeItem(CACHE_PREFIX + 'Dashboard');
    }
  } else {
    // Clear all
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};

const formatDataForSheet = (data: any): any => {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(formatDataForSheet);
  }
  if (typeof data === 'object') {
    const formatted: any = {};
    for (const key in data) {
      let val = data[key];
      if (typeof val === 'string') {
        // Prevent Google Sheets from stripping leading zeroes or interpreting as formula
        // SĐT, mã QR, ID có thể bắt đầu bằng 0, hoặc +, thì ta thêm dấu nháy đơn '
        if ((/^0\d+$/.test(val) || val.startsWith('+')) && !val.startsWith("'")) {
          val = "'" + val;
        }
      }
      formatted[key] = val;
    }
    return formatted;
  }
  return data;
};

export const apiService = {
  // Read Sheet with Cache
  readSheet: async (sheetName: string, forceRefresh = false, retries = 3) => {
    // 1. Check Cache first
    if (!forceRefresh) {
      const cachedData = getCache(sheetName);
      if (cachedData) {
        console.log(`[CACHE] Hit: ${sheetName}`);
        return cachedData;
      }
    }

    try {
      // Use IMAGE_API_URL for Image sheet requests, otherwise main API_URL
      const baseUrl = sheetName === 'Image' 
        ? `${IMAGE_API_URL}?sheetId=${IMAGE_SHEET_ID}&page=1&pageSize=100` 
        : `${API_URL}?action=read&sheet=${sheetName}`;
      
      // Add cache busting and timestamp
      const url = `${baseUrl}&_t=${Date.now()}`;
        
      console.log(`[API] Fetching ${sheetName}...`);
      const response = await fetch(url, { 
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const textResponse = await response.text();
      
      if (!textResponse) {
        console.warn(`[API] Empty response for ${sheetName}`);
        return [];
      }

      let result;
      try {
        result = JSON.parse(textResponse);
      } catch (e) {
        if (textResponse.trim().startsWith('<!DOCTYPE') || textResponse.trim().startsWith('<html')) {
          console.warn(`[API] Expected JSON but got HTML for ${sheetName}.`);
          return [];
        }
        console.error(`[API] Failed to parse JSON for ${sheetName}.`);
        return [];
      }
      
      let data = result.data || (result.success || result.status === 'success' ? result.data : []);
      
      if (data && Array.isArray(data)) {
        // Clean up any leading literal quotes that were added to preserve prefixes
        data = data.map(item => {
          if (typeof item !== 'object' || item === null) return item;
          const cleaned: any = {};
          for (const key in item) {
            let val = item[key];
            if (typeof val === 'string' && val.startsWith("'") && (val.substring(1).startsWith('0') || val.substring(1).startsWith('+'))) {
              val = val.substring(1);
            }
            cleaned[key] = val;
          }
          return cleaned;
        });

        // Update Cache
        setCache(sheetName, data);
        return data;
      }
      
      return [];
    } catch (error) {
      if (retries > 0) {
        const delay = 1000 * (4 - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiService.readSheet(sheetName, forceRefresh, retries - 1);
      }
      console.error(`[API] Final error on ${sheetName}:`, error);
      return [];
    }
  },

  // Thêm mới 1 dòng
  createRecord: async (sheetName: string, data: any, retries = 2): Promise<any> => {
    try {
      const formattedData = formatDataForSheet(data);
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'create', sheet: sheetName, data: formattedData }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
      });
      
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error(`[API] Create ${sheetName} failed (Status: ${response.status}) - Invalid JSON:`, text.substring(0, 500));
        
        if (retries > 0) {
          console.log(`[API] Retrying create ${sheetName}... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1000));
          return apiService.createRecord(sheetName, data, retries - 1);
        }
        
        return { success: false, message: 'Server trả về định dạng không hợp lệ (Mã: ' + response.status + ')' };
      }
      
      if (result.success) clearCache(sheetName);
      return result;
    } catch (error) {
      console.error(`Create error on ${sheetName}:`, error);
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return apiService.createRecord(sheetName, data, retries - 1);
      }
      return { success: false };
    }
  },

  // Cập nhật 1 dòng
  updateRecord: async (sheetName: string, id: string, data: any, retries = 2): Promise<any> => {
    try {
      const formattedData = formatDataForSheet(data);
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'update', sheet: sheetName, id, data: formattedData }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
      });
      
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error(`[API] Update ${sheetName} failed (Status: ${response.status}) - Invalid JSON:`, text.substring(0, 500));
        
        if (retries > 0) {
          console.log(`[API] Retrying update ${sheetName}... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1000));
          return apiService.updateRecord(sheetName, id, data, retries - 1);
        }

        return { success: false, message: 'Server trả về định dạng không hợp lệ (Mã: ' + response.status + ')' };
      }
      
      if (result.success) clearCache(sheetName);
      return result;
    } catch (error) {
      console.error(`Update error on ${sheetName}:`, error);
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return apiService.updateRecord(sheetName, id, data, retries - 1);
      }
      return { success: false };
    }
  },

  // Xóa 1 dòng
  deleteRecord: async (sheetName: string, id: string, retries = 2): Promise<any> => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', sheet: sheetName, id }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
      });
      
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error(`[API] Delete ${sheetName} failed (Status: ${response.status}) - Invalid JSON:`, text.substring(0, 500));
        
        if (retries > 0) {
          console.log(`[API] Retrying delete ${sheetName}... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1000));
          return apiService.deleteRecord(sheetName, id, retries - 1);
        }

        return { success: false, message: 'Server trả về định dạng không hợp lệ (Mã: ' + response.status + ')' };
      }
      
      if (result.success) clearCache(sheetName);
      return result;
    } catch (error) {
      console.error(`Delete error on ${sheetName}:`, error);
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return apiService.deleteRecord(sheetName, id, retries - 1);
      }
      return { success: false };
    }
  },

  // Upload ảnh lên Drive và lưu vào sheet Image (Kế thừa từ dự án Photo mới)
  uploadImage: async (base64: string, filename: string, category: string) => {
    try {
      // Structure based on user's project doPost
      const payload = {
        fileName: filename,
        fileType: 'image/jpeg', // Default or derived
        base64: base64.includes('base64,') ? base64.split('base64,')[1] : base64,
        sheetId: IMAGE_SHEET_ID,
        category: category
      };

      const response = await fetch(IMAGE_API_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow'
      });
      
      // Note: GAS doPost typically returns a JSON string, but if mode: 'no-cors' is used, we can't read it.
      // However, our fetch above doesn't use no-cors, so we should be able to read if configured.
      return await response.json();
    } catch (error) {
      console.error(`Upload error:`, error);
      return { success: false, message: 'Lỗi kết nối server' };
    }
  }
};
