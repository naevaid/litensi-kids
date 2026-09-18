package com.example.ui.components

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@Composable
fun QrScannerFrame(
    onScannedSuccess: (rawPayload: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasCameraPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    // Debounce scanner: JANGAN callback onScannedSuccess berulang2 untuk QR SAMA dalam 3 detik terakhir
    var lastScannedAtMs by remember { mutableLongStateOf(0L) }
    var lastScannedPayload by remember { mutableStateOf<String?>(null) }
    // Status "Berhasil Terdeteksi" di UI (tampilkan icon check sebentar)
    var detectedSuccessAtMs by remember { mutableLongStateOf(0L) }
    val detectedRecently = (System.currentTimeMillis() - detectedSuccessAtMs) < 1500L
    val showDetectedIcon = remember(detectedSuccessAtMs) { detectedRecently }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasCameraPermission = isGranted
    }

    // Refresh `showDetectedIcon` setiap 500ms (karena System.currentTimeMillis tidak reactive)
    LaunchedEffect(detectedSuccessAtMs) {
        if (detectedSuccessAtMs == 0L) return@LaunchedEffect
        kotlinx.coroutines.delay(1500)
        // Trigger re-composition: cukup mutate value non-visible untuk paksa refresh detikan
        lastScannedAtMs.let { lastScannedAtMs = it + 1 }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "laser")
    val laserYRatio by infiniteTransition.animateFloat(
        initialValue = 0.1f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "laserY"
    )

    // Single background thread untuk ImageAnalysis (avoid blocking main)
    val cameraAnalysisExecutor: ExecutorService = remember { Executors.newSingleThreadExecutor() }

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (!hasCameraPermission) {
            // Camera Permission Request Card (jika izin kamera belum granted)
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF3F51B5).copy(alpha = 0.12f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = null,
                            tint = Color(0xFF3F51B5),
                            modifier = Modifier.size(28.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "Izin Kamera Diperlukan",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A),
                            fontSize = 15.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Aktifkan kamera perangkat untuk memindai QR Code dari dashboard Orang Tua secara langsung.",
                        style = MaterialTheme.typography.bodySmall.copy(
                            color = Color(0xFF64748B),
                            fontSize = 11.sp,
                            textAlign = TextAlign.Center
                        )
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(42.dp)
                            .testTag("btn_request_camera_permission"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3F51B5))
                    ) {
                        Icon(
                            imageVector = Icons.Default.CameraAlt,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Aktifkan Kamera untuk Scan QR",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 11.sp
                            )
                        )
                    }
                }
            }
        } else {
            // Live CameraX Preview Frame + QR Overlay (REAL SCAN, bukan simulasi)
            Box(
                modifier = Modifier
                    .size(260.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFF0F172A))
                    .border(
                        2.dp,
                        if (showDetectedIcon) Color(0xFF10B981).copy(alpha = 0.8f) else Color(0xFF0EA5E9)
                            .copy(alpha = 0.6f),
                        RoundedCornerShape(24.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                // CameraX Preview View + ImageAnalysis Barcode REAL
                AndroidView(
                    factory = { ctx ->
                        val previewView = PreviewView(ctx)
                        val mainHandler = Handler(Looper.getMainLooper())
                        val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                        cameraProviderFuture.addListener({
                            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

                            // (1) Use Case PREVIEW (tampilan kamera ke user)
                            val preview = Preview.Builder().build().also {
                                it.setSurfaceProvider(previewView.surfaceProvider)
                            }

                            // (2) Use Case IMAGE ANALYSIS → ML Kit Barcode QR SCANNER REAL
                            // ⚠️ JANGAN pakai remember{} di dalam factory AndroidView (bukan composable scope!)
                            val barcodeScanner = BarcodeScanning.getClient(
                                BarcodeScannerOptions.Builder()
                                    .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                                    .build()
                            )
                            val imageAnalysis = ImageAnalysis.Builder()
                                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                                .build()
                                .also { analysis ->
                                    analysis.setAnalyzer(cameraAnalysisExecutor) { imageProxy ->
                                        val mediaImage = imageProxy.image
                                        if (mediaImage == null) {
                                            imageProxy.close()
                                            return@setAnalyzer
                                        }
                                        val inputImage = InputImage.fromMediaImage(
                                            mediaImage,
                                            imageProxy.imageInfo.rotationDegrees
                                        )
                                        barcodeScanner.process(inputImage)
                                            .addOnSuccessListener { barcodes ->
                                                val qrBarcode = barcodes.firstOrNull {
                                                    it.format == Barcode.FORMAT_QR_CODE && it.rawValue != null
                                                }
                                                if (qrBarcode != null) {
                                                    val payload = qrBarcode.rawValue!!
                                                    val now = System.currentTimeMillis()
                                                    val debouncePass =
                                                        (now - lastScannedAtMs) > TimeUnit.SECONDS.toMillis(3)
                                                    val payloadBerubah = (payload != lastScannedPayload)
                                                    if (debouncePass || payloadBerubah) {
                                                        // ⚠️ State Compose MUTATION harus di MAIN THREAD (bukan thread pool analyzer!)
                                                        mainHandler.post {
                                                            lastScannedAtMs = now
                                                            lastScannedPayload = payload
                                                            detectedSuccessAtMs = now
                                                        }
                                                        Log.d(
                                                            "QrScannerFrame",
                                                            "QR Terdeteksi OK, payload length=${payload.length}"
                                                        )
                                                        // Callback ke Parent (PairingScreen) — tetap aman walau dari bg thread
                                                        onScannedSuccess(payload)
                                                    }
                                                }
                                            }
                                            .addOnFailureListener { _err ->
                                                // ignore individual frame error; next frame akan dicoba lagi
                                            }
                                            .addOnCompleteListener {
                                                // WAJIB close imageProxy agar frame berikutnya bisa dianalisa
                                                imageProxy.close()
                                            }
                                    }
                                }

                            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                            try {
                                cameraProvider.unbindAll()
                                cameraProvider.bindToLifecycle(
                                    lifecycleOwner,
                                    cameraSelector,
                                    preview,
                                    imageAnalysis
                                )
                            } catch (e: Exception) {
                                Log.e("QrScannerFrame", "CameraX use case binding failed", e)
                            }
                        }, ContextCompat.getMainExecutor(ctx))
                        previewView
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Laser Scanning Overlay Frame
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val width = size.width
                    val height = size.height

                    // Four Corner Markers for QR Alignment
                    val cornerLength = 40f
                    val strokeWidth = 8f
                    val cornerColor = if (showDetectedIcon) Color(0xFF10B981) else Color(0xFF10B981)

                    // Top Left
                    drawLine(cornerColor, Offset(30f, 30f), Offset(30f + cornerLength, 30f), strokeWidth)
                    drawLine(cornerColor, Offset(30f, 30f), Offset(30f, 30f + cornerLength), strokeWidth)

                    // Top Right
                    drawLine(cornerColor, Offset(width - 30f, 30f), Offset(width - 30f - cornerLength, 30f), strokeWidth)
                    drawLine(cornerColor, Offset(width - 30f, 30f), Offset(width - 30f, 30f + cornerLength), strokeWidth)

                    // Bottom Left
                    drawLine(cornerColor, Offset(30f, height - 30f), Offset(30f + cornerLength, height - 30f), strokeWidth)
                    drawLine(cornerColor, Offset(30f, height - 30f), Offset(30f, height - 30f - cornerLength), strokeWidth)

                    // Bottom Right
                    drawLine(cornerColor, Offset(width - 30f, height - 30f), Offset(width - 30f - cornerLength, height - 30f), strokeWidth)
                    drawLine(cornerColor, Offset(width - 30f, height - 30f), Offset(width - 30f, height - 30f - cornerLength), strokeWidth)

                    // Laser Scanning Line
                    if (!showDetectedIcon) {
                        val currentLaserY = height * laserYRatio
                        drawLine(
                            brush = Brush.horizontalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color(0xFF10B981),
                                    Color.White,
                                    Color(0xFF10B981),
                                    Color.Transparent
                                )
                            ),
                            start = Offset(20f, currentLaserY),
                            end = Offset(width - 20f, currentLaserY),
                            strokeWidth = 6f
                        )
                    }
                }

                // (BARU) Icon Check Circle BESAR ketika QR berhasil terdeteksi (1.5 detik terlihat)
                if (showDetectedIcon) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.35f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF10B981),
                            modifier = Modifier.size(88.dp)
                        )
                    }
                }

                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 12.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color.Black.copy(alpha = 0.6f))
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (showDetectedIcon) "QR Terdeteksi! Menghubungkan..." else "Arahkan Kamera ke QR Code Dashboard",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // 🆕 CATATAN: Tombol Simulasi Scan QR SUDAH DIHAPUS sesuai request user!
        // Scanner sekarang bekerja REAL-TIME otomatis ketika frame QR barcode muncul di kamera (auto-detect via ML Kit).
        Text(
            text = "Masukkan Nama Anak dan pindai QR Code",
            style = MaterialTheme.typography.bodySmall.copy(
                color = Color(0xFF64748B),
                fontSize = 11.sp,
                textAlign = TextAlign.Center
            ),
            modifier = Modifier.fillMaxWidth()
        )
    }
}
