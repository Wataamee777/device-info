// クッキー操作
function setCookie(name, value, days) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
}

function getCookie(name) {
  const value = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return value ? decodeURIComponent(value.split('=')[1]) : null;
}

// 初期変数
let privacyMode = false;
let testClickCount = 0;

// DOM参照
const modal = document.getElementById("termsModal");
const acceptBtn = document.getElementById("acceptBtn");
const toggleBtn = document.getElementById("togglePrivacy");
const infoBox = document.getElementById("infoBox");

// 初期処理
document.addEventListener('DOMContentLoaded', () => {
  const agreed = getCookie('userConsent');
  if (agreed === "accepted") {
    showInfoBox();
    init();
  } else {
    if (modal) modal.style.display = "flex";
    if (acceptBtn) {
      acceptBtn.style.display = "none";
      setTimeout(() => {
        acceptBtn.style.display = "block";
      }, 3000);
      acceptBtn.onclick = () => {
        setCookie("userConsent", "accepted", 1);
        if (modal) modal.style.display = "none";
        showInfoBox();
        init();
      };
    }
  }
});

function showInfoBox() {
  if (infoBox) infoBox.style.display = 'block';
}

// 個人情報保護モード切り替え（初期テキストセット＆イベント登録）
if (toggleBtn) {
  toggleBtn.textContent = `個人情報保護: ${privacyMode ? 'ON' : 'OFF'}`;
  toggleBtn.addEventListener("click", () => {
    privacyMode = !privacyMode;
    toggleBtn.textContent = `個人情報保護: ${privacyMode ? 'ON' : 'OFF'}`;
    toggleSensitiveInfo(privacyMode);
  });
}

function toggleSensitiveInfo(isPrivate) {
  const ids = ['ipAddr', 'hostname', 'address', 'isp', 'vpnProxy', 'location'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isPrivate ? 'none' : 'block';
  });
}

// 初期化（メイン処理）
async function init() {
  parseUserAgent();
  await fetchIPinfo();
  const ping = await measurePing();
  const pingEl = document.getElementById('ping');
  if (pingEl) pingEl.textContent = ping;

  const speedEl = document.getElementById('speed');
  if (speedEl) speedEl.textContent = '計測できませんでした';

  const localIP = await getLocalIP();
  const localIPEl = document.getElementById('localIP');
  if (localIPEl) localIPEl.textContent = localIP;

  const gpuInfo = getGPUInfo();
  const gpuInfoEl = document.getElementById('gpuInfo');
  if (gpuInfoEl) gpuInfoEl.textContent = gpuInfo;

  getLocation();
  checkScreenSharing();
}

function parseUserAgent() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '不明';
  const lang = navigator.language || '不明';
  const browserMatch = ua.match(/(Firefox|Chrome|Safari|Edge|MSIE|Trident)\/?\s*(\d+)/i);
  let browser = '不明', version = '不明';
  if (browserMatch) {
    browser = browserMatch[1];
    version = browserMatch[2];
    if (browser === 'Trident') browser = 'Internet Explorer';
  }

  const elMap = {
    platform: platform,
    browser: browser,
    browserVersion: version,
    userAgent: ua,
    language: lang,
    charset: document.characterSet || '不明',
    encoding: 'gzip, deflate, br, zstd',
    connection: navigator.connection ? JSON.stringify(navigator.connection) : '不明',
    cookieEnabled: navigator.cookieEnabled ? '利用可能' : '利用不可',
    javaEnabled: (typeof navigator.javaEnabled === 'function' && navigator.javaEnabled()) ? '利用可能' : '利用不可',
    screenSize: `${screen.width} × ${screen.height} ピクセル`,
    colorDepth: `${screen.colorDepth} ビット`
  };

  for (const [id, text] of Object.entries(elMap)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

async function fetchIPinfo() {
  try {
    // デモ用APIトークンのため、公開環境では別途管理推奨
    const res = await fetch('https://ipinfo.io/json?token=fbc2a33d088907');
    if (!res.ok) throw new Error();
    const data = await res.json();

    if (!privacyMode) {
      const idMap = {
        ipAddr: data.ip || '不明',
        hostname: data.hostname || '不明',
        address: [data.city, data.region, data.country].filter(Boolean).join(', ') || '不明',
        isp: data.org || '不明',
        vpnProxy: (data.proxy || data.vpn) ? 'あり' : 'なし'
      };
      for (const [id, text] of Object.entries(idMap)) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
      }
    }
  } catch {
    ['ipAddr', 'hostname', 'address', 'isp', 'vpnProxy'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !privacyMode) el.textContent = '取得失敗';
    });
  }
}

function getLocation() {
  if (!navigator.geolocation) {
    const el = document.getElementById('location');
    if (el) el.textContent = '対応していません';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      if (!privacyMode) {
        const c = pos.coords;
        const el = document.getElementById('location');
        if (el) el.textContent = `緯度: ${c.latitude.toFixed(6)}, 経度: ${c.longitude.toFixed(6)}, 精度: ±${c.accuracy}m`;
      }
    },
    err => {
      const el = document.getElementById('location');
      if (el) el.textContent = `取得失敗（${err.message}）`;
    }
  );
}

async function measurePing(url = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png") {
  try {
    const start = performance.now();
    await fetch(url, { mode: 'no-cors', cache: 'no-cache' });
    const end = performance.now();
    return Math.round(end - start) + ' ms';
  } catch {
    return '測定失敗';
  }
}

function getLocalIP() {
  return new Promise(resolve => {
    if (!window.RTCPeerConnection) {
      resolve('取得不可');
      return;
    }
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => resolve('取得不可'));
    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        resolve('取得不可');
        return;
      }
      const match = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
      if (match) resolve(match[1]);
    };
  });
}

function getGPUInfo() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return '不明';
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '不明';
}

function checkScreenSharing() {
  // 画面共有や録画の検知は仕様上困難なのでログのみ
  console.log("画面共有や録画の検知は仕様上制限があります");
}

// クッキー削除（隠し機能）
const cookieResetBtn = document.getElementById("cookieResetBtn");
if (cookieResetBtn) {
  cookieResetBtn.addEventListener("click", (e) => {
    if (!e.shiftKey) return;
    testClickCount++;
    if (testClickCount >= 3) {
      document.cookie = "userConsent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      alert("クッキーを削除しました。ページを再読み込みします。");
      location.reload();
    }
  });
}
