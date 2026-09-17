<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CatatanPendapatan extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'catatan_pendapatan';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'user_id',
        'user_name',
        'user_email',
        'user_phone',
        'item',
        'amount',
        'provider',
        'status',
        'transaction_date',
        'invoice_no',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'amount' => 'integer',
            'transaction_date' => 'datetime',
        ];
    }

    // Relasi ke tabel users (bisa null jika user dihapus)
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
