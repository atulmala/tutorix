import React from 'react';
import { formatExperienceBadgeLabel } from '@tutorix/shared-utils';

type ExperienceBadgeProps = {
  totalExperienceMonths?: number | null;
};

export const ExperienceBadge: React.FC<ExperienceBadgeProps> = ({
  totalExperienceMonths,
}) => {
  const label = formatExperienceBadgeLabel(totalExperienceMonths);
  if (!label) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm shadow-amber-200">
      <span aria-hidden>★</span>
      {label}
    </span>
  );
};
