<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model PermintaanWaktuLayar untuk tabel permintaan_tambah_waktu_layar (R3 Modul Permintaan Waktu)
// Flow: Anak kirim permintaan pending → Orang tua approve/reject via CH4 Grant Waktu
class PermintaanWaktuLayar extends Model
{
    use HasFactory;

    protected $table = 'permintaan_tambah_waktu_layar';

    protected $fillable = [
        'profil_anak_id',
        'durasi_menit_diminta',
        'alasan_kategori',
        'catatan',
        'status',
        'approved_by_user_id',
        'catatan_orangtua',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'durasi_menit_diminta' => 'integer',
            'approved_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    // Relasi ke ProfilAnak yang membuat permintaan
    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class);
    }

    // Relasi ke User (orang tua yang approve/reject permintaan ini)
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
