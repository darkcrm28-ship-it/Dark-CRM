import React from "react";

export default function DarakLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="darakGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF2B2" />
          <stop offset="45%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#9E7618" />
        </linearGradient>
        <linearGradient id="darakGoldLight" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#F9E8A2" />
        </linearGradient>
      </defs>

      {/* Modern Architectural Geometric D Monogram */}
      {/* Outer D Silhouette */}
      <path
        d="M8 7H24C33.3888 7 41 14.6112 41 24C41 33.3888 33.3888 41 24 41H8V7Z"
        stroke="url(#darakGoldGrad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Inner Architectural Villa Gable Line */}
      <path
        d="M16 26L24 17L32 26"
        stroke="url(#darakGoldLight)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central Pillar */}
      <path
        d="M24 21V35"
        stroke="url(#darakGoldGrad)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Base Accent Line */}
      <path
        d="M15 35H33"
        stroke="url(#darakGoldLight)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
