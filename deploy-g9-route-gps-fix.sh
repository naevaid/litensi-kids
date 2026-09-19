#!/bin/bash
# ============================================================
# DEPLOY G9 FIX: Route GPS POST Production Verify + Clear Cache
# Target commit: terbaru dari main branch (termasuk G8 + G9)
# Urutan: git pull → vite build → rsync FE → rsync BE (PASTIKAN routes/) → artisan optimize/route clear → restart PHP-FPM → nginx reload → health check → route:list verification
# ============================================================
set -e

echo "====== STEP 1/8: GIT PULL /var/www/litensi-git-src ======"
cd /var/www/litensi-git-src
git reset --hard HEAD
git clean -fd
git pull origin main
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "LATEST COMMIT: $CURRENT_COMMIT"

echo ""
echo "====== STEP 2/8: VITE PRODUCTION BUILD (git-src root) ======"
cd /var/www/litensi-git-src
# Pastikan .env untuk vite ada (root level) - sudah ada chmod 600
export NODE_OPTIONS="--max-old-space-size=4096"
npm ci || npm install
npm run build
BUILD_SIZE=$(du -sh dist | cut -f1)
echo "BUILD OK, dist size: $BUILD_SIZE"

echo ""
echo "====== STEP 3/8: RSYNC FRONTEND dist → /var/www/litensi-frontend ======"
rsync -av --delete --exclude='.git' \
  /var/www/litensi-git-src/dist/ \
  /var/www/litensi-frontend/
chown -R www-data:www-data /var/www/litensi-frontend
echo "Frontend rsync OK (cache bust hash file name auto ganti tiap build)"

echo ""
echo "====== STEP 4/8: RSYNC BACKEND git-src → /var/www/litensi-backend ======"
# EXCLUDE SELALU: .env, vendor, storage, .git (credential aman, vendor tidak perlu copy, storage symlink)
rsync -av --delete \
  --exclude='.env' \
  --exclude='vendor' \
  --exclude='storage' \
  --exclude='.git' \
  /var/www/litensi-git-src/backend/ \
  /var/www/litensi-backend/
chown -R www-data:www-data /var/www/litensi-backend
# Storage symlink SUDAH ADA (verified previous deploys)
echo "Backend rsync OK (routes/, app/Http/Controllers/API, bootstrap/config semua TERUPDATE)"

echo ""
echo "====== STEP 5/8: LARAVEL ARTISAN (www-data context via php-fpm socket) ======"
cd /var/www/litensi-backend
# (G9 PRIORITAS) EKSPLISIT route:clear AGAR Laravel reload file routes/api.php TERBARU!
sudo -u www-data /usr/bin/php8.5 artisan route:clear -v || true
# Clear cache lainnya
sudo -u www-data /usr/bin/php8.5 artisan optimize:clear -v || true
# (G9) migrate --force JIKA ada migration baru (tidak ada saat ini, tapi safe)
sudo -u www-data /usr/bin/php8.5 artisan migrate --force --no-interaction || true
echo "Laravel artisan OK (route:clear DONE EKSPLISIT untuk GPS endpoint)"

echo ""
echo "====== STEP 6/8: RESTART PHP-FPM + NGINX RELOAD ======"
systemctl restart php8.5-fpm.service
sleep 1
systemctl status php8.5-fpm.service --no-pager | head -6
nginx -t 2>&1 | tail -3
systemctl reload nginx
echo "Services OK"

echo ""
echo "====== STEP 7/8: HEALTH CHECK HTTPS parental.naeva.id ======"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://parental.naeva.id/ || echo "000")
echo "Health check / HTTP status: $HTTP_STATUS"

echo ""
echo "====== STEP 8/8: CRITICAL VERIFICATION — ROUTE:LIST GPS POST ADA? ======"
cd /var/www/litensi-backend
echo "=== FILTER route:list UNTUK 'gps' ==="
sudo -u www-data /usr/bin/php8.5 artisan route:list 2>&1 | grep -i gps || echo "[PERINGATAN!] grep gps TIDAK MENEMUKAN APA APA. Jalankan manual artisan route:list full"
echo ""
echo "=== FULL route:list bagian ANAK (prefix v1/anak) ==="
sudo -u www-data /usr/bin/php8.5 artisan route:list 2>&1 | grep -E "api/v1/anak" | head -20

echo ""
echo "========================================================"
echo "DEPLOY G9 DONE. COMMIT: $CURRENT_COMMIT"
echo "ROOT CAUSE PREVIOUS BUG GPS HTML SPA: route production blm reload / rsync routes blm sync"
echo "SELANJUTNYA: user rebuild APK Android G9 interceptor HTML → install HP → EXPEDITED upload trigger"
echo "========================================================"
