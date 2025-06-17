// クッキー操作関数（簡易版）
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days*24*60*60*1000));
  const expires = "expires="+ d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  const cname = name + "=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for(let c of ca) {
    while (c.charAt(0) == ' ') c = c.substring(1);
    if (c.indexOf(cname) == 0) return c.substring(cname.length, c.length);
  }
  return "";
}

// 利用規約モーダルの表示制御
const termsModal = document.getElementById('termsModal');
const acceptBtn = document.getElementById('acceptBtn');
const infoBox = document.getElementById('infoBox');

function showInfoBox() {
  termsModal.style.display = 'none';
  infoBox.style.display = 'block';
}

// 画面録画・共有検知（簡易的にMediaStreamを調べる）
// ※直接的に共有を止めることは不可。ユーザーに注意喚起を促すのみ。
function checkScreenSharing() {
  // 画面共有ストリームがあればアラート出す（擬似例）
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    // 共有中かどうかはここでは検知不可のため警告だけ
    // 実際は別途ユーザーに伝えるのが良い
    // console.log("画面共有は検知できません");
  }
}

// ページロード時の処理
window.onload = () => {
  const agreed = getCookie('termsAccepted');
  if (agreed === "true") {
    showInfoBox();
    initInfoGathering();
  } else {
    // 利用規約モーダル表示（OKは3秒後に表示）
    acceptBtn.style.display = 'none';
    termsModal.style.display = 'flex';

    setTimeout(() => {
      acceptBtn.style.display = 'inline-block';
    }, 3000);

    acceptBtn.onclick = () => {
      setCookie('termsAccepted', 'true', 1);
      showInfoBox();
      initInfoGathering();
    }
  }
}

function initInfoGathering() {
  checkScreenSharing();
  // ここにユーザー情報取得の初期化関数をまとめて呼び出す
  // 例）parseUserAgent(); fetchIPinfo(); measurePing(); getLocation(); など
}
const toggleBtn = document.getElementById('togglePrivacy');
let privacyMode = false;

toggleBtn.onclick = () => {
  privacyMode = !privacyMode;
  toggleBtn.textContent = `個人情報保護: ${privacyMode ? 'ON' : 'OFF'}`;
  toggleSensitiveInfo(privacyMode);
};

function toggleSensitiveInfo(isPrivate) {
  const sensitiveIds = ['ipAddr', 'hostname', 'address', 'isp', 'vpnProxy', 'location'];
  sensitiveIds.forEach(id => {
    document.getElementById(id).style.display = isPrivate ? 'none' : 'block';
  });
}

async function fetchIPinfo() {
  try {
    const res = await fetch('https://ipinfo.io/json?token=fbc2a33d088907');
    if (!res.ok) throw new Error('APIエラー');
    const data = await res.json();

    if (!privacyMode) {
      document.getElementById('ipAddr').textContent = data.ip || '不明';
      document.getElementById('hostname').textContent = data.hostname || '不明';
      document.getElementById('address').textContent = [data.city, data.region, data.country].filter(Boolean).join(', ') || '不明';
      document.getElementById('isp').textContent = data.org || '不明';
      document.getElementById('vpnProxy').textContent = data.proxy ? 'あり' : 'なし';
    }
  } catch {
    if (!privacyMode) {
      ['ipAddr', 'hostname', 'address', 'isp', 'vpnProxy'].forEach(id => {
        document.getElementById(id).textContent = '取得失敗';
      });
    }
  }
}

function parseUserAgent() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '不明';
  const lang = navigator.language || '不明';

  // ブラウザ判定（ざっくり）
  const browserMatch = ua.match(/(Firefox|Chrome|Safari|Edge|MSIE|Trident)\/?\s*(\d+)/i);
  let browser = '不明';
  let version = '不明';
  if (browserMatch) {
    browser = browserMatch[1];
    version = browserMatch[2];
    if (browser === 'Trident') browser = 'Internet Explorer';
  }

  document.getElementById('platform').textContent = platform;
  document.getElementById('browser').textContent = browser;
  document.getElementById('browserVersion').textContent = version;
  document.getElementById('userAgent').textContent = ua;
  document.getElementById('language').textContent = lang;
  document.getElementById('charset').textContent = document.characterSet || '不明';
  document.getElementById('encoding').textContent = 'gzip, deflate, br, zstd';
  document.getElementById('connection').textContent = navigator.connection ? JSON.stringify(navigator.connection) : '不明';
  document.getElementById('cookieEnabled').textContent = navigator.cookieEnabled ? '利用可能' : '利用不可';
  document.getElementById('javaEnabled').textContent = navigator.javaEnabled() ? '利用可能' : '利用不可';
  document.getElementById('screenSize').textContent = `${screen.width} × ${screen.height} ピクセル`;
  document.getElementById('colorDepth').textContent = `${screen.colorDepth} ビット`;
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
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({iceServers: []});
    let localIP = '取得不可';

    pc.createDataChannel('');
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => resolve(localIP));

    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        resolve(localIP);
        return;
      }
      const ipMatch = event.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
      if (ipMatch) {
        localIP = ipMatch[1];
        resolve(localIP);
        pc.onicecandidate = null;
      }
    };
  });
}

function getGPUInfo() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return '不明';
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  }
  return '不明';
}

function getLocation() {
  if (!navigator.geolocation) {
    document.getElementById('location').textContent = '対応していません';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      if (!privacyMode) {
        const c = pos.coords;
        document.getElementById('location').textContent = `緯度: ${c.latitude.toFixed(6)}, 経度: ${c.longitude.toFixed(6)}, 精度: ±${c.accuracy}m`;
      }
    },
    err => {
      document.getElementById('location').textContent = `取得失敗（${err.message}）`;
    }
  );
}

async function init() {
  parseUserAgent();
  await fetchIPinfo();

  const ping = await measurePing();
  document.getElementById('ping').textContent = ping;

  document.getElementById('speed').textContent = '計測できませんでした';

  const localIP = await getLocalIP();
  document.getElementById('localIP').textContent = localIP;

  const gpuInfo = getGPUInfo();
  document.getElementById('gpuInfo').textContent = gpuInfo;

  getLocation();
}

init();
