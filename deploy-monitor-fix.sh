#!/bin/bash
# Deploy fix monitor (battery + timestamp tooltip sync)
set -e
cd /var/www/litensi-git-src
echo "====== GIT PULL ======"
git reset --hard HEAD
git clean -fd
git pull origin main
echo "Commit: $(git rev-parse --short HEAD)"

echo ""
echo "====== RSYNC BACKEND ======"
rsync -av --delete --exclude='.env' --exclude='vendor' --exclude='storage' --exclude='.git' /var/www/litensi-git-src/backend/ /var/www/litensi-backend/
chown -R www-data:www-data /var/www/litensi-backend

echo ""
echo "====== RSYNC FRONTEND (dist Vite terbaru) ======"
rsync -av --delete /var/www/litensi-git-src/dist/ /var/www/litensi-frontend/
chown -R www-data:www-data /var/www/litensi-frontend

echo ""
echo "====== LARAVEL ======"
cd /var/www/litensi-backend
sudo -u www-data /usr/bin/php8.5 artisan route:clear -v || true
sudo -u www-data /usr/bin/php8.5 artisan optimize:clear -v || true

echo ""
echo "====== RESTART PHP-FPM + NGINX ======"
systemctl restart php8.5-fpm.service
systemctl reload nginx
echo "PHP-FPM status: $(systemctl is-active php8.5-fpm.service)"
echo "Nginx status: $(systemctl is-active nginx)"

echo ""
echo "====== HEALTH CHECK ======"
echo "HTTPS /: $(curl -s -o /dev/null -w '%{http_code}' https://parental.naeva.id/)"
echo ""
echo "====== FINAL TEST: curl POST GPS is_mock_detected=false (test battery_level update ProfilAnak id=16) ======"
curl -s -X POST "https://parental.naeva.id/api/v1/anak/16/gps" \
  -H "Accept: application/json" \
  -H "X-Requested-With: XMLHttpRequest" \
  --max-time 15 \
  --data-urlencode "pairing_pin=616841" \
  --data-urlencode "qr_pairing_code=LTN-VEU-7698-SEC" \
  --data-urlencode "latitude=-6.8141987" \
  --data-urlencode "longitude=110.8216030" \
  --data-urlencode "captured_at=2026-09-19T05:00:00.000Z" \
  --data-urlencode "accuracy_meters=19" \
  --data-urlencode "battery_level=80" \
  --data-urlencode "altitude_m=40" | head -10
echo ""
echo "✅ DONE"
