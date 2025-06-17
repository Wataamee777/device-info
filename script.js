async function getIPInfo() {
  try {
    const res = await fetch('ip.php');
    if (!res.ok) throw new Error('ip.phpの取得失敗');
    const data = await res.json();

    document.getElementById('ipAddr').textContent = data.ip || '不明';

    if (data.location) {
      const loc = data.location;
      const addr = [loc.city, loc.region, loc.country].filter(Boolean).join(', ');
      document.getElementById('address').textContent = addr || '不明';
      document.getElementById('isp').textContent = data.isp || '不明';
      document.getElementById('vpnProxy').textContent = data.vpnProxy || '不明';
    } else {
      document.getElementById('address').textContent = '不明';
      document.getElementById('isp').textContent = '不明';
      document.getElementById('vpnProxy').textContent = '不明';
    }
  } catch {
    document.getElementById('ipAddr').textContent = '取得失敗';
    document.getElementById('address').textContent = '取得失敗';
    document.getElementById('isp').textContent = '取得失敗';
    document.getElementById('vpnProxy').textContent = '取得失敗';
  }
}

function getUserAgentInfo() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '不明';
  const language = navigator.language || '不明';
  const charset = document.characterSet || '不明';
  const encoding = document.characterSet || '不明'; // 文字コードとエンコードは同じもの

  // ブラウザ名とバージョン判別（簡易）
  let browser = '不明';
  let version = '不明';
  const regexes = [
    [/Edg\/([\d\.]+)/, 'Edge'],
    [/Chrome\/([\d\.]+)/, 'Chrome'],
    [/Firefox\/([\d\.]+)/, 'Firefox'],
    [/Safari\/([\d\.]+)/, 'Safari'],
    [/MSIE\s([\d\.]+)/, 'Internet Explorer'],
    [/Trident\/.*rv:([\d\.]+)/, 'Internet Explorer'],
  ];
  for (const [regex, name] of regexes) {
    const match = ua.match(regex);
    if (match) {
      browser = name;
      version = match[1];
      break;
    }
  }

  document.getElementById('platform').textContent = platform;
  document.getElementById('browser').textContent = browser;
  document.getElementById('browserVersion').textContent = version;
  document.getElementById('userAgent').textContent = ua;
  document.getElementById('language').textContent = language;
  document.getElementById('charset').textContent = charset;
  document.getElementById('encoding').textContent = encoding;

  // ネットワーク接続状態（online/offline）
  document.getElementById('connection').textContent = navigator.onLine ? 'オンライン' : 'オフライン';

  // クッキー利用可否
  document.getElementById('cookieEnabled').textContent = navigator.cookieEnabled ? '可' : '不可';

  // Java利用可否
  document.getElementById('javaEnabled').textContent = navigator.javaEnabled() ? '可' : '不可';

  // 画面サイズ・色深度
  document.getElementById('screenSize').textContent = `${screen.width}×${screen.height} px`;
  document.getElementById('colorDepth').textContent = `${screen.colorDepth} bit`;

  // GPU情報取得（WebGL）
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    document.getElementById('gpuInfo').textContent = 'WebGL非対応';
  } else {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      document.getElementById('gpuInfo').textContent = `${vendor} / ${renderer}`;
    } else {
      document.getElementById('gpuInfo').textContent = '情報取得不可';
    }
  }
}

// ローカルIP取得（WebRTCを使う、非推奨ですが実装例）

function getLocalIP() {
  const localIPField = document.getElementById('localIP');
  localIPField.textContent = '取得中...';

  const pc = new RTCPeerConnection({iceServers: []});
  pc.createDataChannel('');
  pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(console.error);

  pc.onicecandidate = event => {
    if (!event.candidate) {
      if (localIPField.textContent === '取得中...') {
        localIPField.textContent = '取得不可';
      }
      pc.close();
      return;
    }
    const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
    const ipMatch = event.candidate.candidate.match(ipRegex);
    if (ipMatch) {
      localIPField.textContent = ipMatch[1];
      pc.close();
    }
  };
}

// 速度擬似計測（1MBのファイルをfetchして計測）

async function measureSpeed() {
  const speedField = document.getElementById('speed');
  const pingField = document.getElementById('ping');
  speedField.textContent = '計測中...';
  pingField.textContent = '計測中...';

  try {
    const start = performance.now();
    // 軽量ファイルURL（できれば同一サーバー上に1MBのファイル用意推奨）
    const testUrl = 'https://speed.hetzner.de/1MB.bin'; 
    const response = await fetch(testUrl, {cache: 'no-store'});
    if (!response.ok) throw new Error('ファイル取得失敗');

    const blob = await response.blob();
    const end = performance.now();

    const durationSeconds = (end - start) / 1000;
    const sizeBytes = blob.size;

    // 速度Mbps計算
    const speedMbps = ((sizeBytes * 8) / durationSeconds) / (1024 * 1024);
    speedField.textContent = speedMbps.toFixed(2) + ' Mbps';

    // Ping擬似計測 = fetch開始から応答開始までの時間
    // ※本格的pingはブラウザで不可なので擬似計測です
    const pingStart = performance.now();
    await fetch(testUrl, {cache: 'no-store', method: 'HEAD'});
    const pingEnd = performance.now();
    const pingMs = pingEnd - pingStart;
    pingField.textContent = pingMs.toFixed(0) + ' ms';

  } catch {
    speedField.textContent = '計測失敗';
    pingField.textContent = '計測失敗';
  }
}

// 位置情報取得（ブラウザGeolocation API）

function getLocation() {
  const locField = document.getElementById('location');
  if (!navigator.geolocation) {
    locField.textContent = '非対応';
    return;
  }
  locField.textContent = '取得中...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      locField.textContent = `緯度: ${pos.coords.latitude.toFixed(5)}, 経度: ${pos.coords.longitude.toFixed(5)}`;
    },
    err => {
      locField.textContent = '許可なし/取得失敗';
    },
    {timeout: 10000}
  );
}

async function init() {
  await getIPInfo();
  getUserAgentInfo();
  getLocalIP();
  measureSpeed();
  getLocation();
}

window.onload = init;
