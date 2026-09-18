<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Model ChatMessage untuk tabel pesan_chat_orangtua_anak (R3 Modul Chat)
// 1 row = 1 pesan dalam thread anak tertentu. Sender enum: child (perangkat anak), parent (portal orang tua), system (pesan otomatis).
class ChatMessage extends Model
{
    use HasFactory;

    protected $table = 'pesan_chat_orangtua_anak';

    protected $fillable = [
        'profil_anak_id',
        'user_id_orangtua',
        'sender',
        'text',
        'attachments',
        'is_read',
        'permintaan_waktu_id',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'attachments' => 'array',
            'permintaan_waktu_id' => 'integer',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    // Relasi ke ProfilAnak (thread anak mana pesan ini berada)
    public function profilAnak(): BelongsTo
    {
        return $this->belongsTo(ProfilAnak::class);
    }

    // Relasi ke User (orang tua yang mengirim / thread owner)
    public function orangTua(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id_orangtua');
    }

    // Relasi ke PermintaanWaktuLayar (jika pesan system terhubung dengan permintaan approve)
    public function permintaanWaktuLayar(): BelongsTo
    {
        return $this->belongsTo(PermintaanWaktuLayar::class, 'permintaan_waktu_id');
    }
}
