#!/bin/bash
# ============================================================
# G10 DEBUG: Kenapa POST /api/v1/anak/{id}/gps di-redirect ke HTML SPA (route:list mengatakannya TERDAFTAR)
# ============================================================
set +e
cd /var/www/litensi-backend

echo "============================================================"
echo "=== DEBUG 1/6: Curl -X POST endpoint GPS (mirip request Android) ==="
echo "Request: POST https://parental.naeva.id/api/v1/anak/16/gps"
echo "Body: pairing_pin=616841 (sesuai logcat user), latitude=-6.814, longitude=110.821, captured_at ISO"
echo "============================================================"
sleep 1
curl -v -X POST "https://parental.naeva.id/api/v1/anak/16/gps" \
  --max-time 10 \
  --data-urlencode "pairing_pin=616841" \
  --data-urlencode "qr_pairing_code=LTN-VEU-7698-SEC" \
  --data-urlencode "latitude=-6.8141883" \
  --data-urlencode "longitude=110.8216613" \
  --data-urlencode "captured_at=2026-09-19T04:13:51.336Z" \
  --data-urlencode "accuracy_meters=28" \
  --data-urlencode "battery_level=70" \
  --data-urlencode "altitude_m=39.0" \
  --data-urlencode "is_mock_detected=false" \
  2>&1 | head -100
echo ""

echo "============================================================"
echo "=== DEBUG 2/6: Curl POST endpoint fcm-token YANG SEBELUMNYA BERHASIL (untuk pembanding) ==="
echo "POST https://parental.naeva.id/api/v1/anak/16/fcm-token (kontrol positif BUKAN HTML)"
echo "============================================================"
curl -s -X POST "https://parental.naeva.id/api/v1/anak/16/fcm-token" \
  --max-time 10 \
  -d "pairing_pin=616841&fcm_token=debugtest" | head -20
echo ""
echo "(Kontrol di atas SEHARUSNYA return JSON success=true/false message=... BUKAN HTML)"

echo ""
echo "============================================================"
echo "=== DEBUG 3/6: ACTUAL FILE routes/api.php di VPS (bukan cache!) ==="
echo "Line 137-162 (blok prefix 'anak' - fokus line 154 POST gps):"
echo "============================================================"
sed -n '136,163p' /var/www/litensi-backend/routes/api.php
echo ""
echo "md5sum routes/api.php VPS vs git-src (harus SAMA)"
md5sum /var/www/litensi-backend/routes/api.php
md5sum /var/www/litensi-git-src/backend/routes/api.php

echo ""
echo "============================================================"
echo "=== DEBUG 4/6: NGINX CONFIG sites-enabled parental.naeva.id ==="
echo "Fokus location block /api vs location / (SPA fallback). Urutan: BLOK API HARUS DI ATAS SPA!"
echo "============================================================"
cat -n /etc/nginx/sites-enabled/parental.naeva.id 2>/dev/null || echo "NGINX CONFIG NOT FOUND at sites-enabled, coba sites-available"

echo ""
echo "============================================================"
echo "=== DEBUG 5/6: App/Http/Kernel.php middleware groups 'api' ==="
echo "Cek: apakah group api MEMILIKI middleware auth:sanctum GLOBAL yang mewajibkan token TANPA kecuali?"
echo "(Jika sanctum global → TAMBAHKAN except untuk route gps/fcm/pairing, JANGAN redirect ke /login)"
echo "============================================================"
sed -n '1,80p' /var/www/litensi-backend/app/Http/Kernel.php 2>/dev/null
# Coba file Laravel 11+ bootstrap/app.php untuk middleware groups (bukan Kernel.php di L11 structure)
echo "--- Cek juga bootstrap/app.php (jika Laravel 11+) ---"
sed -n '1,120p' /var/www/litensi-backend/bootstrap/app.php 2>/dev/null || true

echo ""
echo "============================================================"
echo "=== DEBUG 6/6: artisan route:list FILTER api/v1/anak (urutan ROUTE dalam grup anak - first match!) ==="
echo "Laravel first-match wins rule: POST /{id}/gps HARUS sebelum GET /{id}"
echo "============================================================"
sudo -u www-data /usr/bin/php8.5 artisan route:list 2>&1 | grep -E "api/v1/anak" | cat -n
