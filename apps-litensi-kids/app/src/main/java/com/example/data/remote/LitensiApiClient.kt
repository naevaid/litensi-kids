package com.example.data.remote

import com.parental.litensikids.BuildConfig
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

// Singleton Retrofit client untuk Litensi Backend API
// Pakai Kotlin object agar 1 instance saja di seluruh app lifecycle
object LitensiApiClient {

    private const val TIMEOUT_DETIK = 30L

    // Instance singleton LitensiApiService (lazy, dibuat saat pertama diakses)
    val instance: LitensiApiService by lazy { buildApiService() }

    private fun buildApiService(): LitensiApiService {
        // === OkHttpClient + logging interceptor (BODIES saat DEBUG, NONE di RELEASE) ===
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
            .addInterceptor(logging)
            .build()

        // === Moshi JSON Converter (KotlinJsonAdapterFactory untuk support nullable + default value) ===
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
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(LitensiApiService::class.java)
    }
}
