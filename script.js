document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons safely
    if (typeof lucide !== 'undefined') {
        try {
            lucide.createIcons();
        } catch (e) {
            console.error("Lucide icons failed to initialize:", e);
        }
    }

    // 2. Set Current Year in Footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // 3. Scroll Animations (Intersection Observer)
    setupScrollAnimations();

    // 4. Form Submit Simulation
    setupForm();

    // 5. Category Filtering
    setupCategoryFilter();

    // 6. Modals
    setupModals();
});

function setupScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.05
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll('.fade-in-scroll');
    elementsToAnimate.forEach(el => observer.observe(el));

    // FAILSAFE: Eğer IntersectionObserver tetiklenmezse veya elemanlar gizli kalırsa,
    // 1.5 saniye sonra otomatik olarak tüm elemanları görünür yap.
    setTimeout(() => {
        document.querySelectorAll('.fade-in-scroll:not(.visible)').forEach(el => {
            el.classList.add('visible');
        });
    }, 1500);
}

function setupForm() {
    const form = document.querySelector('.notify-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = `<i data-lucide="check"></i> <span>Kaydedildi</span>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)'; // Green
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = ''; // Reset
                form.reset();
            }, 3000);
        });
    }
}

function setupCategoryFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const bentoCards = document.querySelectorAll('.bento-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            bentoCards.forEach(card => {
                card.classList.remove('visible');
                
                if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                    card.classList.remove('hide');
                    setTimeout(() => {
                        card.classList.add('visible');
                    }, 50);
                } else {
                    card.classList.add('hide');
                }
            });
        });
    });
}


// Modal Data Dictionary
const featureDetailsData = {
    'teknik-servis': {
        title: 'Teknik Servis Yönetimi',
        desc: 'Gelişmiş teknik servis modülü ile cihaz kabulünden teslimata kadar tüm süreçleri profesyonelce yönetin.',
        icon: '<i data-lucide="wrench"></i>',
        items: [
            { title: '24 Aşamalı Durum Takibi', text: 'Cihazın servisteki her anını takip edin (Örn: Parça Bekliyor, Onay Bekliyor, Onarıldı).' },
            { title: 'Yedek Cihaz Modülü', text: 'Müşteriye verilen yedek cihazların IMEI takibi ve zimmet sözleşmeleri.' },
            { title: 'Müşteri Onay Sistemi', text: 'Maliyet çıktığında müşteriye SMS ile onay linki gider, müşteri tek tıkla onaylar veya reddeder.' }
        ]
    },
    'alis-satis': {
        title: 'Alış-Satış & 2.El',
        desc: 'Sıfır ve ikinci el cihaz alım/satım işlemlerinde tam yasal uyumluluk ve otomatik evrak üretimi.',
        icon: '<i data-lucide="shopping-cart"></i>',
        items: [
            { title: '2. El Alım Sihirbazı', text: 'Kimlik okuma, e-Devlet IMEI sorgusu ve otomatik PUS (Gider Pusulası) oluşturma.' },
            { title: 'KVKK ve Sözleşmeler', text: 'Satış anında otomatik KVKK metni, garanti belgesi ve teslimat formu yazdırılır.' },
            { title: 'Barkodlu Hızlı Satış', text: 'Kasa modülüyle entegre, okut-sat mantığıyla saniyeler içinde işlem.' }
        ]
    },
    'stok': {
        title: 'Stok & Tedarik',
        desc: 'Şubeler arası transferler, kritik stok uyarıları ve detaylı tedarikçi yönetimi.',
        icon: '<i data-lucide="boxes"></i>',
        items: [
            { title: 'Çoklu Şube Yönetimi', text: 'Tüm şubelerinizin stoklarını tek ekrandan görün, tek tıkla transfer yapın.' },
            { title: 'Parça Sipariş Akışı', text: 'Servisteki cihaz için eksik parça anında tedarik listesine düşer, kısmi alım desteklenir.' },
            { title: 'Hurda ve Geri Dönüşüm', text: 'Kullanılamaz cihazları hurdaya ayırıp, çalışan parçalarını sağlam stoklara ekleyin.' }
        ]
    },
    'finans': {
        title: 'Finans ve Ön Muhasebe',
        desc: 'İşletmenizin nakit akışını, gelir-gider dengesini ve resmi muhasebe entegrasyonunu sağlayın.',
        icon: '<i data-lucide="wallet"></i>',
        items: [
            { title: 'Kasa & Banka Takibi', text: 'Günlük tahsilatlar, ödemeler ve nakit akış tablosu gerçek zamanlı.' },
            { title: 'Cari Hesap Yönetimi', text: 'Tedarikçi ve kurumsal müşterileriniz için detaylı bakiye ve ekstre takibi.' },
            { title: 'e-Fatura Entegrasyonu', text: 'Satış veya servis bitiminde tek tuşla e-Fatura/e-Arşiv kesimi.' }
        ]
    },
    'musteri-portali': {
        title: 'Müşteri Portalı',
        desc: 'Müşterilerinize kendi cihazlarını şeffaf bir şekilde takip edebilecekleri özel bir alan sunun.',
        icon: '<i data-lucide="users"></i>',
        items: [
            { title: 'Canlı Durum Takibi', text: 'Müşteri, telefon numarası ve takip koduyla cihazının hangi aşamada olduğunu görür.' },
            { title: 'Geçmiş İşlemler', text: 'Müşterinin geçmişte aldığı tüm servis hizmetleri ve satın almalar dijital arşivinde.' },
            { title: 'Online Ödeme', text: 'Servis ücretini portal üzerinden 3D secure ile kredi kartıyla ödeme imkanı.' }
        ]
    },
    'raporlar': {
        title: 'Raporlar ve Dashboard',
        desc: 'İşletmenizin performansını analiz edin, veri odaklı kararlar alın.',
        icon: '<i data-lucide="bar-chart-2"></i>',
        items: [
            { title: 'Teknisyen Performansı', text: 'Hangi teknisyen günde kaç cihaz onardı, geri dönüş oranları nedir?' },
            { title: 'Marka & Model Analizi', text: 'En çok hangi marka cihazlar arıza yapıyor, hangi parçalar daha çok tüketiliyor.' },
            { title: 'Finansal Analiz', text: 'Geçen aya göre kar/zarar durumu, en karlı servis hizmetleri grafikleri.' }
        ]
    }
};

function setupModals() {
    const modal = document.getElementById('feature-modal');
    const closeBtn = document.querySelector('.modal-close');
    const viewBtns = document.querySelectorAll('.view-details-btn');
    
    if (!modal) return;

    // Elements inside modal
    const mIcon = document.getElementById('modal-icon');
    const mTitle = document.getElementById('modal-title');
    const mDesc = document.getElementById('modal-desc');
    const mList = document.getElementById('modal-details-list');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const data = featureDetailsData[targetId];
            
            if (data) {
                // Populate modal
                mIcon.innerHTML = data.icon;
                mTitle.textContent = data.title;
                mDesc.textContent = data.desc;
                
                mList.innerHTML = '';
                data.items.forEach(item => {
                    mList.innerHTML += `
                        <div class="modal-detail-item">
                            <i data-lucide="check-circle-2"></i>
                            <div>
                                <h4>${item.title}</h4>
                                <p>${item.text}</p>
                            </div>
                        </div>
                    `;
                });
                
                if (typeof lucide !== 'undefined') lucide.createIcons();
                
                // Show modal
                modal.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent background scrolling
            }
        });
    });

    // Close modal functions
    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}
