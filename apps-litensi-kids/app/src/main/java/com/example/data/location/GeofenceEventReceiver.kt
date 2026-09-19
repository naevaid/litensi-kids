package com.example.data.location

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.data.work.GPSUploadWorker
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent

// (G3.8) BroadcastReceiver untuk menangkap event geofence trigger ENTER / EXIT dari Play Services GeofencingClient.
// Setiap kali perangkat cross boundary zona → trigger OneTimeWork EXPEDITED GPSUploadWorker untuk upload GPS SEGERA
//   (bukan menunggu 15 menit periodik) → backend dapat hitung geofence ENTER/EXIT & FCM push <5 detik latency.
// Manifest declared: android:exported="false" (hanya internal app yang bisa trigger, aman dari external intent).
class GeofenceEventReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "GeofenceEventReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val ctx = context.applicationContext
        val geofencingEvent = GeofencingEvent.fromIntent(intent)

        // 1. Cek error (misal Google Play Services not available / GPS disable). Jika error → log & skip (tidak crash).
        if (geofencingEvent == null) {
            Log.e(TAG, "onReceive: GeofencingEvent null (intent invalid). Skip.")
            return
        }
        if (geofencingEvent.hasError()) {
            val errorCode = geofencingEvent.errorCode
            Log.e(TAG, "onReceive: Geofence error code=$errorCode. Skip trigger.")
            return
        }

        // 2. Dapatkan transition type (ENTER / EXIT / DWELL)
        val geofenceTransition = geofencingEvent.geofenceTransition
        val transitionName = when (geofenceTransition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> "ENTER"
            Geofence.GEOFENCE_TRANSITION_EXIT -> "EXIT"
            Geofence.GEOFENCE_TRANSITION_DWELL -> "DWELL"
            else -> "UNKNOWN($geofenceTransition)"
        }

        // 3. Dapatkan list triggering geofences (zona yang kena trigger, bisa multiple sekaligus)
        val triggeringGeofences = geofencingEvent.triggeringGeofences
        val requestIds = triggeringGeofences?.joinToString(", ") { it.requestId } ?: "none"
        Log.i(TAG, "onReceive: Geofence $transitionName triggered! Zona: [$requestIds]")

        // 4. Trigger OneTimeWork EXPEDITED GPSUploadWorker → upload GPS SEGERA (latency rendah geofence FCM push)
        // Kenapa tidak langsung Retrofit di BroadcastReceiver? Karena onReceive dipanggil di main thread
        //   dan timeout ~10 detik. WorkManager jauh lebih aman untuk network call & tidak di-kill system.
        GPSUploadWorker.enqueueExpeditedOneTime(ctx)
    }
}
