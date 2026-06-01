import React from 'react';
import { parseTutorOfferingLabelSegments } from '@tutorix/shared-utils';

type OfferingLabelProps = {
  label: string | null | undefined;
  className?: string;
  delimiterClassName?: string;
};

export function OfferingLabel({
  label,
  className = '',
  delimiterClassName = 'font-normal text-purple-400',
}: OfferingLabelProps) {
  if (!label?.trim()) {
    return <span className={className}>—</span>;
  }

  const segments = parseTutorOfferingLabelSegments(label);

  if (segments.length <= 1) {
    return <span className={className}>{label}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`.trim()}>
      {segments.map((segment, index) => (
        <React.Fragment key={`${segment}-${index}`}>
          {index > 0 ? (
            <span className={delimiterClassName} aria-hidden>
              |
            </span>
          ) : null}
          <span>{segment}</span>
        </React.Fragment>
      ))}
    </span>
  );
}
