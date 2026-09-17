<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotifikasiDiteruskan extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'notifikasi_diteruskan';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'user_id',
        'profil_anak_id',
        'child_name',
        'device_name',
        'app_name',
        'app_package',
        'app_category',
        'sender_or_title',
        'content',
        'timestamp',
        'is_read',
        'is_starred',
        'is_flagged',
        'flag_reason',
        'is_sensitive',
        'sensitive_category',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'timestamp' => 'datetime',
            'is_read' => 'boolean',
            'is_starred' => 'boolean',
            'is_flagged' => 'boolean',
            'is_sensitive' => 'boolean',
        ];
    }

    // Relasi ke tabel users (orang tua)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Relasi ke tabel profil_anak (sumber notifikasi)
    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class, 'profil_anak_id');
    }
}
