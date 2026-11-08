/* Le Coin des Filles — comportement du site (GSAP + ScrollTrigger + Lenis, tout en local) */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const PHONE = '+33610376613';

  clearTimeout(window.__fb);
  if (reduce) root.classList.add('rm');

  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) root.classList.add('nojs-fallback');

  /* ------------------------------------------------------------------
     Fonctions indépendantes de GSAP (fonctionnent même sans animation)
     ------------------------------------------------------------------ */

  // Année du footer
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  // Vidéo du hero : version adaptée à l'écran, image fixe si économie de données / mouvement réduit
  (function heroVideo() {
    const v = $('.hero__video'); if (!v) return;
    const saver = navigator.connection && navigator.connection.saveData;
    if (reduce || saver) return;
    v.src = innerWidth < 900 ? v.dataset.sd : v.dataset.hd;
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    const p = v.play(); if (p && p.catch) p.catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { const q = v.play(); if (q && q.catch) q.catch(() => {}); } });
  })();

  // Ouvert / fermé (heure de Paris)
  const HOURS = { 1: [510, 1110], 2: [510, 1110], 3: [510, 1110], 4: [510, 1110], 5: [510, 1110], 6: [540, 1140], 0: null };
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const fmt = m => { const h = Math.floor(m / 60), mm = m % 60; return h + ' h' + (mm ? ' ' + String(mm).padStart(2, '0') : ''); };
  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
    return { wd, min: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10) };
  }
  function openStatus() {
    const el = $('#openStatus'); const { wd, min } = parisNow();
    $$('.hours tr').forEach(tr => tr.classList.toggle('is-today', +tr.dataset.day === wd));
    if (!el) return;
    const today = HOURS[wd]; let txt, open = false;
    if (today && min >= today[0] && min < today[1]) { open = true; txt = 'Ouvert · jusqu’à ' + fmt(today[1]); }
    else {
      let d = wd, add = 0;
      if (today && min < today[0]) txt = 'Fermé · ouvre à ' + fmt(today[0]);
      else {
        do { d = (d + 1) % 7; add++; } while (!HOURS[d] && add < 8);
        txt = 'Fermé · ouvre ' + (add === 1 ? 'demain' : DAYS[d]) + ' à ' + fmt(HOURS[d][0]);
      }
    }
    el.classList.toggle('is-open', open);
    $('span', el).textContent = txt;
  }
  openStatus(); setInterval(openStatus, 60000);

  // Demande par SMS (aucun serveur : le téléphone prépare le message)
  (function sms() {
    const form = $('#smsForm'); if (!form) return;
    const prev = $('#smsPrev'), copy = $('#smsCopy');
    const build = () => {
      const f = new FormData(form);
      const jour = String(f.get('jour') || '').trim() || 'à convenir';
      return 'Bonjour Virginie, je suis ' + String(f.get('prenom') || '').trim() + '. Je souhaiterais réserver : ' + f.get('presta') +
        '. Jour souhaité : ' + jour + ' (' + String(f.get('moment')).toLowerCase() + '). Pouvez-vous me confirmer un créneau ? Merci !';
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const m = build();
      prev.textContent = '« ' + m + ' »'; copy.hidden = false;
      location.href = 'sms:' + PHONE + '?&body=' + encodeURIComponent(m);
    });
    copy.addEventListener('click', () => {
      const done = () => { copy.textContent = 'Message copié ✓'; };
      if (navigator.clipboard) navigator.clipboard.writeText(build()).then(done, done); else done();
    });
  })();

  // FAQ (un seul volet ouvert à la fois)
  $$('.qa').forEach(qa => {
    const btn = $('.qa__q', qa);
    btn.addEventListener('click', () => {
      const open = !qa.classList.contains('is-open');
      $$('.qa.is-open').forEach(o => { o.classList.remove('is-open'); $('.qa__q', o).setAttribute('aria-expanded', 'false'); });
      qa.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (hasGsap) setTimeout(() => ScrollTrigger.refresh(), 760);
    });
  });

  // Lightbox
  const lb = { el: $('#lb'), img: $('#lbImg'), cap: $('#lbCap'), items: [], i: 0 };
  (function lightbox() {
    lb.items = $$('.gi').map(f => ({ el: f, src: $('img', f).getAttribute('src'), alt: $('img', f).alt, cap: $('figcaption', f).textContent }));
    const show = i => {
      lb.i = (i + lb.items.length) % lb.items.length;
      const it = lb.items[lb.i]; lb.img.src = it.src; lb.img.alt = it.alt; lb.cap.textContent = it.cap;
    };
    const open = i => { show(i); lb.el.classList.add('is-open'); lb.el.setAttribute('aria-hidden', 'false'); if (window.__lenis) window.__lenis.stop(); $('#lbClose').focus(); };
    const close = () => { lb.el.classList.remove('is-open'); lb.el.setAttribute('aria-hidden', 'true'); if (window.__lenis) window.__lenis.start(); };
    lb.items.forEach((it, i) => {
      it.el.setAttribute('tabindex', '0'); it.el.setAttribute('role', 'button'); it.el.setAttribute('aria-label', 'Agrandir la photo : ' + it.cap);
      it.el.addEventListener('click', () => open(i));
      it.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); } });
    });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', () => show(lb.i - 1));
    $('#lbNext').addEventListener('click', () => show(lb.i + 1));
    lb.el.addEventListener('click', e => { if (e.target === lb.el) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.el.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(lb.i - 1);
      if (e.key === 'ArrowRight') show(lb.i + 1);
    });
  })();

  // Carrousel d'avis : défilement natif (snap), boutons, glisser à la souris, lecture auto douce
  (function reviews() {
    const rail = $('#revRail'); if (!rail) return;
    const bar = $('#revBar');
    const stepPx = () => { const q = $('.rq', rail); return q.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).columnGap || 24); };
    const upd = () => { const max = rail.scrollWidth - rail.clientWidth; bar.style.transform = 'scaleX(' + (.08 + .92 * (max > 0 ? rail.scrollLeft / max : 1)) + ')'; };
    rail.addEventListener('scroll', upd, { passive: true }); upd();
    const go = d => {
      const max = rail.scrollWidth - rail.clientWidth;
      if (d > 0 && rail.scrollLeft >= max - 4) rail.scrollTo({ left: 0, behavior: 'smooth' });
      else rail.scrollBy({ left: d * stepPx(), behavior: 'smooth' });
    };
    $('#revPrev').addEventListener('click', () => go(-1));
    $('#revNext').addEventListener('click', () => go(1));
    rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });

    // glisser à la souris
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; rail.style.scrollSnapType = 'none'; rail.style.scrollBehavior = 'auto'; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 3) moved = true; rail.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => {
      if (!down) return; down = false;
      rail.style.scrollSnapType = ''; rail.style.scrollBehavior = '';
      if (moved) rail.scrollBy({ left: 1, behavior: 'smooth' });
    });

    // lecture auto : seulement visible, jamais au survol / focus, jamais en mouvement réduit
    if (!reduce) {
      let timer = null, inView = false, hold = false;
      const tick = () => { if (inView && !hold && !document.hidden) go(1); };
      const start = () => { if (!timer) timer = setInterval(tick, 5200); };
      new IntersectionObserver(es => { inView = es[0].isIntersecting; if (inView) start(); }, { threshold: .4 }).observe(rail);
      ['pointerenter', 'focusin', 'touchstart'].forEach(ev => rail.addEventListener(ev, () => { hold = true; }, { passive: true }));
      ['pointerleave', 'focusout'].forEach(ev => rail.addEventListener(ev, () => { hold = false; }));
    }
  })();

  // CTA flottant mobile (visible après le hero, masqué sur la section réservation)
  (function fab() {
    const f = $('#fab'); if (!f) return;
    let pastHero = false, onBook = false;
    const set = () => f.classList.toggle('is-on', pastHero && !onBook);
    new IntersectionObserver(es => { pastHero = !es[0].isIntersecting; set(); }, { threshold: .55 }).observe($('.hero'));
    new IntersectionObserver(es => { onBook = es[0].isIntersecting; set(); }, { threshold: .25 }).observe($('.book'));
  })();

  /* ------------------------------------------------------------------
     Sans GSAP : menu simple + ancres natives, puis on s'arrête
     ------------------------------------------------------------------ */
  const burger = $('#burger'), menu = $('#menu');
  let menuOpen = false, menuTl = null, lenis = null;

  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', String(!open));
    const navEl = $('#nav'); navEl.classList.toggle('is-menu', open); if (open) navEl.classList.remove('is-hidden');
    if (lenis) open ? lenis.stop() : lenis.start();
    if (!hasGsap || reduce) { menu.style.visibility = open ? 'visible' : 'hidden'; menu.style.background = open ? '#0f0e0d' : ''; return; }
    if (open) {
      menu.style.visibility = 'visible';
      menuTl && menuTl.kill();
      menuTl = gsap.timeline()
        .fromTo('.menu__cols i', { scaleY: 0 }, { scaleY: 1, duration: .8, ease: 'expo.out', stagger: .06 }, 0)
        .fromTo('.menu__nav a', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'expo.out', stagger: .06 }, .25)
        .fromTo('.menu__foot', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'expo.out' }, .6);
    } else {
      menuTl && menuTl.kill();
      menuTl = gsap.timeline({ onComplete: () => { menu.style.visibility = 'hidden'; } })
        .to('.menu__nav a, .menu__foot', { opacity: 0, y: -20, duration: .35, ease: 'power2.in', stagger: .02 }, 0)
        .to('.menu__cols i', { scaleY: 0, transformOrigin: 'bottom', duration: .7, ease: 'expo.inOut', stagger: .05 }, .15)
        .set('.menu__cols i', { transformOrigin: 'top' });
    }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  if (!hasGsap) {
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', () => { if (menuOpen) setMenu(false); }));
    return;
  }

  /* ==================================================================
     GSAP + ScrollTrigger + Lenis
     ================================================================== */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: 'expo.out' });

  // Smooth scroll global
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .085, wheelMultiplier: .95, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // débloqué à la fin du loader
  }

  // Ancres
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href'); if (id.length < 2 && id !== '#') return;
      const target = id === '#' || id === '#top' ? 0 : $(id); if (target === null) return;
      e.preventDefault();
      if (menuOpen) setMenu(false);
      if (lenis) lenis.scrollTo(target, { duration: 1.7, easing: t => 1 - Math.pow(1 - t, 4), immediate: false, force: true });
      else (target === 0 ? window.scrollTo({ top: 0 }) : target.scrollIntoView());
    });
  });

  // ---------- découpage du texte (lettres / mots masqués) ----------
  function split(el, mode) {
    if (el.dataset.split_done) return $$('.ci', el);
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const out = [];
    const walk = (src, dst) => {
      src.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(w => {
            if (!w) return;
            if (/^\s+$/.test(w)) { dst.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span'); word.className = 'w' + (mode === 'words' ? ' wm' : ''); word.setAttribute('aria-hidden', 'true');
            if (mode === 'words') {
              const i = document.createElement('span'); i.className = 'ci'; i.textContent = w; word.appendChild(i); out.push(i);
            } else {
              Array.from(w).forEach(ch => {
                const o = document.createElement('span'); o.className = 'c';
                const i = document.createElement('span'); i.className = 'ci'; i.textContent = ch;
                o.appendChild(i); word.appendChild(o); out.push(i);
              });
            }
            dst.appendChild(word);
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { dst.appendChild(n.cloneNode()); return; }
          const c = n.cloneNode(false); dst.appendChild(c); walk(n, c);
        }
      });
    };
    const tmp = document.createElement('div'); walk(el, tmp);
    el.textContent = ''; while (tmp.firstChild) el.appendChild(tmp.firstChild);
    el.dataset.split_done = '1';
    return out;
  }

  const heroTitle = $('.hero__title');
  const heroChars = split(heroTitle, 'chars');

  // État initial du hero (le loader recouvre tout)
  gsap.set(heroChars, { yPercent: 118, rotate: 6 });
  gsap.set(['.hero__kicker', '.hero__lead', '.hero__cta > *', '.hero__chips > *', '.hero__scroll'], { opacity: 0, y: 30 });
  gsap.set('.hero__arch', { opacity: 0, scaleY: .6, transformOrigin: '50% 100%' });
  gsap.set('.spark', { scale: 0, opacity: 0 });
  gsap.set('.hero__vidwrap', { scale: 1.25 });
  gsap.set('.nav', { yPercent: -100 });

  // ---------- loader ----------
  function runLoader() {
    const num = $('#loaderNum');
    const crown = $('.loader__crown path');
    const len = crown.getTotalLength();
    gsap.set(crown, { strokeDasharray: len, strokeDashoffset: len });
    const cnt = { v: 0 };
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const pageLoaded = new Promise(res => { if (document.readyState === 'complete') res(); else addEventListener('load', res, { once: true }); setTimeout(res, 4500); });

    const intro = gsap.timeline();
    intro
      .to(crown, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
      .from('.loader__name', { yPercent: 40, opacity: 0, duration: 1 }, .2)
      .from('.loader__sub', { y: 12, opacity: 0, duration: .8 }, .45)
      .to(cnt, { v: 100, duration: 1.5, ease: 'power2.inOut', onUpdate: () => { num.textContent = String(Math.round(cnt.v)).padStart(3, '0'); } }, 0);

    Promise.all([new Promise(r => intro.eventCallback('onComplete', r)), pageLoaded, fontsReady]).then(() => {
      gsap.timeline({ onComplete: () => { $('.loader').style.display = 'none'; ScrollTrigger.refresh(); } })
        .to('.loader__core', { yPercent: -25, opacity: 0, duration: .55, ease: 'power3.in' }, 0)
        .to('.loader__count', { opacity: 0, duration: .35 }, 0)
        .to('.loader__col', { scaleY: 0, transformOrigin: i => (i % 2 ? '50% 0%' : '50% 100%'), duration: 1.15, ease: 'expo.inOut', stagger: { each: .07, from: 'center' } }, .35)
        .add(heroIntro, .75);
    });
  }

  // ---------- intro du hero ----------
  function heroIntro() {
    if (lenis) lenis.start();
    gsap.timeline()
      .to('.hero__vidwrap', { scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
      .to('.hero__kicker', { opacity: 1, y: 0, duration: 1 }, .1)
      .to(heroChars, { yPercent: 0, rotate: 0, duration: 1.4, stagger: .04 }, .15)
      .to('.hero__arch', { opacity: 1, scaleY: 1, duration: 1.8, ease: 'expo.inOut' }, .2)
      .to('.hero__lead', { opacity: 1, y: 0, duration: 1.1 }, .85)
      .to('.hero__cta > *', { opacity: 1, y: 0, duration: 1, stagger: .12 }, 1)
      .to('.hero__chips > *, .hero__scroll', { opacity: 1, y: 0, duration: 1, stagger: .1 }, 1.15)
      .to('.spark', { scale: 1, opacity: .9, duration: 1.2, stagger: .06, ease: 'back.out(2.2)' }, .9)
      .to('.nav', { yPercent: 0, duration: 1.1 }, 1.1)
      .add(() => {
        // Ken Burns lent sur la vidéo + scintillement des éclats
        gsap.to('.hero__video', { scale: 1.09, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 });
        $$('.spark').forEach(s => gsap.to(s, { scale: 'random(.55, 1.2)', opacity: 'random(.35, 1)', rotate: 'random(-25, 25)', duration: 'random(1.4, 2.8)', repeat: -1, yoyo: true, ease: 'sine.inOut' }));
      }, 2.2);
  }

  if (reduce) {
    gsap.set([heroChars, '.hero__kicker', '.hero__lead', '.hero__cta > *', '.hero__chips > *', '.hero__scroll', '.hero__arch', '.spark', '.hero__vidwrap', '.nav'], { clearProps: 'all' });
  } else {
    runLoader();
  }

  // ---------- barre de progression, navigation ----------
  gsap.to('.progress__bar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  const nav = $('#nav');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > 80);
      nav.classList.toggle('is-hidden', y > 260 && self.direction === 1 && !menuOpen);
      if (self.direction === -1) nav.classList.remove('is-hidden');
    }
  });

  if (!reduce) {
    // ---------- parallax multicouche du hero ----------
    const heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__media', { yPercent: 12, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hero__stripes', { yPercent: -8, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hero__arch', { yPercent: -26, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hero__sparks', { yPercent: -45, ease: 'none', scrollTrigger: heroST });
    gsap.to('.hero__content', { yPercent: -14, opacity: .1, ease: 'none', scrollTrigger: { ...heroST, end: 'bottom 30%' } });

    // parallax à la souris (desktop)
    if (fine) {
      const layers = $$('.spark, .hero__arch').map(el => ({ el, d: parseFloat(el.dataset.depth || 30), x: gsap.quickTo(el, 'x', { duration: 1.4, ease: 'power3.out' }), y: gsap.quickTo(el, 'y', { duration: 1.4, ease: 'power3.out' }) }));
      $('.hero').addEventListener('pointermove', e => {
        const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
        layers.forEach(l => { l.x(-nx * l.d); l.y(-ny * l.d); });
      });
    }
  }

  // ---------- titres : lettres qui montent, une par une ----------
  $$('[data-split]').forEach(el => {
    const chars = split(el, el.dataset.split === 'words' ? 'words' : 'chars');
    if (reduce) return;
    gsap.set(chars, { yPercent: 115 });
    gsap.to(chars, { yPercent: 0, duration: 1.25, stagger: { each: .022, from: 'start' }, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
  });

  if (reduce) {
    initStaticBits();
    return finish();
  }

  // ---------- révélations en lot ----------
  gsap.set('[data-reveal]', { opacity: 0, y: 46 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, stagger: .1, ease: 'expo.out', overwrite: true })
  });

  // ---------- images : masques (rideau / cercle / arche) + zoom doux ----------
  $$('.rv').forEach(el => {
    const type = el.dataset.rv || 'up';
    const from = { up: 'inset(100% 0% 0% 0%)', down: 'inset(0% 0% 100% 0%)', left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)', arch: 'circle(0% at 50% 100%)' }[type];
    const to = type === 'arch' ? 'circle(150% at 50% 100%)' : 'inset(0% 0% 0% 0%)';
    const st = { trigger: el, start: 'top 90%', once: true };
    gsap.fromTo(el, { clipPath: from }, { clipPath: to, duration: 1.6, ease: 'expo.out', scrollTrigger: st });
    gsap.from($('.rv__in', el), { scale: 1.4, duration: 2.1, ease: 'expo.out', scrollTrigger: st });
    // l'image bouge un peu dans son cadre au scroll
    gsap.fromTo($('img', el), { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // ---------- bandeau défilant réactif au scroll ----------
  (function marquee() {
    const rows = $$('.marquee__row').map(r => {
      const dir = parseFloat(r.dataset.dir);
      return { r, dir, x: 0, width: 0, set: gsap.quickSetter(r, 'x', 'px') };
    });
    const measure = () => rows.forEach(o => { o.width = o.r.firstElementChild.getBoundingClientRect().width; if (o.dir > 0 && o.x === 0) o.x = -o.width; });
    measure();
    ScrollTrigger.addEventListener('refresh', measure);
    let vel = 0, sdir = 1;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { vel = s.getVelocity(); if (vel !== 0) sdir = vel > 0 ? 1 : -1; } });
    gsap.ticker.add((t, dt) => {
      vel *= .92;
      const boost = 1 + Math.min(Math.abs(vel), 3200) / 900;   // plus on scrolle vite, plus ça file
      rows.forEach(o => {
        if (!o.width) return;
        o.x += o.dir * (70 * boost) * sdir * (dt / 1000);        // le sens s'inverse en remontant
        if (o.x <= -o.width) o.x += o.width;
        if (o.x > 0) o.x -= o.width;
        o.set(o.x);
      });
    });
  })();

  // ---------- chiffres animés ----------
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), o = { v: 0 };
    el.textContent = (0).toFixed(dec).replace('.', ',');
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = o.v.toFixed(dec).replace('.', ','); } })
    });
  });
  gsap.to('.stats__stripes', { x: -88, ease: 'none', scrollTrigger: { trigger: '.stats', start: 'top bottom', end: 'bottom top', scrub: true } });

  // ---------- galerie : colonnes en parallax ----------
  $$('.gal__col').forEach(col => {
    gsap.to(col, { yPercent: parseFloat(col.dataset.speed), ease: 'none', scrollTrigger: { trigger: '.gal__cols', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // ---------- carrousel d'avis : entrée des cartes ----------
  gsap.from('.rq', { y: 70, opacity: 0, duration: 1.3, stagger: .09, ease: 'expo.out', scrollTrigger: { trigger: '#revRail', start: 'top 88%', once: true } });

  // ---------- mots du footer ----------
  const giant = $('.foot__giant');
  const giantChars = split(giant, 'chars');
  gsap.set(giantChars, { yPercent: 110 });
  gsap.to(giantChars, { yPercent: 0, duration: 1.5, stagger: .035, ease: 'expo.out', scrollTrigger: { trigger: giant, start: 'top 98%', once: true } });

  // ---------- bouton circulaire : léger zoom d'entrée ----------
  gsap.from('.ring', { scale: .6, rotate: -40, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.book__doors', start: 'top 85%', once: true } });

  // ---------- sections épinglées / horizontales ----------
  const mm = gsap.matchMedia();

  // Le salon : storytelling pas à pas (épinglé sur tous les écrans)
  (function story() {
    const stage = $('.story__stage');
    const steps = $$('.story__step'), imgs = $$('.story__img'), n = steps.length;
    const stepsBox = $('.story__steps'), nums = $$('.story__n-cur b'), bar = $('.story__bar i');
    const fit = () => { let h = 0; steps.forEach(s => { h = Math.max(h, s.offsetHeight); }); stepsBox.style.minHeight = h + 'px'; };
    fit(); addEventListener('resize', fit);
    document.fonts && document.fonts.ready.then(() => { fit(); ScrollTrigger.refresh(); });

    gsap.set(steps, { opacity: 0, y: 40 }); gsap.set(steps[0], { opacity: 1, y: 0 });
    gsap.set(imgs, { clipPath: 'circle(0% at 50% 50%)' }); gsap.set(imgs[0], { clipPath: 'circle(80% at 50% 50%)' });
    gsap.set($$('img', stage).filter(i => i.closest('.story__img')), { scale: 1.3 });
    gsap.set($('img', imgs[0]), { scale: 1 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: stage, start: 'top top', end: () => '+=' + Math.round(innerHeight * (n - 1) * .95), pin: true, scrub: .7, anticipatePin: 1, invalidateOnRefresh: true }
    });
    for (let i = 1; i < n; i++) {
      const t = i - 1;
      tl.to(imgs[i], { clipPath: 'circle(80% at 50% 50%)', duration: .85, ease: 'power2.inOut' }, t)
        .to($('img', imgs[i]), { scale: 1, duration: 1, ease: 'power2.out' }, t)
        .to(steps[i - 1], { opacity: 0, y: -40, duration: .3, ease: 'power2.in' }, t + .05)
        .to(steps[i], { opacity: 1, y: 0, duration: .35, ease: 'power2.out' }, t + .5)
        .to(nums, { yPercent: -100 * i, duration: .6, ease: 'power3.inOut' }, t + .15)
        .to(bar, { scaleX: i / (n - 1), duration: 1, ease: 'none' }, t);
    }
    tl.to('.story__oval', { yPercent: -28, duration: n - 1, ease: 'none' }, 0)
      .to('.story__star', { rotate: 300, yPercent: 90, duration: n - 1, ease: 'none' }, 0)
      .to({}, { duration: .3 }, n - 1);
  })();

  // Prestations : défilement horizontal piloté par le scroll vertical (desktop)
  const hsTitle = $('#hs-title');
  const hsChars = split(hsTitle, 'chars');
  gsap.set(hsChars, { yPercent: 115 });
  gsap.to(hsChars, { yPercent: 0, duration: 1.25, stagger: .022, scrollTrigger: { trigger: '.hs', start: 'top 55%', once: true } });

  mm.add('(min-width: 900px)', () => {
    const pin = $('.hs__pin'), track = $('.hs__track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1 } });
    $$('.card').forEach(card => {
      const img = $('.card__media img', card);
      if (img) gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      gsap.from(card, { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 96%', toggleActions: 'play none none reverse' } });
    });
  });
  mm.add('(max-width: 899px)', () => {
    gsap.from('.card', { y: 60, opacity: 0, duration: 1.1, stagger: .1, scrollTrigger: { trigger: '.hs__track', start: 'top 88%', once: true } });
  });

  initStaticBits();
  finish();

  /* ------------------------------------------------------------------
     Micro-interactions
     ------------------------------------------------------------------ */
  function initStaticBits() {
    if (!fine) return;

    // boutons magnétiques
    $$('[data-magnetic]').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: .9, ease: 'elastic.out(1, .45)' });
      const yTo = gsap.quickTo(el, 'y', { duration: .9, ease: 'elastic.out(1, .45)' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * .32);
        yTo((e.clientY - (r.top + r.height / 2)) * .4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });

    // cartes : inclinaison 3D + reflet qui suit la souris (photos de la galerie : inclinaison plus légère, sans reflet)
    $$('[data-tilt], .gi').forEach(el => {
      const glare = $('.tilt__glare', el), soft = el.classList.contains('gi'), amp = soft ? 6 : 14;
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: .7, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: .7, ease: 'power3.out' });
      const gx = glare && gsap.quickTo(glare, 'x', { duration: .5, ease: 'power3.out' });
      const gy = glare && gsap.quickTo(glare, 'y', { duration: .5, ease: 'power3.out' });
      if (glare) el.addEventListener('pointerenter', () => gsap.to(glare, { opacity: 1, duration: .4 }));
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ry((px - .5) * amp); rx((.5 - py) * amp * .85);
        if (glare) { gx(px * r.width); gy(py * r.height); }
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); if (glare) gsap.to(glare, { opacity: 0, duration: .5 }); });
    });

    // curseur
    const c = $('.cursor'), label = $('.cursor__label');
    const cx = gsap.quickTo(c, 'x', { duration: .28, ease: 'power3' }), cy = gsap.quickTo(c, 'y', { duration: .28, ease: 'power3' });
    gsap.set(c, { opacity: 0 });
    addEventListener('pointermove', e => { cx(e.clientX); cy(e.clientY); if (c.style.opacity !== '1') gsap.to(c, { opacity: 1, duration: .4, overwrite: 'auto' }); }, { passive: true });
    document.addEventListener('pointerover', e => {
      const view = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, select, input, [data-tilt]');
      c.classList.toggle('is-view', !!view);
      c.classList.toggle('is-link', !view && !!link);
      if (view) label.textContent = view.dataset.cursor;
    });
    document.addEventListener('pointerleave', () => gsap.to(c, { opacity: 0, duration: .3 }));
  }

  function finish() {
    const refresh = () => ScrollTrigger.refresh();
    if (document.readyState === 'complete') setTimeout(refresh, 200); else addEventListener('load', () => setTimeout(refresh, 200), { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(refresh, 100));
  }
})();
