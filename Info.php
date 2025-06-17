<?php
header('Content-Type: application/json');

function getUserIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) return $_SERVER['HTTP_CLIENT_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0];
    return $_SERVER['REMOTE_ADDR'] ?? '不明';
}

function isVPNorProxy($ip) {
    // 簡易チェックの例としてIPレンジや有名VPN IPリストを使うケースがあるが、
    // 本格的な判定には外部APIやDB利用が必要
    $vpnIPRanges = [
        // 例：IPレンジ（CIDR）や単一IPのリストなど
        '10.0.0.0/8',
        '192.168.0.0/16',
        '172.16.0.0/12',
    ];
    // ここでは簡易的にプライベートIP範囲をVPNと判断しない
    return false;
}

$ip = getUserIP();
$isVpn = isVPNorProxy($ip);

echo json_encode([
    'ip' => $ip,
    'isVpn' => $isVpn,
]);
