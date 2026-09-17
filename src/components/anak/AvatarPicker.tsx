import React, { useRef, useState } from 'react';
import {
  Upload, Check, Image as ImageIcon, Sparkles, X, Trash2,
  Smile, Star, Heart, Sun, Rocket, Gamepad2, Crown, Cat,
  Dog, Palette, Music, Shield, Zap, Moon, Award, LucideIcon
} from 'lucide-react';
import { AVATAR_ICON_OPTIONS, AvatarIconOption, renderAvatarIcon } from './AvatarIconSelector';

const ICON_MAP: Record<string, LucideIcon> = {
  Smile,
  Star,
  Heart,
  Sparkles,
  Sun,
  Rocket,
  Gamepad2,
  Crown,
  Cat,
  Dog,
  Palette,
  Music,
  Shield,
  Zap,
  Moon,
  Award
};

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  value,
  onChange,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'icons' | 'upload'>('icons');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      const err = 'Mohon upload file gambar yang valid (PNG, JPG, JPEG, WEBP)';
      setUploadError(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      const err = 'Ukuran foto maksimal 2MB';
      setUploadError(err);
      if (showToast) showToast(err, 'error');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
        if (showToast) showToast('Foto avatar berhasil diunggah', 'success');
      }
    };
    reader.onerror = () => {
      const err = 'Gagal memproses file foto';
      setUploadError(err);
      if (showToast) showToast(err, 'error');
    };
    reader.readAsDataURL(file);
  };

  const isUploadedImage =
    value.startsWith('data:image') ||
    value.startsWith('http://') ||
    value.startsWith('https://');

  return (
    <div className="space-y-3">
      {/* Label and Mode Switch */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-normal text-slate-600 dark:text-slate-400">
          Pilih Avatar Foto Profil
        </label>
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('icons')}
            className={`px-2 py-0.5 text-[11px] font-normal rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'icons'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-medium'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Pilihan Icon</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2 py-0.5 text-[11px] font-normal rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-medium'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Upload Foto</span>
          </button>
        </div>
      </div>

      {/* Current Preview */}
      <div className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
        <div className="shrink-0">
          {renderAvatarIcon(value, 'w-11 h-11', 'w-5 h-5')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
            {isUploadedImage ? 'Foto Kustom Diunggah' : 'Icon Terpilih'}
          </p>
          <p className="text-[10.5px] text-slate-400 font-normal">
            {isUploadedImage
              ? 'Foto kustom digunakan sebagai avatar anak'
              : 'Icon vektor ceria sebagai penanda profil'}
          </p>
        </div>
        {isUploadedImage && (
          <button
            type="button"
            onClick={() => onChange('icon:Smile')}
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Ganti ke icon bawaan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tab 1: Pilihan Icon-Icon Lucide */}
      {activeTab === 'icons' && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          {AVATAR_ICON_OPTIONS.map((item: AvatarIconOption) => {
            const IconComp = ICON_MAP[item.iconName] || Smile;
            const isSelected =
              value === `icon:${item.iconName}` ||
              value === `icon:${item.id}` ||
              value === item.iconName ||
              value === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(`icon:${item.iconName}`)}
                className={`relative p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  item.bgColor
                } ${item.textColor} ${item.borderColor} ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 shadow-xs scale-102 border-indigo-500'
                    : 'opacity-85 hover:opacity-100 hover:scale-105'
                }`}
                title={item.name}
              >
                <IconComp className="w-4 h-4" />
                <span className="text-[9.5px] font-normal truncate max-w-full leading-none">
                  {item.name.split(' ')[0]}
                </span>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-2xs">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 2: Upload Foto Sendiri */}
      {activeTab === 'upload' && (
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 text-center cursor-pointer transition-colors space-y-1.5"
          >
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-4 h-4" />
            </div>
            <p className="text-xs font-normal text-slate-700 dark:text-slate-300">
              Klik untuk pilih foto dari galeri atau komputer
            </p>
            <p className="text-[10.5px] text-slate-400 font-normal">
              Mendukung format JPG, PNG, WEBP (Maksimal 2 MB)
            </p>
          </div>

          {uploadError && (
            <p className="text-[11px] text-rose-500 font-normal">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
};
