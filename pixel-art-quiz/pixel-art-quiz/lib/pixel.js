/* 픽셀 그래픽 엔진: 캐릭터 스프라이트 + 잔디밭 꽃길 배경 (외부 이미지 없이 코드로 그림) */
(function () {
  'use strict';

  // ---- 시드 랜덤 ----
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }
  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ---- 팔레트 ----
  const SKIN = ['#f9d6b5', '#f2c39d', '#e8b28a', '#fbe0c8'];
  const HAIR = ['#2b2222', '#3b2a22', '#5a3a28', '#1d1d2b', '#7a4a2a', '#c7923e', '#e2c15a', '#8a8f9e', '#3a4a7a', '#6a3a5a'];
  const CLOTH = [
    ['#2d3a5c', '#1f2a44'], ['#1f1f24', '#38383f'], ['#3a6a4a', '#2a4e36'], ['#e8e4dc', '#c9c2b4'],
    ['#b8473f', '#8e332d'], ['#3e74c4', '#2c5596'], ['#e8a33a', '#c07f22'], ['#6b4f9a', '#4f3a75'],
    ['#7c8a96', '#5e6a75'], ['#d9729a', '#b4557a']
  ];
  const PANTS = ['#26262e', '#2d3a5c', '#3d3d48', '#4a5a7a', '#5a4636'];
  const OUTLINE = '#2a1f24';

  // 12 x 17 기본 템플릿
  const BASE = [
    '...HHHHHH...',
    '.HHHHHHHHHH.',
    '.HHHHHHHHHH.',
    '.HHSSSSSSHH.',
    '.HSSSSSSSSH.',
    '.SSESSSSESS.',
    '.SSESSSSESS.',
    '.SKSSSSSSKS.',
    '..SSSMMSSS..',
    '...SSSSSS...',
    '..CCCWWCCC..',
    '.CCCCDDCCCC.',
    '.SCCCDDCCCS.',
    '..CCCCCCCC..',
    '..PPP..PPP..',
    '..PPP..PPP..',
    '..BBB..BBB..'
  ];

  function makeLook(seed) {
    const r = rng(seed);
    const pick = (a) => a[Math.floor(r() * a.length)];
    return {
      skin: pick(SKIN), hair: pick(HAIR), cloth: pick(CLOTH), pants: pick(PANTS),
      style: pick(['short', 'short', 'long', 'long', 'bob', 'cap']),
      glasses: r() < 0.2 ? (r() < 0.5 ? 'sun' : 'round') : null,
      capColor: pick(['#c0392b', '#2d3a5c', '#1f1f24', '#e8e4dc', '#3a6a4a'])
    };
  }

  function buildGrid(look) {
    const g = BASE.map((row) => row.split(''));
    const set = (r, c, v) => { if (g[r] && c >= 0 && c < 12) g[r][c] = v; };
    if (look.style === 'long') {
      for (let r = 4; r <= 11; r++) { set(r, 1, 'H'); set(r, 10, 'H'); }
      for (let r = 5; r <= 11; r++) { set(r, 0, 'H'); set(r, 11, 'H'); }
    } else if (look.style === 'bob') {
      for (let r = 4; r <= 8; r++) { set(r, 1, 'H'); set(r, 10, 'H'); set(r, 0, 'H'); set(r, 11, 'H'); }
    } else if (look.style === 'cap') {
      for (let c = 1; c <= 10; c++) { set(0, c, c > 2 && c < 9 ? 'Q' : '.'); set(1, c, 'Q'); set(2, c, 'Q'); }
      set(2, 11, 'Q');
    } else if (look.style === 'beret') {
      for (let c = 2; c <= 10; c++) set(0, c, 'R');
      for (let c = 0; c <= 11; c++) set(1, c, 'R');
      set(0, 11, 'R'); set(0, 1, '.');
    }
    if (look.glasses === 'sun') { [2, 3, 4, 7, 8, 9].forEach((c) => set(5, c, 'G')); [3, 4, 8, 9].forEach((c) => set(6, c, 'G')); set(5, 5, 'G'); set(5, 6, 'G'); set(6, 3, 'G'); set(6, 8, 'G'); set(6, 2, 'S'); set(6, 7, 'S'); }
    if (look.glasses === 'round') { [2, 4, 7, 9].forEach((c) => set(5, c, 'G')); [2, 4, 7, 9].forEach((c) => set(6, c, 'G')); set(5, 5, 'G'); set(5, 6, 'G'); }
    if (look.prop === 'brush') { set(11, 11, 'Y'); set(10, 11, 'Y'); set(9, 11, 'Y'); set(8, 11, 'Z'); set(12, 11, 'S'); }
    return g;
  }

  function colorOf(ch, look) {
    switch (ch) {
      case 'H': return look.hair;
      case 'S': return look.skin;
      case 'E': return '#2a1f24';
      case 'K': return '#f2a0a0';
      case 'M': return '#c0605a';
      case 'C': return look.cloth[0];
      case 'D': return look.cloth[1];
      case 'W': return '#ffffff';
      case 'P': return look.pants;
      case 'B': return '#3a2a26';
      case 'G': return '#1a1a22';
      case 'Q': return look.capColor;
      case 'R': return look.beretColor || '#d2443a';
      case 'Y': return '#a0703a';
      case 'Z': return '#3e74c4';
      default: return null;
    }
  }

  // 스프라이트를 (외곽선 포함 14x19) 오프스크린 캔버스로 굽기
  function bakeSprite(look) {
    const grid = buildGrid(look);
    const W = 14, H = 19;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const cx = cv.getContext('2d');
    const filled = (r, c) => r >= 0 && r < 17 && c >= 0 && c < 12 && grid[r][c] !== '.';
    // 외곽선
    cx.fillStyle = OUTLINE;
    for (let r = -1; r <= 17; r++) for (let c = -1; c <= 12; c++) {
      if (filled(r, c)) continue;
      if (filled(r - 1, c) || filled(r + 1, c) || filled(r, c - 1) || filled(r, c + 1)) cx.fillRect(c + 1, r + 1, 1, 1);
    }
    for (let r = 0; r < 17; r++) for (let c = 0; c < 12; c++) {
      const col = colorOf(grid[r][c], look);
      if (col) { cx.fillStyle = col; cx.fillRect(c + 1, r + 1, 1, 1); }
    }
    return cv;
  }

  // ---- 배경 씬 (잔디 + 꽃길 + 군중) ----
  function Scene(canvas, opts) {
    opts = opts || {};
    this.cv = canvas; this.cx = canvas.getContext('2d');
    this.seed = opts.seed || 7;
    this.crowdCount = opts.crowd == null ? 34 : opts.crowd;
    this.cheer = false;
    this.frame = 0;
    this.resize();
    const self = this;
    window.addEventListener('resize', function () { self.resize(); });
    setInterval(function () { self.frame++; self.draw(); }, 420);
  }
  Scene.prototype.resize = function () {
    const W = 200;
    const ratio = Math.max(0.4, Math.min(2.4, window.innerHeight / Math.max(1, window.innerWidth)));
    const H = Math.round(W * ratio);
    this.W = W; this.H = H;
    this.cv.width = W; this.cv.height = H;
    this.bakeGround();
    this.placeCrowd();
    this.draw();
  };
  Scene.prototype.bakeGround = function () {
    const W = this.W, H = this.H;
    const g = document.createElement('canvas'); g.width = W; g.height = H;
    const c = g.getContext('2d');
    const r = rng(this.seed * 31);
    c.fillStyle = '#86c45c'; c.fillRect(0, 0, W, H);
    // 잔디 디더링
    for (let i = 0; i < W * H * 0.12; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      c.fillStyle = r() < 0.5 ? '#76b34f' : '#97d26a';
      c.fillRect(x, y, 1, 1);
    }
    // 잔디 풀잎
    for (let i = 0; i < W * H * 0.008; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      c.fillStyle = '#5f9a3e'; c.fillRect(x, y, 1, 2); c.fillRect(x + 2, y + 1, 1, 1);
    }
    // 가운데 꽃길
    const pw = Math.round(W * 0.26), px = Math.round((W - pw) / 2);
    this.path = { x: px, w: pw };
    c.fillStyle = '#efe2bd'; c.fillRect(px, 0, pw, H);
    c.fillStyle = '#e2d2a6';
    for (let i = 0; i < pw * H * 0.06; i++) c.fillRect(px + Math.floor(r() * pw), Math.floor(r() * H), 1, 1);
    c.fillStyle = '#d4c08e'; c.fillRect(px, 0, 1, H); c.fillRect(px + pw - 1, 0, 1, H);
    // 꽃
    const flower = (x, y, petal) => {
      c.fillStyle = petal; c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3);
      c.fillStyle = '#f6d24a'; c.fillRect(x, y, 1, 1);
    };
    const petals = ['#ffffff', '#ffffff', '#ffd1dc', '#ffb0c4', '#fff4b0'];
    for (let y = 2; y < H; y += 3) {
      if (r() < 0.75) flower(px - 2 - Math.floor(r() * 5), y + Math.floor(r() * 2), petals[Math.floor(r() * petals.length)]);
      if (r() < 0.75) flower(px + pw + 1 + Math.floor(r() * 5), y + Math.floor(r() * 2), petals[Math.floor(r() * petals.length)]);
    }
    for (let i = 0; i < W * H * 0.0025; i++) flower(Math.floor(r() * W), Math.floor(r() * H), petals[Math.floor(r() * petals.length)]);
    this.ground = g;
  };
  Scene.prototype.placeCrowd = function () {
    const r = rng(this.seed * 97);
    const W = this.W, H = this.H, p = this.path;
    this.crowd = [];
    const cols = [];
    for (let x = 2; x + 14 <= p.x - 2; x += 15) cols.push(x);
    for (let x = p.x + p.w + 3; x + 14 <= W - 1; x += 15) cols.push(x);
    for (let y = 4; y + 19 < H + 10; y += 21) {
      cols.forEach((x) => {
        if (r() < 0.55) {
          const look = makeLook(Math.floor(r() * 1e9));
          this.crowd.push({ x: x + Math.floor(r() * 3) - 1, y: y + Math.floor(r() * 4), spr: bakeSprite(look), ph: Math.floor(r() * 4) });
        }
      });
    }
    this.crowd.sort((a, b) => a.y - b.y);
  };
  Scene.prototype.draw = function () {
    const c = this.cx;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.ground, 0, 0);
    const f = this.frame;
    this.crowd.forEach((p) => {
      const jump = this.cheer ? ((f + p.ph) % 2 === 0 ? -2 : 0) : ((f + p.ph) % 4 === 0 ? -1 : 0);
      c.fillStyle = 'rgba(40,60,20,0.25)'; c.fillRect(p.x + 3, p.y + 18, 8, 1);
      c.drawImage(p.spr, p.x, p.y + jump);
    });
  };

  // 큰 캐릭터 (NPC / 플레이어) 그리기
  function drawBig(canvas, look, scale) {
    const spr = bakeSprite(look);
    canvas.width = 14; canvas.height = 19;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 14, 19);
    c.drawImage(spr, 0, 0);
    canvas.style.width = 14 * (scale || 5) + 'px';
    canvas.style.height = 19 * (scale || 5) + 'px';
  }

  const TEACHER_LOOK = { skin: '#f9d6b5', hair: '#3b2a22', cloth: ['#3a6a4a', '#e8e4dc'], pants: '#2d3a5c', style: 'beret', beretColor: '#d2443a', glasses: null, prop: 'brush' };

  window.Pixel = { Scene, makeLook, bakeSprite, drawBig, hashStr, TEACHER_LOOK };
})();
