<?php
header('Content-Type: application/json; charset=utf-8');

// ユーザーIP取得（プロキシ考慮）
function getUserIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    }
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    }
    return $_SERVER['REMOTE_ADDR'] ?? '不明';
}

$ip = getUserIP();

// ipinfo.io API用トークン（無料登録して取得してください）
$token = 'fbc2a33d088907';

// ジオロケ情報取得
$location = null;
if ($ip !== '不明') {
    $url = "https://ipinfo.io/{$ip}/json?token={$token}";
    $json = @file_get_contents($url);
    if ($json) {
        $location = json_decode($json, true);
    }
}

// プロバイダ(isp)とVPN/Proxyはipinfoのorgフィールドなどから簡易判別可
$isp = $location['org'] ?? '不明';
$vpnProxy = '不明';
if ($isp !== '不明') {
    if (preg_match('/vpn|proxy|hosting|server|cloud/i', $isp)) {
        $vpnProxy = 'ありの可能性あり';
    } else {
        $vpnProxy = 'なしの可能性あり';
    }
}

echo json_encode([
    'ip' => $ip,
    'location' => $location,
    'isp' => $isp,
    'vpnProxy' => $vpnProxy,
]);
