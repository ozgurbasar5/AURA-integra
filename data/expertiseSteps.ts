// data/expertiseSteps.ts

export type Option = {
  label: string;
  value: string;
  score: number; 
  reportText: string;
  isBad?: boolean;
};

export type Step = {
  id: string;
  label: string;
  options: Option[];
};

export type TestGroup = {
  id: string;
  title: string;
  icon: string;
  steps: Step[];
};

export const EXPERTISE_DATA: Record<string, TestGroup[]> = {
  // ----------------------------------------------------------------
  // 1. CEP TELEFONU (ULTRA DETAYLI - M360 STANDARD)
  // ----------------------------------------------------------------
  phone: [
    {
      id: 'cosmetic_grading',
      title: 'DIŞ KOZMETİK & KASA',
      icon: '💎',
      steps: [
        {
          id: 'grade',
          label: 'Genel Kozmetik Notu',
          options: [
            { label: 'A+ (Yenilenmiş/Sıfır)', value: 'A+', score: 100, reportText: 'Cihaz kozmetik olarak A+ (Kusursuz) seviyededir.' },
            { label: 'A (Çok İyi)', value: 'A', score: 90, reportText: 'Cihaz A Kalite (Çok Temiz) durumdadır.' },
            { label: 'B (İyi - Kılcal)', value: 'B', score: 75, reportText: 'Cihaz B Kalite (Kılcal İzler) seviyesindedir.' },
            { label: 'C (Orta - Ezik)', value: 'C', score: 60, reportText: 'Cihaz C Kalite (Ezik/Darbe) seviyesindedir.' },
            { label: 'D (Kötü - Kırık)', value: 'D', score: 40, reportText: 'Cihaz D Kalite (Ağır Hasarlı) durumdadır.', isBad: true },
          ]
        },
        {
          id: 'frame_cond',
          label: 'Kasa / Çerçeve',
          options: [
            { label: 'Hatasız', value: 'perfect', score: 10, reportText: 'Kasa çerçevesinde darbe yok.' },
            { label: 'Kılcal Çizik', value: 'scratch', score: 8, reportText: 'Çerçevede kılcal çizikler mevcut.' },
            { label: 'Köşe Darbesi', value: 'dent', score: 5, reportText: 'Kasa köşelerinde düşmeye bağlı ezik var.', isBad: true },
            { label: 'Yamuk/Eğik', value: 'bent', score: 0, reportText: 'Kasa şasesinde yamukluk var.', isBad: true },
          ]
        },
        {
          id: 'back_cover',
          label: 'Arka Kapak',
          options: [
            { label: 'Temiz', value: 'clean', score: 10, reportText: 'Arka kapak temiz.' },
            { label: 'Lekeli/Soyulmuş', value: 'peel', score: 5, reportText: 'Arka kapakta boya atması/leke var.', isBad: true },
            { label: 'Kırık/Çatlak', value: 'broken', score: 0, reportText: 'Arka cam/kapak kırık.', isBad: true },
          ]
        },
        {
          id: 'camera_lens_glass',
          label: 'Kamera Camı',
          options: [
            { label: 'Sağlam', value: 'ok', score: 10, reportText: 'Lens camları çiziksiz.' },
            { label: 'Çizik', value: 'scratch', score: 5, reportText: 'Lens camında derin çizik var (Görüntüyü etkileyebilir).', isBad: true },
            { label: 'Kırık', value: 'cracked', score: 0, reportText: 'Lens camı kırık.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'screen_group',
      title: 'EKRAN & DOKUNMATİK',
      icon: '📱',
      steps: [
        {
          id: 'glass',
          label: 'Ön Cam Fiziksel',
          options: [
            { label: 'Kusursuz', value: 'mint', score: 10, reportText: 'Ön camda çizik veya deformasyon yok.' },
            { label: 'Kılcal Çizik', value: 'light_scratch', score: 8, reportText: 'Işık altında görülen kılcal çizikler mevcut.' },
            { label: 'Derin Çizik', value: 'deep_scratch', score: 5, reportText: 'Tırnağa takılan derin çizikler var.', isBad: true },
            { label: 'Kırık/Çatlak', value: 'broken', score: 0, reportText: 'Ön camda kırık veya çatlaklar mevcut.', isBad: true },
          ]
        },
        {
          id: 'touch_panel',
          label: 'Dokunmatik',
          options: [
            { label: 'Sorunsuz', value: 'pass', score: 10, reportText: 'Dokunmatik panel tüm yüzeyde aktif.' },
            { label: 'Ölü Nokta', value: 'dead_zone', score: 0, reportText: 'Dokunmatikte basmayan bölgeler (kör nokta) var.', isBad: true },
            { label: 'Hayalet Dokunuş', value: 'ghost_touch', score: 0, reportText: 'Ekran kendi kendine basıyor (Ghost Touch).', isBad: true },
          ]
        },
        {
          id: 'dead_pixel',
          label: 'Ölü Piksel',
          options: [
            { label: 'Yok / Temiz', value: 'pass', score: 10, reportText: 'Panelde ölü piksel bulunmamaktadır.' },
            { label: 'Var', value: 'fail', score: 0, reportText: 'Ekranda ölü pikseller tespit edilmiştir.', isBad: true },
          ]
        },
        {
          id: 'truetone',
          label: 'TrueTone (Apple)',
          options: [
            { label: 'Aktif', value: 'active', score: 5, reportText: 'TrueTone ortam ışığı sensörü aktif.' },
            { label: 'Çalışmıyor', value: 'inactive', score: 0, reportText: 'TrueTone özelliği devre dışı (Ekran değişmiş olabilir).', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'audio_group',
      title: 'SES & MİKROFONLAR',
      icon: '🔊',
      steps: [
        {
          id: 'mic_bottom',
          label: 'Alt Mikrofon',
          options: [
            { label: 'Net', value: 'pass', score: 5, reportText: 'Alt mikrofon ses alımı net.' },
            { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Alt mikrofon çalışmıyor.', isBad: true },
          ]
        },
        {
          id: 'mic_front',
          label: 'Ön (Ahize) Mikrofonu',
          options: [
            { label: 'Net', value: 'pass', score: 5, reportText: 'Siri/Ön kamera mikrofonu sağlam.' },
            { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Ön mikrofon ses almıyor.', isBad: true },
          ]
        },
        {
          id: 'mic_back',
          label: 'Arka (Kamera) Mikrofonu',
          options: [
            { label: 'Net', value: 'pass', score: 5, reportText: 'Video kayıt mikrofonu sağlam.' },
            { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Arka mikrofon çalışmıyor.', isBad: true },
          ]
        },
        {
          id: 'spk_ear',
          label: 'Ahize (Ear Speaker)',
          options: [
            { label: 'Yüksek/Net', value: 'pass', score: 5, reportText: 'İç kulaklık sesi net.' },
            { label: 'Az/Patlak', value: 'fail', score: 0, reportText: 'Ahize sesi az veya patlak.', isBad: true },
          ]
        },
        {
          id: 'spk_loud',
          label: 'Hoparlör (Buzzer)',
          options: [
            { label: 'Güçlü', value: 'pass', score: 5, reportText: 'Ana hoparlör sesi temiz.' },
            { label: 'Patlak', value: 'fail', score: 0, reportText: 'Hoparlörde cızırtı/patlak var.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'camera_group',
      title: 'KAMERA SİSTEMLERİ',
      icon: '📷',
      steps: [
        {
          id: 'rear_focus',
          label: 'Arka Odak (OIS)',
          options: [
            { label: 'Net', value: 'pass', score: 10, reportText: 'Otomatik odaklama ve OIS sorunsuz.' },
            { label: 'Titreme', value: 'shake', score: 0, reportText: 'OIS motorunda titreme var.', isBad: true },
            { label: 'Bulanık', value: 'blur', score: 0, reportText: 'Kamera odaklama yapamıyor.', isBad: true },
          ]
        },
        {
          id: 'lens_dust',
          label: 'Lens Tozu',
          options: [
            { label: 'Temiz', value: 'clean', score: 10, reportText: 'Lens içi temiz.' },
            { label: 'Tozlu', value: 'dust', score: 5, reportText: 'Kamera lensinde toz lekeleri var.', isBad: true },
          ]
        },
        {
          id: 'front_cam',
          label: 'Ön Kamera',
          options: [
            { label: 'Net', value: 'pass', score: 10, reportText: 'Selfie kamerası sorunsuz.' },
            { label: 'Tozlu/Bozuk', value: 'fail', score: 0, reportText: 'Ön kamera arızalı veya tozlu.', isBad: true },
          ]
        },
        {
          id: 'flash',
          label: 'Flaş / Fener',
          options: [
            { label: 'Çalışıyor', value: 'pass', score: 5, reportText: 'Kamera flaşı aktif.' },
            { label: 'Bozuk', value: 'fail', score: 0, reportText: 'Flaş çalışmıyor.', isBad: true },
          ]
        },
        {
          id: 'lidar',
          label: 'LiDAR Tarayıcı',
          options: [
            { label: 'Aktif', value: 'pass', score: 5, reportText: 'LiDAR mesafe sensörü çalışıyor.' },
            { label: 'Yok/Arızalı', value: 'fail', score: 0, reportText: 'LiDAR sensörü yanıt vermiyor.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'sensor_group',
      title: 'SENSÖRLER',
      icon: '📡',
      steps: [
        {
          id: 'prox',
          label: 'Yakınlık Sensörü',
          options: [
            { label: 'Aktif', value: 'pass', score: 5, reportText: 'Yakınlık sensörü çalışıyor.' },
            { label: 'Pasif', value: 'fail', score: 0, reportText: 'Yakınlık sensörü tepkisiz.', isBad: true },
          ]
        },
        {
          id: 'light',
          label: 'Işık Sensörü',
          options: [
            { label: 'Aktif', value: 'pass', score: 5, reportText: 'Ortam ışığı sensörü çalışıyor.' },
            { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Otomatik parlaklık çalışmıyor.', isBad: true },
          ]
        },
        {
          id: 'faceid',
          label: 'FaceID/TouchID',
          options: [
            { label: 'Sorunsuz', value: 'pass', score: 15, reportText: 'Biyometrik güvenlik sistemleri sağlam.' },
            { label: 'Hatalı', value: 'fail', score: 0, reportText: 'FaceID/TouchID arızalı.', isBad: true },
          ]
        },
        {
          id: 'nfc',
          label: 'NFC',
          options: [
            { label: 'Okuyor', value: 'pass', score: 5, reportText: 'NFC modülü aktif.' },
            { label: 'Hatalı', value: 'fail', score: 0, reportText: 'NFC okuma yapmıyor.', isBad: true },
          ]
        },
        {
          id: 'gyro',
          label: 'Jiroskop',
          options: [
            { label: 'Aktif', value: 'pass', score: 5, reportText: 'Hareket sensörleri (Gyro) aktif.' },
            { label: 'Hatalı', value: 'fail', score: 0, reportText: 'Ekran döndürme çalışmıyor.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'batt_group',
      title: 'GÜÇ & BATARYA',
      icon: '🔋',
      steps: [
        {
          id: 'health',
          label: 'Pil Sağlığı (%)',
          options: [
            { label: '%100 (Orijinal)', value: '100', score: 15, reportText: 'Pil sağlığı %100, orijinal kapasite.' },
            { label: '%90-99', value: 'excellent', score: 12, reportText: 'Pil sağlığı mükemmel (%90+).' },
            { label: '%80-89', value: 'good', score: 10, reportText: 'Pil durumu iyi.' },
            { label: 'Servis', value: 'bad', score: 0, reportText: 'Pil servis uyarısı veriyor.', isBad: true },
          ]
        },
        {
          id: 'cycle',
          label: 'Pil Döngüsü (Cycle)',
          options: [
            { label: 'Düşük (0-500)', value: 'low', score: 5, reportText: 'Pil döngüsü düşük.' },
            { label: 'Yüksek (1000+)', value: 'high', score: 0, reportText: 'Pil döngüsü çok yüksek.', isBad: true },
          ]
        },
        {
          id: 'charge_wireless',
          label: 'Kablosuz Şarj',
          options: [
            { label: 'Çalışıyor', value: 'pass', score: 5, reportText: 'Kablosuz şarj aktif.' },
            { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Kablosuz şarj çalışmıyor.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'conn_group',
      title: 'BAĞLANTI & TUŞLAR',
      icon: '📶',
      steps: [
        {
          id: 'wifi_bt',
          label: 'Wi-Fi / Bluetooth',
          options: [
            { label: 'Aktif', value: 'pass', score: 10, reportText: 'Kablosuz bağlantılar sorunsuz.' },
            { label: 'Kopuyor', value: 'fail', score: 0, reportText: 'Wi-Fi/BT bağlantı sorunu var.', isBad: true },
          ]
        },
        {
          id: 'buttons',
          label: 'Fiziksel Tuşlar',
          options: [
            { label: 'Hepsi Çalışıyor', value: 'pass', score: 10, reportText: 'Güç, Ses ve Action tuşları sağlam.' },
            { label: 'Eksik/Basmıyor', value: 'fail', score: 0, reportText: 'Bazı tuşlar tepki vermiyor.', isBad: true },
          ]
        },
        {
          id: 'vibration',
          label: 'Titreşim',
          options: [
            { label: 'Çalışıyor', value: 'pass', score: 5, reportText: 'Titreşim motoru aktif.' },
            { label: 'Bozuk', value: 'fail', score: 0, reportText: 'Titreşim çalışmıyor.', isBad: true },
          ]
        }
      ]
    }
  ],

  // ----------------------------------------------------------------
  // 2. ROBOT SÜPÜRGE
  // ----------------------------------------------------------------
  robot: [
    {
      id: 'cosmetic_robot',
      title: 'DIŞ GÖRÜNÜM',
      icon: '💎',
      steps: [
        {
          id: 'grade',
          label: 'Kozmetik Derecesi',
          options: [
            { label: 'A (Çok Temiz)', value: 'A', score: 100, reportText: 'Cihaz kozmetik olarak çok temiz.' },
            { label: 'B (Normal)', value: 'B', score: 80, reportText: 'Kullanıma bağlı çizikler mevcut.' },
            { label: 'C (Yıpranmış)', value: 'C', score: 60, reportText: 'Cihazda yoğun yıpranma var.' },
          ]
        },
        {
          id: 'top_cover',
          label: 'Üst Kapak',
          options: [
            { label: 'Temiz', value: 'clean', score: 10, reportText: 'Üst kapak temiz.' },
            { label: 'Çizik', value: 'scratch', score: 5, reportText: 'Üst kapakta çizikler var.' },
          ]
        },
        {
          id: 'bumper',
          label: 'Tampon',
          options: [
            { label: 'Sağlam', value: 'ok', score: 10, reportText: 'Ön tampon sağlam.' },
            { label: 'Darbeli', value: 'hit', score: 0, reportText: 'Tamponda derin darbeler var.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'lidar_nav',
      title: 'LİDAR & NAVİGASYON',
      icon: '📡',
      steps: [
        {
          id: 'lidar_rpm',
          label: 'Lidar Devri',
          options: [
            { label: 'Normal', value: 'ok', score: 20, reportText: 'Lidar kulesi stabil dönüyor.' },
            { label: 'Sıkışık', value: 'fail', score: 0, reportText: 'Lidar motoru zorlanıyor (Hata 1).', isBad: true },
          ]
        },
        {
          id: 'cliff_sensor',
          label: 'Düşme Sensörleri',
          options: [
            { label: 'Aktif', value: 'ok', score: 10, reportText: 'Cliff (uçurum) sensörleri temiz ve aktif.' },
            { label: 'Kirli/Bozuk', value: 'fail', score: 0, reportText: 'Düşme sensörleri çalışmıyor.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'movement',
      title: 'TEKERLEK & HAREKET',
      icon: '⚙️',
      steps: [
        {
          id: 'wheel_left',
          label: 'Sol Tekerlek',
          options: [
            { label: 'Sağlam', value: 'ok', score: 10, reportText: 'Sol tekerlek motoru ve yayı sağlam.' },
            { label: 'Sert/Sesli', value: 'fail', score: 0, reportText: 'Sol tekerlek arızalı.', isBad: true },
          ]
        },
        {
          id: 'wheel_right',
          label: 'Sağ Tekerlek',
          options: [
            { label: 'Sağlam', value: 'ok', score: 10, reportText: 'Sağ tekerlek motoru ve yayı sağlam.' },
            { label: 'Sert/Sesli', value: 'fail', score: 0, reportText: 'Sağ tekerlek arızalı.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'cleaning',
      title: 'TEMİZLİK SİSTEMİ',
      icon: '🧹',
      steps: [
        {
          id: 'main_brush',
          label: 'Ana Fırça',
          options: [
            { label: 'Dönüyor', value: 'ok', score: 10, reportText: 'Ana fırça motoru aktif.' },
            { label: 'Dönmüyor', value: 'fail', score: 0, reportText: 'Ana fırça motoru arızalı.', isBad: true },
          ]
        },
        {
          id: 'fan_suction',
          label: 'Fan Emiş Gücü',
          options: [
            { label: 'Güçlü', value: 'ok', score: 10, reportText: 'Vakum fanı tam performans çekiyor.' },
            { label: 'Islık Sesi', value: 'noise', score: 0, reportText: 'Fanda ıslık sesi var (Balans bozuk).', isBad: true },
            { label: 'Çekmiyor', value: 'dead', score: 0, reportText: 'Vakum fanı çalışmıyor (Fan Error).', isBad: true },
          ]
        },
        {
          id: 'mop_pump',
          label: 'Su Pompası',
          options: [
            { label: 'Su Veriyor', value: 'ok', score: 10, reportText: 'Elektronik pompa su veriyor.' },
            { label: 'Tıkanık', value: 'fail', score: 0, reportText: 'Su gelmiyor (Kireçlenme/Pompa Arızası).', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'docking',
      title: 'ŞARJ & İSTASYON',
      icon: '🔋',
      steps: [
        {
          id: 'dock_return',
          label: 'İstasyona Dönüş',
          options: [
            { label: 'Buluyor', value: 'ok', score: 10, reportText: 'Cihaz şarj istasyonunu bulup yerleşiyor.' },
            { label: 'Bulamıyor', value: 'fail', score: 0, reportText: 'Cihaz istasyonu bulamıyor (IR Sensör Hatası).', isBad: true },
          ]
        },
        {
          id: 'battery_hold',
          label: 'Batarya Tutumu',
          options: [
            { label: 'Normal', value: 'ok', score: 5, reportText: 'Batarya şarj tutuyor.' },
            { label: 'Hızlı Bitiyor', value: 'drain', score: 0, reportText: 'Batarya temizlik bitmeden kapanıyor.', isBad: true },
          ]
        }
      ]
    }
  ],

  // ----------------------------------------------------------------
  // 3. ARAÇ KAMERASI (DASHCAM)
  // ----------------------------------------------------------------
  dashcam: [
    {
      id: 'cosmetic_dash',
      title: 'KOZMETİK DURUM',
      icon: '💎',
      steps: [
        {
          id: 'grade',
          label: 'Kozmetik Notu',
          options: [
            { label: 'A (Sıfır Ayarı)', value: 'A', score: 100, reportText: 'Cihaz sıfır ayarında.' },
            { label: 'B (İkinci El)', value: 'B', score: 80, reportText: 'Temiz ikinci el.' },
            { label: 'C (Yıpranmış)', value: 'C', score: 50, reportText: 'Yıpranmış kasa.' },
          ]
        },
        {
          id: 'screen_cond',
          label: 'Ekran',
          options: [
            { label: 'Çiziksiz', value: 'ok', score: 10, reportText: 'Ekran temiz.' },
            { label: 'Çizik', value: 'scratch', score: 5, reportText: 'Ekranda çizikler var.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'visual',
      title: 'GÖRÜNTÜ KALİTESİ',
      icon: '📹',
      steps: [
        {
          id: 'focus_check',
          label: 'Plaka Okuma (Odak)',
          options: [
            { label: 'Net', value: 'ok', score: 20, reportText: 'Odak net, plakalar okunuyor.' },
            { label: 'Bulanık', value: 'blur', score: 0, reportText: 'Sıcaklıktan dolayı lens odağı kaymış.', isBad: true },
          ]
        },
        {
          id: 'sensor_color',
          label: 'Sensör Renkleri',
          options: [
            { label: 'Doğal', value: 'ok', score: 20, reportText: 'Renkler doğal.' },
            { label: 'Pembe/Mor', value: 'pink', score: 0, reportText: 'Sensör yanığı (Görüntü pembeleşmiş).', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'recording',
      title: 'KAYIT SİSTEMİ',
      icon: '💾',
      steps: [
        {
          id: 'sd_rw',
          label: 'SD Kart Yazma',
          options: [
            { label: 'Başarılı', value: 'ok', score: 15, reportText: 'Hafıza kartı okuma/yazma testi başarılı.' },
            { label: 'Kart Hatası', value: 'fail', score: 0, reportText: 'Kart yuvası arızalı veya kartı bozuyor.', isBad: true },
          ]
        },
        {
          id: 'loop_rec',
          label: 'Döngüsel Kayıt',
          options: [
            { label: 'Aktif', value: 'ok', score: 15, reportText: 'Eski kayıtları silip üzerine yazıyor.' },
            { label: 'Durduruyor', value: 'stop', score: 0, reportText: 'Kart dolunca kayıt duruyor (Loop hatası).', isBad: true },
          ]
        },
        {
          id: 'g_sensor',
          label: 'G-Sensör (Darbe)',
          options: [
            { label: 'Algılıyor', value: 'ok', score: 5, reportText: 'Darbe anında videoyu kilitliyor.' },
            { label: 'Pasif', value: 'fail', score: 0, reportText: 'G-Sensör çalışmıyor.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'power',
      title: 'GÜÇ & KAPASİTÖR',
      icon: '⚡',
      steps: [
        {
          id: 'super_cap',
          label: 'Kapasitör/Pil',
          options: [
            { label: 'Sağlam', value: 'ok', score: 15, reportText: 'Enerji kesilince kaydı tamamlayıp kapanıyor.' },
            { label: 'Tarih Sıfırlıyor', value: 'dead', score: 0, reportText: 'Enerji gidince anında kapanıyor (Tarih sıfırlanıyor).', isBad: true },
          ]
        },
        {
          id: 'wifi_app',
          label: 'Wi-Fi Bağlantısı',
          options: [
            { label: 'Bağlanıyor', value: 'ok', score: 10, reportText: 'Telefona bağlanıyor, görüntü aktarıyor.' },
            { label: 'Kopuyor', value: 'weak', score: 0, reportText: 'Wi-Fi ağı görünmüyor veya kopuyor.', isBad: true },
          ]
        }
      ]
    }
  ],

  // ----------------------------------------------------------------
  // 4. BİLGİSAYAR / LAPTOP (GENİŞLETİLMİŞ TEKNİK LİSTE)
  // ----------------------------------------------------------------
  pc: [
    {
      id: 'cosmetic_pc',
      title: 'DIŞ KASA & KOZMETİK',
      icon: '💻',
      steps: [
        {
          id: 'grade',
          label: 'Genel Kozmetik',
          options: [
            { label: 'A (Kusursuz)', value: 'A', score: 100, reportText: 'Cihaz vitrin temizliğinde.' },
            { label: 'B (Kılcal)', value: 'B', score: 85, reportText: 'Ufak kullanım izleri mevcut.' },
            { label: 'C (Yıpranmış)', value: 'C', score: 60, reportText: 'Belirgin soyulma ve ezikler var.', isBad: false },
            { label: 'D (Hasarlı)', value: 'D', score: 40, reportText: 'Kasa kırık veya çatlak.', isBad: true },
          ]
        },
        {
          id: 'hinge_status', // Menteşe detaylandırıldı
          label: 'Menteşe Durumu',
          options: [
            { label: 'Sağlam', value: 'ok', score: 10, reportText: 'Menteşeler sorunsuz.' },
            { label: 'Gevşek/Boşluk', value: 'loose', score: 5, reportText: 'Menteşelerde boşluk var, sıkılmalı.' },
            { label: 'Kasa Ayrık', value: 'broken_mount', score: 0, reportText: 'Vida yuvaları kırık, kasa ayrılıyor.', isBad: true },
          ]
        },
        {
          id: 'screw_check', // Teknisyen detayı: Eksik vida var mı?
          label: 'Vida Kontrolü',
          options: [
            { label: 'Tam', value: 'full', score: 5, reportText: 'Alt kasa vidaları tam.' },
            { label: 'Eksik/Yalama', value: 'missing', score: 0, reportText: 'Eksik veya yalama olmuş vidalar var.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'screen_group',
      title: 'EKRAN & PANEL',
      icon: '🖥️',
      steps: [
        {
          id: 'panel_visual',
          label: 'Panel Kozmetik',
          options: [
            { label: 'Temiz', value: 'clean', score: 20, reportText: 'Ekran yüzeyi temiz.' },
            { label: 'Klavye İzi', value: 'key_mark', score: 15, reportText: 'Panelde klavye silinme izi var.' },
            { label: 'Soyulma (Coating)', value: 'peel', score: 10, reportText: 'Antirefle kaplama soyulmuş (Staingate).', isBad: true },
          ]
        },
        {
          id: 'panel_func',
          label: 'Görüntü/Pixel',
          options: [
            { label: 'Sorunsuz', value: 'ok', score: 20, reportText: 'Görüntü aktarımı hatasız.' },
            { label: 'Ölü Pixel', value: 'dead_pixel', score: 10, reportText: 'Panelde ölü/takılı pikseller mevcut.', isBad: true },
            { label: 'Işık Sızması/Leke', value: 'whitespot', score: 10, reportText: 'Ekranda Whitespot veya ışık sızması var.', isBad: true },
            { label: 'Çizgi/Titreme', value: 'line', score: 0, reportText: 'Panel arızalı (Dikey/Yatay çizgi).', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'hardware',
      title: 'ANAKART & DONANIM',
      icon: '🚀',
      steps: [
        {
          id: 'thermal',
          label: 'Isı Değerleri',
          options: [
            { label: 'Normal (<80°C)', value: 'ok', score: 15, reportText: 'Stres testinde ısı değerleri stabil.' },
            { label: 'Bakım Gerekli', value: 'maintenance', score: 10, reportText: 'Termal macun/fan bakımı gerekiyor.' },
            { label: 'Aşırı Isınma/Kapanma', value: 'cutoff', score: 0, reportText: 'Cihaz ısıdan dolayı kapanıyor (Thermal Shutdown).', isBad: true },
          ]
        },
        {
          id: 'gpu_stress', // Teknisyen detayı: Ekran kartı yük testi
          label: 'GPU (Ekran Kartı)',
          options: [
            { label: 'Stabil', value: 'ok', score: 20, reportText: 'Furmark/Test sonuçları temiz.' },
            { label: 'Artifact', value: 'artifact', score: 0, reportText: 'Görüntüde bozulmalar (Artifact) var, Chipset arızası.', isBad: true },
            { label: 'Kod 43/Tanımıyor', value: 'driver_fail', score: 0, reportText: 'Sürücü kurulmuyor veya Kod 43 hatası.', isBad: true },
          ]
        },
        {
          id: 'bios_lock', // Teknisyen detayı: Çalıntı/Kurumsal cihaz kontrolü
          label: 'BIOS Durumu',
          options: [
            { label: 'Açık', value: 'open', score: 10, reportText: 'BIOS şifresi yok/erişilebilir.' },
            { label: 'Şifreli (Kilitli)', value: 'locked', score: 0, reportText: 'BIOS şifreli (Admin Password), müdahale gerekli.', isBad: true },
          ]
        },
        {
          id: 'battery_status',
          label: 'Batarya Durumu',
          options: [
            { label: 'İyi Durumda', value: 'good', score: 10, reportText: 'Batarya kapasitesi iyi.' },
            { label: 'Servis/Bitik', value: 'bad', score: 0, reportText: 'Batarya "Servis Öneriliyor" uyarısı veriyor.', isBad: true },
            { label: 'Şişik (Tehlike)', value: 'swollen', score: 0, reportText: 'Batarya şişmiş, acil sökülmeli.', isBad: true },
          ]
        },
        {
            id: 'ssd_health',
            label: 'Disk Sağlığı',
            options: [
              { label: '%90-100', value: 'high', score: 10, reportText: 'Disk sağlığı mükemmel.' },
              { label: '%50 Altı', value: 'mid', score: 5, reportText: 'Disk ömrü azalmış.' },
              { label: 'Bad Sector/RAW', value: 'fail', score: 0, reportText: 'Disk arızalı veya format yemiyor.', isBad: true },
            ]
        }
      ]
    },
    {
      id: 'io_check',
      title: 'GİRİŞ/ÇIKIŞ & FİZİKSEL',
      icon: '⌨️',
      steps: [
        {
          id: 'keyboard',
          label: 'Klavye',
          options: [
            { label: 'Sorunsuz', value: 'ok', score: 10, reportText: 'Tüm tuşlar aktif.' },
            { label: 'Basmayan Tuş', value: 'fail', score: 5, reportText: 'Bazı tuşlar çalışmıyor/zor basıyor.', isBad: true },
            { label: 'Yapışkan', value: 'sticky', score: 0, reportText: 'Sıvı teması şüphesi (Tuşlar yapışıyor).', isBad: true },
          ]
        },
        {
          id: 'ports',
          label: 'USB/Şarj Soketi',
          options: [
            { label: 'Sağlam', value: 'ok', score: 10, reportText: 'Tüm portlar veri aktarıyor.' },
            { label: 'Temassızlık', value: 'loose', score: 5, reportText: 'Soketlerde temassızlık var.', isBad: true },
            { label: 'Kırık/Bozuk', value: 'broken', score: 0, reportText: 'USB veya Şarj soketi fiziksel hasarlı.', isBad: true },
          ]
        },
        {
          id: 'fan_sound',
          label: 'Fan Sesi',
          options: [
            { label: 'Sessiz', value: 'silent', score: 5, reportText: 'Fan yatağı sağlam.' },
            { label: 'Traktör Sesi', value: 'noisy', score: 0, reportText: 'Fan yatağı bozuk, aşırı sesli.', isBad: true },
          ]
        }
      ]
    }
  ],

  // ----------------------------------------------------------------
  // 5. AKILLI SAAT
  // ----------------------------------------------------------------
  watch: [
    {
      id: 'cosmetic_watch',
      title: 'KOZMETİK',
      icon: '⌚️',
      steps: [
        {
          id: 'grade',
          label: 'Kozmetik Notu',
          options: [
            { label: 'A (Çiziksiz)', value: 'A', score: 100, reportText: 'Kasa ve cam çiziksiz.' },
            { label: 'B (Kılcal)', value: 'B', score: 80, reportText: 'Kılcal çizikler var.' },
            { label: 'C (Derin)', value: 'C', score: 50, reportText: 'Derin çizikler mevcut.', isBad: true },
          ]
        },
        {
          id: 'glass',
          label: 'Cam',
          options: [
            { label: 'Temiz', value: 'ok', score: 10, reportText: 'Cam temiz.' },
            { label: 'Çizik', value: 'scratch', score: 5, reportText: 'Camda çizik var.', isBad: true },
          ]
        },
        {
          id: 'strap_lock',
          label: 'Kordon Kilidi',
          options: [
            { label: 'Sağlam', value: 'ok', score: 10, reportText: 'Kordon kilit mekanizması sağlam.' },
            { label: 'Bozuk', value: 'fail', score: 0, reportText: 'Kordon yuvaya oturmuyor.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'function',
      title: 'FONKSİYON',
      icon: '❤️',
      steps: [
        {
          id: 'sensors',
          label: 'Nabız/Oksijen',
          options: [
            { label: 'Okuyor', value: 'ok', score: 20, reportText: 'Arka sensörler aktif ölçüm yapıyor.' },
            { label: 'Okumuyor', value: 'fail', score: 0, reportText: 'Sensör camı kırık veya arızalı.', isBad: true },
          ]
        },
        {
          id: 'crown',
          label: 'Crown (Teker)',
          options: [
            { label: 'Aktif', value: 'ok', score: 10, reportText: 'Digital Crown tuşu ve dönmesi aktif.' },
            { label: 'Basmıyor/Dönmüyor', value: 'fail', score: 0, reportText: 'Tekerlek tuşu arızalı.', isBad: true },
          ]
        }
      ]
    }
  ]
};