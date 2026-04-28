const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const yearEl = document.getElementById('year');
const leadForm = document.getElementById('leadForm');

if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const onScroll = () => {
  if (!navbar) return;
  if (window.scrollY > 12) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

// Hero car carousel — slide left transition
const heroImages = document.querySelectorAll('.hero-car-img');
if (heroImages.length > 1) {
  let current = 0;
  setInterval(() => {
    const outgoing = heroImages[current];
    current = (current + 1) % heroImages.length;
    const incoming = heroImages[current];

    outgoing.classList.remove('hero-car-active');
    outgoing.classList.add('hero-car-exit');

    incoming.classList.remove('hero-car-exit');
    incoming.classList.add('hero-car-active');

    outgoing.addEventListener('transitionend', () => {
      outgoing.classList.remove('hero-car-exit');
    }, { once: true });
  }, 5000);
}

if (leadForm) {
  leadForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const btn = leadForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.textContent = 'Thanks — we will be in touch →';
      btn.disabled = true;
    }
  });
}
