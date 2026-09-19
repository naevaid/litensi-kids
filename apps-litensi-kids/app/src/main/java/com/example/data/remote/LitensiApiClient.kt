package com.example.data.remote

import com.parental.litensikids.BuildConfig
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

// Singleton Retrofit client untuk Litensi Backend API
// Pakai Kotlin object agar 1 instance saja di seluruh app lifecycle
object LitensiApiClient {

    private const val TIMEOUT_DETIK = 30L

    // Instance singleton LitensiApiService (lazy, dibuat saat pertama diakses)
    val instance: LitensiApiService by lazy { buildApiService() }

    // (G10.1 HOTFIX PALING PENTING: Inject Accept JSON GLOBAL di SEMUA request Retrofit)
    // Root cause HTTP 302 redirect ke SPA sebelumnya: Android TIDAK KIRIM header Accept: application/json
    // → Laravel $request->wantsJson()=FALSE → JIKA validasi/gate GAGAL → Laravel redirect()->back()
    // → tanpa Referer → redirect ke ROOT / → OkHttp follow redirect → dapat HTML SPA → Moshi error.
    // DENGAN interceptor ini di bawah: wantsJson()=TRUE SELALU → validation gate fail = JSON 422/403.
    private class ForceAcceptJsonInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val original = chain.request()
            val requestWithHeaders = original.newBuilder()
                .header("Accept", "application/json")
                .header("X-Requested-With", "XMLHttpRequest")
                // Jangan override Content-Type kalau sudah ada (form-urlencoded / multipart)
                .build()
            return chain.proceed(requestWithHeaders)
        }
    }

    // (G9.1 HOTFIX) Interceptor untuk mendeteksi JIKA server mengembalikan HTML (fallback SPA Vite)
    // bukan JSON API — berarti route tidak match / di-redirect Nginx karena route GPS belum terdaftar
    // production VPS. Lempar IOException dengan pesan JELAS, bukan "malformed JSON" yang membingungkan.
    private class HtmlFallbackDetectionInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val request = chain.request()
            val response = chain.proceed(request)
            val contentType = response.header("Content-Type") ?: ""
            // JIKA response = text/html PADAHAL request target API JSON → ini BUG ROUTE / REDIRECT SPA!
            if (contentType.contains("text/html", ignoreCase = true)) {
                val url = request.url.toString()
                val method = request.method
                val bodySnapshot =
                    try { response.peekBody(512L).string().trim().replace("\n", " ") }
                    catch (_: Exception) { "(tidak bisa baca body)" }
                // HTTP 302 redirect to / Laravel page: BERARTI gate ownership ATAU validasi gagal
                // TAPI Accept JSON interceptor SEHARUSNYA sudah mencegah ini. Muncul pesan tambahan.
                val msg = """
                    ❌ SERVER MENGEMBALIKAN HTML SPA BUKAN JSON API.
                    Request: $method $url
                    Content-Type server: $contentType
                    SOLUSI: Jalankan di SSH VPS dengan tambahan header Accept JSON untuk lihat error ASLI:
                    curl -v -X POST '$url' -H 'Accept: application/json' -d 'pairing_pin=PIN_ANDA&latitude=-6.814&longitude=110.821&captured_at=2026-09-19T00:00:00Z'
                    Body preview: $bodySnapshot
                """.trimIndent()
                throw IOException(msg)
            }
            return response
        }
    }

    private fun buildApiService(): LitensiApiService {
        // === OkHttpClient + 3 interceptor (URUTAN SANGAT PENTING JANGAN DIBALIK!) ===
        // URUTAN INTERCEPTOR:
        // 1. ForceAcceptJson (APPEND header Accept JSON GLOBAL sebelum request keluar)
        // 2. HttpLoggingInterceptor (LOG request/response SUDAH DENGAN header Accept JSON)
        // 3. HtmlFallbackDetectionInterceptor (CHECK response content type)
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val okHttpClient = OkHttpClient.Builder()
            .connectTimeout(TIMEOUT_DETIK, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_DETIK, TimeUnit.SECONDS)
            .writeTimeout(TIMEOUT_DETIK, TimeUnit.SECONDS)
            // (G10.1) URUTAN: Accept JSON HEADER INTERCEPTOR PALING AWAL DARI SEMUA!
            .addInterceptor(ForceAcceptJsonInterceptor())
            // (G9.1) Kemudian logging (agar header Accept JSON tercatat di logcat okhttp BODY)
            .addInterceptor(logging)
            // Terakhir detector HTML fallback
            .addInterceptor(HtmlFallbackDetectionInterceptor())
            .build()

        // === Moshi JSON Converter: (G9.1) TAMBAH .asLenient() di Converter Factory
        // agar toleransi minor JSON malformed (misal trailing comma, BOM UTF-8, indentasi tidak normal).
        // BUKAN untuk memparsing HTML (itu sudah ditangkap interceptor di atas duluan). ===
        val moshi = Moshi.Builder()
            .addLast(KotlinJsonAdapterFactory())
            .build()

        // === Normalisasi base URL: tambahkan trailing "/" jika belum ada, agar Retrofit tidak salah resolve path ===
        val baseUrlRaw = BuildConfig.API_BASE_URL.trim()
        val baseUrl = if (baseUrlRaw.endsWith("/")) baseUrlRaw else "$baseUrlRaw/"

        // === Build Retrofit + return LitensiApiService proxy ===
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi).asLenient())
            .build()
            .create(LitensiApiService::class.java)
    }
}
