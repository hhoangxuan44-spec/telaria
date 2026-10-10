/*
 * 泰拉瑞亚 · 昼夜生态
 * --------------------------------------------------------------
 * 图层（从后到前）：
 *   #scene  天空渐变 / 星空 / 太阳月亮 / 云 / 远景山 / 地形（乘以光照图）
 *   #ents   所有 GIF/PNG 生物（DOM，按所在格子的亮度调暗）
 *   #over   水、岩浆、火焰、萤火虫、坠落之星等发光物
 * 坐标：世界以“美术像素”为单位，1 格 = 16 像素，屏幕上再放大 S 倍。
 */
(function () {
  'use strict';

  /* ======================= 基础工具 ======================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(x, y) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }
  function frand(a, b) { return a + Math.random() * (b - a); }
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function $(id) { return document.getElementById(id); }

  var QS = (function () {
    var o = {}, s = location.search.replace(/^\?/, '').split('&');
    for (var i = 0; i < s.length; i++) { var p = s[i].split('='); if (p[0]) o[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }
    return o;
  })();
  var SEED = QS.seed ? parseInt(QS.seed, 10) : 20261010;

  /* ======================= 素材表 ======================= */
  // [路径, 宽, 高, 素材原始朝向(1 右 / -1 左), 底部留白]
  var M = 'Category_Mount_animations/', P = 'Category_Old_pet_images/', PL = 'Category_Player_animations/';
  var SP = {
    guitar:   [PL + 'Guitar_example.gif', 40, 48, 1],
    eat:      [PL + 'EatFood_example.gif', 40, 48, 1],
    orb:      [PL + 'HoldOrb_example.gif', 46, 48, 1],
    drinkL:   [PL + 'DrinkLiquid_example.gif', 48, 56, 1],
    drinkLong:[PL + 'DrinkLong_example.gif', 40, 48, 1],
    drinkOld: [PL + 'DrinkOld_example.gif', 40, 52, 1],
    golf:     [PL + 'GolfPlay_example.gif', 71, 61, 1],

    bunnyM:   [M + 'Bunny_Mount.gif', 60, 56, 1],
    slime:    [M + 'Slime_Mount.gif', 58, 42, 1],
    basilisk: [M + 'Basilisk_Mount.gif', 74, 34, 1],
    pigWalk:  [M + 'Pigron_Mount_(walking).gif', 76, 52, 1],
    pigIdle:  [M + 'Pigron_Mount_idle.gif', 76, 48, 1],
    pigFly:   [M + 'Pigron_Mount.gif', 76, 54, 1],
    beeFly:   [M + 'Bee_Mount_(flying).gif', 72, 52, 1],
    beeWalk:  [M + 'Bee_Mount.gif', 72, 44, 1],
    beeRest:  [M + 'Bee_Mount_(resting).gif', 72, 44, 1],
    book:     [M + 'Book_Mount.gif', 58, 28, 1],
    chRun:    [M + '120px-Chillet_run.gif', 120, 70, 1, 2],
    chIdle:   [M + '120px-Chillet_idle.gif', 120, 70, 1, 2],
    ciRun:    [M + '120px-Chillet_Ignis_run.gif', 120, 70, 1, 2],
    ciIdle:   [M + '120px-Chillet_Ignis_idle.gif', 120, 70, 1, 2],
    fishFly:  [M + 'Cute_Fishron_Mount.gif', 80, 72, 1],
    fishLand: [M + 'Cute_Fishron_Mount_(land).gif', 80, 48, 1],
    fishSwim: [M + 'Cute_Fishron_Mount_(swimming).gif', 76, 52, 1],
    turtle:   [M + 'Turtle_Mount.gif', 74, 48, 1],
    turtleSw: [M + 'Turtle_Mount_(swimming).gif', 84, 48, 1],
    shark:    [M + 'Lava_Shark_Mount.gif', 106, 42, 1],
    rudolph:  [M + 'Rudolph_idle.gif', 82, 72, 1],
    scutlix:  [M + 'Scutlix_Mount.gif', 88, 52, 1],

    android:  [P + 'Android_(old).png', 34, 44, 1],
    dino:     [P + 'Baby_Dinosaur_(old).png', 48, 38, -1],
    eater:    [P + 'Baby_Eater_(old).png', 34, 54, 1],
    hornet:   [P + 'Baby_Hornet_(old).png', 32, 30, -1],
    hornet2:  [P + 'Baby_Hornet_(pre-1.4.4.9).png', 32, 30, -1],
    penguin:  [P + 'Baby_Penguin_(old).png', 22, 32, -1],
    penguin2: [P + 'Baby_Penguin_(pre-1.4.4.9).png', 22, 32, -1],
    skele:    [P + 'Baby_Skeletron_Head_(old).png', 42, 48, 1],
    snowman:  [P + 'Baby_Snowman_(old).png', 26, 32, -1],
    truffle:  [P + 'Baby_Truffle_(old).png', 28, 38, 1],
    bat:      [P + 'Bat_Pet_(old).png', 26, 18, 1],
    bunnyP:   [P + 'Bunny_Pet_(old).png', 28, 26, -1],
    heart:    [P + 'Crimson_Heart_(light_pet)_(pre-1.4.5.0).gif', 32, 32, 1],
    cupid:    [P + 'Cupid_(old).png', 52, 50, -1],
    eyeball:  [P + 'Eyeball_Spring_(old).png', 22, 48, 1],
    guinea:   [P + 'Guinea_Pig_(old).png', 30, 20, -1],
    minotaur: [P + 'Mini_Minotaur_(old).png', 28, 38, 1],
    oldlady:  [P + 'Old_Lady_Pet_(old).png', 38, 46, -1],

    bfly1:    ['Ambience_ButterflySwarm1.gif', 36, 36, 1],
    bfly2:    ['Ambience_ButterflySwarm2.gif', 64, 52, 1, 4]
  };

  var C = 'Category_Cloud_images/';
  var CLOUDS = ['120px-Cummulus_cloud_1', '120px-Cummulus_cloud_2', '120px-Cummulus_cloud_3', '120px-Cummulus_cloud_4',
    '120px-Cumulonimbus_cloud_1', '120px-Cumulonimbus_cloud_2', '120px-Cumulonimbus_cloud_3', '120px-Cumulonimbus_cloud_4',
    '120px-Cirrocumulus_cloud_1', '120px-Cirrocumulus_cloud_2', '120px-Cirrocumulus_cloud_3', '120px-Cirrocumulus_cloud_4', '120px-Cirrocumulus_cloud_5',
    '120px-Cirrus_cloud_1', '120px-Cirrus_cloud_2', '120px-Cirrus_cloud_3', 'Cirrus_cloud_4', 'Cirrus_cloud_5',
    '120px-Regular_cloud_1', '120px-Regular_cloud_2', '120px-Regular_cloud_3', 'Regular_cloud_4'
  ].map(function (n) { return C + n + '.png'; }).concat(['Cummulus_cloud_1.png', 'Cummulus_cloud_2.png', 'Cummulus_cloud_3.png']);
  // 泰拉瑞亚里罕见的“彩蛋云”
  var RARE_CLOUDS = ['110px-Redigit_cloud', '110px-Wilson_cloud', '112px-Charlie_cloud', '112px-Maxwell_cloud', '120px-Brain_of_Cthulhu_cloud',
    '120px-Eater_of_Souls_cloud', '120px-Eye_of_Cthulhu_cloud', '120px-Eye_of_Cthulhu_second_form_cloud', '120px-Fairy_cloud',
    '120px-Goldfish_cloud', '120px-Pumpking_cloud', '120px-Sword_cloud', '120px-Willow_cloud', '120px-Wyvern_cloud',
    'Bird_cloud', 'Bunny_cloud', 'Heart_cloud', 'Skeletron_cloud'
  ].map(function (n) { return C + n + '.png'; });

  // 泰拉瑞亚月相顺序：0 满月 → 4 新月 → 7 盈凸月
  var MOON_FILES = ['Moon-full', 'Moon-2', 'Moon-3', 'Moon-4', 'Moon-new', 'Moon-6', 'Moon-7', 'Moon-8'].map(function (n) {
    return 'Category_Moon_phase_images/' + n + '.png';
  });
  var MOON_NAMES = ['满月', '亏凸月', '下弦月', '残月', '新月', '蛾眉月', '上弦月', '盈凸月'];
  var MOON_LIGHT = [1, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75];

  var IMG = {};
  function img(src) {
    if (!IMG[src]) { var i = new Image(); i.src = src; IMG[src] = i; }
    return IMG[src];
  }
  function ready(i) { return i.complete && i.naturalWidth > 0; }

  /* ======================= 画布与尺寸 ======================= */
  var stage = $('stage'), sceneC = $('scene'), overC = $('over'), entLayer = $('ents');
  var sc = sceneC.getContext('2d'), oc = overC.getContext('2d');
  var S, VW, VH;                         // 缩放、视口（美术像素）
  var WT, WH, WW, surf0, SURF, cx;       // 世界尺寸（格）、地表行
  var hx0, hx1, px0, px1, cfx, golfX;    // 房屋、池塘、篝火、高尔夫
  var tiles, walls, liq, hgt, openSky, DEC;
  var worldC, contentC, fgC, cloudC, lightC, lightImg;
  var torches = [], lavaCells = [], goldCells = [], lavaPool = null;
  var hills = [];

  var AIR = 0, DIRT = 1, GRASS = 2, STONE = 3, COPPER = 4, IRON = 5, GOLD = 6, WOOD = 7, ROOF = 8, SAND = 9;
  var W_DIRT = 1, W_STONE = 2, W_WOOD = 3, W_GLASS = 4;

  function idx(x, y) { return y * WT + x; }
  function tileAt(x, y) { if (x < 0 || x >= WT || y >= WH) return STONE; if (y < 0) return AIR; return tiles[idx(x, y)]; }
  function groundY(x) { var t = clamp(Math.floor(x / 16), 0, WT - 1); return hgt[t] * 16; }

  function computeSize() {
    var w = window.innerWidth, h = window.innerHeight;
    S = clamp(Math.round(Math.min(w, h) / 420 * 4) / 4, 1, 2);
    VW = Math.ceil(w / S); VH = Math.ceil(h / S);
    [sceneC, overC].forEach(function (c) {
      c.width = VW; c.height = VH;
      c.style.width = (VW * S) + 'px'; c.style.height = (VH * S) + 'px';
    });
  }

  /* ======================= 世界生成 ======================= */
  function genWorld() {
    var R = mulberry32(SEED);
    WT = Math.max(150, Math.ceil(VW / 16) + 24);
    WH = Math.ceil(VH / 16) + 1;
    WW = WT * 16;
    surf0 = Math.round(VH * (VH > VW * 1.2 ? 0.64 : 0.6) / 16);
    if (WH - surf0 < 11) surf0 = WH - 11;
    SURF = surf0 * 16;
    cx = WT >> 1;
    hx0 = cx - 6; hx1 = cx + 5;
    cfx = cx + 11;
    px0 = cx + 22; px1 = cx + 35;
    golfX = cx - 22;

    var n = WT * WH;
    tiles = new Uint8Array(n); walls = new Uint8Array(n); liq = new Uint8Array(n);
    hgt = new Int16Array(WT);
    var lock = new Uint8Array(WT), x, y, i;

    var p1 = R() * 6.3, p2 = R() * 6.3, p3 = R() * 6.3;
    for (x = 0; x < WT; x++) {
      hgt[x] = surf0 + Math.round(Math.sin(x * 0.071 + p1) * 1.7 + Math.sin(x * 0.029 + p2) * 2.3 + Math.sin(x * 0.17 + p3) * 0.6);
    }
    function flat(a, b) { for (var q = Math.max(0, a); q <= Math.min(WT - 1, b); q++) { hgt[q] = surf0; lock[q] = 1; } }
    flat(hx0 - 3, cfx + 6);
    flat(px0 - 5, px1 + 3);
    flat(golfX - 5, golfX + 9);
    for (x = 1; x < WT; x++) if (!lock[x]) hgt[x] = clamp(hgt[x], hgt[x - 1] - 1, hgt[x - 1] + 1);
    for (x = WT - 2; x >= 0; x--) if (!lock[x]) hgt[x] = clamp(hgt[x], hgt[x + 1] - 1, hgt[x + 1] + 1);
    for (x = 0; x < WT; x++) hgt[x] = clamp(hgt[x], surf0 - 4, surf0 + 3);

    // 池塘
    for (x = px0; x <= px1; x++) {
      var e = Math.min(x - px0, px1 - x), d = e === 0 ? 1 : e === 1 ? 2 : 3;
      hgt[x] = surf0 + d;
      for (y = surf0; y < surf0 + d; y++) liq[idx(x, y)] = 1;
    }

    // 泥土 / 石头分层
    for (x = 0; x < WT; x++) {
      var dd = 5 + Math.round(Math.sin(x * 0.21 + p2) * 1.5 + R() * 0.8);
      for (y = hgt[x]; y < WH; y++) {
        var dep = y - hgt[x], t;
        if (dep === 0) t = GRASS; else if (dep < dd) t = DIRT; else t = STONE;
        if (t === DIRT && dep > 1 && hash(x * 3, y * 7) < 0.06) t = STONE;
        i = idx(x, y);
        tiles[i] = t;
        if (dep >= 1) walls[i] = dep < dd ? W_DIRT : W_STONE;
      }
      if (x >= px0 && x <= px1) { tiles[idx(x, hgt[x])] = SAND; tiles[idx(x, hgt[x] + 1)] = SAND; }
    }

    function blob(bx, by, r, fn) {
      for (var yy = Math.floor(by - r); yy <= Math.ceil(by + r); yy++)
        for (var xx = Math.floor(bx - r); xx <= Math.ceil(bx + r); xx++) {
          if (xx < 1 || xx >= WT - 1 || yy < 0 || yy >= WH - 1) continue;
          var dx = xx - bx, dy = yy - by;
          if (dx * dx + dy * dy <= r * r) fn(xx, yy, idx(xx, yy));
        }
    }
    // 石层里的泥土团、矿石
    var k;
    for (k = 0; k < WT / 6; k++) {
      blob(R() * WT, surf0 + 6 + R() * (WH - surf0 - 6), 1 + R() * 1.5, function (xx, yy, ii) { if (tiles[ii] === STONE) tiles[ii] = DIRT; });
    }
    for (k = 0; k < WT / 4; k++) {
      var oy = surf0 + 3 + R() * (WH - surf0 - 4);
      var depth = (oy - surf0) / (WH - surf0);
      var ore = depth > 0.75 && R() < 0.5 ? GOLD : depth > 0.45 && R() < 0.6 ? IRON : COPPER;
      blob(R() * WT, oy, 0.8 + R() * 0.9, function (xx, yy, ii) { if (tiles[ii] === STONE || tiles[ii] === DIRT && yy - hgt[xx] > 2) tiles[ii] = ore; });
    }

    // 洞穴
    function carve(bx, by, r) {
      blob(bx, by, r, function (xx, yy, ii) {
        if (yy <= hgt[xx] + 2 || (xx >= px0 - 3 && xx <= px1 + 3)) return;
        tiles[ii] = AIR;
        if (!walls[ii]) walls[ii] = W_DIRT;
      });
    }
    torches = [];
    for (k = 0; k < 4; k++) {
      var wx = 8 + R() * (WT - 16), wy = surf0 + 6 + R() * (WH - surf0 - 9), a = R() * 6.28;
      var steps = 26 + R() * 24, mid = null;
      for (var s = 0; s < steps; s++) {
        a += (R() - 0.5) * 0.8;
        wx = clamp(wx + Math.cos(a), 4, WT - 5);
        wy = clamp(wy + Math.sin(a) * 0.5, surf0 + 5, WH - 3);
        carve(wx, wy, 1.2 + R() * 0.9);
        if (s === (steps >> 1)) mid = [Math.round(wx), Math.round(wy)];
        if (s === 3) torches.push({ x: Math.round(wx), y: Math.round(wy), cave: true });
      }
      if (mid) torches.push({ x: mid[0], y: mid[1], cave: true });
    }
    // 岩浆池
    var lx = clamp(cx - 34, 14, WT - 14), ly = WH - 5, rx = 9, ry = 3;
    lavaCells = [];
    for (y = ly - ry; y <= ly + ry; y++) for (x = lx - rx; x <= lx + rx; x++) {
      var ex = (x - lx) / rx, ey = (y - ly) / ry;
      if (ex * ex + ey * ey <= 1) {
        i = idx(x, y); tiles[i] = AIR; if (!walls[i]) walls[i] = W_STONE;
        if (y >= ly) { liq[i] = 2; lavaCells.push(i); }
      }
    }
    lavaPool = { x0: (lx - rx + 2) * 16, x1: (lx + rx - 1) * 16, top: ly * 16, bottom: (ly + 2) * 16 };
    torches.push({ x: lx - rx + 2, y: ly - 2, cave: true }, { x: lx + rx - 2, y: ly - 2, cave: true });

    // 房屋
    var f = surf0;
    for (x = hx0; x <= hx1; x++) { tiles[idx(x, f)] = WOOD; tiles[idx(x, f - 7)] = WOOD; }
    for (y = f - 6; y <= f - 1; y++) { tiles[idx(hx0, y)] = WOOD; tiles[idx(hx1, y)] = WOOD; }
    for (y = f - 3; y <= f - 1; y++) { tiles[idx(hx0, y)] = AIR; tiles[idx(hx1, y)] = AIR; }
    for (x = hx0 - 1; x <= hx1 + 1; x++) tiles[idx(x, f - 8)] = ROOF;
    for (x = hx0 + 1; x <= hx1 - 1; x++) tiles[idx(x, f - 9)] = ROOF;
    for (x = hx0 + 3; x <= hx1 - 3; x++) tiles[idx(x, f - 10)] = ROOF;
    for (x = hx0 + 1; x <= hx1 - 1; x++) for (y = f - 6; y <= f - 1; y++) walls[idx(x, y)] = W_WOOD;
    for (x = hx0 + 2; x <= hx0 + 3; x++) for (y = f - 5; y <= f - 4; y++) walls[idx(x, y)] = W_GLASS;
    for (x = hx1 - 3; x <= hx1 - 2; x++) for (y = f - 5; y <= f - 4; y++) walls[idx(x, y)] = W_GLASS;
    torches.push({ x: hx0 + 1, y: f - 3 }, { x: hx1 - 1, y: f - 3 });

    goldCells = [];
    for (i = 0; i < n; i++) if (tiles[i] === GOLD) goldCells.push(i);

    // 光照衰减与天空开放格
    openSky = new Uint8Array(n); DEC = new Float32Array(n);
    for (x = 0; x < WT; x++) for (y = 0; y < WH; y++) {
      i = idx(x, y);
      if (tiles[i] || walls[i]) break;
      openSky[i] = 1;
    }
    for (i = 0; i < n; i++) DEC[i] = tiles[i] ? 0.79 : liq[i] === 1 ? 0.86 : walls[i] ? 0.88 : 0.91;

    paintWorld(R);
    buildMinimapBase();
    buildHills(R);
  }

  /* ---------- 方块像素绘制 ---------- */
  var PAL = {};
  PAL[DIRT] = { c: [[151, 107, 75], [139, 96, 66], [163, 118, 84], [128, 88, 60]], o: [92, 60, 40] };
  PAL[STONE] = { c: [[128, 128, 132], [114, 114, 120], [142, 142, 146], [102, 102, 108]], o: [66, 66, 74] };
  PAL[SAND] = { c: [[211, 198, 111], [196, 182, 98], [226, 213, 130], [186, 170, 90]], o: [150, 132, 64] };
  PAL[WOOD] = { c: [[170, 112, 62], [154, 98, 52], [184, 126, 72], [160, 104, 56]], o: [88, 54, 28] };
  PAL[ROOF] = { c: [[176, 58, 48], [158, 46, 40], [198, 76, 60], [168, 52, 44]], o: [96, 24, 24] };
  var ORE = {};
  ORE[COPPER] = [[196, 112, 62], [232, 152, 92], [150, 78, 40]];
  ORE[IRON] = [[176, 146, 128], [208, 184, 168], [140, 112, 98]];
  ORE[GOLD] = [[224, 192, 64], [252, 230, 110], [176, 140, 38]];
  var WPAL = {};
  WPAL[W_DIRT] = [[86, 58, 40], [78, 52, 36], [94, 64, 44]];
  WPAL[W_STONE] = [[62, 62, 70], [54, 54, 62], [70, 70, 78]];
  WPAL[W_WOOD] = [[112, 74, 42], [100, 64, 36], [122, 82, 48]];

  function solidPix(t, u, v, up, dn, lf, rt, px, py) {
    if (!up && !lf && u === 0 && v === 0) return null;
    if (!up && !rt && u === 14 && v === 0) return null;
    if (!dn && !lf && u === 0 && v === 14) return null;
    if (!dn && !rt && u === 14 && v === 14) return null;
    var edge = (!up && v === 0) || (!dn && v === 14) || (!lf && u === 0) || (!rt && u === 14);
    var h = hash(px >> 1, py >> 1);
    if (t === GRASS) {
      if (!up) {
        var g = 4 + (hash(px >> 1, 999) > 0.5 ? 2 : 0) + (hash(px >> 2, 77) > 0.8 ? 2 : 0);
        if (v === 0) return [30, 122, 44];
        if (v < g) return h > 0.7 ? [86, 206, 82] : h > 0.3 ? [56, 182, 66] : [44, 160, 58];
        if (v === g) return [34, 120, 46];
      }
      if ((!lf && u < 4 || !rt && u > 10) && v < 10) return edge ? [30, 122, 44] : [44, 160, 58];
      t = DIRT;
    }
    if (t === COPPER || t === IRON || t === GOLD) {
      if (edge) return PAL[STONE].o;
      var hb = hash(px >> 2, py >> 2);
      if (hb > 0.45) { var oc2 = ORE[t]; return oc2[(h * 3) | 0]; }
      t = STONE;
    }
    var p = PAL[t];
    if (edge) return p.o;
    if (t === WOOD && (py % 8 === 6)) return p.o;
    if (t === ROOF && ((py % 6 === 4) || ((px + (py % 12 < 6 ? 0 : 4)) % 8 === 0 && py % 6 < 4))) return p.o;
    return p.c[(h * 4) | 0];
  }
  function wallPix(w, px, py) {
    if (w === W_GLASS) {
      if (px % 32 === 0 || py % 32 === 0) return [70, 50, 30, 255];
      return [190, 225, 255, 70];
    }
    var p = WPAL[w], h = hash(px >> 2, py >> 2);
    if (w === W_WOOD && px % 8 === 0) return [80, 50, 26, 255];
    var c = p[(h * 3) | 0];
    return [c[0], c[1], c[2], 255];
  }

  function solidAt(x, y) {
    if (x < 0 || x >= WT || y >= WH) return true;
    if (y < 0) return false;
    return tiles[idx(x, y)] !== AIR;
  }

  function paintWorld(R) {
    var HPX = WH * 16;
    worldC = mk(WW, HPX);
    var w = worldC.getContext('2d');
    var im = w.createImageData(WW, HPX), d = im.data;
    for (var ty = 0; ty < WH; ty++) for (var tx = 0; tx < WT; tx++) {
      var i = idx(tx, ty), t = tiles[i], wl = walls[i];
      if (!t && !wl) continue;
      var up = solidAt(tx, ty - 1), dn = solidAt(tx, ty + 1), lf = solidAt(tx - 1, ty), rt = solidAt(tx + 1, ty);
      for (var v = 0; v < 16; v += 2) for (var u = 0; u < 16; u += 2) {
        var px = tx * 16 + u, py = ty * 16 + v, col = null, a = 255;
        if (t) col = solidPix(t, u, v, up, dn, lf, rt, px, py);
        if (!col && wl) { col = wallPix(wl, px, py); a = col[3]; }
        if (!col) continue;
        for (var yy = 0; yy < 2; yy++) for (var xx = 0; xx < 2; xx++) {
          var o = ((py + yy) * WW + px + xx) * 4;
          d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = a;
        }
      }
    }
    w.putImageData(im, 0, 0);
    paintDecor(w, R);
  }

  function rect(c, x, y, ww, hh, col) { c.fillStyle = col; c.fillRect(x, y, ww, hh); }

  function paintDecor(w, R) {
    var x, i, gx, gy;
    var reserved = function (tx) {
      return (tx >= hx0 - 1 && tx <= hx1 + 1) || (tx >= px0 - 1 && tx <= px1 + 1) || (tx >= cfx - 2 && tx <= cfx + 2);
    };
    // 树
    var maxH = Math.max(5, Math.floor((SURF - 130) / 16));
    x = 3 + Math.floor(R() * 4);
    while (x < WT - 3) {
      var bad = (x >= hx0 - 4 && x <= cfx + 7) || (x >= px0 - 5 && x <= px1 + 4) || (x >= golfX - 3 && x <= golfX + 8);
      if (!bad && tiles[idx(x, hgt[x])] === GRASS) {
        drawTree(w, x, hgt[x], clamp(Math.floor(6 + R() * 8), 5, maxH), (R() * 1e9) | 0);
        x += 5 + Math.floor(R() * 7);
      } else x++;
    }
    // 草与花
    var flowerCols = [[236, 64, 64], [250, 214, 62], [120, 150, 255], [236, 120, 220], [255, 255, 255]];
    for (x = 0; x < WT; x++) {
      if (reserved(x) || tiles[idx(x, hgt[x])] !== GRASS) continue;
      gy = hgt[x] * 16;
      for (var b = 0; b < 4; b++) {
        if (R() < 0.55) {
          gx = x * 16 + b * 4 + (R() < 0.5 ? 0 : 2);
          var hh = 2 + Math.floor(R() * 4) * 2;
          rect(w, gx, gy - hh, 2, hh, R() < 0.5 ? '#2fa63e' : '#46c04c');
          if (hh > 6) rect(w, gx + (R() < 0.5 ? -2 : 2), gy - hh + 2, 2, 2, '#2fa63e');
        }
      }
      var rr = R();
      if (rr < 0.12) {
        var fc = flowerCols[(R() * flowerCols.length) | 0];
        gx = x * 16 + 6;
        rect(w, gx, gy - 8, 2, 8, '#2a8a36');
        rect(w, gx - 2, gy - 12, 6, 4, rgba(fc));
        rect(w, gx, gy - 14, 2, 2, rgba(fc));
        rect(w, gx, gy - 12, 2, 2, '#ffe14a');
      } else if (rr < 0.15) {
        gx = x * 16 + 4;
        rect(w, gx + 2, gy - 6, 4, 6, '#efe6d6');
        rect(w, gx, gy - 10, 8, 4, '#d23a2a');
        rect(w, gx + 2, gy - 12, 4, 2, '#d23a2a');
        rect(w, gx + 2, gy - 10, 2, 2, '#fff');
      } else if (rr < 0.18) {
        rect(w, x * 16 + 4, gy - 4, 8, 4, '#8a8a90');
        rect(w, x * 16 + 6, gy - 6, 4, 2, '#a4a4aa');
      }
    }
    // 向日葵
    drawSunflower(w, (hx0 - 2) * 16 + 4, SURF);
    drawSunflower(w, (hx0 - 3) * 16 + 2, SURF);
    drawSunflower(w, (hx1 + 2) * 16 + 6, SURF);
    // 房屋内部：门、桌椅、箱子
    drawDoor(w, hx0 * 16, SURF - 48);
    drawDoor(w, hx1 * 16, SURF - 48);
    drawFurniture(w);
    // 火把杆
    for (i = 0; i < torches.length; i++) {
      var t = torches[i];
      rect(w, t.x * 16 + 7, t.y * 16 + 6, 2, 8, '#6b4423');
    }
    // 篝火
    var fx = cfx * 16 + 8;
    rect(w, fx - 16, SURF - 6, 32, 6, '#6e6e74');
    rect(w, fx - 14, SURF - 8, 28, 2, '#86868c');
    rect(w, fx - 12, SURF - 12, 24, 4, '#7a4a24');
    rect(w, fx - 8, SURF - 14, 16, 2, '#5a3416');
    // 高尔夫球洞旗
    var gfx = (golfX + 8) * 16 + 8;
    rect(w, gfx, SURF - 44, 2, 44, '#d8d8d8');
    rect(w, gfx + 2, SURF - 44, 12, 4, '#e23b3b');
    rect(w, gfx + 2, SURF - 40, 8, 4, '#e23b3b');
    rect(w, gfx + 2, SURF - 36, 4, 2, '#e23b3b');
    rect(w, gfx - 4, SURF - 2, 10, 2, '#1d4d1d');
  }

  function drawTree(w, tx, groundRow, height, seed) {
    var R = mulberry32(seed);
    var x0 = tx * 16 + 2, gy = groundRow * 16, top = gy - height * 16;
    var bark = ['#4e321c', '#6f4a2c', '#8a603a', '#7d5634', '#6f4a2c', '#4e321c'];
    for (var y = top; y < gy; y += 2) {
      for (var c = 0; c < 6; c++) {
        var col = bark[c];
        var h = hash(x0 + c * 2, y);
        if (c > 0 && c < 5 && h < 0.04) col = '#3e2614';
        if (c > 0 && c < 5 && (y - top) % 22 === 0) col = '#5a3b22';
        rect(w, x0 + c * 2, y, 2, 2, col);
      }
    }
    // 根
    rect(w, x0 - 4, gy - 4, 4, 4, '#6f4a2c'); rect(w, x0 - 6, gy - 2, 2, 2, '#4e321c');
    rect(w, x0 + 12, gy - 4, 4, 4, '#6f4a2c'); rect(w, x0 + 16, gy - 2, 2, 2, '#4e321c');
    // 侧枝
    var nb = 1 + Math.floor(R() * 2);
    for (var k = 0; k < nb; k++) {
      var by = Math.round((top + (gy - top) * (0.25 + R() * 0.4)) / 2) * 2, side = R() < 0.5 ? -1 : 1;
      var bx = side < 0 ? x0 - 8 : x0 + 12;
      rect(w, bx, by, 8, 2, '#6f4a2c');
      canopy(w, bx + (side < 0 ? -2 : 10), by - 4, 10, 8, (R() * 1e9) | 0);
    }
    canopy(w, x0 + 6, top - 18, 28 + R() * 8, 24 + R() * 6, (R() * 1e9) | 0);
  }

  function canopy(w, ccx, ccy, rw, rh, seed) {
    var R = mulberry32(seed), blobs = [[0, 0, rw * 0.78, rh * 0.78]];
    for (var i = 0; i < 6; i++) blobs.push([(R() - 0.5) * rw * 0.95, (R() - 0.5) * rh * 0.8, rw * (0.32 + R() * 0.3), rh * (0.32 + R() * 0.3)]);
    function inside(x, y) {
      for (var j = 0; j < blobs.length; j++) {
        var b = blobs[j], dx = (x - b[0]) / b[2], dy = (y - b[1]) / b[3];
        if (dx * dx + dy * dy <= 1) return true;
      }
      return false;
    }
    var pal = ['#24702f', '#2f8a39', '#3fa344', '#5cbf4f', '#86d865'];
    ccx = Math.round(ccx / 2) * 2; ccy = Math.round(ccy / 2) * 2;
    for (var y = -rh * 1.3; y <= rh * 1.3; y += 2) for (var x = -rw * 1.3; x <= rw * 1.3; x += 2) {
      var X = Math.round(x / 2) * 2, Y = Math.round(y / 2) * 2;
      if (!inside(X, Y)) continue;
      var col;
      if (!inside(X - 2, Y) || !inside(X + 2, Y) || !inside(X, Y - 2) || !inside(X, Y + 2)) col = '#174d20';
      else {
        var s = (-X / rw - Y / rh) * 0.9 + (hash(ccx + X, ccy + Y) - 0.5) * 1.2;
        if (hash((ccx + X) >> 3, (ccy + Y) >> 3) > 0.82) s -= 0.6;
        col = pal[clamp(Math.round(2 + s * 1.6), 0, 4)];
      }
      rect(w, ccx + X, ccy + Y, 2, 2, col);
    }
  }

  function drawSunflower(w, x, gy) {
    rect(w, x + 4, gy - 40, 2, 40, '#2a8a36');
    rect(w, x, gy - 20, 4, 4, '#3fa344'); rect(w, x + 6, gy - 28, 4, 4, '#3fa344');
    rect(w, x - 2, gy - 50, 14, 10, '#f5c52b');
    rect(w, x, gy - 52, 10, 14, '#f5c52b');
    rect(w, x + 2, gy - 48, 6, 6, '#6b3d18');
    rect(w, x + 2, gy - 48, 2, 2, '#8a5428');
  }
  function drawDoor(w, x, y) {
    rect(w, x + 2, y, 12, 48, '#5a3818');
    rect(w, x + 4, y + 2, 8, 44, '#8a5a2e');
    rect(w, x + 4, y + 14, 8, 2, '#5a3818');
    rect(w, x + 4, y + 32, 8, 2, '#5a3818');
    rect(w, x + 10, y + 22, 2, 4, '#e0c060');
  }
  function drawFurniture(w) {
    var fy = SURF;
    // 桌子
    var tx = (cx - 1) * 16;
    rect(w, tx, fy - 18, 30, 4, '#8a5a2e'); rect(w, tx, fy - 18, 30, 2, '#a8743e');
    rect(w, tx + 2, fy - 14, 4, 14, '#6e4422'); rect(w, tx + 24, fy - 14, 4, 14, '#6e4422');
    // 桌上的蜡烛和瓶子
    rect(w, tx + 6, fy - 24, 4, 6, '#f0ead0'); rect(w, tx + 7, fy - 26, 2, 2, '#ffd050');
    rect(w, tx + 18, fy - 26, 6, 8, '#5aa0e0'); rect(w, tx + 20, fy - 28, 2, 2, '#c08850');
    // 椅子
    var cxp = (cx - 2) * 16 + 6;
    rect(w, cxp, fy - 26, 2, 26, '#6e4422'); rect(w, cxp, fy - 12, 10, 2, '#8a5a2e'); rect(w, cxp + 8, fy - 12, 2, 12, '#6e4422');
    // 箱子
    var chx = (cx + 2) * 16;
    rect(w, chx, fy - 16, 20, 16, '#7a4a22'); rect(w, chx, fy - 16, 20, 2, '#9a6432');
    rect(w, chx, fy - 9, 20, 2, '#4a2a10'); rect(w, chx + 8, fy - 11, 4, 4, '#e8c040');
    // 书架
    var bsx = (hx1 - 2) * 16 - 2;
    rect(w, bsx, fy - 94, 20, 2, '#6e4422');
    var bc = ['#c03030', '#3060c0', '#30a040', '#d0a020', '#8040b0'];
    for (var b = 0; b < 5; b++) rect(w, bsx + 2 + b * 3, fy - 102 + (b % 2) * 2, 2, 8 - (b % 2) * 2, bc[b]);
    // 横幅
    var bnx = (cx + 0) * 16;
    rect(w, bnx, fy - 92, 12, 2, '#6e4422'); rect(w, bnx + 2, fy - 90, 8, 18, '#3a62c8'); rect(w, bnx + 4, fy - 86, 4, 4, '#ffd34a');
  }

  /* ---------- 远景山脉 ---------- */
  function buildHills(R) {
    hills = [];
    var defs = [
      { p: 0.12, base: '#8fa9d6', hi: '#b7cbec', lit: '#a3bce2', dark: '#7b95c4', snow: true, lo: 0.50, amp: 0.17, f: 0.012, haze: 0.45 },
      { p: 0.28, base: '#5c9c6e', hi: '#79b685', tree: '#4a8a5c', lo: 0.62, amp: 0.13, f: 0.016, haze: 0.25 },
      { p: 0.55, base: '#3b7a48', hi: '#4f9459', tree: '#2c6237', lo: 0.80, amp: 0.08, f: 0.024, haze: 0.08 }
    ];
    defs.forEach(function (df) {
      var wdt = Math.ceil(VW + (WW - VW) * df.p) + 4, H = SURF + 96;
      var c = mk(wdt, H), g = c.getContext('2d');
      var a1 = R() * 6, a2 = R() * 6, a3 = R() * 6;
      var tops = [];
      for (var x = 0; x < wdt; x += 2) {
        var n = Math.sin(x * df.f + a1) * 0.5 + Math.sin(x * df.f * 2.3 + a2) * 0.3 + Math.sin(x * df.f * 5.1 + a3) * 0.15;
        if (df.snow) n = Math.abs(n) * 1.6 - 0.3;
        var top = Math.round((SURF * (df.lo + 0.08) - n * SURF * df.amp) / 2) * 2;
        top = clamp(top, 8, SURF);
        tops[x >> 1] = top;
        rect(g, x, top, 2, H - top, df.base);
        if (df.snow) {
          // 山脊明暗：迎光坡亮、背光坡暗
          var prev = tops[(x >> 1) - 1] || top;
          rect(g, x, top, 2, Math.max(4, Math.round((SURF - top) * 0.35 / 2) * 2), top <= prev ? df.lit : df.dark);
          var snowLine = SURF * 0.43;
          if (top < snowLine) rect(g, x, top, 2, Math.round((snowLine - top) * 0.7 / 2) * 2 + 2, top <= prev ? '#eef4ff' : '#c9d6ee');
        }
        rect(g, x, top, 2, 2, df.hi);
        if (!df.snow && x % 6 === 0) rect(g, x, top + 4 + (hash(x, 3) * 6 | 0) * 2, 2, 2, df.hi);
      }
      if (df.tree) {
        for (var tx = 0; tx < wdt; tx += 18 + Math.floor(R() * 40)) {
          tx -= tx % 2;
          var tt = tops[tx >> 1] || SURF;
          var th = (df.p > 0.4 ? 18 : 10) + Math.floor(R() * 10);
          var r = df.p > 0.4 ? 9 : 6;
          rect(g, tx, tt - th, 2, th + 2, df.tree);
          for (var yy2 = -r; yy2 <= r; yy2 += 2) for (var xx2 = -r; xx2 <= r; xx2 += 2)
            if (xx2 * xx2 + yy2 * yy2 * 1.3 <= r * r) rect(g, tx + xx2, tt - th - r + yy2, 2, 2, (xx2 + yy2 < -r * 0.6) ? df.hi : df.tree);
        }
      }
      hills.push({ c: c, p: df.p, haze: df.haze, tint: mk(wdt, H), key: '' });
    });
  }

  /* ======================= 时间系统 ======================= */
  var SPEEDS = [0, 1, 60, 600];
  var TIME = { synced: true, speedIdx: 1, G: 0, phaseBase: 0, phaseBaseDay: 0, bloodDay: null, bloodOn: false, startDay: 0 };
  function realG() { var d = new Date(); return (d.getTime() - d.getTimezoneOffset() * 60000) / 3600000; }
  function astroAge(ms) {
    var syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    var a = ((ms - ref) / 86400000) % syn; if (a < 0) a += syn;
    return a / syn;
  }
  function dayIndex(G) { return Math.floor((G - 4.5) / 24); }
  function moonPhase() {
    if (TIME.synced) return (4 + Math.round(astroAge(Date.now()) * 8)) % 8;
    var d = dayIndex(TIME.G) - TIME.phaseBaseDay;
    return ((TIME.phaseBase + d) % 8 + 8) % 8;
  }
  function unsync() {
    if (!TIME.synced) return;
    TIME.phaseBase = moonPhase(); TIME.phaseBaseDay = dayIndex(TIME.G);
    TIME.synced = false;
  }
  function hourOf(G) { return ((G % 24) + 24) % 24; }
  function isBlood() {
    var h = hourOf(TIME.G);
    if (!(h >= 19.5 || h < 4.5)) return false;
    var d = dayIndex(TIME.G);
    if (TIME.bloodDay === d) return TIME.bloodOn;
    return moonPhase() !== 4 && hash(d, 9173) < 1 / 9;
  }

  // 天空关键帧：[小时, 顶部, 底部, 环境光, 星空强度]
  var SKY = [
    [0, '#060a1f', '#18204a', [0.30, 0.34, 0.55], 1],
    [4.0, '#0a1030', '#262d5e', [0.32, 0.35, 0.55], 1],
    [4.5, '#2a2f6a', '#c96f5a', [0.50, 0.45, 0.55], 0.6],
    [5.25, '#4a77c8', '#f2b27a', [0.86, 0.78, 0.72], 0.1],
    [6.5, '#4f86e6', '#9fcdf7', [1, 1, 1], 0],
    [12, '#5c94fc', '#a8d8fc', [1, 1, 1], 0],
    [17.5, '#5a8cec', '#b6d6f2', [1, 0.98, 0.95], 0],
    [18.75, '#4d5fae', '#f2a066', [0.95, 0.78, 0.66], 0],
    [19.5, '#262a66', '#b0566a', [0.60, 0.50, 0.60], 0.4],
    [20.25, '#0d1236', '#2a2860', [0.34, 0.36, 0.56], 0.9],
    [21, '#060a1f', '#18204a', [0.30, 0.34, 0.55], 1],
    [24, '#060a1f', '#18204a', [0.30, 0.34, 0.55], 1]
  ].map(function (k) { return [k[0], hex(k[1]), hex(k[2]), k[3], k[4]]; });

  var env = { hour: 12, top: [0, 0, 0], bot: [0, 0, 0], amb: [1, 1, 1], stars: 0, night: false, blood: false, phase: 0, lum: 1 };
  function computeEnv() {
    var h = hourOf(TIME.G), a = SKY[0], b = SKY[1];
    for (var i = 0; i < SKY.length - 1; i++) if (h >= SKY[i][0] && h < SKY[i + 1][0]) { a = SKY[i]; b = SKY[i + 1]; break; }
    var t = (h - a[0]) / (b[0] - a[0]); t = t * t * (3 - 2 * t);
    env.hour = h;
    env.top = lerp3(a[1], b[1], t); env.bot = lerp3(a[2], b[2], t);
    env.amb = lerp3(a[3], b[3], t); env.stars = lerp(a[4], b[4], t);
    env.night = h >= 19.5 || h < 4.5;
    env.phase = moonPhase();
    var ml = MOON_LIGHT[env.phase];
    var k = lerp(1, 0.72 + 0.4 * ml, env.stars);
    env.amb = [env.amb[0] * k, env.amb[1] * k, env.amb[2] * k];
    env.blood = isBlood();
    if (env.blood) {
      var f = env.stars;
      env.top = lerp3(env.top, [44, 4, 12], f * 0.9);
      env.bot = lerp3(env.bot, [120, 18, 26], f * 0.85);
      env.amb = lerp3(env.amb, [0.62, 0.24, 0.24], f * 0.85);
    }
    env.lum = env.amb[0] * 0.3 + env.amb[1] * 0.5 + env.amb[2] * 0.2;
  }

  /* ======================= 光照 ======================= */
  var LR, LG, LB, lightSources = [];
  function initLight() {
    var n = WT * WH;
    LR = new Float32Array(n); LG = new Float32Array(n); LB = new Float32Array(n);
    lightC = mk(WT, WH);
    lightImg = lightC.getContext('2d').createImageData(WT, WH);
  }
  function addLight(x, y, r, g, b) {
    var tx = Math.floor(x / 16), ty = Math.floor(y / 16);
    if (tx < 0 || ty < 0 || tx >= WT || ty >= WH) return;
    var i = idx(tx, ty);
    if (r > LR[i]) LR[i] = r; if (g > LG[i]) LG[i] = g; if (b > LB[i]) LB[i] = b;
  }
  function computeLight() {
    var n = WT * WH, ar = env.amb[0], ag = env.amb[1], ab = env.amb[2], i, x, y, d, v;
    for (i = 0; i < n; i++) {
      if (openSky[i]) { LR[i] = ar; LG[i] = ag; LB[i] = ab; } else { LR[i] = 0.06; LG[i] = 0.06; LB[i] = 0.08; }
    }
    for (i = 0; i < lavaCells.length; i++) { var c = lavaCells[i]; LR[c] = 1; LG[c] = 0.6; LB[c] = 0.25; }
    for (i = 0; i < lightSources.length; i++) { var s = lightSources[i]; addLight(s[0], s[1], s[2], s[3], s[4]); }
    for (var it = 0; it < 2; it++) {
      for (y = 0; y < WH; y++) {
        var row = y * WT;
        for (x = 1; x < WT; x++) {
          i = row + x; d = DEC[i];
          v = LR[i - 1] * d; if (v > LR[i]) LR[i] = v;
          v = LG[i - 1] * d; if (v > LG[i]) LG[i] = v;
          v = LB[i - 1] * d; if (v > LB[i]) LB[i] = v;
        }
        for (x = WT - 2; x >= 0; x--) {
          i = row + x; d = DEC[i];
          v = LR[i + 1] * d; if (v > LR[i]) LR[i] = v;
          v = LG[i + 1] * d; if (v > LG[i]) LG[i] = v;
          v = LB[i + 1] * d; if (v > LB[i]) LB[i] = v;
        }
      }
      for (x = 0; x < WT; x++) {
        for (y = 1; y < WH; y++) {
          i = y * WT + x; d = DEC[i];
          v = LR[i - WT] * d; if (v > LR[i]) LR[i] = v;
          v = LG[i - WT] * d; if (v > LG[i]) LG[i] = v;
          v = LB[i - WT] * d; if (v > LB[i]) LB[i] = v;
        }
        for (y = WH - 2; y >= 0; y--) {
          i = y * WT + x; d = DEC[i];
          v = LR[i + WT] * d; if (v > LR[i]) LR[i] = v;
          v = LG[i + WT] * d; if (v > LG[i]) LG[i] = v;
          v = LB[i + WT] * d; if (v > LB[i]) LB[i] = v;
        }
      }
    }
    var D = lightImg.data;
    for (i = 0; i < n; i++) {
      var o = i * 4;
      D[o] = LR[i] > 1 ? 255 : LR[i] * 255; D[o + 1] = LG[i] > 1 ? 255 : LG[i] * 255; D[o + 2] = LB[i] > 1 ? 255 : LB[i] * 255; D[o + 3] = 255;
    }
    lightC.getContext('2d').putImageData(lightImg, 0, 0);
  }
  function lightAt(x, y) {
    var tx = clamp(Math.floor(x / 16), 0, WT - 1), ty = clamp(Math.floor(y / 16), 0, WH - 1), i = idx(tx, ty);
    return [Math.min(1, LR[i]), Math.min(1, LG[i]), Math.min(1, LB[i])];
  }

  /* ======================= 天空装饰 ======================= */
  var stars = [], clouds = [], shooters = [], wind = 0.4;
  var sunC, moonCache = {};
  function buildSky() {
    stars = [];
    var R = mulberry32(SEED + 7);
    for (var i = 0; i < Math.floor(VW * SURF / 1400); i++) {
      var c = R();
      stars.push({ x: R() * VW, y: R() * SURF * 0.92, s: R() < 0.15 ? 2 : 1, ph: R() * 6.28, sp: 1 + R() * 2.5,
        col: c < 0.1 ? [255, 210, 170] : c < 0.2 ? [180, 200, 255] : [255, 255, 255] });
    }
    // 太阳
    sunC = mk(48, 48);
    var g = sunC.getContext('2d');
    for (var y = 0; y < 48; y += 2) for (var x = 0; x < 48; x += 2) {
      var dx = x + 1 - 24, dy = y + 1 - 24, r = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx);
      var ray = Math.abs(Math.cos(ang * 4)) > 0.92 && r < 23;
      if (r < 11) rect(g, x, y, 2, 2, r < 7 ? '#fffbe6' : '#ffe680');
      else if (r < 13) rect(g, x, y, 2, 2, '#ffc93c');
      else if (ray && r < 21) rect(g, x, y, 2, 2, r < 17 ? '#ffd65a' : '#ffb830');
    }
    // 云
    clouds = [];
    var n = Math.max(10, Math.round(WW / 140));
    for (var k = 0; k < n; k++) spawnCloud(true);
  }
  function spawnCloud(initial, fromLeft) {
    var rare = Math.random() < 0.09;
    var src = rare ? RARE_CLOUDS[(Math.random() * RARE_CLOUDS.length) | 0] : CLOUDS[(Math.random() * CLOUDS.length) | 0];
    var depth = frand(0.08, 0.4);
    var span = VW + (WW - VW) * depth + 320;
    var cl = { im: img(src), depth: depth, span: span,
      x: initial ? Math.random() * span : (fromLeft ? -150 : span - 160),
      y: frand(8, SURF * (rare ? 0.45 : 0.55)), a: lerp(0.65, 0.95, depth / 0.4), sp: frand(0.6, 1.4) };
    clouds.push(cl);
    return cl;
  }
  function moonSprite(phase, blood) {
    var key = phase + (blood ? 'b' : '');
    if (moonCache[key]) return moonCache[key];
    var im = img(MOON_FILES[phase]);
    if (!ready(im)) return null;
    var c = mk(50, 50), g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    if (blood) { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#ff4a3a'; g.fillRect(0, 0, 50, 50); }
    moonCache[key] = c;
    return c;
  }

  /* ======================= 生物 ======================= */
  var ents = [];
  function setSp(e, key) {
    if (e.sk === key) return;
    var d = SP[key];
    e.sk = key; e.w = d[1]; e.h = d[2]; e.face = d[3]; e.pad = d[4] || 0;
    e.el.src = d[0];
    e.el.style.width = (d[1] * S) + 'px'; e.el.style.height = (d[2] * S) + 'px';
  }
  function makeEnt(key, o) {
    var e = { x: 0, y: 0, vx: 0, vy: 0, air: false, dir: 1, t: 0, state: 'idle', mode: 'ground', yo: 0, rot: 0, sx: 1, sy: 1,
      bright: -1, ph: Math.random() * 6.28, opacity: 1, name: '' };
    for (var k in o) e[k] = o[k];
    e.el = document.createElement('img');
    e.el.className = 'ent'; e.el.alt = ''; e.el.draggable = false;
    entLayer.appendChild(e.el);
    setSp(e, key);
    if (!e.y) e.y = groundY(e.x);
    ents.push(e);
    return e;
  }
  function tx2(t) { return t * 16 + 8; }

  var pond, segL, segR, house;
  function inPond(x) { return x > pond.x0 - 6 && x < pond.x1 + 6; }

  function spawnEntities() {
    ents.forEach(function (e) { if (e.el.parentNode) e.el.parentNode.removeChild(e.el); });
    ents = [];
    pond = { x0: px0 * 16, x1: (px1 + 1) * 16, surf: SURF };
    segL = [3 * 16, (px0 - 3) * 16];
    segR = [(px1 + 4) * 16, (WT - 3) * 16];
    house = [(hx0 + 1) * 16 + 10, hx1 * 16 - 10];

    // ---- 玩家 ----
    var guitar = makeEnt('guitar', { kind: 'static', x: tx2(cfx - 2), dir: 1, name: '吉他手' });
    var eat = makeEnt('eat', { kind: 'static', x: tx2(cfx + 2), dir: -1, name: '美食家' });
    var orbP = makeEnt('orb', { kind: 'static', x: tx2(cfx + 5), dir: -1, name: '持球法师', glow: [0.55, 0.75, 1.0] });
    var drinkL = makeEnt('drinkL', { kind: 'static', x: tx2(px0 - 3), dir: 1, name: '饮者' });
    var golf = makeEnt('golf', { kind: 'static', x: tx2(golfX), dir: 1, name: '高尔夫球手' });
    var drinkLong = makeEnt('drinkLong', { kind: 'static', x: tx2(hx0 + 2) + 4, dir: 1, name: '屋主' });
    var drinkOld = makeEnt('drinkOld', { kind: 'static', x: tx2(hx1 - 2) - 2, dir: -1, name: '老练的炼金师' });
    var rud = makeEnt('rudolph', { kind: 'static', x: segR[0] + (segR[1] - segR[0]) * 0.55, dir: -1, flip: true, name: '鲁道夫' });

    // ---- 宠物（跟随主人）----
    function gpet(key, owner, side, off, o) { return makeEnt(key, Object.assign({ kind: 'gpet', owner: owner, side: side, off: off, x: owner.x + side * off }, o || {})); }
    function fpet(key, owner, side, off, o) { var e = makeEnt(key, Object.assign({ kind: 'fpet', owner: owner, side: side, off: off, x: owner.x + side * off }, o || {})); e.y = owner.y - owner.h - 10; return e; }
    gpet('dino', guitar, -1, 34);
    fpet('hornet2', guitar, -1, 22);
    gpet('bunnyP', eat, 1, 26);
    gpet('oldlady', eat, 1, 54);
    fpet('skele', eat, 1, 20);
    gpet('snowman', orbP, 1, 30);
    fpet('cupid', orbP, 1, 26);
    gpet('penguin', drinkL, -1, 26);
    gpet('penguin2', drinkL, -1, 46);
    fpet('hornet', drinkL, -1, 18);
    gpet('truffle', golf, -1, 40);
    gpet('minotaur', golf, -1, 62);
    gpet('eyeball', golf, 1, 70, { hopper: true });
    fpet('eater', golf, -1, 24);
    gpet('guinea', drinkLong, 1, 30, { range: house });
    fpet('bat', drinkLong, 1, 16);
    gpet('android', drinkOld, -1, 30, { range: house });
    fpet('heart', drinkOld, -1, 18, { glow: [1.0, 0.35, 0.35] });

    // ---- 坐骑与野生动物 ----
    var L0 = segL[0], L1 = segL[1], R0 = segR[0], R1 = segR[1];
    makeEnt('bunnyM', { kind: 'critter', x: lerp(L0, L1, 0.15), range: [L0, lerp(L0, L1, 0.55)], spd: 34, walk: 'bunnyM', idleP: 0.15 });
    makeEnt('slime', { kind: 'hopper', x: lerp(L0, L1, 0.3), range: [L0, lerp(L0, L1, 0.6)], name: '史莱姆' });
    makeEnt('pigWalk', { kind: 'critter', x: lerp(L0, L1, 0.45), range: [L0, L1], spd: 22, walk: 'pigWalk', idle: 'pigIdle', fly: 'pigFly', flyP: 0.18 });
    makeEnt('basilisk', { kind: 'critter', x: lerp(L0, L1, 0.6), range: [L0, R1], spd: 95, walk: 'basilisk', idleP: 0, leap: true });
    makeEnt('beeFly', { kind: 'critter', mode: 'fly', x: lerp(L0, L1, 0.5), y: SURF - 120, tx: lerp(L0, L1, 0.3), ty: SURF - 140, t: 12, range: [L0, L1], spd: 26, walk: 'beeWalk', fly: 'beeFly', rest: 'beeRest', flyP: 0.4 });
    makeEnt('book', { kind: 'flyer', x: tx2(cx), y: SURF - 150, area: [tx2(hx0 - 12), tx2(cfx + 8), SURF * 0.35, SURF - 90], spd: 22 });
    makeEnt('chRun', { kind: 'critter', x: lerp(R0, R1, 0.3), range: [R0, R1], spd: 40, walk: 'chRun', idle: 'chIdle' });
    makeEnt('ciRun', { kind: 'critter', x: lerp(L0, L1, 0.08), range: [L0, lerp(L0, L1, 0.4)], spd: 44, walk: 'ciRun', idle: 'ciIdle', glow: [0.9, 0.45, 0.2] });
    makeEnt('fishLand', { kind: 'critter', mode: 'swim', x: lerp(pond.x0, pond.x1, 0.4), y: pond.surf + 30, t: 9, range: [lerp(L0, L1, 0.6), R1], spd: 26, walk: 'fishLand', swim: 'fishSwim', fly: 'fishFly', flyP: 0.12, swimP: 0.35 });
    makeEnt('turtle', { kind: 'critter', mode: 'swim', x: lerp(pond.x0, pond.x1, 0.7), y: pond.surf + 30, t: 14, dir: -1, range: [R0, lerp(R0, R1, 0.6)], spd: 12, walk: 'turtle', swim: 'turtleSw', swimP: 0.45, swimSpd: 18 });
    makeEnt('scutlix', { kind: 'critter', x: lerp(R0, R1, 0.75), range: [lerp(R0, R1, 0.4), R1], spd: 48, walk: 'scutlix', idleP: 0.05 });
    if (lavaPool) {
      var sh = makeEnt('shark', { kind: 'lava', x: lerp(lavaPool.x0, lavaPool.x1, 0.5), dir: 1 });
      sh.y = lavaPool.top + 30;
    }
    // 蝴蝶
    for (var b = 0; b < 3; b++) {
      var bx = b === 0 ? lerp(L0, L1, 0.2) : b === 1 ? tx2(hx0 - 4) : lerp(R0, R1, 0.5);
      var bf = makeEnt(b === 1 ? 'bfly2' : 'bfly1', { kind: 'flyer', butterfly: true, x: bx, y: SURF - 40,
        area: [bx - 120, bx + 120, SURF - 90, SURF - 16], spd: 14 });
      bf.y = SURF - 40;
    }
  }

  function startArc(e, x1, y1, h, dur) {
    e.arc = { x0: e.x, y0: e.y, x1: x1, y1: y1, h: h, d: dur, t: 0 };
    if (x1 !== e.x) e.dir = x1 > e.x ? 1 : -1;
  }
  function stepArc(e, dt) {
    var a = e.arc; a.t += dt;
    var t = Math.min(1, a.t / a.d);
    e.x = lerp(a.x0, a.x1, t);
    e.y = lerp(a.y0, a.y1, t) - Math.sin(Math.PI * t) * a.h;
    if (t >= 1) { e.arc = null; if (a.done) a.done(); }
  }
  function followGround(e, dt) {
    var gy = groundY(e.x);
    if (Math.abs(gy - e.y) > 40) e.y = gy; else e.y += (gy - e.y) * Math.min(1, dt * 14);
  }
  function physics(e, dt) {
    e.vy += 700 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
    if (e.range) e.x = clamp(e.x, e.range[0], e.range[1]);
    var gy = groundY(e.x);
    if (e.y >= gy && e.vy > 0) { e.y = gy; e.vy = 0; e.vx = 0; e.air = false; e.land = 0.15; }
  }
  function hop(e, power) {
    if (e.air || e.arc || e.mode !== 'ground') return;
    e.air = true; e.vy = -(power || 190); e.vx = 0;
  }

  function updEnt(e, dt) {
    if (e.arc) { stepArc(e, dt); return; }
    var night = env.stars > 0.6;
    switch (e.kind) {
      case 'static':
        if (e.air) physics(e, dt); else followGround(e, dt);
        if (e.flip) { e.t -= dt; if (e.t <= 0) { e.dir = -e.dir; e.t = frand(6, 14); } }
        break;

      case 'gpet': {
        var ow = e.owner;
        e.t -= dt;
        if (e.t <= 0) { e.off = frand(18, 70); e.side = Math.random() < 0.7 ? e.side : -e.side; e.t = frand(3, 8); }
        var rg = e.range || (ow.x < pond.x0 ? segL : segR);
        var tx = clamp(ow.x + e.side * e.off, rg[0], rg[1]);
        if (e.air) { physics(e, dt); break; }
        var d = tx - e.x;
        if (e.hopper) {
          e.t2 = (e.t2 || 0) - dt;
          if (Math.abs(d) > 6 && e.t2 <= 0) { e.dir = d > 0 ? 1 : -1; e.air = true; e.vy = -230; e.vx = e.dir * Math.min(70, Math.abs(d) * 1.5); e.t2 = frand(0.4, 1.4); }
          followGround(e, dt);
          e.sy = e.land > 0 ? 0.8 : 1; e.land = Math.max(0, (e.land || 0) - dt);
          break;
        }
        if (Math.abs(d) > 4) {
          e.dir = d > 0 ? 1 : -1;
          var sp = Math.min(70, 18 + Math.abs(d) * 0.8);
          e.x += e.dir * sp * dt;
          e.yo = -Math.abs(Math.sin(T * 13 + e.ph)) * 3;
        } else {
          e.yo *= 0.8;
          if (Math.random() < dt * 0.3) e.dir = ow.x > e.x ? 1 : -1;
        }
        followGround(e, dt);
        break;
      }

      case 'fpet': {
        var o = e.owner;
        e.t -= dt;
        if (e.t <= 0) { e.off = frand(14, 40); e.side = Math.random() < 0.5 ? 1 : -1; e.t = frand(3, 7); }
        var fx = o.x + e.side * e.off + Math.sin(T * 0.7 + e.ph) * 10;
        var fy = o.y - o.h - 8 + Math.sin(T * 2 + e.ph) * 6;
        if (e.range) fx = clamp(fx, e.range[0], e.range[1]);
        var vx = (fx - e.x) * 2.2;
        e.x += vx * dt; e.y += (fy - e.y) * Math.min(1, dt * 2.5);
        if (Math.abs(vx) > 6) e.dir = vx > 0 ? 1 : -1; else e.dir = o.x > e.x ? 1 : -1;
        e.rot = clamp(vx * 0.15, -10, 10);
        break;
      }

      case 'flyer': {
        e.t -= dt;
        var ar = e.area, dx = (e.tx || e.x) - e.x, dy = (e.ty || e.y) - e.y;
        if (e.t <= 0 || dx * dx + dy * dy < 64) { e.tx = frand(ar[0], ar[1]); e.ty = frand(ar[2], ar[3]); e.t = frand(4, 9); dx = e.tx - e.x; dy = e.ty - e.y; }
        var L = Math.sqrt(dx * dx + dy * dy) || 1;
        e.vx += (dx / L * e.spd - e.vx) * dt * 1.2;
        e.vy += (dy / L * e.spd * 0.6 - e.vy) * dt * 1.2;
        e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(T * 2.4 + e.ph) * 10 * dt;
        if (Math.abs(e.vx) > 3) e.dir = e.vx > 0 ? 1 : -1;
        if (e.butterfly) e.opacity = clamp(1 - env.stars * 1.6, 0, 1);
        break;
      }

      case 'lava': {
        e.t -= dt;
        if (e.t <= 0 && Math.random() < 0.3) {
          var jx = clamp(e.x + e.dir * frand(30, 70), lavaPool.x0, lavaPool.x1);
          startArc(e, jx, e.y, 46, 1.1);
          e.t = frand(5, 10);
          e.arc.done = function () { burst(e.x, lavaPool.top + 2, [255, 150, 40], 10); };
          burst(e.x, lavaPool.top + 2, [255, 150, 40], 8);
          break;
        } else if (e.t <= 0) e.t = frand(3, 6);
        e.x += e.dir * 28 * dt;
        if (e.x > lavaPool.x1) { e.x = lavaPool.x1; e.dir = -1; }
        if (e.x < lavaPool.x0) { e.x = lavaPool.x0; e.dir = 1; }
        e.y = lavaPool.top + 32 + Math.sin(T * 1.6 + e.ph) * 4;
        break;
      }

      case 'hopper': {
        if (e.air) { physics(e, dt); e.sy = e.vy < 0 ? 1.12 : 0.95; e.sx = 2 - e.sy; break; }
        e.t -= dt;
        e.land = Math.max(0, (e.land || 0) - dt);
        var charge = clamp(1 - e.t / 0.6, 0, 1);
        e.sy = e.land > 0 ? 0.78 : 1 - charge * 0.18; e.sx = 2 - e.sy;
        if (e.t <= 0) {
          if (!e.tx || Math.abs(e.tx - e.x) < 20) e.tx = frand(e.range[0], e.range[1]);
          e.dir = e.tx > e.x ? 1 : -1;
          e.air = true; e.vy = -frand(220, 300); e.vx = e.dir * frand(40, 80);
          e.t = frand(0.9, 2.2);
        }
        followGround(e, dt);
        break;
      }

      case 'critter':
        updCritter(e, dt, night);
        break;
    }
  }

  function updCritter(e, dt, night) {
    if (e.air) { physics(e, dt); return; }
    e.t -= dt;
    if (e.mode === 'ground') {
      if (e.rest && night) {
        setSp(e, e.rest); e.state = 'rest'; followGround(e, dt);
        return;
      }
      if (e.t <= 0) {
        var r = Math.random();
        if (e.fly && r < (e.flyP || 0)) {
          e.mode = 'fly'; setSp(e, e.fly);
          e.tx = frand(e.range[0], e.range[1]); e.ty = frand(SURF * 0.3, SURF - 90); e.t = frand(8, 16);
          return;
        }
        r = Math.random();
        if (e.swim && r < (e.swimP || 0)) { e.state = 'toPond'; e.tx = e.x < pond.x0 ? pond.x0 - 10 : pond.x1 + 10; e.t = 30; }
        else if (Math.random() < (e.idleP == null ? 0.35 : e.idleP)) { e.state = 'idle'; e.t = frand(2, 6); }
        else {
          e.state = 'walk'; e.tx = frand(e.range[0], e.range[1]); e.t = 25;
          var cross = inPond(e.tx) || ((e.x < pond.x0) !== (e.tx < pond.x0));
          if (cross && !e.leap) {
            if (e.swim) { e.state = 'toPond'; e.tx = e.x < pond.x0 ? pond.x0 - 10 : pond.x1 + 10; }
            else e.tx = e.x;
          }
        }
      }
      if (e.state === 'walk' || e.state === 'toPond') {
        var d = e.tx - e.x;
        if (Math.abs(d) < 3) {
          if (e.state === 'toPond') {
            e.mode = 'swim'; setSp(e, e.swim);
            startArc(e, clamp(e.x + (e.x < pond.x0 ? 50 : -50), pond.x0 + 20, pond.x1 - 20), pond.surf + 30, 30, 0.8);
            var ex = e;
            e.arc.done = function () { burst(ex.x, pond.surf, [150, 200, 255], 10); };
            e.t = frand(10, 22);
            return;
          }
          e.state = 'idle'; e.t = frand(1.5, 5);
        } else {
          e.dir = d > 0 ? 1 : -1;
          var nx = e.x + e.dir * e.spd * dt;
          if (inPond(nx) && !(e.state === 'toPond')) {
            if (e.leap) { startArc(e, e.dir > 0 ? pond.x1 + 14 : pond.x0 - 14, SURF, 70, 1.0); return; }
            e.state = 'idle'; e.t = 1;
          } else e.x = nx;
        }
      }
      setSp(e, (e.state === 'idle' && e.idle) ? e.idle : e.walk);
      followGround(e, dt);
    } else if (e.mode === 'fly') {
      if (night && e.rest) e.t = Math.min(e.t, 0);
      var dx = e.tx - e.x, dy = e.ty - e.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
      if (e.t <= 0 && !e.landing) {
        e.landing = true;
        e.tx = frand(e.range[0], e.range[1]);
        if (inPond(e.tx) && !e.swim) e.tx = e.range[0] + 20;
      }
      if (e.landing) e.ty = inPond(e.tx) && e.swim ? pond.surf + 30 : groundY(e.tx);
      else if (L < 10) { e.tx = frand(e.range[0], e.range[1]); e.ty = frand(SURF * 0.3, SURF - 90); }
      var sp = e.spd * 1.8;
      e.vx += (dx / L * sp - e.vx) * dt * 1.5; e.vy += (dy / L * sp - e.vy) * dt * 1.5;
      e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(T * 3 + e.ph) * 8 * dt;
      if (Math.abs(e.vx) > 3) e.dir = e.vx > 0 ? 1 : -1;
      if (e.landing && L < 6) {
        e.landing = false; e.vx = e.vy = 0;
        if (inPond(e.x) && e.swim) { e.mode = 'swim'; setSp(e, e.swim); e.t = frand(8, 16); burst(e.x, pond.surf, [150, 200, 255], 10); }
        else { e.mode = 'ground'; e.state = 'idle'; e.t = frand(1, 3); e.y = groundY(e.x); setSp(e, e.idle || e.walk); }
      }
    } else if (e.mode === 'swim') {
      var sw = e.swimSpd || 24;
      e.x += e.dir * sw * dt;
      if (e.x > pond.x1 - 30) e.dir = -1;
      if (e.x < pond.x0 + 30) e.dir = 1;
      e.y = pond.surf + 30 + Math.sin(T * 1.4 + e.ph) * 5;
      if (e.t <= 0) {
        if (e.fly && Math.random() < 0.4) {
          e.mode = 'fly'; setSp(e, e.fly); burst(e.x, pond.surf, [150, 200, 255], 12);
          e.tx = frand(e.range[0], e.range[1]); e.ty = frand(SURF * 0.3, SURF - 90); e.t = frand(6, 12);
          e.vy = -60;
          return;
        }
        var toR = Math.random() < 0.5;
        var bx = toR ? pond.x1 + 16 : pond.x0 - 16;
        if (bx < e.range[0] || bx > e.range[1]) bx = toR ? pond.x0 - 16 : pond.x1 + 16;
        var ee = e;
        e.mode = 'ground'; setSp(e, e.walk); e.state = 'idle'; e.t = frand(2, 5);
        burst(e.x, pond.surf, [150, 200, 255], 10);
        startArc(e, bx, SURF, 34, 0.8);
        e.arc.done = function () { ee.y = groundY(ee.x); };
      }
    }
  }

  /* ======================= 粒子 / 萤火虫 / 坠落之星 ======================= */
  var parts = [], flies = [], fallen = [], starCount = 0;
  function burst(x, y, col, n) {
    for (var i = 0; i < n; i++) parts.push({ x: x, y: y, vx: frand(-50, 50), vy: frand(-110, -30), life: frand(0.4, 0.9), t: 0, col: col, g: 300, s: 2 });
  }
  function hearts(x, y) {
    for (var i = 0; i < 3; i++) parts.push({ x: x + frand(-8, 8), y: y, vx: frand(-12, 12), vy: frand(-40, -26), life: 1.4, t: i * -0.2, heart: true, g: 0 });
  }
  function initFlies() {
    flies = [];
    var n = Math.round(WT / 4);
    for (var i = 0; i < n; i++) {
      var x = Math.random() * WW;
      flies.push({ x: x, y: groundY(x) - frand(10, 80), vx: 0, vy: 0, ph: Math.random() * 6.28, hx: x });
    }
  }
  var nextStar = 6, nextShoot = 4;
  function updParticles(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i]; p.t += dt;
      if (p.t < 0) continue;
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t > p.life) parts.splice(i, 1);
    }
    // 萤火虫
    if (env.stars > 0.05) {
      for (i = 0; i < flies.length; i++) {
        var f = flies[i];
        f.vx += frand(-30, 30) * dt + (f.hx - f.x) * 0.02 * dt; f.vy += frand(-30, 30) * dt;
        f.vx *= 0.98; f.vy *= 0.98;
        f.x += f.vx * dt; f.y += f.vy * dt;
        var gy = groundY(f.x);
        if (f.y > gy - 6) f.vy -= 40 * dt;
        if (f.y < gy - 110) f.vy += 40 * dt;
      }
    }
    // 篝火火星
    if (Math.random() < dt * 6) parts.push({ x: tx2(cfx) + frand(-6, 6), y: SURF - 14, vx: frand(-8, 8), vy: frand(-50, -25), life: frand(0.8, 1.8), t: 0, col: [255, frand(120, 200), 40], g: -6, s: 1, ember: true });
    // 岩浆气泡
    if (lavaPool && Math.random() < dt * 2) parts.push({ x: frand(lavaPool.x0, lavaPool.x1), y: lavaPool.top + 2, vx: 0, vy: frand(-30, -12), life: 0.5, t: 0, col: [255, 200, 90], g: 60, s: 2, ember: true });

    // 坠落之星（只在夜里）
    if (env.night && env.stars > 0.7) {
      nextStar -= dt;
      if (nextStar <= 0 && fallen.length < 5) {
        nextStar = frand(10, 26);
        var sx = camX + frand(0.1, 0.9) * VW;
        fallen.push({ x: sx, y: -10, vx: frand(-60, 60), vy: 260, ground: false, t: 0 });
      }
      nextShoot -= dt;
      if (nextShoot <= 0) { nextShoot = frand(3, 9); shooters.push({ x: frand(0, VW), y: frand(0, SURF * 0.4), vx: frand(-260, -160), vy: frand(60, 110), t: 0, life: 0.7 }); }
    }
    for (i = fallen.length - 1; i >= 0; i--) {
      var s = fallen[i]; s.t += dt;
      if (!s.ground) {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (Math.random() < 0.8) parts.push({ x: s.x, y: s.y, vx: frand(-10, 10), vy: frand(-10, 10), life: 0.5, t: 0, col: [255, 230, 120], g: 0, s: 2, ember: true });
        var tx = Math.floor(s.x / 16), ty = Math.floor(s.y / 16);
        if (s.x < 0 || s.x > WW) { fallen.splice(i, 1); continue; }
        if (ty >= 0 && (solidAt(tx, ty) || liq[idx(clamp(tx, 0, WT - 1), clamp(ty, 0, WH - 1))])) {
          if (liq[idx(clamp(tx, 0, WT - 1), clamp(ty, 0, WH - 1))]) { burst(s.x, s.y, [150, 200, 255], 10); fallen.splice(i, 1); continue; }
          s.ground = true; s.y = ty * 16 - 6;
          burst(s.x, s.y + 4, [255, 230, 120], 14);
          if (s.x > camX && s.x < camX + VW) chat('一颗坠落之星落到了地面上！', '#ffe27a');
        }
      } else if (!env.night) {
        burst(s.x, s.y, [255, 230, 120], 6); fallen.splice(i, 1);
      }
    }
    for (i = shooters.length - 1; i >= 0; i--) { var sh = shooters[i]; sh.t += dt; sh.x += sh.vx * dt; sh.y += sh.vy * dt; if (sh.t > sh.life) shooters.splice(i, 1); }
  }

  /* ======================= 镜头 ======================= */
  var camX = 0, camV = 0, dragging = false, lastInput = -999, tour = true, tourTarget = null, tourT = 0;
  function clampCam() { camX = clamp(camX, 0, WW - VW); }
  function updCamera(dt) {
    if (!dragging) {
      camX += camV * dt; camV *= Math.pow(0.04, dt);
      if (Math.abs(camV) < 2) camV = 0;
    }
    if (tour && !dragging && T - lastInput > 20 && camV === 0) {
      tourT -= dt;
      if (tourT <= 0 || !tourTarget) {
        var cands = ents.filter(function (e) { return e.kind !== 'lava' && !e.butterfly; });
        tourTarget = cands[(Math.random() * cands.length) | 0]; tourT = frand(12, 20);
      }
      var goal = tourTarget.x - VW / 2;
      camX += (goal - camX) * Math.min(1, dt * 0.35);
    }
    clampCam();
  }

  /* ======================= 渲染 ======================= */
  function tintLayer(dst, src, color, haze) {
    var g = dst.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, dst.width, dst.height);
    g.fillStyle = color; g.fillRect(0, 0, dst.width, dst.height);
    g.globalCompositeOperation = 'multiply'; g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0);
    if (haze) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = haze[1]; g.fillStyle = haze[0]; g.fillRect(0, 0, dst.width, dst.height); g.globalAlpha = 1; }
    g.globalCompositeOperation = 'source-over';
  }
  function ambCol(mul) {
    mul = mul || 1;
    return rgba([clamp(env.amb[0] * mul, 0, 1) * 255, clamp(env.amb[1] * mul, 0, 1) * 255, clamp(env.amb[2] * mul, 0, 1) * 255]);
  }

  var lastHillTint = -1;
  function render() {
    var cam = Math.round(camX), i;
    sc.globalCompositeOperation = 'source-over';
    sc.imageSmoothingEnabled = false;

    // 天空
    var g = sc.createLinearGradient(0, 0, 0, SURF);
    g.addColorStop(0, rgba(env.top)); g.addColorStop(1, rgba(env.bot));
    sc.fillStyle = g; sc.fillRect(0, 0, VW, VH);

    // 星空
    if (env.stars > 0.01) {
      var par = cam * 0.02;
      for (i = 0; i < stars.length; i++) {
        var st = stars[i], a = env.stars * (0.55 + 0.45 * Math.sin(T * st.sp + st.ph));
        var sx = ((st.x - par) % VW + VW) % VW;
        sc.fillStyle = rgba(st.col, a);
        sc.fillRect(Math.round(sx), Math.round(st.y), st.s, st.s);
        if (st.s === 2 && a > 0.8) { sc.fillStyle = rgba(st.col, a * 0.4); sc.fillRect(Math.round(sx) - 1, Math.round(st.y) + 0.5, 4, 1); sc.fillRect(Math.round(sx) + 0.5, Math.round(st.y) - 1, 1, 4); }
      }
      for (i = 0; i < shooters.length; i++) {
        var s = shooters[i], fa = env.stars * (1 - s.t / s.life);
        var gr = sc.createLinearGradient(s.x, s.y, s.x - s.vx * 0.15, s.y - s.vy * 0.15);
        gr.addColorStop(0, rgba([255, 255, 255], fa)); gr.addColorStop(1, rgba([255, 255, 255], 0));
        sc.strokeStyle = gr; sc.lineWidth = 1; sc.beginPath(); sc.moveTo(s.x, s.y); sc.lineTo(s.x - s.vx * 0.15, s.y - s.vy * 0.15); sc.stroke();
      }
    }

    // 太阳 / 月亮
    drawCelestial();

    // 远山 + 云
    if (T - lastHillTint > 0.25) {
      lastHillTint = T;
      for (i = 0; i < hills.length; i++) {
        var hl = hills[i];
        var key = env.amb.map(function (v) { return Math.round(v * 60); }).join() + (env.blood ? 'b' : '');
        if (hl.key !== key) { hl.key = key; tintLayer(hl.tint, hl.c, ambCol(1), [rgba(env.bot), hl.haze]); }
      }
    }
    sc.drawImage(hills[0].tint, -Math.round(cam * hills[0].p), 0);
    drawClouds(cam);
    sc.drawImage(hills[1].tint, -Math.round(cam * hills[1].p), 0);
    sc.drawImage(hills[2].tint, -Math.round(cam * hills[2].p), 0);

    // 前景地形 × 光照
    var cg = contentC.getContext('2d');
    cg.clearRect(0, 0, VW, VH);
    cg.drawImage(worldC, cam, 0, VW, VH, 0, 0, VW, VH);
    var fg = fgC.getContext('2d');
    fg.globalCompositeOperation = 'source-over';
    fg.imageSmoothingEnabled = true;
    fg.drawImage(lightC, cam / 16, 0, VW / 16, VH / 16, 0, 0, VW, VH);
    fg.imageSmoothingEnabled = false;
    fg.globalCompositeOperation = 'multiply'; fg.drawImage(contentC, 0, 0);
    fg.globalCompositeOperation = 'destination-in'; fg.drawImage(contentC, 0, 0);
    fg.globalCompositeOperation = 'source-over';
    sc.drawImage(fgC, 0, 0);

    renderEnts(cam);
    renderOver(cam);
  }

  function celestialPos(f) {
    var hor = SURF - 10;
    return [-30 + f * (VW + 60), hor - Math.sin(Math.PI * f) * (hor - Math.min(60, SURF * 0.15))];
  }
  function drawCelestial() {
    var h = env.hour;
    if (h >= 4.5 && h < 19.5) {
      var p = celestialPos((h - 4.5) / 15), low = 1 - Math.sin(Math.PI * (h - 4.5) / 15);
      sc.globalCompositeOperation = 'lighter';
      var gg = sc.createRadialGradient(p[0], p[1], 0, p[0], p[1], 90);
      var gc = lerp3([255, 240, 190], [255, 140, 60], low * low);
      gg.addColorStop(0, rgba(gc, 0.55)); gg.addColorStop(0.3, rgba(gc, 0.18)); gg.addColorStop(1, rgba(gc, 0));
      sc.fillStyle = gg; sc.fillRect(p[0] - 90, p[1] - 90, 180, 180);
      sc.globalCompositeOperation = 'source-over';
      sc.save(); sc.translate(Math.round(p[0]), Math.round(p[1])); sc.rotate(T * 0.05);
      sc.drawImage(sunC, -24, -24); sc.restore();
    } else {
      var nf = ((h - 19.5 + 24) % 24) / 9, mp = celestialPos(nf);
      var ms = moonSprite(env.phase, env.blood);
      var il = MOON_LIGHT[env.phase];
      if (il > 0) {
        sc.globalCompositeOperation = 'lighter';
        var mg = sc.createRadialGradient(mp[0], mp[1], 0, mp[0], mp[1], 70);
        var mc = env.blood ? [255, 60, 50] : [170, 190, 255];
        mg.addColorStop(0, rgba(mc, 0.28 * il)); mg.addColorStop(1, rgba(mc, 0));
        sc.fillStyle = mg; sc.fillRect(mp[0] - 70, mp[1] - 70, 140, 140);
      }
      if (ms) { sc.globalCompositeOperation = 'screen'; sc.drawImage(ms, Math.round(mp[0] - 25), Math.round(mp[1] - 25)); }
      sc.globalCompositeOperation = 'source-over';
    }
  }

  function drawClouds(cam) {
    var g = cloudC.getContext('2d'), list = [];
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      if (!ready(c.im)) continue;
      var x = ((c.x - cam * c.depth) % c.span + c.span) % c.span - 150;
      if (x > VW || x + c.im.width < 0) continue;
      list.push([c, Math.round(x)]);
    }
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, VW, cloudC.height);
    if (!list.length) return;
    var tc = lerp3(env.amb, [1, 1, 1], 0.1);
    if (env.blood) tc = lerp3(tc, [0.7, 0.25, 0.25], env.stars);
    g.fillStyle = rgba([tc[0] * 255, tc[1] * 255, tc[2] * 255]); g.fillRect(0, 0, VW, cloudC.height);
    g.globalCompositeOperation = 'multiply';
    list.forEach(function (l) { g.drawImage(l[0].im, l[1], Math.round(l[0].y)); });
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = 'rgba(0,0,0,0)';
    var mask = maskC.getContext('2d');
    mask.clearRect(0, 0, VW, maskC.height);
    list.forEach(function (l) { mask.globalAlpha = l[0].a; mask.drawImage(l[0].im, l[1], Math.round(l[0].y)); });
    mask.globalAlpha = 1;
    g.drawImage(maskC, 0, 0);
    g.globalCompositeOperation = 'source-over';
    sc.drawImage(cloudC, 0, 0);
  }

  function renderEnts(cam) {
    var upd = (frameNo % 4) === 0;
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      var sx = e.x - e.w / 2 - cam;
      var vis = sx < VW + 10 && sx + e.w > -10;
      if (!vis) { if (e.vis !== false) { e.el.style.display = 'none'; e.vis = false; } continue; }
      if (e.vis === false) { e.el.style.display = ''; }
      e.vis = true;
      var sy = e.y - e.h + e.pad + e.yo;
      var flip = e.dir === e.face ? 1 : -1;
      e.el.style.transform = 'translate3d(' + (sx * S).toFixed(1) + 'px,' + (sy * S).toFixed(1) + 'px,0) scale(' + (flip * e.sx) + ',' + e.sy + ')' + (e.rot ? ' rotate(' + (e.rot * flip).toFixed(1) + 'deg)' : '');
      if (upd) {
        var l = lightAt(e.x, e.y - e.h * 0.5), b = clamp(l[0] * 0.3 + l[1] * 0.5 + l[2] * 0.2, 0.08, 1);
        if (e.glow) b = Math.max(b, 0.85);
        if (Math.abs(b - e.bright) > 0.02) {
          e.bright = b;
          var warm = l[0] - l[2];
          e.el.style.filter = b > 0.98 ? '' : 'brightness(' + b.toFixed(2) + ')' + (warm > 0.15 ? ' sepia(' + Math.min(0.5, warm).toFixed(2) + ')' : '');
        }
        if (e.opacity !== e.op2) { e.op2 = e.opacity; e.el.style.opacity = e.opacity; e.el.style.visibility = e.opacity < 0.02 ? 'hidden' : ''; }
      }
    }
  }

  function glow(x, y, r, col, a) {
    if (a <= 0.01) return;
    var g = oc.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    oc.fillStyle = g; oc.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function flame(x, y, sc2) {
    var f = Math.sin(T * 18 + x) * 0.5 + Math.sin(T * 11 + x * 3) * 0.5;
    var hgt2 = Math.round((6 + f * 1.5) * sc2 / 2) * 2;
    oc.fillStyle = '#ff7a1a'; oc.fillRect(x - 2 * sc2, y - hgt2, 4 * sc2, hgt2);
    oc.fillStyle = '#ffb02e'; oc.fillRect(x - 1 * sc2, y - hgt2 + 2, 2 * sc2, hgt2 - 2);
    oc.fillStyle = '#fff2b0'; oc.fillRect(x - 1, y - Math.max(2, hgt2 - 4 * sc2), 2, Math.max(2, hgt2 - 4 * sc2));
    if (f > 0.3) { oc.fillStyle = '#ff9a2a'; oc.fillRect(x - 1 + (f > 0.6 ? 2 : -2), y - hgt2 - 2, 2, 2); }
  }
  var HEART_PX = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
  function pxHeart(x, y, a) {
    oc.fillStyle = rgba([255, 70, 90], a);
    for (var r = 0; r < HEART_PX.length; r++) for (var c = 0; c < 7; c++) if (HEART_PX[r][c] === '#') oc.fillRect(Math.round(x) + c - 3, Math.round(y) + r - 3, 1, 1);
  }
  function pxStar(x, y, a, s) {
    x = Math.round(x); y = Math.round(y);
    oc.fillStyle = rgba([255, 214, 60], a);
    oc.fillRect(x - 1, y - 4 * s, 2, 8 * s); oc.fillRect(x - 4 * s, y - 1, 8 * s, 2);
    oc.fillRect(x - 2 * s, y - 2 * s, 4 * s, 4 * s);
    oc.fillStyle = rgba([255, 255, 220], a); oc.fillRect(x - 1, y - 1, 2, 2);
  }

  function renderOver(cam) {
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.globalCompositeOperation = 'source-over';
    oc.clearRect(0, 0, VW, VH);
    oc.setTransform(1, 0, 0, 1, -cam, 0);
    var t0 = Math.max(0, Math.floor(cam / 16) - 1), t1 = Math.min(WT - 1, Math.ceil((cam + VW) / 16) + 1), x, y, i, u;
    var nightA = env.stars;

    // 液体
    for (y = 0; y < WH; y++) for (x = t0; x <= t1; x++) {
      i = idx(x, y);
      var l = liq[i]; if (!l) continue;
      var top = y === 0 || liq[i - WT] !== l, sx = x * 16, sy = y * 16;
      if (l === 1) {
        var lr = Math.min(1, LR[i]), lg = Math.min(1, LG[i]), lb = Math.min(1, LB[i]);
        var wc = [40 * lr + 10, 100 * lg + 15, 230 * lb + 25];
        for (u = 0; u < 16; u += 2) {
          var off = top ? 2 + Math.round(Math.sin(T * 2.2 + (sx + u) * 0.18) * 1.2) : 0;
          oc.fillStyle = rgba(wc, 0.55); oc.fillRect(sx + u, sy + off, 2, 16 - off);
          if (top) { oc.fillStyle = rgba([wc[0] + 90, wc[1] + 90, wc[2] + 30], 0.75); oc.fillRect(sx + u, sy + off, 2, 2); }
        }
      } else {
        for (u = 0; u < 16; u += 2) {
          var off2 = top ? 2 + Math.round(Math.sin(T * 1.1 + (sx + u) * 0.12) * 1.5) : 0;
          oc.fillStyle = 'rgba(255,' + (95 + Math.round(Math.sin(T * 2 + (sx + u) * 0.08 + y) * 20)) + ',20,0.82)';
          oc.fillRect(sx + u, sy + off2, 2, 16 - off2);
          if (top) { oc.fillStyle = '#ffd05a'; oc.fillRect(sx + u, sy + off2, 2, 2); }
        }
      }
    }

    // 火把与篝火
    for (i = 0; i < torches.length; i++) {
      var tch = torches[i], fx = tch.x * 16 + 8, fy = tch.y * 16 + 6;
      if (fx < cam - 40 || fx > cam + VW + 40) continue;
      flame(fx, fy, 1);
    }
    var cxp = tx2(cfx);
    flame(cxp - 5, SURF - 12, 1.5); flame(cxp + 5, SURF - 12, 1.5); flame(cxp, SURF - 12, 2.2);

    // 粒子
    for (i = 0; i < parts.length; i++) {
      var p = parts[i]; if (p.t < 0) continue;
      var pa = 1 - p.t / p.life;
      if (p.heart) pxHeart(p.x, p.y, Math.min(1, pa * 1.5));
      else { oc.fillStyle = rgba(p.col, pa); oc.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    }

    // 坠落之星
    for (i = 0; i < fallen.length; i++) {
      var s = fallen[i];
      pxStar(s.x, s.y + (s.ground ? Math.sin(T * 3 + i) * 1.5 : 0), 1, s.ground ? 1 : 1);
    }

    // 发光（夜里明显）
    oc.globalCompositeOperation = 'lighter';
    var ga = 0.25 + nightA * 0.5;
    for (i = 0; i < torches.length; i++) {
      var tc = torches[i]; glow(tc.x * 16 + 8, tc.y * 16 + 3, 26, [255, 170, 70], (tc.cave ? 0.5 : ga) * (0.9 + Math.sin(T * 9 + i) * 0.1));
    }
    glow(cxp, SURF - 14, 48, [255, 150, 60], (0.3 + nightA * 0.45) * (0.9 + Math.sin(T * 7) * 0.1));
    if (lavaPool) glow((lavaPool.x0 + lavaPool.x1) / 2, lavaPool.top, 120, [255, 90, 20], 0.25);
    for (i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.glow && e.vis) glow(e.x, e.y - e.h * 0.55, 34, [e.glow[0] * 255, e.glow[1] * 255, e.glow[2] * 255], 0.12 + nightA * 0.35);
    }
    for (i = 0; i < fallen.length; i++) glow(fallen[i].x, fallen[i].y, 30, [255, 220, 120], 0.35 + nightA * 0.3);
    if (nightA > 0.05) {
      for (i = 0; i < flies.length; i++) {
        var f = flies[i];
        if (f.x < cam - 10 || f.x > cam + VW + 10) continue;
        var bl = Math.sin(T * 2.2 + f.ph); bl = bl > 0 ? bl * bl : 0;
        var fa = nightA * bl;
        if (fa < 0.03) continue;
        glow(f.x, f.y, 9, [190, 255, 90], fa * 0.6);
        oc.fillStyle = rgba([235, 255, 150], fa); oc.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
      }
    }
    // 金矿闪光
    for (i = 0; i < goldCells.length; i++) {
      var gc = goldCells[i], gx = (gc % WT) * 16, gyy = Math.floor(gc / WT) * 16;
      if (gx < cam - 16 || gx > cam + VW) continue;
      var sp = Math.sin(T * 1.7 + gc * 1.3);
      if (sp > 0.94) {
        var px2 = gx + (hash(gc, 1) * 12 | 0) + 2, py2 = gyy + (hash(gc, 2) * 12 | 0) + 2, sa = (sp - 0.94) / 0.06;
        oc.fillStyle = rgba([255, 255, 220], sa);
        oc.fillRect(px2 - 2, py2, 5, 1); oc.fillRect(px2, py2 - 2, 1, 5);
      }
    }
    oc.globalCompositeOperation = 'source-over';
    oc.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ======================= 界面 ======================= */
  var watchC = $('watch'), wg = watchC.getContext('2d');
  function drawWatch(h, m, g, size) {
    g = g || wg; size = size || 32;
    g.clearRect(0, 0, size, size);
    var c = 16, x, y;
    for (y = 0; y < 32; y++) for (x = 0; x < 32; x++) {
      var dx = x + 0.5 - c, dy = y + 0.5 - c - 1, r = Math.sqrt(dx * dx + dy * dy);
      if (r < 10.5) g.fillStyle = r < 9.5 ? '#fbf6e2' : '#c9b98a';
      else if (r < 12.5) g.fillStyle = (dx + dy < -4) ? '#ffe680' : '#e0b43c';
      else if (r < 13.6) g.fillStyle = '#5a3a0c';
      else continue;
      g.fillRect(x, y, 1, 1);
    }
    g.fillStyle = '#e0b43c'; g.fillRect(14, 0, 4, 3); g.fillStyle = '#5a3a0c'; g.fillRect(13, 0, 1, 3); g.fillRect(18, 0, 1, 3);
    for (var k = 0; k < 12; k++) {
      var a = k / 12 * Math.PI * 2;
      g.fillStyle = k % 3 === 0 ? '#3a2a10' : '#9a8a60';
      g.fillRect(Math.round(c - 0.5 + Math.sin(a) * 8), Math.round(c + 0.5 - Math.cos(a) * 8), 1, 1);
    }
    function hand(ang, len, col) {
      g.fillStyle = col;
      for (var s = 0; s <= len; s += 0.5) g.fillRect(Math.round(c - 0.5 + Math.sin(ang) * s), Math.round(c + 0.5 - Math.cos(ang) * s), 1, 1);
    }
    hand(((h % 12) + m / 60) / 12 * Math.PI * 2, 5, '#2a1a08');
    hand(m / 60 * Math.PI * 2, 7.5, '#b02020');
    g.fillStyle = '#2a1a08'; g.fillRect(15, 16, 2, 2);
  }

  function iconCanvas(kind) {
    var c = mk(32, 32), g = c.getContext('2d'), x, y;
    function disc(cx2, cy2, r, col, clipY) {
      for (y = 0; y < 32; y++) for (x = 0; x < 32; x++) {
        if (clipY != null && y > clipY) continue;
        var dx = x + 0.5 - cx2, dy = y + 0.5 - cy2;
        if (dx * dx + dy * dy <= r * r) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
      }
    }
    if (kind === 'dawn' || kind === 'dusk' || kind === 'noon') {
      var cy2 = kind === 'noon' ? 16 : 22;
      var col = kind === 'dusk' ? '#ff8a3a' : '#ffd84a';
      for (var k = 0; k < 8; k++) {
        var a = k / 8 * Math.PI * 2;
        for (var s = 10; s < 15; s++) { x = Math.round(16 + Math.cos(a) * s); y = Math.round(cy2 + Math.sin(a) * s); if (kind === 'noon' || y < 24) { g.fillStyle = col; g.fillRect(x, y, 2, 2); } }
      }
      disc(16, cy2, 8, '#fff2a0', kind === 'noon' ? null : 23);
      disc(16, cy2, 6, kind === 'dusk' ? '#ffb070' : '#fffbe0', kind === 'noon' ? null : 23);
      if (kind !== 'noon') { g.fillStyle = '#3a8a3a'; g.fillRect(2, 24, 28, 3); g.fillStyle = '#7a5030'; g.fillRect(2, 27, 28, 3); }
    } else if (kind === 'watch') {
      drawWatch(10, 10, g, 32);
    } else if (kind === 'sync') {
      disc(16, 16, 12, '#2a62c8');
      g.fillStyle = '#3fae4a';
      [[9, 9, 6, 4], [8, 13, 5, 6], [18, 8, 5, 3], [17, 12, 8, 5], [20, 17, 4, 6], [12, 21, 4, 3]].forEach(function (r) { g.fillRect(r[0], r[1], r[2], r[3]); });
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(9, 6, 5, 2);
    } else if (kind === 'music') {
      g.fillStyle = '#6a4424'; g.fillRect(4, 10, 24, 18); g.fillStyle = '#8a5a30'; g.fillRect(5, 11, 22, 4);
      g.fillStyle = '#f0d060'; g.fillRect(15, 3, 2, 14); g.fillRect(15, 3, 7, 2); g.fillRect(20, 3, 2, 10);
      disc(14, 17, 3, '#f0d060'); disc(19, 13, 3, '#f0d060');
    } else if (kind === 'eye') {
      for (y = 0; y < 32; y++) for (x = 0; x < 32; x++) {
        var ex = (x + 0.5 - 16) / 13, ey = (y + 0.5 - 16) / 8;
        if (ex * ex + ey * ey <= 1) { g.fillStyle = ex * ex + ey * ey > 0.8 ? '#2a1a10' : '#f2f2f2'; g.fillRect(x, y, 1, 1); }
      }
      disc(16, 16, 5, '#3a7ad8'); disc(16, 16, 2.5, '#101010'); g.fillStyle = '#fff'; g.fillRect(17, 13, 2, 2);
    } else if (kind === 'star') {
      var pts = [];
      for (var q = 0; q < 10; q++) { var ang = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? 6 : 14; pts.push([16 + Math.cos(ang) * rr, 17 + Math.sin(ang) * rr]); }
      g.fillStyle = '#ffd23a'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.forEach(function (p) { g.lineTo(p[0], p[1]); }); g.closePath(); g.fill();
      var id = g.getImageData(0, 0, 32, 32);
      for (var j = 3; j < id.data.length; j += 4) id.data[j] = id.data[j] > 110 ? 255 : 0;
      g.putImageData(id, 0, 0);
      g.fillStyle = '#fff8c0'; g.fillRect(14, 12, 4, 6);
    } else if (kind === 'heart') {
      for (y = 0; y < 32; y++) for (x = 0; x < 32; x++) {
        var X = (x + 0.5 - 16) / 13, Y = -(y + 0.5 - 17) / 13 + 0.12;
        var v = Math.pow(X * X + Y * Y - 0.5, 3) - X * X * Y * Y * Y * 0.6;
        if (v <= 0) { g.fillStyle = (X < -0.15 && Y > 0.25) ? '#ff8a8a' : '#e3202e'; g.fillRect(x, y, 1, 1); }
      }
    }
    return c;
  }

  var SLOTS = [
    { k: '1', name: '时间：黎明 (4:30 AM)', icon: 'dawn', act: function () { jumpTo(4.5); } },
    { k: '2', name: '时间：正午 (12:00 PM)', icon: 'noon', act: function () { jumpTo(12); } },
    { k: '3', name: '时间：黄昏 (7:30 PM)', icon: 'dusk', act: function () { jumpTo(19.5); } },
    { k: '4', name: '时间：午夜 (12:00 AM)', icon: 'moon', act: function () { jumpTo(0); } },
    { k: '5', name: '时间流速', icon: 'watch', act: cycleSpeed },
    { k: '6', name: '与现实时间同步', icon: 'sync', act: resync },
    { k: '7', name: '召唤血月', icon: 'blood', act: toggleBlood },
    { k: '8', name: '音乐', icon: 'music', act: toggleMusic },
    { k: '9', name: '镜头自动巡游', icon: 'eye', act: function () { tour = !tour; lastInput = T - 30; chat(tour ? '镜头巡游：开' : '镜头巡游：关', '#a0d8ff'); } },
    { k: '0', name: '坠落之星', icon: 'star', act: function () { chat(starCount ? '你已经收集了 ' + starCount + ' 颗坠落之星。' : '夜里点击落在地上的星星来收集它们。', '#ffe27a'); } }
  ];
  var selSlot = 4, slotEls = [];
  function buildHotbar() {
    var hb = $('hotbar');
    SLOTS.forEach(function (s, i) {
      var d = document.createElement('div');
      d.className = 'slot';
      var icon;
      if (s.icon === 'moon' || s.icon === 'blood') {
        icon = document.createElement('img'); icon.className = 'round px'; icon.src = MOON_FILES[0];
        if (s.icon === 'blood') icon.style.filter = 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(.9)';
      } else { icon = iconCanvas(s.icon); icon.className = 'px'; }
      d.appendChild(icon);
      var num = document.createElement('span'); num.className = 'num txt'; num.textContent = s.k; d.appendChild(num);
      var cnt = document.createElement('span'); cnt.className = 'cnt txt'; d.appendChild(cnt);
      d.addEventListener('pointerdown', function (ev) { ev.stopPropagation(); });
      d.addEventListener('click', function (ev) { ev.stopPropagation(); useSlot(i); });
      d.addEventListener('mouseenter', function () { $('item-name').textContent = slotName(i); });
      d.addEventListener('mouseleave', function () { $('item-name').textContent = slotName(selSlot); });
      hb.appendChild(d);
      slotEls.push({ el: d, cnt: cnt });
    });
    var hearts = $('hearts'), hi = iconCanvas('heart').toDataURL();
    for (var k = 0; k < 20; k++) { var im = document.createElement('img'); im.src = hi; im.className = 'px'; hearts.appendChild(im); }
    updateSlots();
  }
  function slotName(i) {
    var s = SLOTS[i];
    if (s.icon === 'watch') return '时间流速：' + speedText();
    if (s.icon === 'music') return musicOn ? '音乐：开（点击关闭）' : '音乐：关（点击开启）';
    if (s.icon === 'eye') return '镜头自动巡游：' + (tour ? '开' : '关');
    if (s.icon === 'sync') return TIME.synced ? '已与现实时间同步' : '与现实时间同步';
    if (s.icon === 'blood') return env.blood ? '驱散血月' : '召唤血月';
    if (s.icon === 'star') return '坠落之星 ×' + starCount;
    return s.name;
  }
  function useSlot(i) {
    selSlot = i;
    SLOTS[i].act();
    updateSlots();
    $('item-name').textContent = slotName(i);
  }
  function updateSlots() {
    slotEls.forEach(function (s, i) {
      s.el.classList.toggle('sel', i === selSlot);
      var ic = SLOTS[i].icon;
      var on = (ic === 'sync' && TIME.synced) || (ic === 'music' && musicOn) || (ic === 'eye' && tour) || (ic === 'blood' && env.blood);
      s.el.classList.toggle('on', on);
      s.cnt.textContent = ic === 'watch' ? speedShort() : ic === 'star' ? (starCount || '') : '';
    });
  }
  function speedShort() { return TIME.synced ? '1×' : SPEEDS[TIME.speedIdx] === 0 ? 'Ⅱ' : SPEEDS[TIME.speedIdx] + '×'; }
  function speedText() {
    if (TIME.synced) return '与现实同步（1×）';
    var s = SPEEDS[TIME.speedIdx];
    return s === 0 ? '已暂停' : s === 1 ? '正常 1×' : s === 60 ? '泰拉瑞亚原速 60×' : '飞速 600×';
  }

  function jumpTo(h) {
    unsync();
    var cur = hourOf(TIME.G), d = (h - cur + 24) % 24;
    if (d < 0.01) d = 0;
    TIME.G += d;
    if (TIME.speedIdx === 0) TIME.speedIdx = 1;
  }
  function cycleSpeed() {
    if (TIME.synced) { unsync(); TIME.speedIdx = 2; }
    else TIME.speedIdx = (TIME.speedIdx + 1) % SPEEDS.length;
    chat('时间流速：' + speedText(), '#a0d8ff');
  }
  function resync() {
    TIME.synced = true; TIME.speedIdx = 1; TIME.bloodDay = null; TIME.G = realG();
    chat('已与现实时间同步。', '#a0d8ff');
  }
  function toggleBlood() {
    if (!env.night) { jumpTo(19.5); TIME.bloodDay = dayIndex(TIME.G); TIME.bloodOn = true; return; }
    TIME.bloodDay = dayIndex(TIME.G); TIME.bloodOn = !env.blood;
  }

  var chatEl = $('chat');
  function chat(text, col) {
    var d = document.createElement('div');
    d.className = 'txt'; d.textContent = text; d.style.color = col || '#fff';
    chatEl.appendChild(d);
    while (chatEl.children.length > 5) chatEl.removeChild(chatEl.firstChild);
    setTimeout(function () { d.style.opacity = '0'; }, 7000);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 8400);
  }

  function fmtTime(h) {
    var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    var ap = hh >= 12 ? 'PM' : 'AM', h12 = hh % 12 || 12;
    return { s: h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap, h: hh, m: mm };
  }
  var lastHud = '', mmC = $('mm'), mmG, mmBase;
  function buildMinimapBase() {
    mmC.width = WT; mmC.height = WH; mmG = mmC.getContext('2d');
    mmBase = mk(WT, WH);
    var g = mmBase.getContext('2d'), im = g.createImageData(WT, WH), d = im.data;
    var MC = {};
    MC[DIRT] = [151, 107, 75]; MC[GRASS] = [40, 170, 60]; MC[STONE] = [120, 120, 126]; MC[COPPER] = [200, 120, 70];
    MC[IRON] = [180, 150, 130]; MC[GOLD] = [230, 200, 70]; MC[WOOD] = [170, 112, 62]; MC[ROOF] = [180, 60, 50]; MC[SAND] = [211, 198, 111];
    for (var i = 0; i < WT * WH; i++) {
      var c = null, a = 255;
      if (tiles[i]) c = MC[tiles[i]];
      else if (liq[i] === 1) c = [50, 110, 230];
      else if (liq[i] === 2) c = [255, 110, 30];
      else if (walls[i]) c = walls[i] === W_GLASS ? [170, 210, 250] : walls[i] === W_WOOD ? [110, 72, 40] : walls[i] === W_STONE ? [60, 60, 68] : [86, 58, 40];
      if (!c) continue;
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = a;
    }
    g.putImageData(im, 0, 0);
  }
  function drawMinimap() {
    mmG.clearRect(0, 0, WT, WH);
    mmG.drawImage(mmBase, 0, 0);
    if (env.lum < 0.97) { mmG.fillStyle = 'rgba(5,8,30,' + ((1 - env.lum) * 0.6).toFixed(2) + ')'; mmG.fillRect(0, 0, WT, WH); }
    for (var i = 0; i < ents.length; i++) {
      var e = ents[i];
      if (e.butterfly) continue;
      mmG.fillStyle = e.kind === 'static' ? '#ffffff' : (e.kind === 'gpet' || e.kind === 'fpet') ? '#ff9ad0' : '#ffe14a';
      mmG.fillRect(Math.floor(e.x / 16), Math.floor((e.y - 8) / 16), 1, 1);
    }
    for (i = 0; i < fallen.length; i++) { mmG.fillStyle = '#fff6a0'; mmG.fillRect(Math.floor(fallen[i].x / 16), Math.floor(fallen[i].y / 16), 1, 1); }
    mmG.strokeStyle = 'rgba(255,255,255,0.9)'; mmG.lineWidth = 1;
    mmG.strokeRect(Math.floor(camX / 16) + 0.5, 0.5, Math.round(VW / 16) - 1, WH - 1);
  }

  var CARD = ['东', '西'];
  function updateHud() {
    var ft = fmtTime(env.hour);
    var key = ft.s + env.phase + env.blood + TIME.synced + TIME.speedIdx + starCount;
    if (key === lastHud) return;
    lastHud = key;
    $('t-big').textContent = ft.s;
    drawWatch(ft.h, ft.m);
    var day = dayIndex(TIME.G) - TIME.startDay + 1;
    var part = env.hour < 4.5 ? '深夜' : env.hour < 7 ? '清晨' : env.hour < 11.5 ? '上午' : env.hour < 13.5 ? '正午' : env.hour < 17.5 ? '下午' : env.hour < 19.5 ? '傍晚' : '夜晚';
    $('t-sub').textContent = '第 ' + day + ' 天 · ' + part + (env.blood ? ' · 血月' : '');
    $('t-sub').style.color = env.blood ? '#ff6a6a' : '';
    $('t-moon').textContent = '月相：' + MOON_NAMES[env.phase] + (TIME.synced ? '（真实）' : '');
    $('moon-ico').src = MOON_FILES[env.phase];
    $('t-mode').textContent = TIME.synced ? '现实时间同步 · 1×' : '泰拉时间 · ' + speedText();
    var mph = Math.round(Math.abs(wind) * 28);
    $('t-wind').textContent = (env.blood ? '血月 · ' : env.night ? '晴夜 · ' : '晴朗 · ') + (mph ? CARD[wind > 0 ? 1 : 0] + '风 ' + mph + ' mph' : '无风');
    updateSlots();
    $('item-name').textContent = slotName(selSlot);
  }

  /* ======================= 事件提示 ======================= */
  var prevNight = null, prevBlood = null;
  function checkEvents() {
    if (prevNight !== null) {
      if (env.night && !prevNight) chat(env.blood ? '血月正在升起……' : '夜幕降临了……', env.blood ? '#ff4a4a' : '#9fb4ff');
      if (!env.night && prevNight) { chat('早上好！新的一天开始了。', '#ffe27a'); wind = frand(-1, 1); }
      if (env.night && prevNight && env.blood && !prevBlood) chat('血月正在升起……', '#ff4a4a');
      if (env.night && prevNight && !env.blood && prevBlood) chat('血月消散了。', '#ffb0b0');
    }
    prevNight = env.night; prevBlood = env.blood;
  }

  /* ======================= 音频 ======================= */
  var music = $('bg-music'), musicOn = false, audioReady = false, actx = null, lp = null, gain = null;
  function setupAudioGraph() {
    if (actx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      actx = new AC();
      var src = actx.createMediaElementSource(music);
      lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000;
      gain = actx.createGain(); gain.gain.value = 1;
      src.connect(lp); lp.connect(gain); gain.connect(actx.destination);
    } catch (e) { actx = null; }
  }
  function updateAudio(dt) {
    if (!actx || !musicOn) return;
    var n = env.stars;
    var target = env.blood ? 700 : lerp(20000, 1300, n);
    lp.frequency.value += (target - lp.frequency.value) * Math.min(1, dt * 1.5);
    gain.gain.value += ((env.blood ? 0.7 : lerp(1, 0.6, n)) - gain.gain.value) * Math.min(1, dt * 1.5);
    // 夜晚蟋蟀
    if (n > 0.6) {
      cricketT -= dt;
      if (cricketT <= 0) { cricketT = frand(0.5, 2.2); chirp(); }
    }
  }
  var cricketT = 1;
  function chirp() {
    try {
      var t = actx.currentTime, f = frand(4200, 4800), pan = actx.createStereoPanner ? actx.createStereoPanner() : null;
      for (var k = 0; k < 3; k++) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + k * 0.06);
        g.gain.linearRampToValueAtTime(0.02, t + k * 0.06 + 0.01);
        g.gain.linearRampToValueAtTime(0, t + k * 0.06 + 0.04);
        o.connect(g);
        if (pan) { pan.pan.value = frand(-0.8, 0.8); g.connect(pan); } else g.connect(actx.destination);
        o.start(t + k * 0.06); o.stop(t + k * 0.06 + 0.05);
      }
      if (pan) pan.connect(actx.destination);
    } catch (e) { /* 忽略 */ }
  }
  function toggleMusic() {
    if (!audioReady) { chat('音乐还没有加载。', '#ffb0b0'); return; }
    musicOn = !musicOn;
    if (musicOn) { if (actx && actx.state === 'suspended') actx.resume(); music.play(); } else music.pause();
  }

  /* ======================= 输入 ======================= */
  var ptr = null;
  stage.addEventListener('pointerdown', function (e) {
    ptr = { x: e.clientX, y: e.clientY, cam: camX, t: performance.now(), lx: e.clientX, lt: performance.now(), moved: false };
    dragging = true; camV = 0; lastInput = T;
    stage.classList.add('drag');
    try { stage.setPointerCapture(e.pointerId); } catch (er) { /* 忽略 */ }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!ptr) return;
    var dx = e.clientX - ptr.x;
    if (Math.abs(dx) > 6) ptr.moved = true;
    camX = ptr.cam - dx / S; clampCam();
    var now = performance.now();
    if (now - ptr.lt > 16) { camV = -(e.clientX - ptr.lx) / S / ((now - ptr.lt) / 1000); ptr.lx = e.clientX; ptr.lt = now; }
    lastInput = T;
  });
  function endPtr(e) {
    if (!ptr) return;
    dragging = false; stage.classList.remove('drag');
    if (!ptr.moved && performance.now() - ptr.t < 500) { camV = 0; tap(e.clientX, e.clientY); }
    else if (performance.now() - ptr.lt > 80) camV = 0;
    camV = clamp(camV, -1500, 1500);
    ptr = null;
  }
  stage.addEventListener('pointerup', endPtr);
  stage.addEventListener('pointercancel', endPtr);
  stage.addEventListener('wheel', function (e) {
    camX += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / S; clampCam(); lastInput = T; e.preventDefault();
  }, { passive: false });
  var keys = {};
  window.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    var i = '1234567890'.indexOf(e.key);
    if (i >= 0) useSlot(i);
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  $('minimap').addEventListener('pointerdown', function (e) {
    e.stopPropagation();
    var r = mmC.getBoundingClientRect();
    camX = (e.clientX - r.left) / r.width * WW - VW / 2; clampCam(); camV = 0; lastInput = T;
  });

  function tap(cx2, cy2) {
    var wx = cx2 / S + camX, wy = cy2 / S;
    for (var i = 0; i < fallen.length; i++) {
      var s = fallen[i];
      if (s.ground && Math.abs(s.x - wx) < 16 && Math.abs(s.y - wy) < 16) {
        fallen.splice(i, 1); starCount++;
        burst(s.x, s.y, [255, 230, 120], 16);
        chat('获得了 坠落之星 (' + starCount + ')', '#ffe27a');
        updateSlots();
        return;
      }
    }
    for (i = ents.length - 1; i >= 0; i--) {
      var e = ents[i];
      if (!e.vis || e.opacity < 0.1) continue;
      if (wx > e.x - e.w / 2 - 4 && wx < e.x + e.w / 2 + 4 && wy > e.y - e.h - 4 && wy < e.y + 4) {
        hearts(e.x, e.y - e.h);
        if (e.kind === 'static' || e.kind === 'gpet' || (e.kind === 'critter' && e.mode === 'ground') || e.kind === 'hopper') {
          if (!e.air && !e.arc) { e.air = true; e.vy = -200; e.vx = 0; }
        }
        if (e.name) chat(e.name + '：' + pick(['你好呀！', '今天天气不错。', '要来点音乐吗？', '小心夜里的僵尸！', '真是个美丽的世界。']), '#ffffff');
        return;
      }
    }
  }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  /* ======================= 主循环 ======================= */
  var T = 0, last = 0, frameNo = 0, lastLightT = -1, lastMM = -1, maskC;
  function frame(now) {
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016;
    last = now; T += dt; frameNo++;

    if (TIME.synced) TIME.G = realG(); else TIME.G += dt * SPEEDS[TIME.speedIdx] / 3600;
    computeEnv();
    checkEvents();

    var kp = (keys.ArrowLeft || keys.a || keys.A ? -1 : 0) + (keys.ArrowRight || keys.d || keys.D ? 1 : 0);
    if (kp) { camX += kp * 260 * dt; camV = 0; lastInput = T; }
    updCamera(dt);

    for (var i = 0; i < clouds.length; i++) clouds[i].x += wind * 9 * clouds[i].sp * (0.4 + clouds[i].depth * 2) * dt;
    for (i = 0; i < ents.length; i++) updEnt(ents[i], dt);
    updParticles(dt);

    if (T - lastLightT > 0.1) {
      lastLightT = T;
      lightSources = [[tx2(cfx), SURF - 10, 1.0, 0.72, 0.42]];
      for (i = 0; i < torches.length; i++) lightSources.push([torches[i].x * 16 + 8, torches[i].y * 16 + 6, 1.0, 0.82, 0.55]);
      for (i = 0; i < ents.length; i++) { var e = ents[i]; if (e.glow) lightSources.push([e.x, e.y - e.h * 0.5, e.glow[0] * 0.8, e.glow[1] * 0.8, e.glow[2] * 0.8]); }
      for (i = 0; i < fallen.length; i++) lightSources.push([fallen[i].x, fallen[i].y, 0.9, 0.85, 0.5]);
      computeLight();
    }
    render();
    updateHud();
    updateAudio(dt);
    if (T - lastMM > 0.3) { lastMM = T; drawMinimap(); }
    requestAnimationFrame(frame);
  }

  function build() {
    computeSize();
    genWorld();
    initLight();
    contentC = mk(VW, VH); fgC = mk(VW, VH);
    cloudC = mk(VW, SURF); maskC = mk(VW, SURF);
    buildSky();
    spawnEntities();
    initFlies();
    fallen = []; parts = [];
    camX = tx2(cfx) - VW / 2 - 40; clampCam();
    computeEnv(); computeLight();
    lastHud = '';
  }

  function init() {
    if (QS.time != null && QS.time !== '') {
      TIME.G = Math.floor(realG() / 24) * 24 + parseFloat(QS.time);
      unsync();
      TIME.synced = false;
      TIME.speedIdx = QS.speed != null ? Math.max(0, SPEEDS.indexOf(parseInt(QS.speed, 10))) : 1;
    } else TIME.G = realG();
    if (QS.phase != null) { unsync(); TIME.phaseBase = parseInt(QS.phase, 10) % 8; TIME.phaseBaseDay = dayIndex(TIME.G); }
    if (QS.blood === '1') { unsync(); TIME.bloodDay = dayIndex(TIME.G); TIME.bloodOn = true; }
    if (QS.tour === '0') tour = false;
    TIME.startDay = dayIndex(TIME.G);
    wind = frand(-1, 1);
    // 预加载所有精灵
    Object.keys(SP).forEach(function (k) { img(SP[k][0]); });
    MOON_FILES.forEach(img);
    build();
    buildHotbar();
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { build(); }, 250);
    });
    requestAnimationFrame(frame);
    if (QS.overlay === '0') { $('start-overlay').classList.add('hide'); }
    loadMusic();
  }

  /* ======================= 启动界面 / 音乐加载 ======================= */
  function loadMusic() {
    var overlay = $('start-overlay'), msg = $('start-msg'), fill = $('bar-fill');
    var started = false;
    function enter(withMusic) {
      if (started) return;
      started = true;
      overlay.classList.add('hide');
      if (withMusic && audioReady) {
        setupAudioGraph();
        if (actx && actx.state === 'suspended') actx.resume();
        var p = music.play();
        musicOn = true;
        if (p && p.catch) p.catch(function () { musicOn = false; updateSlots(); });
      }
      chat('欢迎来到泰拉瑞亚！拖动画面探索世界。', '#ffe27a');
      updateSlots();
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'Music-Overworld_Day.m4a', true);
    xhr.responseType = 'blob';
    xhr.onprogress = function (e) { if (e.lengthComputable) fill.style.width = (e.loaded / e.total * 100).toFixed(0) + '%'; };
    xhr.onload = function () {
      if (this.status === 200) {
        music.src = URL.createObjectURL(this.response);
        audioReady = true;
        fill.style.width = '100%';
        msg.textContent = '点击开始';
      } else { msg.textContent = '音乐加载失败，点击进入'; audioReady = false; }
    };
    xhr.onerror = function () { msg.textContent = '音乐加载失败，点击进入'; };
    xhr.send();
    overlay.addEventListener('click', function (e) {
      if (e.target.id === 'mute-btn') { xhr.abort(); enter(false); return; }
      if (audioReady || /失败/.test(msg.textContent)) enter(true);
    });
  }

  init();
})();
