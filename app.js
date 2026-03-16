const STORAGE_KEY = "generatedQrCodes";
const SETTINGS_KEY = "qrFormatSettings";

const $btnThung = document.getElementById("btn-thung");
const $btnSanPham = document.getElementById("btn-sanpham");
const $btnCong = document.getElementById("btn-cong");
const $btnCustom = document.getElementById("btn-custom");
const $customText = document.getElementById("customText");
const $generatedValue = document.getElementById("generatedValue");
const $qr = document.getElementById("qr");
const $historyThung = document.getElementById("historyThung");
const $historySanPham = document.getElementById("historySanPham");
const $historyCong = document.getElementById("historyCong");
const $historyCustom = document.getElementById("historyCustom");
const $clearHistory = document.getElementById("clearHistory");

const $formatThung = document.getElementById("format-thung");
const $formatSanPham = document.getElementById("format-sanpham");
const $formatCong = document.getElementById("format-cong");
const $saveSettings = document.getElementById("saveSettings");

function randomAlphanumeric(length) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}

function randomWrongString() {
  // Generate a string that's likely to be invalid for the common formats.
  // We'll randomly choose a length that is not 32 and allow special chars.
  const specials = "-_.!@#$%^&*()[]{}:;<>?,/|~";
  const all = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + specials;
  const len = Math.floor(Math.random() * 40) + 1; // 1..40
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += all.charAt(Math.floor(Math.random() * all.length));
  }
  return out;
}

function loadSettings() {
  const defaults = {
    thung: "^[A-Za-z0-9]{32}$",
    sanPham: "^https://traceviet\\.mae\\.gov\\.vn/[^/]+/[A-Za-z0-9]{32}$",
    cong: "^https://traceviet\\.mae\\.gov\\.vn/cong/[A-Za-z0-9]{32}$",
  };

  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return { ...defaults, ...(stored || {}) };
  } catch {
    return defaults;
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function validateRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch (e) {
    return false;
  }
}

function generateFromRegex(pattern) {
  if (!validateRegex(pattern)) {
    return randomAlphanumeric(32);
  }

  // Basic support for patterns like:
  // ^[A-Za-z0-9]{32}$
  // ^https://.../[A-Za-z0-9]{32}$
  const match = pattern.match(/^\^(.*)\[A-Za-z0-9\]\{(\d+)\}\$$/);
  if (match) {
    // Unescape regex escapes so the generated string contains normal characters.
    // E.g. turn "https://traceviet\\.mae\\.gov\\.vn/" into "https://traceviet.mae.gov.vn/".
    let prefix = match[1].replace(/\\(.)/g, "$1");

    // Support `[^/]+` in the prefix by replacing it with a random path segment.
    // Example: https://traceviet.mae.gov.vn/[^/]+/ => https://traceviet.mae.gov.vn/abc123de/
    prefix = prefix.replace(/\[\^\/\]\+/g, () => randomAlphanumeric(8));

    const len = Number(match[2]);
    return prefix + randomAlphanumeric(len);
  }

  // Fallback: generate something alphanumeric.
  return randomAlphanumeric(32);
}

function makeInvalidFromValid(valid, pattern) {
  // Try to generate a string that does not match the regex.
  const regex = new RegExp(pattern);

  // Attempt small mutations until we get a non-matching value.
  for (let i = 0; i < 5; i += 1) {
    const idx = Math.floor(Math.random() * valid.length);
    const chars = "!@#$%^&*()_+-=[]{}|;:,<.>/?";
    const mutated =
      valid.slice(0, idx) +
      chars.charAt(Math.floor(Math.random() * chars.length)) +
      valid.slice(idx + 1);
    if (!regex.test(mutated)) {
      return mutated;
    }
  }

  // If still matching, append a forbidden char.
  const appended = valid + "!";
  return regex.test(appended) ? valid + "#" : appended;
}

function makeThung(isValid, format) {
  const valid = generateFromRegex(format);
  if (isValid) {
    return valid;
  }
  return makeInvalidFromValid(valid, format);
}

function makeSanPham(isValid, format) {
  const valid = generateFromRegex(format);
  if (isValid) {
    return valid;
  }
  return makeInvalidFromValid(valid, format);
}

function makeCong(isValid, format) {
  const valid = generateFromRegex(format);
  if (isValid) {
    return valid;
  }
  return makeInvalidFromValid(valid, format);
}

function getModeValue() {
  const selected = document.querySelector("input[name=mode]:checked");
  return selected ? selected.value === "true" : true;
}

function saveToStorage(entry) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  existing.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return existing;
}

function loadHistory() {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  renderHistory(existing);
}

function applySettingsToInputs() {
  const settings = loadSettings();
  $formatThung.value = settings.thung;
  $formatSanPham.value = settings.sanPham;
  $formatCong.value = settings.cong;
}

$saveSettings.addEventListener("click", () => {
  const thung = $formatThung.value.trim();
  const sanPham = $formatSanPham.value.trim();
  const cong = $formatCong.value.trim();

  if (!validateRegex(thung) || !validateRegex(sanPham) || !validateRegex(cong)) {
    alert("Vui lòng nhập regex hợp lệ cho cả 3 format.");
    return;
  }

  saveSettings({ thung, sanPham, cong });
  alert("Đã lưu cài đặt format.");
});

function renderHistory(entries) {
  const thungEntries = entries.filter((e) => e.type === "Thùng");
  const sanPhamEntries = entries.filter((e) => e.type === "Sản phẩm");
  const congEntries = entries.filter((e) => e.type === "Công");
  const customEntries = entries.filter((e) => e.type === "Tùy");

  const renderList = (container, items) => {
    container.innerHTML = "";
    if (!items || items.length === 0) {
      container.innerHTML = "<p>Chưa có mã nào được tạo.</p>";
      return;
    }

    items.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "history-item";

      const top = document.createElement("div");
      top.className = "row";

      const title = document.createElement("div");
      title.innerHTML = `<strong>${entry.type}</strong> <span class="meta">${entry.isValid ? "(Đúng)" : "(Sai)"}</span>`;

      const time = document.createElement("div");
      time.className = "meta";
      const date = new Date(entry.createdAt);
      time.textContent = date.toLocaleString();

      top.append(title, time);

      const value = document.createElement("pre");
      value.className = "code";
      value.textContent = entry.value;

      const actions = document.createElement("div");
      actions.className = "history-actions";

      const btnView = document.createElement("button");
      btnView.type = "button";
      btnView.textContent = "Xem";
      btnView.className = "secondary";
      btnView.addEventListener("click", () => {
        $generatedValue.textContent = entry.value;
        renderQr(entry.value);
      });

      const btnDelete = document.createElement("button");
      btnDelete.type = "button";
      btnDelete.textContent = "Xóa";
      btnDelete.className = "secondary";
      btnDelete.addEventListener("click", () => {
        const remaining = entries.filter((e) => e.id !== entry.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        loadHistory();
      });

      actions.append(btnView, btnDelete);

      card.append(top, value, actions);
      container.appendChild(card);
    });
  };

  renderList($historyThung, thungEntries);
  renderList($historySanPham, sanPhamEntries);
  renderList($historyCong, congEntries);
  renderList($historyCustom, customEntries);
}

function renderQr(value) {
  $qr.innerHTML = "";
  if (!value) return;
  // QRCode.js renders inside the container.
  new QRCode($qr, {
    text: value,
    width: 160,
    height: 160,
    correctLevel: QRCode.CorrectLevel.H,
  });
}

function handleGenerate(type) {
  const isValid = getModeValue();
  const settings = loadSettings();

  let value;
  if (type === "Thùng") {
    value = makeThung(isValid, settings.thung);
  } else if (type === "Sản phẩm") {
    value = makeSanPham(isValid, settings.sanPham);
  } else {
    value = makeCong(isValid, settings.cong);
  }

  $generatedValue.textContent = value;
  renderQr(value);

  const entry = {
    id: crypto.randomUUID(),
    type,
    value,
    isValid,
    createdAt: new Date().toISOString(),
  };

  saveToStorage(entry);
  loadHistory();
}

$btnThung.addEventListener("click", () => handleGenerate("Thùng"));
$btnSanPham.addEventListener("click", () => handleGenerate("Sản phẩm"));
$btnCong.addEventListener("click", () => handleGenerate("Công"));
$btnCustom.addEventListener("click", () => {
  const text = $customText.value.trim();
  if (!text) {
    alert("Vui lòng nhập nội dung để tạo QR.");
    return;
  }

  $generatedValue.textContent = text;
  renderQr(text);

  const entry = {
    id: crypto.randomUUID(),
    type: "Tùy",
    value: text,
    isValid: true,
    createdAt: new Date().toISOString(),
  };

  saveToStorage(entry);
  loadHistory();
});

$clearHistory.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  loadHistory();
});

applySettingsToInputs();
loadHistory();
