<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model JadwalBlokir: jadwal rutin blokir aplikasi per anak.
 * Dipakai di halaman Kontrol Aplikasi subtab "Jadwal".
 */
class JadwalBlokir extends Model
{
    use HasFactory;

    protected $table = 'jadwal_blokir';

    protected $fillable = [
        'profil_anak_id',
        'aturan_aplikasi_id',
        'nama_jadwal',
        'days_active',
        'jam_mulai',
        'jam_selesai',
        'action_when_match',
        'durasi_jadwal_minutes',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'days_active' => 'array',
            'durasi_jadwal_minutes' => 'integer',
            'is_active' => 'boolean',
            'jam_mulai' => 'datetime:H:i',
            'jam_selesai' => 'datetime:H:i',
        ];
    }

    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class);
    }

    public function aturanAplikasi(): BelongsTo
    {
        return $this->belongsTo(AturanAplikasi::class, 'aturan_aplikasi_id');
    }
}
