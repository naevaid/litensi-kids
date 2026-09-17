<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pengumuman extends Model
{
    use HasFactory;

    // Nama tabel yang digunakan model ini
    protected $table = 'pengumuman';

    // Kolom yang dapat diisi secara massal
    protected $fillable = [
        'title',
        'badge_text',
        'badge_color',
        'content_type',
        'description',
        'image_url',
        'video_url',
        'display_target',
        'start_date',
        'end_date',
        'is_active',
        'cta_label',
        'cta_url',
        'author',
    ];

    // Cast tipe data untuk kolom tertentu
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }
}
