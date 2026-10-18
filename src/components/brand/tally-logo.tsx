import Link from "next/link";
import { TallyIcon } from "./tally-icon";

export interface TallyLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

const sizeConfig = {
  sm: { icon: 20, text: "text-lg", gap: "gap-1.5" },
  md: { icon: 26, text: "text-xl", gap: "gap-2" },
  lg: { icon: 34, text: "text-2xl", gap: "gap-2.5" },
  xl: { icon: 44, text: "text-3xl sm:text-4xl", gap: "gap-3" },
};

/**
 * Full brand lockup: Tally mark + geometric typography (no tagline under logo).
 */
export function TallyLogo({
  size = "md",
  href = "/",
  className = "",
  iconClassName = "text-[#5E8C61] dark:text-[#A7C8A3]",
  textClassName = "text-[#17211B] dark:text-[#F3F1E8]",
}: TallyLogoProps) {
  const cfg = sizeConfig[size];

  const content = (
    <div className={`inline-flex items-center ${cfg.gap} ${className}`}>
      <TallyIcon size={cfg.icon} className={`shrink-0 ${iconClassName}`} />
      <div className="flex flex-col">
        <span
          className={`font-extrabold tracking-[-0.03em] leading-none ${cfg.text} ${textClassName}`}
        >
          Tally
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E8C61] rounded"
        aria-label="Tally — Home"
      >
        {content}
      </Link>
    );
  }

  return content;
}
