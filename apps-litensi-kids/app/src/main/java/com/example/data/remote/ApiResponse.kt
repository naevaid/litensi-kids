package com.example.data.remote

import com.squareup.moshi.Json

// Generic wrapper response standard seluruh endpoint backend Litensi
// Shape: { success: Boolean, message: String?, data: <T> }
// Digunakan oleh Retrofit untuk parsing envelope sebelum unwrap payload aktual
data class ApiResponse<T : Any>(
    @Json(name = "success") val success: Boolean,
    @Json(name = "message") val message: String? = null,
    @Json(name = "data") val data: T
)
