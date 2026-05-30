// utils/storage.ts (GÜNCELLENMİŞ VE TAM UYUMLU)

// --- SABİT ANAHTARLAR ---
export const STORAGE_KEY_PRODUCTS = "aura_products_db";
export const STORAGE_KEY_TRANSACTIONS = "aura_transactions_db";
export const STORAGE_KEY_WORKSHOP = "aura_workshop_db";

// --- TİP TANIMLAMALARI (Interfaces) ---

export interface Product {
  id: string;           // String ID (Benzersiz)
  name: string;
  price: number;        // Fiyatı sayı olarak tutmak işlem yapmak için daha sağlıklıdır
  category: string;
  stock: number;
  image: string;        // Base64
  
  // Eklenen Özellikler (Admin Panelinin Bozulmaması İçin):
  condition: string;    // "Sıfır" veya "Outlet"
  description?: string; // Açıklama
  sahibindenLink?: string;
  dolapLink?: string;
  letgoLink?: string;
}

export interface WorkshopJob {
  id: string;
  customerName: string;
  deviceModel: string;
  issue: string;      
  status: "Bekliyor" | "İşlemde" | "Tamamlandı" | "İptal";
  price: number;
  date: string;
}

export interface Transaction {
  id: string;
  type: "gelir" | "gider";
  amount: number;
  description: string;
  date: string;
}

// --- YARDIMCI: ID OLUŞTURUCU ---
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// --- DOSYA ÇEVİRİCİ (Resim Yükleme İçin) ---
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// --- ÜRÜN FONKSİYONLARI ---
export const saveProductsToStorage = (data: Product[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(data));
    // Vitrin ile senkronize olması için event
    window.dispatchEvent(new Event("storage"));
  }
};

export const getProductsFromStorage = (): Product[] => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

// --- KASA/MUHASEBE FONKSİYONLARI ---
export const saveTransactionsToStorage = (data: Transaction[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(data));
  }
};

export const getTransactionsFromStorage = (): Transaction[] => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

// --- ATÖLYE/TEKNİK SERVİS FONKSİYONLARI ---
export const saveWorkshopToStorage = (data: WorkshopJob[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_WORKSHOP, JSON.stringify(data));
  }
};

export const getWorkshopFromStorage = (): WorkshopJob[] => {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEY_WORKSHOP);
    return data ? JSON.parse(data) : [];
  }
  return [];
};