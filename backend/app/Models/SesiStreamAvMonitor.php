<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SesiStreamAvMonitor extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'sesi_stream_av_monitor';

    // Kolom yang dapat diisi secara massal (sesuai migration 000006 field)
    protected $fillable = [
        'profil_anak_id',
        'user_id_yg_memantau',
        'mode',
        'started_at',
        'stopped_at',
        'durasi_menit_aktual',
        'kualitas',
        'jumlah_snapshot_ambil',
        'alarm_dibunyikan',
        'kunci_layar_dieksekusi',
        'status',
        'catatan_error',
    ];

    // Cast tipe data untuk kolom tertentu (sesuai migration type)
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'stopped_at' => 'datetime',
            'durasi_menit_aktual' => 'integer',
            'jumlah_snapshot_ambil' => 'integer',
            'alarm_dibunyikan' => 'boolean',
            'kunci_layar_dieksekusi' => 'boolean',
        ];
    }

    // Relasi ke profil_anak (sesi ini memantau siapa)
    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class);
    }

    // Relasi ke users (siapa orang tua yg start pemantauan ini)
    public function userPemantau(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id_yg_memantau');
    }
}
