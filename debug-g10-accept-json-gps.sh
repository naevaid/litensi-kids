#!/bin/bash
set +e
cd /var/www/litensi-backend

echo "=== G10.1 Debug: CURL POST GPS DENGAN Accept: application/json AGAR ERROR TERBACA JELAS (bukan 302) ==="
echo "ProfilAnak id=16 di DB: PIN BERAPA? QR CODE BERAPA? CEK DULU row aslinya:"
sudo -u www-data /usr/bin/php8.5 artisan tinker --execute='echo "ProfilAnak id=16 -> pin=".App\Models\ProfilAnak::find(16)?->pairing_pin." | qr=".App\Models\ProfilAnak::find(16)?->qr_pairing_code." | name=".App\Models\ProfilAnak::find(16)?->name." | user_id=".App\Models\ProfilAnak::find(16)?->user_id."\n";'

echo ""
echo "=== POST GPS DENGAN Accept: application/json + X-Requested-With: XMLHttpRequest (gunakan PIN + QR ASLI dari DB row 16 di atas!) ==="
curl -s -X POST "https://parental.naeva.id/api/v1/anak/16/gps" \
  -H "Accept: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  --max-time 10 \
  --data-urlencode "pairing_pin=616841" \
  --data-urlencode "qr_pairing_code=LTN-VEU-7698-SEC" \
  --data-urlencode "latitude=-6.8141883" \
  --data-urlencode "longitude=110.8216613" \
  --data-urlencode "captured_at=2026-09-19T04:13:51.336Z" \
  --data-urlencode "accuracy_meters=28" \
  --data-urlencode "battery_level=70" \
  --data-urlencode "altitude_m=39.0" \
  --data-urlencode "is_mock_detected=false" | head -80
echo ""
echo "(Jika output di atas BERUPA JSON errors (422/403/500) — BACA error message, langsung ketahui penyebabnya! Kalau success: success=true gps_id=X.)"
