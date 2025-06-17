async function fetchIPInfo() {
  try {
    const res = await fetch('https://ipinfo.io/json?token=YOUR_TOKEN_HERE');
    if (!res.ok) throw new Error('APIエラー');
    return await res.json();
  } catch {
    return null;
  }
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = '不明', version = '不明';

  if (/Edge\/(\d+)/.test(ua)) {
    browser = 'Edge';
    version = ua.match(/Edge\/(\d+)/)[1];
  } else if (/Chrome\/(\d+)/.test(ua)) {
    browser = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)[1];
  } else if (/Firefox\/(\d+)/.test(ua)) {
    browser = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)[1];
  } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || '不明';
  }

  return { browser, version };
}

function getGPUInfo() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) return '未対応';
  const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (dbgRenderInfo) {
    return gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) + ' / ' + gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
  }
  return '取得不可';
}

function getLocalIPs() {
  return new Promise((resolve) => {
    const ips = new Set();
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    pc.onicecandidate = event => {
      if (!event.candidate) {
        resolve(Array.from(ips));
        return;
      }
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const ipMatch = ipRegex.exec(event.candidate.candidate);
      if (ipMatch) ips.add(ipMatch[1]);
    };
  });
}

function getConnectionInfo() {
  const nav = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!nav) return '未対応';
  return `${nav.effectiveType || '不明'} (ダウンロード:${nav.downlink || '不明'}Mbps, RTT:${nav.rtt || '不明'}ms)`;
}

async function measurePing(url = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png") {
  try {
    const start = performance.now();
    await fetch(url, {mode:'no-cors', cache:'no-cache'});
    const end = performance.now();
    return Math.round(end - start) + ' ms';
  } catch {
    return '測定失敗';
  }
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve('対応していません');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const c = pos.coords;
        resolve(`緯度: ${c.latitude.toFixed(6)}, 経度: ${c.longitude.toFixed(6)}, 精度: ±${c.accuracy}m`);
      },
      err => resolve(`取得失敗（${err.message}）`)
    );
  });
}

async function init() {
  // IP情報取得 (サーバー経由で追加情報も取得)
  const response = await fetch('info.php');
  const serverInfo = await response.json();

  // IPinfo.ioの情報はブラウザからも別取得（任意）
  const ipInfo = await fetchIPInfo();

  // DOM要素セット
  document.getElementById('ipAddr').textContent = serverInfo.ip || (ipInfo?.ip || '取得失敗');
  document.getElementById('address').textContent = ipInfo?.city && ipInfo?.region && ipInfo?.country
    ? `${ipInfo.city}, ${ipInfo.region}, ${ipInfo.country}`
    : '不明';
  document.getElementById('isp').textContent = ipInfo?.org || '不明';
  document.getElementById('vpnProxy').textContent = serverInfo.isVpn ? '検出済み' : '検出されず';

  const browserInfo = getBrowserInfo();
  document.getElementById('platform').textContent = navigator.platform || '不明';
  document.getElementById('browser').textContent = browserInfo.browser;
  document.getElementById('browserVersion').textContent = browserInfo.version;
  document.getElementById('userAgent').textContent = navigator.userAgent;
  document.getElementById('language').textContent = navigator.language || '不明';
  document.getElementById('charset').textContent = document.characterSet || '不明';
  document.getElementById('encoding').textContent = 'gzip, deflate, br, zstd';
  document.getElementById('connection').textContent = getConnectionInfo();
  document.getElementById('cookieEnabled').textContent = navigator.cookieEnabled ? '利用可能' : '利用不可';
  document.getElementById('javaEnabled').textContent = navigator.javaEnabled() ? '利用可能' : '利用不可';
  document.getElementById('screenSize').textContent = `${screen.width} × ${screen.height} ピクセル`;
  document.getElementById('colorDepth').textContent = `${screen.colorDepth} ビット`;
  document.getElementById('gpuInfo').textContent = getGPUInfo();

  const localIPs = await getLocalIPs();
  document.getElementById('localIP').textContent = localIPs.length ? localIPs.join(', ') : '取得不可';

  const ping = await measurePing();
  document.getElementById('ping').textContent = ping;
  document.getElementById('speed').textContent = '計測停止（負荷軽減のため）';

  const location = await getLocation();
  document.getElementById('location').textContent = location;
}

init();
