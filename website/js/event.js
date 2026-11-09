/* ZENSATION DOJO — event page: builds the story + a Japanese-editorial photo layout from data/events.js,
   and a full-screen viewer (tap a photo → browse them all: arrows, swipe, keyboard, thumbnails). */
(function () {
  'use strict';
  const events = window.ZD_EVENTS || [];
  const main = document.getElementById('evMain');
  const D = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* tiny DOM helper */
  function h(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.setAttribute('style', v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    [].concat(kids || []).forEach((c) => { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  /* 0-based index → kanji numeral (一 … 十 · 十一 … 九十九) */
  const num = (i) => { const n = i + 1; if (n >= 100) return String(n); if (n < 10) return D[n]; const t = Math.floor(n / 10), o = n % 10; return (t > 1 ? D[t] : '') + '十' + D[o]; };

  /* which event? */
  const slug = new URLSearchParams(location.search).get('e');
  const ev = events.find((e) => e.slug === slug);
  if (!ev) { renderMissing(); return; }

  document.title = ev.title + ' — Zensation Dojo';
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', ev.summary || ev.title);

  const photos = ev.photos || [];
  const items = [];            // every clickable photo, in viewer order: [hero, ...gallery]

  main.appendChild(buildHero());
  if (photos.length > 1) main.appendChild(buildGallery());
  main.appendChild(buildMore());
  initReveal();
  const viewer = buildViewer();
  items.forEach((it, i) => it.btn.addEventListener('click', () => viewer.open(i, it.img)));

  /* ───────── hero ───────── */
  function buildHero() {
    const p = photos[0];
    const text = h('div', { class: 'ev-hero__text' }, [
      h('p', { class: 'ev-kicker rv', text: ev.tag + ' · ' + (ev.kanji || '') }),
      h('h1', { class: 'ev-title rv', text: ev.title }),
      h('span', { class: 'ev-rule rv', 'aria-hidden': 'true' })
    ]);
    const meta = [ev.date, ev.place].filter(Boolean).join(' · ');
    if (meta) text.appendChild(h('p', { class: 'ev-when rv', text: meta }));
    (ev.story || []).forEach((t) => text.appendChild(h('p', { class: 'ev-story rv', text: t })));
    if (ev.facts && ev.facts.length) {
      text.appendChild(h('dl', { class: 'ev-facts rv' }, ev.facts.map((f) => h('div', {}, [h('dt', { text: f[0] }), h('dd', { text: f[1] })]))));
    }
    if (ev.related && ev.related.length) {
      const wrap = h('div', { class: 'ev-related rv' });
      ev.related.forEach((r) => wrap.appendChild(h('a', { href: 'event.html?e=' + encodeURIComponent(r.slug) }, [h('span', { 'aria-hidden': 'true', text: '連' }), r.label])));
      text.appendChild(wrap);
    }
    const wa = 'https://wa.me/919880092314?text=' + encodeURIComponent('Hi Zensation Dojo, I saw ' + ev.title + ' and I’d like to bring something like it to my event.');
    text.appendChild(h('div', { class: 'ev-cta rv' }, [
      h('a', { class: 'btn btn--red', href: wa, target: '_blank', rel: 'noopener' }, ['Book us ', h('span', { 'aria-hidden': 'true', text: '予約' })]),
      h('a', { class: 'btn btn--ghost', href: 'index.html#events', text: 'All events' })
    ]));

    const img = h('img', { src: p.src, alt: p.title + ' — ' + p.note, width: p.w, height: p.h, decoding: 'async', fetchpriority: 'high' });
    const btn = h('button', { class: 'ev-frame__btn', type: 'button', 'aria-label': 'View photo: ' + p.title }, [img, h('span', { class: 'ev-frame__hint', text: 'Tap to view' })]);
    items.push({ btn, img, photo: p });
    const frame = h('figure', { class: 'ev-frame rv', style: '--r:' + (p.w / p.h).toFixed(4) }, [
      btn,
      h('span', { class: 'ev-seal', 'aria-hidden': 'true', text: ev.kanji || '祭' }),
      h('figcaption', {}, [h('b', { text: p.title }), ' — ' + p.note])
    ]);

    return h('section', { class: 'ev-hero' }, [
      h('span', { class: 'ev-hero__kanji', 'aria-hidden': 'true', text: ev.kanji || '' }),
      h('div', { class: 'ev-hero__inner' }, [text, frame])
    ]);
  }

  /* ───────── gallery: rows chosen from each photo's shape ─────────
     wide + tall → a wide slot beside a tall one (sides alternate) · three tall → a staggered trio ·
     two tall → an offset pair · a lone photo → centred. Tall photos hang at different heights, like a hanging scroll display. */
  function buildGallery() {
    const rest = photos.slice(1);
    const wide = (q) => q.w / q.h > 1.2;
    const rows = [];
    let i = 0, flip = false;
    while (i < rest.length) {
      const left = rest.length - i;
      const a = rest[i], b = rest[i + 1];
      if (left >= 2 && wide(a) && !wide(b)) { rows.push({ kind: 'lp', at: [i, i + 1] }); i += 2; }
      else if (left >= 2 && !wide(a) && wide(b)) { rows.push({ kind: 'pl', at: [i, i + 1] }); i += 2; }
      else if (!wide(a) && left >= 3 && !wide(b) && !wide(rest[i + 2]) && left !== 4) { rows.push({ kind: 'ppp', at: [i, i + 1, i + 2] }); i += 3; }
      else if (!wide(a) && left >= 2 && !wide(b)) { rows.push({ kind: 'pp', at: [i, i + 1] }); i += 2; }
      else { rows.push({ kind: wide(a) ? 'l' + (flip ? 'r' : 'l') : 'p', at: [i] }); flip = !flip; i += 1; }
    }

    const sec = h('section', { class: 'ev-gallery', 'aria-labelledby': 'evGalTitle' }, [
      h('header', { class: 'ev-gallery__head rv' }, [
        h('p', { class: 'ev-kicker', text: '写真 · Shashin' }),
        h('h2', { id: 'evGalTitle', text: 'The photos' }),
        h('p', { class: 'ev-hint', text: 'Tap any photo to see it large — then swipe or use the arrows to see each one.' })
      ])
    ]);
    const wrap = h('div', { class: 'ev-rows' });
    rows.forEach((r, ri) => {
      const row = h('div', { class: 'ev-row ev-row--' + r.kind });
      r.at.forEach((k, pos) => row.appendChild(buildFigure(rest[k], k + 1, pos, ri)));
      wrap.appendChild(row);
    });
    sec.appendChild(wrap);
    return sec;
  }

  function buildFigure(p, index, pos, rowIdx) {
    const img = h('img', { src: p.thumb, alt: p.title + ' — ' + p.note, width: p.w, height: p.h, loading: 'lazy', decoding: 'async' });
    const btn = h('button', { class: 'ev-ph__btn', type: 'button', 'aria-label': 'View photo ' + (index + 1) + ': ' + p.title }, [img, h('span', { class: 'ev-ph__zoom', 'aria-hidden': 'true' })]);
    items.push({ btn, img, photo: p });
    const side = (rowIdx + pos) % 2 ? ' is-left' : '';
    return h('figure', { class: 'ev-ph rv' + side, style: '--r:' + (p.w / p.h).toFixed(4) + ';--i:' + pos }, [
      h('div', { class: 'ev-ph__row' }, [
        btn,
        h('div', { class: 'ev-ph__cap', 'aria-hidden': 'true' }, [h('i', { text: num(index) }), h('span', { text: p.title })])
      ]),
      h('figcaption', { class: 'ev-ph__note', text: p.note })
    ]);
  }

  /* ───────── more events ───────── */
  function buildMore() {
    const others = events.filter((e) => e.slug !== ev.slug);
    const sec = h('section', { class: 'ev-more', 'aria-labelledby': 'evMoreTitle' }, [
      h('header', { class: 'ev-gallery__head rv' }, [
        h('p', { class: 'ev-kicker', text: '続き · More' }),
        h('h2', { id: 'evMoreTitle', text: 'More from the dojo' })
      ])
    ]);
    const grid = h('div', { class: 'ev-more__grid' });
    others.forEach((e) => {
      const im = h('img', { src: e.cover, alt: '', loading: 'lazy', decoding: 'async' });
      if (e.coverPos) im.style.objectPosition = e.coverPos;
      grid.appendChild(h('a', { class: 'ev-mini rv', href: 'event.html?e=' + encodeURIComponent(e.slug) }, [
        h('span', { class: 'ev-mini__img' }, [im]),
        h('span', { class: 'ev-mini__body' }, [h('i', { 'aria-hidden': 'true', text: e.kanji || '祭' }), h('b', { text: e.title }), h('em', { text: e.tag })])
      ]));
    });
    if (others.length) sec.appendChild(grid);
    sec.appendChild(h('p', { class: 'ev-more__all rv' }, [h('a', { class: 'btn btn--ghost', href: 'index.html#events', text: 'Back to all events' })]));
    return sec;
  }

  function renderMissing() {
    document.title = 'Event not found — Zensation Dojo';
    main.appendChild(h('section', { class: 'ev-missing' }, [
      h('p', { class: 'ev-kicker', text: '迷子 · Lost?' }),
      h('h1', { class: 'ev-title', text: 'We couldn’t find that event' }),
      h('div', { class: 'ev-cta' }, [h('a', { class: 'btn btn--red', href: 'index.html#events', text: 'See all events' })])
    ]));
  }

  function initReveal() {
    const els = Array.from(document.querySelectorAll('.rv'));
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    els.forEach((e) => io.observe(e));
  }

  /* ───────── photo viewer ───────── */
  function buildViewer() {
    const prev = h('button', { class: 'lb__nav lb__nav--prev', type: 'button', 'aria-label': 'Previous photo', text: '‹' });
    const next = h('button', { class: 'lb__nav lb__nav--next', type: 'button', 'aria-label': 'Next photo', text: '›' });
    const close = h('button', { class: 'lb__close', type: 'button', 'aria-label': 'Close viewer' }, [h('span', { 'aria-hidden': 'true', text: '×' })]);
    const count = h('span', { class: 'lb__count', 'aria-live': 'polite' });
    const img = h('img', { class: 'lb__img', alt: '', draggable: 'false' });
    const stage = h('div', { class: 'lb__stage' }, [img]);
    const capT = h('b'), capN = h('span');
    const thumbs = h('div', { class: 'lb__thumbs', role: 'tablist', 'aria-label': 'Photos' });
    const tbtns = items.map((it, i) => {
      const b = h('button', { class: 'lb__thumb', type: 'button', role: 'tab', 'aria-label': 'Photo ' + (i + 1) + ': ' + it.photo.title }, [h('img', { src: it.photo.thumb || it.photo.src, alt: '', draggable: 'false' })]);
      b.addEventListener('click', () => go(i, i > cur ? 1 : -1));
      thumbs.appendChild(b); return b;
    });
    if (items.length < 2) { prev.hidden = next.hidden = thumbs.hidden = true; }
    const root = h('div', { class: 'lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Photo viewer', hidden: true }, [
      h('div', { class: 'lb__bg' }),
      h('div', { class: 'lb__top' }, [count, close]),
      prev, stage, next,
      h('div', { class: 'lb__foot' }, [h('p', { class: 'lb__cap' }, [capT, capN]), thumbs])
    ]);
    document.body.appendChild(root);

    let cur = 0, isOpen = false, opener = null, pushed = false, token = 0;
    const inertEls = [document.querySelector('.ev-bar'), main, document.querySelector('.ev-foot')];

    function show(i, fromRect, dir) {
      cur = i;
      const it = items[i], p = it.photo, my = ++token;
      count.textContent = num(i) + '  /  ' + num(items.length - 1);
      count.setAttribute('aria-label', 'Photo ' + (i + 1) + ' of ' + items.length);
      capT.textContent = p.title; capN.textContent = p.note;
      img.alt = p.title + ' — ' + p.note;
      tbtns.forEach((b, k) => { b.classList.toggle('is-on', k === i); b.setAttribute('aria-selected', String(k === i)); if (k === i) b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); });
      prev.disabled = i === 0; next.disabled = i === items.length - 1;
      // show the cached thumbnail straight away, swap in the full-size file when it has loaded
      img.src = p.thumb || p.src;
      img.classList.add('is-soft');
      const full = new Image();
      full.onload = () => { if (my === token) { img.src = p.src; img.classList.remove('is-soft'); } };
      full.src = p.src;
      [i - 1, i + 1].forEach((k) => { if (items[k]) new Image().src = items[k].photo.src; });   // preload neighbours
      if (reduce) return;
      if (fromRect) {                       // FLIP: grow out of the tapped thumbnail
        requestAnimationFrame(() => {
          const to = img.getBoundingClientRect();
          if (!to.width) return;
          const dx = fromRect.left - to.left, dy = fromRect.top - to.top, sx = fromRect.width / to.width, sy = fromRect.height / to.height;
          img.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
        });
      } else if (dir) {
        img.animate([{ transform: 'translateX(' + (dir * 44) + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }
    function go(i, dir) { if (i < 0 || i >= items.length || i === cur) return; show(i, null, dir); }

    function open(i, srcImg) {
      if (isOpen) return;
      isOpen = true; opener = document.activeElement;
      root.hidden = false; root.classList.remove('is-out');
      document.documentElement.classList.add('lb-lock');
      inertEls.forEach((e) => e && e.setAttribute('inert', ''));
      const rect = srcImg ? srcImg.getBoundingClientRect() : null;
      show(i, rect, 0);
      if (!reduce) root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
      close.focus({ preventScroll: true });
      try { history.pushState({ lb: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    }
    function shut(fromPop) {
      if (!isOpen) return;
      isOpen = false; token++;
      const done = () => {
        root.hidden = true;
        document.documentElement.classList.remove('lb-lock');
        inertEls.forEach((e) => e && e.removeAttribute('inert'));
        if (opener && opener.focus) opener.focus({ preventScroll: true });
        // keep the page where the visitor was looking: the photo they just left
        const t = items[cur] && items[cur].btn;
        if (t && t.getBoundingClientRect().bottom < 0 || t && t.getBoundingClientRect().top > innerHeight) t.scrollIntoView({ block: 'center' });
      };
      if (reduce) done(); else root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' }).onfinish = done;
      if (pushed && !fromPop) { pushed = false; try { history.back(); } catch (e) { /* ignore */ } }
      pushed = false;
    }
    window.addEventListener('popstate', () => { if (isOpen) shut(true); });

    close.addEventListener('click', () => shut(false));
    prev.addEventListener('click', () => go(cur - 1, -1));
    next.addEventListener('click', () => go(cur + 1, 1));
    let swiped = false;
    root.addEventListener('click', (e) => { if (swiped) return; if (e.target === root || e.target.classList.contains('lb__bg') || e.target === stage) shut(false); });

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); shut(false); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1, -1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0, -1); }
      else if (e.key === 'End') { e.preventDefault(); go(items.length - 1, 1); }
      else if (e.key === 'Tab') {                       // keep focus inside the viewer
        const f = Array.from(root.querySelectorAll('button:not([disabled]):not([hidden])'));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // swipe: drag the photo sideways, release past 60px to change photo
    let sx = 0, sy = 0, dragging = false, moved = false;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; dragging = true; moved = false; sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { moved = true; try { stage.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } }
      if (moved) img.style.transform = 'translateX(' + dx * 0.9 + 'px)';
    });
    const endDrag = (e) => {
      if (!dragging) return; dragging = false;
      const dx = e.clientX - sx;
      img.style.transform = '';
      swiped = moved; setTimeout(() => { swiped = false; }, 0);
      if (moved && Math.abs(dx) > 60) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      else if (moved && !reduce) img.animate([{ transform: 'translateX(' + dx * 0.9 + 'px)' }, { transform: 'none' }], { duration: 240, easing: 'ease-out' });
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    return { open: open };
  }
})();
