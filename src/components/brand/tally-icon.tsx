import type { SVGProps } from "react";

export interface TallyIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

/**
 * Tally brand mark: 3 ascending rounded vertical bars with a base circle.
 * Exact geometry derived from SVG/tally-logo-light.svg.
 */
export function TallyIcon({
  size = 32,
  className = "",
  ...props
}: TallyIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1086.98 1236.59"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="m496.62,574.56h0v449.38c0,117.37-95.29,212.66-212.66,212.66h0v-449.38c0-117.37,95.29-212.66,212.66-212.66Z" />
      <path d="m791.8,283.27h0v740.66c0,117.37-95.29,212.66-212.66,212.66h0V495.93c0-117.37,95.29-212.66,212.66-212.66Z" />
      <path d="m1086.98,0h0v1023.94c0,117.37-95.29,212.66-212.66,212.66h0V212.66C874.33,95.29,969.61,0,1086.98,0Z" />
      <circle cx="113.06" cy="1123.54" r="113.06" />
    </svg>
  );
}
