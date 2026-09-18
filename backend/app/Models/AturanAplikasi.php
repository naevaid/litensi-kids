<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Model untuk aturan aplikasi (per anak per package aplikasi).
 * Satu row mewakili satu aturan akses untuk satu aplikasi pada satu perangkat anak.
 *
 * Fillable SESUAI migration 2026_09_18_000002 + interface AppRuleItem.tsx
 */
class AturanAplikasi extends Model
{
    use HasFactory;

    protected $table = 'aturan_aplikasi';

    protected $fillable = [
        'profil_anak_id',
        'package_name',
        'app_name',
        'category',
        'icon',
        'status',
        'daily_limit_minutes',
        'used_today_minutes',
        'schedule_mode',
        'allow_weekend_extra',
        'weekend_extra_minutes',
        'last_used_time',
    ];

    protected function casts(): array
    {
        return [
            'daily_limit_minutes' => 'integer',
            'used_today_minutes' => 'integer',
            'weekend_extra_minutes' => 'integer',
            'allow_weekend_extra' => 'boolean',
            'last_used_time' => 'datetime',
        ];
    }

    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class);
    }

    public function jadwalBlokir(): HasMany
    {
        return $this->hasMany(JadwalBlokir::class, 'aturan_aplikasi_id');
    }
}
