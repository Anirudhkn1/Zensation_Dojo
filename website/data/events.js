/* EVENTS — one entry per event. The home page cards AND the event page (event.html?e=<slug>) are built from this list.
 *   slug      – URL id            title – event name          tag   – small label on the card
 *   kanji     – single character on the red seal               place / date – leave out if unknown (the page just hides them)
 *   cover     – card image (thumbnail)    coverPos – CSS object-position for the card crop
 *   hero      – large image on the event page = photos[0] unless set
 *   summary   – one line on the card      story – paragraphs on the event page
 *   facts     – [label, value] rows       related – [{slug,label}] "from the same event" links
 *   photos    – gallery. src = full size, thumb = small, w/h = pixel size (keeps the layout from jumping), title + note = caption
 * The gallery layout is automatic: wide photos get a wide slot, tall photos pair up, the order is the order below.
 * Photo 1 is the "everyone is in it" shot: it is the card cover and the event-page opener.
 */
window.ZD_EVENTS = [
  {
    slug: 'pax-culture-26',
    title: 'Pax Culture ’26',
    tag: 'Pax Culture',
    kanji: '折',
    place: 'PVR Cinemas lobby',
    date: 'July 2026',
    cover: 'assets/events/pax-culture-26/crew-t.webp',
    coverPos: '50% 50%',
    summary: 'An origami & papercraft table, a long workshop line, and the whole crew behind it.',
    story: [
      'Cranes, butterflies, dragons and a very patient bunny girl: for Pax Culture ’26 the dojo turned a cinema lobby into a folding table. Anime papercraft — Demon Slayer figures, an Initial D Toyota AE86 — stood beside hand-folded origami, with a hand-lettered sign that read “Unfold your creativity!”.',
      'All day a long black table filled with people folding, gluing and cutting. Our crew stood behind it in black staff tees, two of us in full kimono and hakama, handing out paper charms and teaching the first fold.'
    ],
    facts: [
      ['Format', 'Origami & papercraft table, hands-on workshop'],
      ['Setting', 'Pax Culture ’26'],
      ['Folded', 'Cranes, butterflies, dragons, anime papercraft']
    ],
    related: [{ slug: 'pax-culture-26-pre-event', label: 'Before the event — the Pre-event' }],
    photos: [
      { src: 'assets/events/pax-culture-26/crew.webp',  thumb: 'assets/events/pax-culture-26/crew-t.webp',  w: 2000, h: 1126, title: 'The whole crew',          note: 'Everyone behind the table, charms and cranes in hand.' },
      { src: 'assets/events/pax-culture-26/table.webp', thumb: 'assets/events/pax-culture-26/table-t.webp', w: 2000, h: 1126, title: 'The display table',       note: 'Cranes, butterflies and anime papercraft — with an invitation to fold your own.' },
      { src: 'assets/events/pax-culture-26/stall.webp', thumb: 'assets/events/pax-culture-26/stall-t.webp', w: 1334, h: 2000, title: 'The workshop line',       note: 'A long table, paper everywhere, and a queue that never really ended.' },
      { src: 'assets/events/pax-culture-26/ae86.webp',  thumb: 'assets/events/pax-culture-26/ae86-t.webp',  w: 1334, h: 2000, title: 'Toyota AE86 Trueno',      note: 'Papercraft, Initial D version.' },
      { src: 'assets/events/pax-culture-26/bunny.webp', thumb: 'assets/events/pax-culture-26/bunny-t.webp', w: 1334, h: 2000, title: 'Bunny Girl',              note: 'Origami designed by Chen Xiao.' }
    ]
  },
  {
    slug: 'pax-culture-26-pre-event',
    title: 'Pax Culture ’26 — Pre-event',
    tag: 'Pre-event',
    kanji: '前',
    summary: 'The warm-up: a courtyard folding session before the big day.',
    story: [
      'Before Pax Culture ’26 opened its doors, we ran a small folding session in a courtyard: paper stars, line-art sheets and a lot of origami, with everyone showing off what they made.'
    ],
    facts: [
      ['Format', 'Pre-event folding session'],
      ['Leads to', 'Pax Culture ’26']
    ],
    related: [{ slug: 'pax-culture-26', label: 'The main event — Pax Culture ’26' }],
    cover: 'assets/events/pax-culture-26/pre-event-t.webp',
    coverPos: '50% 50%',
    photos: [
      { src: 'assets/events/pax-culture-26/pre-event.webp', thumb: 'assets/events/pax-culture-26/pre-event-t.webp', w: 2000, h: 1126, title: 'Pre-event', note: 'Everyone with their folds, under the hanging plants.' }
    ]
  },
  {
    slug: 'japanese-horror-night',
    title: 'Japanese Horror Night',
    tag: 'Halloween Special',
    kanji: '怪',
    place: 'Kongsi Tea Bar, Jayanagar, Bengaluru',
    cover: 'assets/events/japanese-horror-night/pair-lights-t.webp',
    coverPos: '50% 46%',
    summary: 'Ghost lanterns, shogi boards, origami and an Uzumaki spiral — Halloween, Japan style.',
    story: [
      'A Halloween special at Kongsi Tea Bar in Jayanagar, Bengaluru. The café already wore its Halloween best — ghost lanterns, spider webs, eyeballs on the walls — and we filled its tables with Japan.',
      'We played Japanese board games with guests, folded origami at the white café tables, and dressed for the night: a skull mask, a studded cap, a long sword, and a spiral held over one eye as a nod to Junji Ito’s Uzumaki.'
    ],
    facts: [
      ['Venue', 'Kongsi Tea Bar, Jayanagar'],
      ['Format', 'Halloween special: board games, origami, costumes']
    ],
    photos: [
      { src: 'assets/events/japanese-horror-night/pair-lights.webp', thumb: 'assets/events/japanese-horror-night/pair-lights-t.webp', w: 1500, h: 2000, title: 'Happy Halloween', note: 'Skull mask, studded cap, and a spiral held over one eye — a nod to Junji Ito’s Uzumaki.' },
      { src: 'assets/events/japanese-horror-night/pair-close.webp', thumb: 'assets/events/japanese-horror-night/pair-close-t.webp', w: 1500, h: 2000, title: 'Uzumaki, up close', note: 'The spiral from Junji Ito’s horror manga, held over one eye.' },
      { src: 'assets/events/japanese-horror-night/games-wide.webp', thumb: 'assets/events/japanese-horror-night/games-wide-t.webp', w: 1500, h: 2000, title: 'The game table', note: 'Two boards laid out, one guest, and a game about to begin.' },
      { src: 'assets/events/japanese-horror-night/games-close.webp', thumb: 'assets/events/japanese-horror-night/games-close-t.webp', w: 1500, h: 2000, title: 'Mid-game', note: 'Hands over the board, mid-move.' },
      { src: 'assets/events/japanese-horror-night/pair-wide.webp', thumb: 'assets/events/japanese-horror-night/pair-wide-t.webp', w: 1500, h: 2000, title: 'Under the ghost lanterns', note: 'The full set — glowing ghosts above, red fairy lights behind.' },
      { src: 'assets/events/japanese-horror-night/origami-table.webp', thumb: 'assets/events/japanese-horror-night/origami-table-t.webp', w: 1500, h: 2000, title: 'The folding table', note: 'Paper creatures taking shape beneath the Happy Halloween wall.' },
      { src: 'assets/events/japanese-horror-night/ghost-lamps.webp', thumb: 'assets/events/japanese-horror-night/ghost-lamps-t.webp', w: 1500, h: 2000, title: 'Lantern light', note: 'Paper-light ghosts hung from the ceiling.' },
      { src: 'assets/events/japanese-horror-night/games-face.webp', thumb: 'assets/events/japanese-horror-night/games-face-t.webp', w: 1500, h: 2000, title: 'Across the board', note: 'A guest, two boards, and a long think.' },
      { src: 'assets/events/japanese-horror-night/origami-side.webp', thumb: 'assets/events/japanese-horror-night/origami-side-t.webp', w: 1500, h: 2000, title: 'Folding hour', note: 'Guests folding paper at the white café table.' },
      { src: 'assets/events/japanese-horror-night/ghost-big.webp', thumb: 'assets/events/japanese-horror-night/ghost-big-t.webp', w: 1500, h: 2000, title: 'The watching ghost', note: 'A paper-light ghost looming over the Happy Halloween wall.' },
      { src: 'assets/events/japanese-horror-night/pair-lanterns.webp', thumb: 'assets/events/japanese-horror-night/pair-lanterns-t.webp', w: 1500, h: 2000, title: 'The photo wall', note: 'Red fairy lights, spider webs and a jack-o’-lantern grin behind the pair.' }
    ]
  }
];
