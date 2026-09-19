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
                    try { response.peekBody(256L).string().trim().replace("\n", " ") }
                    catch (_: Exception) { "(tidak bisa baca body)" }
                val msg = """
                    ❌ SERVER MENGEMBALIKAN HTML SPA BUKAN JSON API.
                    Request: $method $url
                    Content-Type server: $contentType
                    Ini BERARTI route API BELUM TERDAFTAR di production VPS atau Nginx salah redirect
                    ke frontend Vite (index.html fallback SPA).
                    SOLUSI: Jalankan di SSH VPS: cd /var/www/litensi-backend && /usr/bin/php8.5 artisan route:list
                    → CEK ADAKAH BARIS: POST api/v1/anak/{id}/gps .... AnakController@uploadGpsPergerakan
                    JIKA TIDAK ADA: rsync folder routes terbaru + /usr/bin/php8.5 artisan route:clear lalu retry.
                    Body preview HTML: $bodySnapshot
                """.trimIndent()
                throw IOException(msg)
            }
            return response
        }
    }

    private fun buildApiService(): LitensiApiService {
        // === OkHttpClient + logging interceptor + HTML fallback detector (urutan interceptor PENTING) ===
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
            // (G9.1) Urutan INTERCEPTOR: logging dulu agar body tercatat, KEMUDIAN fallback detector
            // yang akan lempar exception JIKA HTML. Pesan error akan masuk ke GPSUploadWorker Log.w
            .addInterceptor(logging)
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
