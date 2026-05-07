/* ================================================================
   CONFIG — chỉnh ở đây để thêm/bớt loại QR hoặc đổi màu
   ================================================================ */

const PALETTE = ['#16a34a', '#dc2626', '#111111', '#2563eb']; // xanh lá, đỏ, đen, xanh dương

const YEAR = new Date().getFullYear();

const QR_TYPES = [
  { id: 'sanpham', label: 'Sản phẩm', defaultRegex: `https://traceviet\\.mae\\.gov\\.vn/02/AI\\d{15}(SAURIENGA|SAU_RIENG_THAIA)\\d{5}` },
  { id: 'thung',   label: 'Thùng',    defaultRegex: `https://traceviet\\.intrustdss\\.vn/1/TSR${YEAR}\\d{7}` },
  { id: 'cong',    label: 'Công',     defaultRegex: `https://traceviet\\.intrustdss\\.vn/2/CSR${YEAR}\\d{7}` },
];

const STORAGE_KEY = 'qr_config';

/* ================================================================
   COLOR UTILITIES
   ================================================================ */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Trả về { topLeft, topRight, bottomLeft, bottomRight, center }
// Ràng buộc:
//   - Đúng 1 màu dominant (2–3 lần), màu còn lại tối đa 1 lần
//   - Trong 4 góc phải có ít nhất 3 màu → dominant tối đa 2 góc
//     (nếu dominant=3: bắt buộc 2 góc + 1 ô giữa)
function generateRegionColors() {
  const colors   = shuffle(PALETTE);       // [dominant, c1, c2, c3]
  const dominant = colors[0];
  const dominantCount = Math.random() < 0.5 ? 2 : 3;

  // map[0..3] = 4 góc (topLeft, topRight, bottomLeft, bottomRight), map[4] = center
  const map     = Array(5).fill(null);
  const corners = shuffle([0, 1, 2, 3]); // thứ tự góc ngẫu nhiên

  if (dominantCount === 3) {
    // Bắt buộc: 2 góc + ô giữa (để 4 góc có đủ 3 màu)
    map[corners[0]] = dominant;
    map[corners[1]] = dominant;
    map[corners[2]] = colors[1];
    map[corners[3]] = colors[2];
    map[4]          = dominant;
  } else {
    // dominantCount === 2: dominant ở bất kỳ 2 trong 5 vị trí đều hợp lệ
    // (tệ nhất 2 góc → góc còn lại dùng 2 màu khác → 3 màu trong 4 góc ✓)
    const slots = shuffle([0, 1, 2, 3, 4]);
    map[slots[0]] = dominant;
    map[slots[1]] = dominant;
    map[slots[2]] = colors[1];
    map[slots[3]] = colors[2];
    map[slots[4]] = colors[3];
  }

  return {
    topLeft:     map[0],
    topRight:    map[1],
    bottomLeft:  map[2],
    bottomRight: map[3],
    center:      map[4],
  };
}

// Diamond trung tâm xoay 45° chạm 4 cạnh → r = (N-1)/2
function getRegionColor(row, col, N, colors) {
  const cx = (N - 1) / 2;
  const cy = (N - 1) / 2;
  const r  = Math.floor((N - 1) / 2);

  if (Math.abs(col - cx) + Math.abs(row - cy) <= r) return colors.center;
  if (row < cy && col < cx) return colors.topLeft;
  if (row < cy && col >= cx) return colors.topRight;
  if (row >= cy && col < cx) return colors.bottomLeft;
  return colors.bottomRight;
}

/* ================================================================
   QR RENDERING
   ================================================================ */

function renderQR(text, canvasEl, cellSize, colors) {
  const qr = qrcode(0, 'H');
  qr.addData(text);
  qr.make();

  const N      = qr.getModuleCount();
  const margin = 4;
  const size   = (N + margin * 2) * cellSize;

  canvasEl.width  = size;
  canvasEl.height = size;
  const ctx = canvasEl.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      if (!qr.isDark(row, col)) continue;
      ctx.fillStyle = getRegionColor(row, col, N, colors);
      ctx.fillRect(
        (col + margin) * cellSize,
        (row + margin) * cellSize,
        cellSize,
        cellSize
      );
    }
  }
}

/* ================================================================
   REGEX → RANDOM STRING (mini generator, không cần thư viện)
   Hỗ trợ: literals, \d \w \s \D \W, [a-z], {n}, {n,m}, +, *, ?, (a|b)
   ================================================================ */

const CHAR_SETS = {
  d: '0123456789',
  w: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
  s: ' \t',
  D: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  W: '!@#$%^&*()',
  S: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
};

function randChar(chars) {
  return chars[Math.floor(Math.random() * chars.length)];
}

// Giải mã nội dung bên trong [...], vd "A-Z0-9" → "ABC...Z0123456789"
function expandCharClass(cls) {
  let out = '';
  let i = 0;
  while (i < cls.length) {
    if (cls[i] === '\\' && i + 1 < cls.length) {
      out += CHAR_SETS[cls[i + 1]] ?? cls[i + 1];
      i += 2;
    } else if (i + 2 < cls.length && cls[i + 1] === '-') {
      const from = cls.charCodeAt(i);
      const to   = cls.charCodeAt(i + 2);
      for (let c = from; c <= to; c++) out += String.fromCharCode(c);
      i += 3;
    } else {
      out += cls[i++];
    }
  }
  return out;
}

// Tách alternation (a|b|c) theo | ngoài group/class
function splitAlts(pat) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < pat.length; i++) {
    if (pat[i] === '(' || pat[i] === '[') depth++;
    else if (pat[i] === ')' || pat[i] === ']') depth--;
    else if (pat[i] === '|' && depth === 0) {
      parts.push(pat.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(pat.slice(start));
  return parts;
}

function randFromRegex(pattern) {
  let result = '';
  let i = 0;

  while (i < pattern.length) {
    let chars = '';   // tập ký tự để chọn ngẫu nhiên
    let token = null; // chuỗi cố định (từ group đệ quy)

    if (pattern[i] === '\\' && i + 1 < pattern.length) {
      chars = CHAR_SETS[pattern[i + 1]] ?? pattern[i + 1];
      i += 2;

    } else if (pattern[i] === '[') {
      let j = i + 1;
      const negate = pattern[j] === '^' && ++j;
      while (j < pattern.length && pattern[j] !== ']') j++;
      chars = expandCharClass(pattern.slice(negate ? i + 2 : i + 1, j));
      i = j + 1;

    } else if (pattern[i] === '(') {
      let depth = 1, j = i + 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === '(') depth++;
        else if (pattern[j] === ')') depth--;
        j++;
      }
      const inner = pattern.slice(i + 1, j - 1);
      const alts  = splitAlts(inner);
      token = randFromRegex(alts[Math.floor(Math.random() * alts.length)]);
      i = j;

    } else if (pattern[i] === '.') {
      chars = CHAR_SETS.w; // . → word chars (đủ dùng)
      i++;

    } else {
      chars = pattern[i++]; // literal
    }

    // Đọc quantifier
    let min = 1, max = 1;
    if (i < pattern.length) {
      if (pattern[i] === '{') {
        const j = pattern.indexOf('}', i);
        const [a, b] = pattern.slice(i + 1, j).split(',');
        min = parseInt(a);
        max = b !== undefined ? (b ? parseInt(b) : min + 5) : min;
        i = j + 1;
      } else if (pattern[i] === '+') { min = 1; max = 8;  i++; }
        else if (pattern[i] === '*') { min = 0; max = 8;  i++; }
        else if (pattern[i] === '?') { min = 0; max = 1;  i++; }
    }
    const count = min + Math.floor(Math.random() * (max - min + 1));

    if (token !== null) {
      for (let k = 0; k < count; k++) result += token;
    } else {
      for (let k = 0; k < count; k++) result += randChar(chars);
    }
  }

  return result;
}

/* ================================================================
   LOCAL STORAGE
   ================================================================ */

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveConfig(updates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadConfig(), ...updates }));
}

/* ================================================================
   SHARED QR DISPLAY
   ================================================================ */

// Trạng thái QR hiện tại — dùng để re-render khi đổi kích thước
let lastQRText   = '';
let lastQRColors = null;

// Render lại với text + màu cho sẵn (không sinh màu mới)
function redrawQR() {
  if (!lastQRText || !lastQRColors) return;
  const canvas = document.getElementById('qr-canvas');
  renderQR(lastQRText, canvas, getCellSize(), lastQRColors);
}

// Sinh QR mới: tạo màu mới, lưu lại, render
function showQR(text) {
  lastQRText   = text;
  lastQRColors = generateRegionColors();
  const canvas = document.getElementById('qr-canvas');
  renderQR(text, canvas, getCellSize(), lastQRColors);
  canvas.style.display = 'block';
  document.getElementById('qr-text').textContent = text;
  document.getElementById('download-btn').style.display = 'inline-block';
}

/* ================================================================
   REGEX SECTION
   ================================================================ */

function buildRegexSection() {
  const config    = loadConfig();
  const container = document.getElementById('regex-rows');

  QR_TYPES.forEach(({ id, label, defaultRegex }) => {
    const row = document.createElement('div');
    row.className = 'regex-row';
    row.innerHTML = `
      <span class="regex-row__label">${label}</span>
      <div class="regex-row__controls">
        <input type="text" id="regex-${id}" value="${config[id] ?? defaultRegex}" placeholder="Nhập regex..." />
        <button class="btn btn--secondary" id="save-${id}">Lưu</button>
        <button class="btn btn--primary"   id="gen-${id}">Sinh QR</button>
      </div>
    `;
    container.appendChild(row);

    document.getElementById(`save-${id}`).addEventListener('click', () => {
      saveConfig({ [id]: document.getElementById(`regex-${id}`).value });
      flashBtn(`save-${id}`, 'Đã lưu ✓');
    });

    document.getElementById(`gen-${id}`).addEventListener('click', () => {
      let text;
      try { text = randFromRegex(document.getElementById(`regex-${id}`).value); }
      catch (e) { alert(`Regex không hợp lệ: ${e.message}`); return; }
      showQR(text);
    });
  });
}

/* ================================================================
   TEXT SECTION
   ================================================================ */

// "abc00021" → "abc00022", giữ nguyên độ dài phần số
function incrementTrailingNumber(text) {
  const match = text.match(/^(.*?)(\d+)$/);
  if (!match) return text;
  const [, prefix, numStr] = match;
  return prefix + String(Number(numStr) + 1).padStart(numStr.length, '0');
}

function setupTextSection() {
  const textInput = document.getElementById('text-input');
  const autoIncr  = document.getElementById('auto-incr');
  const genBtn    = document.getElementById('gen-text');

  // currentValue theo dõi giá trị tăng dần; input không bao giờ thay đổi
  let currentValue  = '';
  let lastInputSeen = '';

  function doGenerate() {
    const inputVal = textInput.value.trim();
    if (!inputVal) return;

    // Nếu người dùng thay đổi nội dung input → reset về giá trị mới
    if (inputVal !== lastInputSeen) {
      currentValue  = inputVal;
      lastInputSeen = inputVal;
    }

    showQR(currentValue);

    if (autoIncr.checked) currentValue = incrementTrailingNumber(currentValue);
  }

  genBtn.addEventListener('click', doGenerate);
  textInput.addEventListener('keydown', e => { if (e.key === 'Enter') doGenerate(); });
}

/* ================================================================
   SIZE CONTROL (global)
   ================================================================ */

function getCellSize() {
  return Number(document.getElementById('cell-size').value);
}

function setupSizeControl() {
  const slider  = document.getElementById('cell-size');
  const display = document.getElementById('cell-size-display');
  display.textContent = `${slider.value} px`;
  slider.addEventListener('input', () => {
    display.textContent = `${slider.value} px`;
    redrawQR();
  });
}

/* ================================================================
   INIT
   ================================================================ */

function flashBtn(id, successText) {
  const btn = document.getElementById(id);
  const original = btn.textContent;
  btn.textContent = successText;
  btn.disabled = true;
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
}

document.addEventListener('DOMContentLoaded', () => {
  setupSizeControl();
  buildRegexSection();
  setupTextSection();

  document.getElementById('download-btn').addEventListener('click', () => {
    const canvas = document.getElementById('qr-canvas');
    const text   = document.getElementById('qr-text').textContent || 'qrcode';
    const link   = document.createElement('a');
    link.download = `${text.slice(-20)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });
});
