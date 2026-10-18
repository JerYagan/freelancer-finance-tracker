import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import {
  Home,
  BarChart3,
  Receipt,
  Wallet,
  Folder,
  User,
  Users,
  Sprout,
  Calendar,
  Bell,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  TrendingUp,
  Settings,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Download,
  Upload,
} from "lucide-react";

export type BrandIconName =
  | "home"
  | "analytics"
  | "receipt"
  | "wallet"
  | "folder"
  | "user"
  | "users"
  | "sprout"
  | "calendar"
  | "bell"
  | "check"
  | "arrow-up"
  | "arrow-down"
  | "plus"
  | "trending"
  | "settings"
  | "sparkles"
  | "shield"
  | "card"
  | "download"
  | "upload";

const ICON_MAP: Record<BrandIconName, ComponentType<LucideProps>> = {
  home: Home,
  analytics: BarChart3,
  receipt: Receipt,
  wallet: Wallet,
  folder: Folder,
  user: User,
  users: Users,
  sprout: Sprout,
  calendar: Calendar,
  bell: Bell,
  check: CheckCircle2,
  "arrow-up": ArrowUpRight,
  "arrow-down": ArrowDownRight,
  plus: Plus,
  trending: TrendingUp,
  settings: Settings,
  sparkles: Sparkles,
  shield: ShieldCheck,
  card: CreditCard,
  download: Download,
  upload: Upload,
};

export interface BrandIconProps {
  name: BrandIconName;
  variant?: "badge" | "minimal" | "pill" | "solid";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  iconClassName?: string;
}

const variantStyles = {
  badge:
    "bg-[#A7C8A3]/25 text-[#17211B] border border-[#5E8C61]/30 shadow-xs dark:bg-[#5E8C61]/20 dark:text-[#A7C8A3] dark:border-[#5E8C61]/40",
  pill:
    "bg-[#F3F1E8] text-[#5E8C61] border border-[#A7C8A3] dark:bg-[#17211B] dark:text-[#A7C8A3] dark:border-[#5E8C61]/40",
  solid:
    "bg-[#5E8C61] text-[#FFFFEF] border border-[#5E8C61] shadow-xs dark:bg-[#5E8C61] dark:text-[#FFFFEF]",
  minimal: "text-[#5E8C61] dark:text-[#A7C8A3]",
};

const sizeStyles = {
  sm: { container: "w-7 h-7 rounded-lg", icon: 14, strokeWidth: 2.2 },
  md: { container: "w-10 h-10 rounded-xl", icon: 20, strokeWidth: 2.2 },
  lg: { container: "w-12 h-12 rounded-2xl", icon: 24, strokeWidth: 2.4 },
  xl: { container: "w-16 h-16 rounded-3xl", icon: 30, strokeWidth: 2.5 },
};

/**
 * Brand-styled icon wrapper using lucide-react with the Tally dual-tone badge styling.
 * Strictly avoids emojis while honoring the brand styleboard.
 */
export function BrandIcon({
  name,
  variant = "badge",
  size = "md",
  className = "",
  iconClassName = "",
}: BrandIconProps) {
  const IconComponent = ICON_MAP[name] ?? BarChart3;
  const sizeConfig = sizeStyles[size];

  if (variant === "minimal") {
    return (
      <IconComponent
        size={sizeConfig.icon}
        strokeWidth={sizeConfig.strokeWidth}
        className={`${variantStyles.minimal} ${iconClassName} ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center transition-transform ${sizeConfig.container} ${variantStyles[variant]} ${className}`}
      aria-hidden="true"
    >
      <IconComponent
        size={sizeConfig.icon}
        strokeWidth={sizeConfig.strokeWidth}
        className={iconClassName}
      />
    </div>
  );
}
