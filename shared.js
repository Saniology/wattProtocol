/* ═══════════════════════════════════════════════════════
   $WATT PROTOCOL — SHARED NAV + FOOTER + CURSOR
   Include this script on every page
   ═══════════════════════════════════════════════════════ */

(function() {
  // ── Detect current page
  const path = window.location.pathname.split('/').pop() || 'index.html';

  // ── Announcement banner (fetched from server, shown on all pages) ──────
  const _apiBase = window.location.port === '3000' ? '' : 'http://localhost:3000';
  document.body.insertAdjacentHTML('afterbegin',
    '<div id="watt-announcement" style="display:none;background:#f5e642;color:#080808;font-family:\'Courier New\',monospace;font-size:12px;font-weight:700;letter-spacing:0.08em;text-align:center;padding:10px 48px;position:fixed;top:0;left:0;right:0;z-index:1001;"></div>'
  );
  fetch(`${_apiBase}/api/announcement`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.announcement && data.announcement.trim()) {
        const el = document.getElementById('watt-announcement');
        if (el) {
          el.textContent = data.announcement.trim();
          el.style.display = 'block';
          // Push nav down so it sits below the banner
          const bannerH = el.offsetHeight;
          const nav = document.getElementById('watt-nav');
          const mob = document.getElementById('navMobile');
          if (nav) nav.style.top = bannerH + 'px';
          if (mob) mob.style.top = (bannerH + 72) + 'px';
          // Also add top padding to <body> so page content isn't hidden behind banner+nav
          document.body.style.paddingTop = bannerH + 'px';
        }
        // Populate homepage announcement section if present
        const strip = document.getElementById('announcement-strip');
        if (strip && data.announcement && data.announcement.trim()) {
          strip.querySelector('.announcement-strip-text').textContent = data.announcement.trim();
          strip.style.display = 'flex';
        }
      }
    })
    .catch(() => {/* server not running — silently ignore */});

  // ── Inject cursor
  document.body.insertAdjacentHTML('afterbegin', `
    <div id="watt-cursor"></div>
    <div id="watt-cursor-ring"></div>
  `);

  // ── Inject Nav
  document.body.insertAdjacentHTML('afterbegin', `
    <nav id="watt-nav">
      <a href="index.html" class="nav-logo">
        <svg width="32" height="32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="navlg" cx="38%" cy="30%" r="75%"><stop offset="0%" stop-color="#FFF8CC"/><stop offset="28%" stop-color="#F5C518"/><stop offset="62%" stop-color="#D4920E"/><stop offset="100%" stop-color="#8A5500"/></radialGradient><mask id="navlm"><rect width="128" height="128" fill="white"/><path d="M73 20 L48 64 H66 L58 108 L82 60 H65 Z" fill="black"/></mask></defs><circle cx="64" cy="64" r="64" fill="#070400"/><circle cx="64" cy="64" r="56" fill="url(#navlg)" mask="url(#navlm)"/><path d="M73 20 L48 64 H66 L58 108 L82 60 H65 Z" fill="#070400"/><circle cx="64" cy="64" r="62" stroke="#F5C518" stroke-width="1.5" stroke-opacity="0.35" fill="none"/></svg>
        <span>$WATT</span>
        <div class="nav-logo-dot"></div>
      </a>
      <ul class="nav-links">
        <li><a href="index.html" ${path==='index.html'?'class="active"':''}>Home</a></li>
        <li><a href="how-it-works.html" ${path==='how-it-works.html'?'class="active"':''}>How It Works</a></li>
        <li><a href="token.html" ${path==='token.html'?'class="active"':''}>Token</a></li>
        <li><a href="community.html" ${path==='community.html'?'class="active"':''}>Community</a></li>
        <li><a href="whitepaper.html" ${path==='whitepaper.html'?'class="active"':''}>Whitepaper</a></li>
        <li><a href="about.html" ${path==='about.html'?'class="active"':''}>About</a></li>
        <li><a href="dashboard.html" ${path==='dashboard.html'?'class="active"':''}>Dashboard</a></li>
        <li><a href="index.html#waitlist" class="nav-cta">Join Waitlist</a></li>
      </ul>
      <button class="nav-burger" id="navBurger" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </nav>
    <div class="nav-mobile" id="navMobile">
      <a href="index.html">Home</a>
      <a href="how-it-works.html">How It Works</a>
      <a href="token.html">Token</a>
      <a href="community.html">Community & SDG</a>
      <a href="whitepaper.html">Whitepaper</a>
      <a href="about.html">About</a>
      <a href="dashboard.html">Dashboard</a>
      <a href="index.html#waitlist" style="color:var(--yellow)">⚡ Join Waitlist</a>
    </div>
  `);

  // ── Inject Footer
  document.body.insertAdjacentHTML('beforeend', `
    <footer id="watt-footer">
      <div class="footer-top">
        <div>
          <div class="footer-brand-logo" style="display:flex;align-items:center;gap:12px;"><svg width="40" height="40" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="dFt" cx="38%" cy="30%" r="75%"><stop offset="0%" stop-color="#FFF8CC"/><stop offset="28%" stop-color="#F5C518"/><stop offset="62%" stop-color="#D4920E"/><stop offset="100%" stop-color="#8A5500"/></radialGradient><mask id="mFt"><rect width="128" height="128" fill="white"/><path d="M73 20 L48 64 H66 L58 108 L82 60 H65 Z" fill="black"/></mask></defs><circle cx="64" cy="64" r="64" fill="#070400"/><circle cx="64" cy="64" r="56" fill="url(#dFt)" mask="url(#mFt)"/><path d="M73 20 L48 64 H66 L58 108 L82 60 H65 Z" fill="#070400"/><circle cx="64" cy="64" r="62" stroke="#F5C518" stroke-width="1.5" stroke-opacity="0.35" fill="none"/></svg><span>$WATT</span></div>
          <p class="footer-brand-desc">A decentralized protocol rewarding individuals worldwide for generating renewable energy. Born in Africa. Built for the World.</p>
          <div class="footer-socials">
            <a class="footer-social" href="#" title="X / Twitter">𝕏</a>
            <a class="footer-social" href="#" title="Telegram">✈</a>
            <a class="footer-social" href="#" title="Discord">◈</a>
            <a class="footer-social" href="#" title="LinkedIn">in</a>
            <a class="footer-social" href="#" title="Instagram">◻</a>
            <a class="footer-social" href="#" title="YouTube">▶</a>
          </div>
        </div>
        <div class="footer-col">
          <div class="footer-col-title">Protocol</div>
          <ul>
            <li><a href="how-it-works.html">How It Works</a></li>
            <li><a href="token.html">Tokenomics</a></li>
            <li><a href="whitepaper.html">Whitepaper</a></li>
            <li><a href="community.html">SDG Impact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <div class="footer-col-title">Company</div>
          <ul>
            <li><a href="about.html">About</a></li>
            <li><a href="about.html#team">Team</a></li>
            <li><a href="#">Press Kit</a></li>
            <li><a href="#">Careers</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <div class="footer-col-title">Resources</div>
          <ul>
            <li><a href="#">GitHub</a></li>
            <li><a href="#">Documentation</a></li>
            <li><a href="#">Grant Applications</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="footer-copy">© 2025 $WATT Protocol · Velion Global Technologies</span>
        <div class="footer-live"><div class="footer-live-dot"></div> Building on Base Network</div>
        <span class="footer-legal"><a href="privacy.html" style="color:inherit;text-decoration:none;">Privacy</a> · <a href="terms.html" style="color:inherit;text-decoration:none;">Terms</a> · Not Financial Advice</span>
      </div>
    </footer>
  `);

  // ── Cursor logic
  const cur = document.getElementById('watt-cursor');
  const ring = document.getElementById('watt-cursor-ring');
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cur.style.left=mx+'px'; cur.style.top=my+'px';
  });
  function animRing(){
    rx+=(mx-rx)*0.11; ry+=(my-ry)*0.11;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(animRing);
  }
  animRing();
  document.querySelectorAll('a,button,.card,.hover-target').forEach(el=>{
    el.addEventListener('mouseenter',()=>{cur.classList.add('hover');ring.classList.add('hover');});
    el.addEventListener('mouseleave',()=>{cur.classList.remove('hover');ring.classList.remove('hover');});
  });

  // ── Nav scroll
  const nav = document.getElementById('watt-nav');
  window.addEventListener('scroll',()=>{
    nav.classList.toggle('scrolled', window.scrollY > 60);
  });

  // ── Mobile nav
  document.getElementById('navBurger').addEventListener('click',()=>{
    document.getElementById('navMobile').classList.toggle('open');
  });

  // ── Scroll reveal
  const observer = new IntersectionObserver(entries=>{
    entries.forEach((e,i)=>{
      if(e.isIntersecting){
        setTimeout(()=>e.target.classList.add('visible'), i*80);
      }
    });
  },{threshold:0.08});
  document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

  // ── Waitlist form handler (shared)
  document.addEventListener('submit', e=>{
    if(e.target.classList.contains('waitlist-form')){
      e.preventDefault();
      const input = e.target.querySelector('input[type="email"]');
      const btn = e.target.querySelector('button');
      const msg = e.target.nextElementSibling;
      if(input && input.value.includes('@')){
        btn.textContent = '⚡ You\'re In!';
        btn.style.background = 'var(--green)';
        btn.style.color = 'var(--black)';
        if(msg) msg.style.display='block';
        input.value='';
        setTimeout(()=>{ btn.textContent='Join Now'; btn.style.background=''; btn.style.color=''; },4000);
      }
    }
  });

})();

/* ═══════════════════════════════════════════════════════
   GLOBAL TOAST SYSTEM
   Usage: window.wattToast('Message', 'success'|'error'|'info')
   ═══════════════════════════════════════════════════════ */
(function() {
  // Inject toast container + styles
  const style = document.createElement('style');
  style.textContent = `
    #watt-toast-container {
      position: fixed; bottom: 28px; right: 28px; z-index: 99999;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    }
    .watt-toast {
      display: flex; align-items: center; gap: 12px;
      background: #1a1a1a; border: 1px solid #333;
      color: #fff; font-family: 'Courier New', monospace;
      font-size: 12px; font-weight: 700; letter-spacing: 0.06em;
      padding: 14px 20px; min-width: 260px; max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      transform: translateX(120%); opacity: 0;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease;
      pointer-events: auto;
    }
    .watt-toast.show { transform: translateX(0); opacity: 1; }
    .watt-toast.hide { transform: translateX(120%); opacity: 0; }
    .watt-toast-bar { width: 3px; height: 36px; flex-shrink: 0; }
    .watt-toast.success .watt-toast-bar { background: #22c55e; }
    .watt-toast.error   .watt-toast-bar { background: #ef4444; }
    .watt-toast.info    .watt-toast-bar { background: #f5e642; }
    .watt-toast-icon { font-size: 15px; flex-shrink: 0; }
    .watt-toast-msg { flex: 1; line-height: 1.5; }
    .watt-toast-close { background: none; border: none; color: #555; font-size: 16px; cursor: pointer; padding: 0 0 0 8px; flex-shrink: 0; line-height: 1; transition: color 0.15s; }
    .watt-toast-close:hover { color: #fff; }
    @media (max-width: 500px) {
      #watt-toast-container { left: 16px; right: 16px; bottom: 16px; }
      .watt-toast { min-width: 0; }
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'watt-toast-container';
  document.body.appendChild(container);

  const icons = { success: '✓', error: '✕', info: '⚡' };

  window.wattToast = function(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `watt-toast ${type}`;
    toast.innerHTML = `
      <div class="watt-toast-bar"></div>
      <span class="watt-toast-icon">${icons[type] || '⚡'}</span>
      <span class="watt-toast-msg">${message}</span>
      <button class="watt-toast-close" aria-label="Dismiss">✕</button>
    `;
    container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    const dismiss = () => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 350);
    };

    toast.querySelector('.watt-toast-close').addEventListener('click', dismiss);
    if (duration > 0) setTimeout(dismiss, duration);
    return dismiss;
  };
})();

/* ═══════════════════════════════════════════════════════
   GDPR COOKIE CONSENT BANNER
   Shows once, stores choice in localStorage.
   Sets watt_ref cookie only after consent.
   ═══════════════════════════════════════════════════════ */
(function() {
  const CONSENT_KEY = 'watt_cookie_consent';
  if (localStorage.getItem(CONSENT_KEY)) return; // already decided

  const style = document.createElement('style');
  style.textContent = `
    #watt-consent {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 99990;
      background: #111; border-top: 1px solid #2a2a2a;
      padding: 18px 32px; display: flex; align-items: center;
      gap: 20px; flex-wrap: wrap; justify-content: space-between;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.34,1.2,0.64,1);
      box-shadow: 0 -8px 32px rgba(0,0,0,0.5);
    }
    #watt-consent.show { transform: translateY(0); }
    #watt-consent p {
      font-family: 'Inter', sans-serif; font-size: 13px; color: #888;
      line-height: 1.6; margin: 0; flex: 1; min-width: 240px;
    }
    #watt-consent a { color: #f5e642; text-decoration: none; }
    #watt-consent a:hover { text-decoration: underline; }
    #watt-consent-btns { display: flex; gap: 10px; flex-shrink: 0; }
    #watt-consent-accept {
      background: #f5e642; color: #080808; border: none;
      font-family: 'Courier New', monospace; font-size: 10px; font-weight: 700;
      letter-spacing: 0.15em; text-transform: uppercase; padding: 10px 20px; cursor: pointer;
      transition: background 0.2s;
    }
    #watt-consent-accept:hover { background: #ffe100; }
    #watt-consent-decline {
      background: none; border: 1px solid #333; color: #555;
      font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.1em;
      text-transform: uppercase; padding: 10px 16px; cursor: pointer; transition: all 0.15s;
    }
    #watt-consent-decline:hover { border-color: #555; color: #888; }
    @media (max-width: 600px) {
      #watt-consent { padding: 16px 20px; gap: 14px; }
      #watt-consent-btns { width: 100%; }
      #watt-consent-accept, #watt-consent-decline { flex: 1; text-align: center; }
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.id = 'watt-consent';
  banner.innerHTML = `
    <p>We use a single cookie (<code style="color:#fff;font-size:11px">watt_ref</code>) to track referral codes for 7 days so that referral credit is correctly attributed. No advertising or third-party tracking.
    <a href="privacy.html"> Learn more →</a></p>
    <div id="watt-consent-btns">
      <button id="watt-consent-decline">Decline</button>
      <button id="watt-consent-accept">Accept Cookies</button>
    </div>
  `;
  document.body.appendChild(banner);
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('show')));

  const dismiss = (accepted) => {
    localStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'declined');
    banner.style.transform = 'translateY(100%)';
    setTimeout(() => banner.remove(), 400);
  };

  document.getElementById('watt-consent-accept').addEventListener('click', () => dismiss(true));
  document.getElementById('watt-consent-decline').addEventListener('click', () => dismiss(false));
})();
