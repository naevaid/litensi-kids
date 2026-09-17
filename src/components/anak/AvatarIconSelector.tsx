import React from 'react';
import {
  User, Smile, Heart, Star, Sparkles, Sun, Moon, Zap,
  Compass, Flame, Shield, Award, Rocket, Ghost, Crown,
  Gamepad2, Cat, Dog, Music, Palette, LucideIcon
} from 'lucide-react';

export interface AvatarIconOption {
  id: string;
  name: string;
  iconName: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const AVATAR_ICON_OPTIONS: AvatarIconOption[] = [
  { id: 'icon-smile', name: 'Senyum Ceria', iconName: 'Smile', bgColor: 'bg-amber-100 dark:bg-amber-950/60', textColor: 'text-amber-600 dark:text-amber-400', borderColor: 'border-amber-200 dark:border-amber-800' },
  { id: 'icon-star', name: 'Bintang Terang', iconName: 'Star', bgColor: 'bg-yellow-100 dark:bg-yellow-950/60', textColor: 'text-yellow-600 dark:text-yellow-400', borderColor: 'border-yellow-200 dark:border-yellow-800' },
  { id: 'icon-heart', name: 'Hati Ceria', iconName: 'Heart', bgColor: 'bg-rose-100 dark:bg-rose-950/60', textColor: 'text-rose-600 dark:text-rose-400', borderColor: 'border-rose-200 dark:border-rose-800' },
  { id: 'icon-sparkles', name: 'Kilau Ajaib', iconName: 'Sparkles', bgColor: 'bg-purple-100 dark:bg-purple-950/60', textColor: 'text-purple-600 dark:text-purple-400', borderColor: 'border-purple-200 dark:border-purple-800' },
  { id: 'icon-sun', name: 'Matahari Pagi', iconName: 'Sun', bgColor: 'bg-orange-100 dark:bg-orange-950/60', textColor: 'text-orange-600 dark:text-orange-400', borderColor: 'border-orange-200 dark:border-orange-800' },
  { id: 'icon-rocket', name: 'Roket Angkasa', iconName: 'Rocket', bgColor: 'bg-indigo-100 dark:bg-indigo-950/60', textColor: 'text-indigo-600 dark:text-indigo-400', borderColor: 'border-indigo-200 dark:border-indigo-800' },
  { id: 'icon-gamepad', name: 'Gamer Cilik', iconName: 'Gamepad2', bgColor: 'bg-blue-100 dark:bg-blue-950/60', textColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-200 dark:border-blue-800' },
  { id: 'icon-crown', name: 'Mahkota Juara', iconName: 'Crown', bgColor: 'bg-emerald-100 dark:bg-emerald-950/60', textColor: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-emerald-200 dark:border-emerald-800' },
  { id: 'icon-cat', name: 'Kucing Lucu', iconName: 'Cat', bgColor: 'bg-pink-100 dark:bg-pink-950/60', textColor: 'text-pink-600 dark:text-pink-400', borderColor: 'border-pink-200 dark:border-pink-800' },
  { id: 'icon-dog', name: 'Anjing Setia', iconName: 'Dog', bgColor: 'bg-cyan-100 dark:bg-cyan-950/60', textColor: 'text-cyan-600 dark:text-cyan-400', borderColor: 'border-cyan-200 dark:border-cyan-800' },
  { id: 'icon-palette', name: 'Seniman Cilik', iconName: 'Palette', bgColor: 'bg-teal-100 dark:bg-teal-950/60', textColor: 'text-teal-600 dark:text-teal-400', borderColor: 'border-teal-200 dark:border-teal-800' },
  { id: 'icon-music', name: 'Musisi Muda', iconName: 'Music', bgColor: 'bg-violet-100 dark:bg-violet-950/60', textColor: 'text-violet-600 dark:text-violet-400', borderColor: 'border-violet-200 dark:border-violet-800' },
  { id: 'icon-shield', name: 'Pelindung Super', iconName: 'Shield', bgColor: 'bg-sky-100 dark:bg-sky-950/60', textColor: 'text-sky-600 dark:text-sky-400', borderColor: 'border-sky-200 dark:border-sky-800' },
  { id: 'icon-zap', name: 'Petir Cepat', iconName: 'Zap', bgColor: 'bg-amber-100 dark:bg-amber-950/60', textColor: 'text-amber-600 dark:text-amber-400', borderColor: 'border-amber-200 dark:border-amber-800' },
  { id: 'icon-moon', name: 'Bulan Tenang', iconName: 'Moon', bgColor: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-600 dark:text-slate-300', borderColor: 'border-slate-200 dark:border-slate-700' },
  { id: 'icon-award', name: 'Bintang Prestasi', iconName: 'Award', bgColor: 'bg-rose-100 dark:bg-rose-950/60', textColor: 'text-rose-600 dark:text-rose-400', borderColor: 'border-rose-200 dark:border-rose-800' }
];

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
  Award,
  User,
  Ghost,
  Compass,
  Flame
};

export const renderAvatarIcon = (
  avatarStr: string,
  className = 'w-10 h-10',
  iconSizeClass = 'w-5 h-5'
) => {
  // If it's an uploaded image data URL or external image URL
  if (avatarStr.startsWith('data:image') || avatarStr.startsWith('http://') || avatarStr.startsWith('https://')) {
    return (
      <img
        src={avatarStr}
        alt="Avatar"
        className={`${className} rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0`}
      />
    );
  }

  // If it's an icon format e.g. "icon:Smile" or "icon:icon-smile"
  const iconKey = avatarStr.startsWith('icon:') ? avatarStr.replace('icon:', '') : avatarStr;
  const matchedPreset = AVATAR_ICON_OPTIONS.find(
    opt => opt.id === iconKey || opt.iconName === iconKey || opt.id === `icon-${iconKey.toLowerCase()}`
  );

  if (matchedPreset) {
    const IconComponent = ICON_MAP[matchedPreset.iconName] || Smile;
    return (
      <div
        className={`${className} ${matchedPreset.bgColor} ${matchedPreset.textColor} ${matchedPreset.borderColor} border rounded-full flex items-center justify-center shrink-0 shadow-2xs`}
        title={matchedPreset.name}
      >
        <IconComponent className={iconSizeClass} />
      </div>
    );
  }

  // Fallback to Icon component lookup or default User
  const IconComponent = ICON_MAP[iconKey] || Smile;
  return (
    <div className={`${className} bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-full flex items-center justify-center shrink-0 shadow-2xs`}>
      <IconComponent className={iconSizeClass} />
    </div>
  );
};
