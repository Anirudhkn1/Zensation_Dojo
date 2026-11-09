/* ZENSATION DOJO — About Tavish. Framer Motion (vanilla build, window.Motion) choreography.
   Wide screens: the stage pins and six scenes play as you scroll — panel unrolls like a scroll, text lands line by line,
   a hanko seal is stamped, and the three portraits slide in from / out to the left and right edge while the red sun
   follows the active one. Phones & reduced-motion: the scenes stack and fade in as they arrive. */
(function () {
  'use strict';
  const root = document.getElementById('about');
  const M = window.Motion;
  if (!root || !M) return;                                   // no library → the stacked, fully visible layout stays
  const { animate, scroll, inView, stagger } = M;
  const $ = (s, r) => (r || root).querySelector(s);
  const $$ = (s, r) => Array.from((r || root).querySelectorAll(s));

  const track = $('#aboutTrack'), pin = $('#aboutPin');
  const chaps = $$('.chap');
  const N = chaps.length;
  const figs = {}; $$('.fig').forEach((f) => { figs[f.dataset.fig] = f; });
  const sun = $('#aboutSun'), ghost = $('#aboutGhost'), wash = $('#aboutWash'), petalsHost = $('#aboutPetals');
  const railBtns = $$('#aboutRail button');

  const EASE = [0.22, 0.8, 0.2, 1];                          // the site's own ease-out
  const SPRING = { type: 'spring', stiffness: 330, damping: 19 };

  /* who stands where, scene by scene (L / R), and who is speaking (act) */
  const PLAN = [
    { L: 'hat',    R: null,    act: 'hat',    tone: '#f1e6c8' },
    { L: 'hat',    R: 'sweep', act: 'sweep',  tone: '#f0dcc2' },
    { L: 'double', R: 'sweep', act: 'double', tone: '#f2d9d2' },
    { L: 'double', R: 'hat',   act: 'hat',    tone: '#ecdcb8' },
    { L: 'sweep',  R: 'hat',   act: 'sweep',  tone: '#dfe2c6' },
    { L: 'sweep',  R: 'double', act: 'double', tone: '#e6dcc6' }
  ];

  const mq = window.matchMedia('(min-width:1000px) and (min-height:640px) and (prefers-reduced-motion:no-preference)');
  const reduce = window.matchMedia('(prefers-reduced-motion:reduce)');
  let cleanups = [];
  const later = (fn) => cleanups.push(fn);

  function reset() {
    cleanups.forEach((fn) => { try { fn(); } catch (e) { /* already gone */ } });
    cleanups = [];
    root.classList.remove('about--pinned', 'about--stacked', 'about--js');
    root.style.removeProperty('--p');
    $$('[style]').forEach((el) => { if (el !== root) el.removeAttribute('style'); });
    $$('.fig').forEach((f) => { delete f.dataset.side; delete f.dataset.slot; });
    petalsHost.textContent = '';
  }

  /* ═════════ PINNED ═════════ */
  function pinned() {
    root.classList.add('about--pinned', 'about--js');
    const side = (n) => (n === 'L' ? -1 : 1);
    let idx = -1, token = 0, ready = false, want = 0;

    // every scene is hidden until its turn; every portrait waits off-stage
    chaps.forEach((c) => { c.style.visibility = 'hidden'; });
    Object.values(figs).forEach((f) => { f.style.visibility = 'hidden'; f.style.opacity = 0; });

    const slotOf = (name, p) => (p.L === name ? 'L' : p.R === name ? 'R' : null);
    const drift = () => Math.min(140, window.innerWidth * 0.09);

    function enter(c) {
      const panel = $('.chap__panel', c), seal = $('.chap__seal', c), items = $$('[data-in]', c);
      c.style.visibility = 'visible'; c.style.pointerEvents = 'auto';
      const unroll = animate(panel, { opacity: [0, 1], y: [18, 0], clipPath: ['inset(-6% -6% 100% -6%)', 'inset(-6% -6% -14% -6%)'] }, { duration: 0.9, ease: EASE });
      unroll.then(() => { panel.style.clipPath = 'none'; });
      animate(items, { opacity: [0, 1], y: [20, 0] }, { duration: 0.6, ease: 'easeOut', delay: stagger(0.075, { startDelay: 0.3 }) });
      animate(seal, { opacity: [0, 1], scale: [2.4, 1], rotate: [-14, -4] }, { ...SPRING, delay: 0.5 });
    }
    function exit(c, k, tok) {
      c.style.pointerEvents = 'none';
      animate($('.chap__panel', c), { opacity: 0, y: -16 }, { duration: 0.32, ease: 'easeIn' })
        .then(() => { if (idx !== k) c.style.visibility = 'hidden'; });
    }

    function setFigs(i) {
      const p = PLAN[i];
      Object.keys(figs).forEach((name) => {
        const f = figs[name], want = slotOf(name, p), cur = f.dataset.slot || '';
        const live = name === p.act;
        const op = live ? 1 : 0.86, sc = live ? 1 : 0.93;
        if (want === cur) {
          if (want) animate(f, { opacity: op, scale: sc }, { duration: 0.8, ease: EASE });
        } else if (want) {                                   // walks on from its own edge
          f.dataset.side = want; f.dataset.slot = want;
          f.style.visibility = 'visible';
          animate(f, { opacity: [0, op], x: [side(want) * drift(), 0], scale: [sc * 0.93, sc] }, { duration: 1, ease: EASE, delay: 0.12 });
        } else {                                             // walks off, towards the edge it stood at
          const from = cur; f.dataset.slot = '';
          animate(f, { opacity: 0, x: side(from) * drift() * 0.7 }, { duration: 0.55, ease: 'easeIn' })
            .then(() => { if (!f.dataset.slot) f.style.visibility = 'hidden'; });
        }
      });
      // the red sun slides behind whoever is speaking
      const aSide = slotOf(p.act, p);
      const af = figs[p.act];
      const w = Math.min(af.offsetWidth || 340, (window.innerWidth - 560) / 2 + 70);
      const inset = Math.max(8, Math.min(window.innerWidth * 0.03, 64));
      const cx = inset + w / 2;
      const target = side(aSide) * (window.innerWidth / 2 - cx);
      animate(sun, { opacity: 1, x: target, scale: [0.9, 1] }, { duration: 1.1, ease: EASE });
    }

    function goto(i) {
      if (i === idx) return;
      const prev = idx; idx = i; token++;
      chaps.forEach((c, k) => { if (k === i) enter(c); else if (k === prev) exit(c, k, token); });
      setFigs(i);
      // one-character scene title + paper tone
      animate(ghost, { opacity: 0, y: -14 }, { duration: 0.25 }).then(() => {
        ghost.textContent = chaps[idx].dataset.kanji || '';
        animate(ghost, { opacity: 1, y: [16, 0] }, { duration: 0.8, ease: EASE });
      });
      animate(wash, { backgroundColor: PLAN[i].tone }, { duration: 1.4, ease: 'easeInOut' });
      railBtns.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    }

    /* scroll → scene. The progress also fills the rail's brush line. */
    const stopScroll = scroll((p) => {
      root.style.setProperty('--p', p.toFixed(4));
      want = Math.min(N - 1, Math.max(0, Math.floor(p * N * 0.9999)));
      if (ready) goto(want);
    }, { target: track, offset: ['start start', 'end end'] });
    later(stopScroll);

    /* first scene plays when the stage arrives on screen, not at page load */
    const stopView = inView(pin, () => { ready = true; goto(want); }, { amount: 0.3 });
    later(stopView);

    /* rail buttons jump to a scene */
    const jump = (k) => () => {
      const range = track.offsetHeight - window.innerHeight;
      const top = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + ((k + 0.5) / N) * range });
    };
    railBtns.forEach((b, k) => { const h = jump(k); b.addEventListener('click', h); later(() => b.removeEventListener('click', h)); });

    /* drifting sakura petals — cheap (transform only) and paused when the stage is off screen */
    const petals = [];
    for (let k = 0; k < 9; k++) {
      const el = document.createElement('i'); el.className = 'petal';
      el.style.left = (Math.random() * 100) + '%';
      petalsHost.appendChild(el);
      const dur = 13 + Math.random() * 9, sway = 40 + Math.random() * 70;
      const a = animate(el, { y: [-40, window.innerHeight + 40], x: [0, sway, -sway * 0.4, sway * 0.6], rotate: [0, 380] },
        { duration: dur, repeat: Infinity, ease: 'linear', delay: -Math.random() * dur });
      petals.push(a);
    }
    const stopPetals = inView(pin, () => { petals.forEach((a) => a.play()); return () => petals.forEach((a) => a.pause()); }, { amount: 0.05 });
    later(stopPetals); later(() => petals.forEach((a) => a.stop()));
  }

  /* ═════════ STACKED (phones, tablets, reduced motion) ═════════ */
  function stacked() {
    root.classList.add('about--stacked');
    if (reduce.matches) return;                              // reduced motion: everything simply visible
    root.classList.add('about--js');
    chaps.forEach((c, k) => {
      const panel = $('.chap__panel', c), seal = $('.chap__seal', c), items = $$('[data-in]', c), fig = $('.chap__fig', c);
      const dir = k % 2 === 0 ? -1 : 1;
      const stop = inView(c, () => {
        const unroll = animate(panel, { opacity: [0, 1], y: [26, 0], clipPath: ['inset(-6% -6% 100% -6%)', 'inset(-6% -6% -14% -6%)'] }, { duration: 0.85, ease: EASE });
        unroll.then(() => { panel.style.clipPath = 'none'; });
        animate(items, { opacity: [0, 1], y: [18, 0] }, { duration: 0.55, ease: 'easeOut', delay: stagger(0.07, { startDelay: 0.28 }) });
        animate(seal, { opacity: [0, 1], scale: [2.3, 1], rotate: [-14, -4] }, { ...SPRING, delay: 0.45 });
        animate(fig, { opacity: [0, 1], x: [dir * 40, 0], rotate: [dir * 3, 0] }, { type: 'spring', stiffness: 120, damping: 17 });
      }, { amount: 0.18 });
      later(stop);
      // a slow parallax drift of each portrait against its card
      const stopParallax = scroll(animate(fig.firstElementChild, { y: ['6%', '-6%'] }, { ease: 'linear' }), { target: c, offset: ['start end', 'end start'] });
      later(stopParallax);
    });
  }

  function start() { reset(); if (mq.matches) pinned(); else stacked(); }
  start();
  (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(start);

  /* lazy images change layout height once loaded: re-measure the pinned scroll range */
  window.addEventListener('load', () => { if (root.classList.contains('about--pinned')) window.dispatchEvent(new Event('resize')); });
})();
