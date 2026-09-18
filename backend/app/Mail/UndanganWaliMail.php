<?php

// Mailable: Kirim email undangan jadi wali / pendamping co-parent ke email calon wali.
// 2 varian link di email:
//   (A) Jika akun sudah ada  -> /terima-undangan?kode=... (langsung login + ACC)
//   (B) Jika akun belum ada  -> /register?kode=...&email=... (prefill email disable)
namespace App\Mail;

use App\Models\UndanganWaliAkses;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UndanganWaliMail extends Mailable
{
    use Queueable, SerializesModels;

    public UndanganWaliAkses $undangan;
    public User $parentUser;
    public ?User $calonPendamping;
    public string $linkTerima;
    public string $linkRegister;
    public string $appUrl;
    public array $permissionLabels;

    public function __construct(UndanganWaliAkses $undangan, User $parentUser, ?User $calonPendamping)
    {
        $this->undangan       = $undangan;
        $this->parentUser     = $parentUser;
        $this->calonPendamping = $calonPendamping;

        $this->appUrl = rtrim((string) config('app.url'), '/');

        $kode = $undangan->kode_undang_unique;
        $email = urlencode((string)$undangan->email_wali);
        $this->linkTerima   = "{$this->appUrl}/terima-undangan?kode={$kode}";
        $this->linkRegister = "{$this->appUrl}/register?kode={$kode}&email={$email}";

        $this->permissionLabels = $this->buildPermissionLabels();
    }

    public function envelope(): Envelope
    {
        $nama = $this->parentUser->name ?? 'Orang Tua';
        return new Envelope(
            from: new Address(
                (string) config('mail.from.address', 'support@naeva.id'),
                (string) config('mail.from.name', config('app.name', 'Litensi Kids'))
            ),
            subject: "📩 Undangan Menjadi Wali Anak dari {$nama} — Litensi Kids"
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.undangan_wali',
            with: [
                'undangan'        => $this->undangan,
                'parentUser'      => $this->parentUser,
                'calonPendamping' => $this->calonPendamping,
                'linkTerima'      => $this->linkTerima,
                'linkRegister'    => $this->linkRegister,
                'appUrl'          => $this->appUrl,
                'permissionLabels'=> $this->permissionLabels,
                'punyaAkun'       => $this->calonPendamping !== null,
                'expiresHuman'    => $this->undangan->expires_at
                    ? $this->undangan->expires_at->translatedFormat('l, d F Y H:i')
                    : '7 hari dari sekarang',
            ]
        );
    }

    private function buildPermissionLabels(): array
    {
        $p = $this->undangan->permission_override_json ?? [
            'canLockScreen'   => true,
            'canGrantTime'    => true,
            'canViewLocation' => true,
            'canEditPin'      => false,
            'canBlockApps'    => true,
        ];
        // Fallback default role-2 (Pendamping) jika cast null
        if (!is_array($p)) {
            $p = ['canLockScreen'=>true,'canGrantTime'=>true,'canViewLocation'=>true,'canEditPin'=>false,'canBlockApps'=>true];
        }
        $labels = [
            'canLockScreen'   => ['label' => '🔒 Kunci Layar Anak',          'val' => (bool)($p['canLockScreen']   ?? false)],
            'canGrantTime'    => ['label' => '⏱️ Tambah Waktu Layar Anak',    'val' => (bool)($p['canGrantTime']    ?? false)],
            'canViewLocation' => ['label' => '📍 Lihat Lokasi Anak',          'val' => (bool)($p['canViewLocation'] ?? false)],
            'canEditPin'      => ['label' => '🔑 Ubah PIN Master Parental',   'val' => (bool)($p['canEditPin']      ?? false)],
            'canBlockApps'    => ['label' => '🚫 Blokir Aplikasi Anak',       'val' => (bool)($p['canBlockApps']    ?? false)],
        ];
        return $labels;
    }
}
