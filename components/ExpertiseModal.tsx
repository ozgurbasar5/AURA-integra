// data/expertiseSteps.ts

export type Option = {
  label: string;
  value: string;
  score: number; // 100 üzerinden hesaplanacak puan etkisi
  reportText: string;
  isBad?: boolean; // Kırmızı işaretlemek için
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
  phone: [
    {
      id: 'screen_group',
      title: 'EKRAN & GÖRÜNTÜ',
      icon: '📱',
      steps: [
        {
          id: 'glass',
          label: 'Ön Cam',
          options: [
            { label: 'Çiziksiz', value: 'perfect', score: 10, reportText: 'Ön camda çizik yoktur.' },
            { label: 'Kılcal Çizik', value: 'light_scratch', score: 8, reportText: 'Kullanıma engel olmayan kılcal çizikler mevcuttur.' },
            { label: 'Kırık/Çatlak', value: 'broken', score: 0, reportText: 'Ön camda çatlaklar mevcuttur.', isBad: true },
          ]
        },
        {
          id: 'touch',
          label: 'Dokunmatik',
          options: [
            { label: 'Sorunsuz', value: 'pass', score: 10, reportText: 'Dokunmatik hassasiyeti tamdır.' },
            { label: 'Hatalı', value: 'fail', score: 0, reportText: 'Dokunmatik panelde ölü bölgeler var.', isBad: true },
          ]
        },
        {
            id: 'display',
            label: 'Leke / Piksel',
            options: [
              { label: 'Temiz', value: 'clean', score: 10, reportText: 'Görüntüde leke veya ölü piksel yoktur.' },
              { label: 'Lekeli', value: 'spot', score: 0, reportText: 'Ekranda leke/ışık sızması mevcuttur.', isBad: true },
            ]
        }
      ]
    },
    {
      id: 'battery_group',
      title: 'GÜÇ & BATARYA',
      icon: '🔋',
      steps: [
        {
          id: 'battery_health',
          label: 'Pil Sağlığı',
          options: [
            { label: '%90-100', value: 'perfect', score: 20, reportText: 'Batarya sağlığı mükemmel durumdadır.' },
            { label: '%80-90', value: 'good', score: 15, reportText: 'Batarya performansı normal seviyededir.' },
            { label: 'Servis', value: 'service', score: 5, reportText: 'Batarya ömrünü tamamlamıştır.', isBad: true },
          ]
        },
         {
          id: 'charging',
          label: 'Şarj Soketi',
          options: [
            { label: 'Sorunsuz', value: 'pass', score: 10, reportText: 'Şarj soketi sağlamdır, akım değerleri normal.' },
            { label: 'Temassızlık', value: 'loose', score: 5, reportText: 'Şarj girişinde temassızlık var.', isBad: true },
          ]
        }
      ]
    },
    {
      id: 'hardware',
      title: 'DONANIM',
      icon: '⚙️',
      steps: [
        {
          id: 'faceid',
          label: 'FaceID/TouchID',
          options: [
            { label: 'Aktif', value: 'pass', score: 15, reportText: 'Biyometrik okuyucular sorunsuz çalışmaktadır.' },
            { label: 'Arızalı', value: 'fail', score: 0, reportText: 'FaceID/TouchID çalışmamaktadır.', isBad: true },
          ]
        },
        {
            id: 'wifi',
            label: 'Wi-Fi / Şebeke',
            options: [
              { label: 'Sorunsuz', value: 'pass', score: 10, reportText: 'Şebeke ve Wi-Fi sinyal değerleri normaldir.' },
              { label: 'Zayıf/Hatalı', value: 'fail', score: 0, reportText: 'Bağlantı sorunları tespit edilmiştir.', isBad: true },
            ]
        }
      ]
    },
    {
        id: 'cosmetic',
        title: 'KOZMETİK',
        icon: '💎',
        steps: [
          {
            id: 'case',
            label: 'Kasa Durumu',
            options: [
              { label: '10/10 Hatasız', value: 'mint', score: 15, reportText: 'Kasa kozmetiği kusursuzdur.' },
              { label: 'Kılcal İzler', value: 'good', score: 10, reportText: 'Kasa çevresinde ufak kullanım izleri vardır.' },
              { label: 'Darbe/Ezik', value: 'bad', score: 5, reportText: 'Kasa köşelerinde darbeler mevcuttur.', isBad: true },
            ]
          }
        ]
      }
  ],
  robot: [
    {
      id: 'lidar_group',
      title: 'LİDAR & SENSÖR',
      icon: '📡',
      steps: [
        {
          id: 'lidar',
          label: 'Lidar Kulesi',
          options: [
            { label: 'Dönüyor', value: 'pass', score: 25, reportText: 'Lidar motoru ve lazeri sorunsuz çalışmaktadır.' },
            { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Lidar kulesi dönmüyor veya lazer hatası var.', isBad: true },
          ]
        },
        {
            id: 'sensors',
            label: 'Düşme Sensörü',
            options: [
              { label: 'Aktif', value: 'pass', score: 10, reportText: 'Sensörler düşmeyi engelliyor, aktiftir.' },
              { label: 'Kirli/Bozuk', value: 'fail', score: 0, reportText: 'Sensör hatası tespit edildi.', isBad: true },
            ]
          }
      ]
    },
    {
      id: 'motor_group',
      title: 'MOTORLAR',
      icon: '🧹',
      steps: [
        {
          id: 'main_brush',
          label: 'Ana Fırça',
          options: [
            { label: 'Sorunsuz', value: 'pass', score: 15, reportText: 'Ana fırça motoru güçlü çalışıyor.' },
            { label: 'Sıkışık', value: 'fail', score: 0, reportText: 'Ana fırça motoru zorlanıyor.', isBad: true },
          ]
        },
        {
            id: 'wheels',
            label: 'Tekerlekler',
            options: [
              { label: 'Sorunsuz', value: 'pass', score: 15, reportText: 'Tekerlek motorları ve amortisörler sağlam.' },
              { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Tekerlek motorunda arıza var.', isBad: true },
            ]
        }
      ]
    },
    {
        id: 'mop_group',
        title: 'PASPAS SİSTEMİ',
        icon: '💧',
        steps: [
            {
                id: 'pump',
                label: 'Su Pompası',
                options: [
                    { label: 'Su Veriyor', value: 'pass', score: 20, reportText: 'Su pompası aktif, damlatma yapıyor.' },
                    { label: 'Tıkanık', value: 'fail', score: 0, reportText: 'Su gelmiyor (Pompa veya boru tıkalı).', isBad: true }
                ]
            },
            {
                id: 'tank',
                label: 'Su Tankı',
                options: [
                    { label: 'Sağlam', value: 'pass', score: 15, reportText: 'Su tankında sızdırma yok.' },
                    { label: 'Çatlak', value: 'leak', score: 0, reportText: 'Su tankı sızdırıyor/çatlak.', isBad: true }
                ]
            }
        ]
    }
  ],
  pc: [
    {
        id: 'perf_group',
        title: 'PERFORMANS',
        icon: '💻',
        steps: [
            {
                id: 'thermal',
                label: 'Isı Değerleri',
                options: [
                    { label: 'Normal', value: 'normal', score: 20, reportText: 'Termal macun bakımları yeni, ısı değerleri normal.' },
                    { label: 'Yüksek Isı', value: 'hot', score: 5, reportText: 'Cihaz yük altında aşırı ısınıyor.', isBad: true }
                ]
            },
            {
                id: 'ssd',
                label: 'Disk Sağlığı',
                options: [
                    { label: '%100 Sağlık', value: 'good', score: 20, reportText: 'SSD/HDD sağlık durumu %100.' },
                    { label: 'Bad Sector', value: 'bad', score: 0, reportText: 'Disk üzerinde bozuk sektörler var.', isBad: true }
                ]
            }
        ]
    },
    {
        id: 'screen_pc',
        title: 'EKRAN & KLAVYE',
        icon: '⌨️',
        steps: [
            {
                id: 'keyboard',
                label: 'Klavye',
                options: [
                    { label: 'Sorunsuz', value: 'pass', score: 20, reportText: 'Tüm tuşlar aktif çalışmaktadır.' },
                    { label: 'Eksik Tuş', value: 'fail', score: 10, reportText: 'Bazı tuşlar basmıyor veya eksik.', isBad: true }
                ]
            },
            {
                id: 'hinge',
                label: 'Menteşe',
                options: [
                    { label: 'Sağlam', value: 'pass', score: 20, reportText: 'Menteşe yapısı sağlam.' },
                    { label: 'Gevşek/Kırık', value: 'fail', score: 0, reportText: 'Kasa menteşelerinde hasar var.', isBad: true }
                ]
            }
        ]
    }
  ],
  watch: [
    {
        id: 'screen_watch',
        title: 'EKRAN & KASA',
        icon: '⌚️',
        steps: [
            {
                id: 'glass',
                label: 'Cam',
                options: [
                    { label: 'Çiziksiz', value: 'good', score: 40, reportText: 'Saat camında çizik yoktur.' },
                    { label: 'Çizik', value: 'bad', score: 20, reportText: 'Kılcal çizikler mevcuttur.' }
                ]
            },
            {
                id: 'sensors',
                label: 'Sensörler',
                options: [
                    { label: 'Aktif', value: 'pass', score: 40, reportText: 'Nabız ve oksijen sensörleri aktif.' },
                    { label: 'Arızalı', value: 'fail', score: 0, reportText: 'Arka sensör camı kırık veya arızalı.', isBad: true }
                ]
            }
        ]
    }
  ]
};