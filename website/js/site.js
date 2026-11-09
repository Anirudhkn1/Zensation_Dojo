/* ZENSATION DOJO — site behaviour: intro hand-off, scroll menu, events, reveal */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const body = document.body;
  const params = new URLSearchParams(location.search);
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  /* ───────── events (data/events.js) — each card opens event.html?e=<slug> ───────── */
  (function buildEvents() {
    const host = $('#eventList');
    const list = window.ZD_EVENTS || [];
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
    list.forEach((e, i) => {
      const art = el('article', 'event reveal');
      art.style.transitionDelay = (i % 3) * 0.08 + 's';
      const a = el('a', 'event__link');
      a.href = 'event.html?e=' + encodeURIComponent(e.slug);
      a.setAttribute('aria-label', e.title + ' — open the event and its photos');

      const img = el('div', 'event__img');
      const im = el('img'); im.src = e.cover; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      if (e.coverPos) im.style.objectPosition = e.coverPos;
      img.appendChild(im);
      img.appendChild(el('span', 'event__tag', e.tag || ''));
      if (e.photos && e.photos.length) img.appendChild(el('span', 'event__count', e.photos.length + (e.photos.length === 1 ? ' photo' : ' photos')));

      const bd = el('div', 'event__body');
      bd.appendChild(el('span', 'event__seal', e.kanji || '祭'));
      bd.appendChild(el('h3', '', e.title));
      if (e.summary) bd.appendChild(el('p', '', e.summary));
      const meta = [e.date, e.place].filter(Boolean).join(' · ');
      if (meta) bd.appendChild(el('p', 'when', meta));
      bd.appendChild(el('span', 'event__go', 'See the photos'));

      a.append(img, bd);
      art.appendChild(a);
      host.appendChild(art);
    });
  })();

  /* ───────── scroll menu ───────── */
  (function menu() {
    const nav = $('#scroll'), btn = $('#scrollToggle'), clip = $('.scroll__clip', nav);
    const links = $$('.scroll__clip a', nav);
    const set = (open, opts) => {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) clip.removeAttribute('inert'); else clip.setAttribute('inert', '');    // closed links must not be tabbable
      if (open && opts && opts.focus) setTimeout(() => links[0].focus(), 350);
      if (!open && opts && opts.returnFocus) btn.focus();
    };
    set(false);
    btn.addEventListener('click', (e) => { e.stopPropagation(); set(!nav.classList.contains('open'), { focus: e.detail === 0 }); });   // detail 0 = keyboard activation
    document.addEventListener('click', (e) => { if (nav.classList.contains('open') && !nav.contains(e.target)) set(false); });
    document.addEventListener('keydown', (e) => {
      if (!nav.classList.contains('open')) return;
      if (e.key === 'Escape') { set(false, { returnFocus: nav.contains(document.activeElement) }); return; }
      const i = links.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
        links[n].focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); links[e.key === 'Home' ? 0 : links.length - 1].focus();
      }
    });
    links.forEach((a) => a.addEventListener('click', () => {
      set(false);
      if (a.getAttribute('href') === '#profile') {
        const p = $('#profile');
        setTimeout(() => { p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash'); }, 650);
      }
    }));

    // current-section marker (aria-current) from what is on screen
    const map = { home: '#home', games: '#games', workshops: '#workshops', experiences: '#experiences', events: '#events', about: '#about', profile: '#profile' };
    const mark = (id) => links.forEach((a) => {
      if (a.getAttribute('href') === map[id]) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    if ('IntersectionObserver' in window) {
      const vis = new Map();
      const spy = new IntersectionObserver((ents) => {
        ents.forEach((en) => vis.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
        let best = null, bv = 0;
        vis.forEach((v, k) => { if (v > bv) { bv = v; best = k; } });
        if (best) mark(best);
      }, { threshold: [0.15, 0.4, 0.7] });
      Object.keys(map).forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
    }
  })();

  /* ───────── reveal on scroll ───────── */
  (function reveal() {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
  })();

  const yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* ───────── intro film: plays once per session; its final scene stays as the hero backdrop ───────── */
  const stageEl = $('#stage');
  const skipBtn = $('#skip');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = store.get('zd_intro') === '1';
  const force = params.has('intro');
  const hold = params.has('hold');                       // test hook: build the film but don't play it
  const srcs = { fanSrc: 'assets/fan.webp', wordmarkSrc: 'assets/wordmark.webp', hankoSrc: 'assets/hanko.webp' };
  const canFilm = typeof gsap !== 'undefined' && typeof ZensationIntro !== 'undefined' && !!document.createElement('canvas').getContext;

  function endIntro() {
    body.classList.remove('intro-on');
    store.set('zd_intro', '1');
    window.scrollTo(0, 0);
  }
  function veilOff() { const v = $('.stage-loading', stageEl); if (v) v.remove(); }
  function wire(film) {
    window.__intro = film;
    window.addEventListener('resize', () => film.fit());
    // keep the drifting petals cheap: only animate while the hero is on screen and the tab is visible
    let vis = true;
    const sync = () => film.ambient(film.isDone() && vis && !document.hidden);
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; sync(); }).observe($('#home'));
    document.addEventListener('visibilitychange', sync);
  }

  if (!canFilm) {                                        // no canvas / no GSAP: the page still works, just without the film
    endIntro(); veilOff(); window.__ready = true;
  } else if ((seen && !force) || reduce) {               // returning visitor: skip straight to the final scene
    endIntro();
    ZensationIntro.create({ root: stageEl, mode: 'final', ...srcs }).then((film) => { wire(film); film.showFinal(); veilOff(); window.__ready = true; })
      .catch(() => { veilOff(); window.__ready = true; });
  } else {
    ZensationIntro.create({ root: stageEl, mode: 'full', ...srcs, onDone: endIntro }).then((film) => {
      wire(film); veilOff();
      skipBtn.addEventListener('click', () => film.skip());
      document.addEventListener('keydown', (e) => { if (body.classList.contains('intro-on') && (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); film.skip(); } });
      if (!hold) film.play();
      window.__ready = true;
    }).catch(() => { endIntro(); veilOff(); window.__ready = true; });
  }
})();
