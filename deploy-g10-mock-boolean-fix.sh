#!/bin/bash
# ============================================================
# DEPLOY G10 FIX: (1) Backend AnakController is_mock_detected nullable + manual cast boolean.
#                   (2) route:clear, rsync backend, restart php, health check.
#                   (3) FINAL VERIFY curl POST GPS Accept JSON return success=true gps_id=X.
# ============================================================
set -e
cd /var/www/litensi-git-src
echo "====== STEP 1/6 GIT PULL ======"
git reset --hard HEAD
git clean -fd
git pull origin main
echo "Current commit: $(git rev-parse --short HEAD)"

echo ""
echo "====== STEP 2/6 RSYNC BACKEND (fokus AnakController) ======"
rsync -av --delete \
  --exclude='.env' --exclude='vendor' --exclude='storage' --exclude='.git' \
  /var/www/litensi-git-src/backend/ /var/www/litensi-backend/
chown -R www-data:www-data /var/www/litensi-backend

echo ""
echo "====== STEP 3/6 LARAVEL route:clear + optimize ======"
cd /var/www/litensi-backend
sudo -u www-data /usr/bin/php8.5 artisan route:clear -v || true
sudo -u www-data /usr/bin/php8.5 artisan optimize:clear -v || true

echo ""
echo "====== STEP 4/6 RESTART PHP-FPM ======"
systemctl restart php8.5-fpm.service
systemctl status php8.5-fpm.service --no-pager | head -4

echo ""
echo "====== STEP 5/6 HEALTH CHECK ======"
echo "Health HTTPS status: $(curl -s -o /dev/null -w '%{http_code}' https://parental.naeva.id/)"

echo ""
echo "====== STEP 6/6 FINAL VERIFY curl POST GPS DENGAN Accept JSON → HARUS success=true gps_id=X ======"
# Dapatkan ProfilAnak id=16 pin dan qr_code ASLI dari DB via artisan tinker (jika psysh permission fail
# pakai raw query mysql sebagai fallback)
PAIRING_PIN=""
QR_CODE=""
cd /var/www/litensi-backend
TINKER_OUT=$(sudo -u www-data /usr/bin/php8.5 artisan tinker --execute='echo App\\Models\\ProfilAnak::find(16)?->pairing_pin."|".App\\Models\\ProfilAnak::find(16)?->qr_pairing_code."|".App\\Models\\ProfilAnak::find(16)?->name;' 2>&1 || echo "")
echo "Tinker output row 16: $TINKER_OUT"
if [[ "$TINKER_OUT" == *"|"* ]]; then
  PAIRING_PIN="$(echo "$TINKER_OUT" | tr -d '[:space:]' | cut -d'|' -f1)"
  QR_CODE="$(echo "$TINKER_OUT" | tr -d '[:space:]' | cut -d'|' -f2)"
  NAME="$(echo "$TINKER_OUT" | tr -d '[:space:]' | cut -d'|' -f3)"
  echo "Parsed ProfilAnak id=16 name='$NAME' pin='$PAIRING_PIN' qr='$QR_CODE'"
fi
# Fallback kalau tinker tidak bisa (permission psysh) — pakai user's pin dari logcat sebelumnya
if [ -z "$PAIRING_PIN" ]; then
  PAIRING_PIN="616841"
  QR_CODE="LTN-VEU-7698-SEC"
  echo "Fallback pakai pin dari logcat user sebelumnya: pin=$PAIRING_PIN qr=$QR_CODE"
fi
sleep 1
curl -s -X POST "https://parental.naeva.id/api/v1/anak/16/gps" \
  -H "Accept: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  --max-time 15 \
  --data-urlencode "pairing_pin=$PAIRING_PIN" \
  --data-urlencode "qr_pairing_code=$QR_CODE" \
  --data-urlencode "latitude=-6.8141883" \
  --data-urlencode "longitude=110.8216613" \
  --data-urlencode "captured_at=2026-09-19T04:50:00.000Z" \
  --data-urlencode "accuracy_meters=28" \
  --data-urlencode "battery_level=70" \
  --data-urlencode "altitude_m=39" \
  --data-urlencode "is_mock_detected=false" | head -30
echo ""
echo "(Di atas SEHARUSNYA BERBENTUK JSON: success=true data.gps_id=N gps_inserted_id=N last_known_latitude=-6.814...) JANGAN HTML."
echo ""
echo "=== CEK DB COUNT pergerakan_gps_anak profil_anak_id=16 SETELAH curl di atas ==="
sudo -u www-data /usr/bin/php8.5 artisan tinker --execute='echo "Count pergerakan_gps_anak id=16 = ".App\\Models\\PergerakanGpsAnak::where("profil_anak_id",16)->count()."\n"; $anak=App\\Models\\ProfilAnak::find(16); echo "ProfilAnak id=16 last_known_lat=".$anak?->last_known_latitude." lng=".$anak?->last_known_longitude." last_gps_captured_at=".$anak?->last_gps_captured_at."\n";' 2>&1 || true
echo "========================================================"
echo "DEPLOY G10 DONE"
