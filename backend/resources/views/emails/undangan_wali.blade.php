<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>Undangan Menjadi Wali Anak - Litensi Kids</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif; color: #1f2937; }
        .wrapper { width: 100%; padding: 32px 16px; background-color: #f4f7fb; box-sizing: border-box; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06); }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 32px; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .header p  { margin: 6px 0 0 0; font-size: 14px; opacity: 0.92; }
        .body { padding: 28px 32px; line-height: 1.6; font-size: 15px; }
        .hi { font-size: 17px; font-weight: 600; margin: 0 0 14px 0; }
        p { margin: 0 0 14px 0; }
        .box-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 18px 0; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14.5px; }
        .row .label { color: #64748b; font-weight: 500; }
        .row .value { color: #0f172a; font-weight: 600; text-align: right; }
        .perm-list { list-style: none; padding: 0; margin: 10px 0 0 0; }
        .perm-list li { padding: 5px 0; font-size: 14.5px; }
        .yes { color: #15803d; font-weight: 600; }
        .no  { color: #94a3b8; font-style: italic; font-weight: 400; }
        .btn-primary { display: inline-block; padding: 13px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; text-align: center; }
        .btn-wrap { margin: 22px 0; text-align: center; }
        .btn-secondary-wrap { text-align: center; font-size: 13.5px; color: #64748b; margin-top: 10px; }
        .btn-secondary-wrap a { color: #4f46e5; text-decoration: underline; word-break: break-all; }
        .expire-box { margin-top: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13.5px; color: #78350f; }
        .footer { text-align: center; padding: 22px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 13px; }
        .footer a { color: #4f46e5; text-decoration: none; }
        .hint-box { margin-top: 16px; padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; font-size: 13.5px; color: #1e40af; }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="card">
            <div class="header">
                <h1>📩 Undangan Menjadi Wali Anak</h1>
                <p>Litensi Kids — Parental Control & Digital Parenting</p>
            </div>
            <div class="body">
                <p class="hi">Halo,</p>
                <p>
                    <strong>{{ $parentUser->name ?? 'Orang Tua' }}</strong>
                    (email: {{ $parentUser->email }})
                    mengundang Anda untuk bergabung menjadi
                    <strong>{{ $undangan->role_name ?? 'Pendamping / Wali (Co-Parent)' }}</strong>
                    dalam mengawasi dan mendampingi penggunaan gawai anak di aplikasi Litensi Kids.
                </p>

                <div class="box-info">
                    <div class="row">
                        <span class="label">📋 Peran</span>
                        <span class="value">{{ $undangan->role_name ?? 'Pendamping / Wali (Co-Parent)' }}</span>
                    </div>
                    <div class="row">
                        <span class="label">👥 Diundang Oleh</span>
                        <span class="value">{{ $parentUser->name ?? '-' }}</span>
                    </div>
                    <div class="row">
                        <span class="label">🔑 Kode Undangan</span>
                        <span class="value" style="font-family: monospace; font-size: 13px;">{{ $undangan->kode_undang_unique }}</span>
                    </div>

                    <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed #cbd5e1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">✅ Akses Izin yang Diberikan:</div>
                        <ul class="perm-list">
                            @foreach($permissionLabels as $perm)
                                <li>
                                    {{ $perm['label'] }}:
                                    @if($perm['val'])<span class="yes">✓ Diizinkan</span>@else<span class="no">✗ Tidak diizinkan</span>@endif
                                </li>
                            @endforeach
                        </ul>
                    </div>
                </div>

                @if($punyaAkun)
                    {{-- (A) Akun sudah terdaftar dengan email yang sama --}}
                    <div class="btn-wrap">
                        <a href="{{ $linkTerima }}" class="btn-primary" target="_blank">🔐 Login & Terima Undangan</a>
                    </div>
                    <div class="btn-secondary-wrap">
                        Jika tombol tidak berfungsi, buka URL ini di browser:<br>
                        <a href="{{ $linkTerima }}" target="_blank">{{ $linkTerima }}</a>
                    </div>
                    <div class="hint-box">
                        💡 Anda sudah memiliki akun Litensi Kids dengan email ini. Login dulu, lalu undangan akan otomatis masuk ke daftar relasi wali Anda.
                    </div>
                @else
                    {{-- (B) Akun BELUM ADA → Link Register prefill email --}}
                    <div class="btn-wrap">
                        <a href="{{ $linkRegister }}" class="btn-primary" target="_blank">📝 Buat Akun Baru & Terima Undangan</a>
                    </div>
                    <div class="btn-secondary-wrap">
                        Jika tombol tidak berfungsi, buka URL ini di browser:<br>
                        <a href="{{ $linkRegister }}" target="_blank">{{ $linkRegister }}</a>
                    </div>
                    <div class="hint-box">
                        💡 Email Anda <strong>{{ $undangan->email_wali }}</strong> sudah otomatis terisi (tidak bisa diubah) pada form pendaftaran.
                        Anda cukup mengisi nama lengkap & kata sandi sendiri (kata sandi TIDAK dikirim melalui email demi keamanan).
                    </div>
                @endif

                <div class="expire-box">
                    ⏳ Masa berlaku undangan: <strong>{{ $expiresHuman }}</strong>.
                    Lewat dari tanggal tersebut, undangan akan otomatis kedaluwarsa dan Anda perlu meminta undangan ulang.
                </div>
            </div>

            <div class="footer">
                Hormat kami,<br>
                <strong>Tim Litensi Kids</strong><br><br>
                <a href="{{ $appUrl }}">{{ $appUrl }}</a><br>
                Jika Anda tidak merasa diminta menjadi wali, abaikan email ini.
            </div>
        </div>
    </div>
</body>
</html>
