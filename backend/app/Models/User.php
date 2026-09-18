<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Kolom yang dapat diisi secara massal.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'pin_master',
        'role',
        'email_verified_at',
        'password',
        'avatar_url',
        'active_plan',
        'active_plan_label',
        'children_count',
        'devices_count',
        'expires_at',
        'status',
        'last_active',
    ];

    /**
     * Kolom yang disembunyikan saat serialisasi.
     * SENSITIF: JANGAN PERNAH kirim pin_master dan password ke JSON response publik!
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'pin_master',
        'remember_token',
    ];

    /**
     * Cast tipe data untuk kolom tertentu.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'children_count' => 'integer',
            'devices_count' => 'integer',
            'expires_at' => 'date',
            'last_active' => 'datetime',
        ];
    }

    // Relasi ke tabel profil_anak (daftar anak yang dimiliki user)
    public function profilAnak(): HasMany
    {
        return $this->hasMany(ProfilAnak::class);
    }

    // Relasi ke tabel zona_geofence (daftar zona geofence user)
    public function zonaGeofence(): HasMany
    {
        return $this->hasMany(ZonaGeofence::class);
    }

    // Relasi ke tabel catatan_pendapatan (riwayat transaksi user)
    public function catatanPendapatan(): HasMany
    {
        return $this->hasMany(CatatanPendapatan::class);
    }

    // Relasi ke tabel notifikasi_diteruskan (notifikasi dari anak)
    public function notifikasiDiteruskan(): HasMany
    {
        return $this->hasMany(NotifikasiDiteruskan::class);
    }
}
