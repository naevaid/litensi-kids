<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model PermintaanAksesAplikasi: daftar permintaan buka blokir dari anak ke orang tua.
 * Dipakai di halaman Kontrol Aplikasi subtab "Permintaan".
 *
 * Status SESUAI interface AppAccessRequest L50: pending / approved / rejected
 */
class PermintaanAksesAplikasi extends Model
{
    use HasFactory;

    protected $table = 'permintaan_akses_aplikasi';

    protected $fillable = [
        'profil_anak_id',
        'app_name',
        'package_name',
        'category',
        'durasi_menit_diminta',
        'alasan',
        'status',
        'handled_by_user_id',
        'handled_at',
        'catatan_handle',
        'requested_at',
    ];

    protected function casts(): array
    {
        return [
            'durasi_menit_diminta' => 'integer',
            'handled_at' => 'datetime',
            'requested_at' => 'datetime',
        ];
    }

    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class);
    }

    public function handledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by_user_id');
    }
}
