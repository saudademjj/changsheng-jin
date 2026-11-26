import React from 'react';
import Archive from 'reicon-react/icons/Archive';
import ArrowLeft from 'reicon-react/icons/ArrowLeft';
import ArrowRight from 'reicon-react/icons/ArrowRight';
import BookOpen from 'reicon-react/icons/BookOpen';
import Check from 'reicon-react/icons/Check';
import ChevronLeft from 'reicon-react/icons/ChevronLeft';
import ChevronRight from 'reicon-react/icons/ChevronRight';
import Clock from 'reicon-react/icons/Clock';
import Compass from 'reicon-react/icons/Compass';
import Copy from 'reicon-react/icons/Copy';
import Download from 'reicon-react/icons/Download';
import Envelope from 'reicon-react/icons/Envelope';
import Eye from 'reicon-react/icons/Eye';
import EyeOff from 'reicon-react/icons/EyeOff';
import Feather from 'reicon-react/icons/Feather';
import Gift from 'reicon-react/icons/Gift';
import Globe from 'reicon-react/icons/Globe';
import Heart from 'reicon-react/icons/Heart';
import Home from 'reicon-react/icons/Home';
import Lock from 'reicon-react/icons/Lock';
import Menu from 'reicon-react/icons/Menu';
import Moon from 'reicon-react/icons/Moon';
import Sparkle from 'reicon-react/icons/Sparkle';
import Sun from 'reicon-react/icons/Sun';
import Trash from 'reicon-react/icons/Trash';
import Upload from 'reicon-react/icons/Upload';
import User from 'reicon-react/icons/User';
import Users from 'reicon-react/icons/Users';
import X from 'reicon-react/icons/X';
import type { IconComponent } from 'reicon-react/createIcon';

export type IconName =
  | 'archive'
  | 'arrowLeft'
  | 'arrowRight'
  | 'bookOpen'
  | 'check'
  | 'chevronLeft'
  | 'chevronRight'
  | 'clock'
  | 'compass'
  | 'copy'
  | 'download'
  | 'envelope'
  | 'eye'
  | 'eyeOff'
  | 'feather'
  | 'gift'
  | 'globe'
  | 'heart'
  | 'home'
  | 'lock'
  | 'menu'
  | 'moon'
  | 'sparkle'
  | 'sun'
  | 'trash'
  | 'upload'
  | 'user'
  | 'users'
  | 'x';

const ICON_MAP: Record<IconName, IconComponent> = {
  archive: Archive,
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  bookOpen: BookOpen,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  compass: Compass,
  copy: Copy,
  download: Download,
  envelope: Envelope,
  eye: Eye,
  eyeOff: EyeOff,
  feather: Feather,
  gift: Gift,
  globe: Globe,
  heart: Heart,
  home: Home,
  lock: Lock,
  menu: Menu,
  moon: Moon,
  sparkle: Sparkle,
  sun: Sun,
  trash: Trash,
  upload: Upload,
  user: User,
  users: Users,
  x: X,
};

interface AppIconProps {
  name: IconName;
  className?: string;
}

/**
 * 严格遵循 DESIGN.md 图标约束：
 * Reicon 图标本体 18px、线条粗细 1.5px，置入 24px × 24px 透明外框内。
 */
export const AppIcon: React.FC<AppIconProps> = ({ name, className }) => {
  const Component = ICON_MAP[name];
  return (
    <span
      className={className ? `reicon-frame ${className}` : 'reicon-frame'}
      aria-hidden="true"
    >
      <Component size={18} strokeWidth={1.5} weight="Outline" />
    </span>
  );
};
