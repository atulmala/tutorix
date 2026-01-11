import React from 'react';

type VerificationTickProps = {
  visible: boolean;
  label: string;
};

export const VerificationTick: React.FC<VerificationTickProps> = ({ visible, label }) => {
  if (!visible) return null;
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className="text-green-600"
      role="img"
      aria-label={label}
    >
      <path
        d="M4 12.5 9 17l11-12"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="24"
        strokeDashoffset="24"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="24"
          to="0"
          dur="0.3s"
          fill="freeze"
        />
      </path>
    </svg>
  );
};

