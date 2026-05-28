// Initialize Lucide Icons
lucide.createIcons();

document.addEventListener('DOMContentLoaded', () => {
    // Set Current Year in Footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // 1. Scroll Animations (Intersection Observer)
    setupScrollAnimations();

    // 2. Form Submit Simulation
    const form = document.querySelector('.notify-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const originalText = btn.innerHTML;
            
            btn.innerHTML = `<i data-lucide="check"></i> <span>Kaydedildi</span>`;
            lucide.createIcons();
            btn.style.background = 'linear-gradient(135deg, #10b981, #059669)'; // Green
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = ''; // Reset
                form.reset();
            }, 3000);
        });
    }
});

function setupScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once animated to keep them visible
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const elementsToAnimate = document.querySelectorAll('.fade-in-scroll');
    elementsToAnimate.forEach(el => observer.observe(el));
}
