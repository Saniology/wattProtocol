/* ═══════════════════════════════════════════════════════
   $WATT PROTOCOL — SHARED NAV + FOOTER + CURSOR
   Include this script on every page
   ═══════════════════════════════════════════════════════ */

(function() {
  // ── Detect current page
  const path = window.location.pathname.split('/').pop() || 'index.html';

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
        <span class="footer-legal">Privacy · Terms · Not Financial Advice</span>
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
