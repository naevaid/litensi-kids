<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KuotaAvMonitorHarian extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'kuota_av_monitor_harian';

    // Kolom yang dapat diisi secara massal (sesuai migration 000005 field)
    protected $fillable = [
        'profil_anak_id',
        'tanggal',
        'paket_kuota_menit_harian',
        'digunakan_audio_menit',
        'digunakan_video_menit',
        'total_digunakan_menit',
        'sisa_kuota_menit',
        'last_mode',
        'last_started_at',
        'last_stopped_at',
        'last_sesi_id',
    ];

    // Cast tipe data untuk kolom tertentu (sesuai migration type)
    protected function casts(): array
    {
        return [
            'tanggal' => 'date',
            'paket_kuota_menit_harian' => 'integer',
            'digunakan_audio_menit' => 'integer',
            'digunakan_video_menit' => 'integer',
            'total_digunakan_menit' => 'integer',
            'sisa_kuota_menit' => 'integer',
            'last_mode' => 'string', // enum idle/audio_listen/camera_live
            'last_started_at' => 'datetime',
            'last_stopped_at' => 'datetime',
            'last_sesi_id' => 'integer',
        ];
    }

    // Relasi ke profil_anak (kuota ini milik siapa)
    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class);
    }
}
