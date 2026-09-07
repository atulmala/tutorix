import React from 'react';

export type HomeAudienceVariant = 'student' | 'tutor';

type HomeAudienceCardProps = {
  variant: HomeAudienceVariant;
  eyebrow: string;
  headline: string;
  subhead: string;
  bullets: string[];
  ctaLabel: string;
  onCta: () => void;
};

const variantStyles: Record<
  HomeAudienceVariant,
  {
    card: string;
    bar: string;
    chip: string;
    chipText: string;
    cta: string;
  }
> = {
  student: {
    card: 'border-[#5fa8ff]/40 bg-[#e8f1ff]/90',
    bar: 'bg-[#5fa8ff]',
    chip: 'bg-white text-[#1d4ed8]',
    chipText: 'text-[#1d4ed8]',
    cta: 'bg-[#5fa8ff] text-white hover:bg-[#4a97f5]',
  },
  tutor: {
    card: 'border-[#1FBBA6]/40 bg-[#e6f7f4]/90',
    bar: 'bg-[#1FBBA6]',
    chip: 'bg-white text-[#0f766e]',
    chipText: 'text-[#0f766e]',
    cta: 'bg-[#1FBBA6] text-white hover:bg-[#17a394]',
  },
};

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M4.5 10.5 8 14l7.5-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const HomeAudienceCard: React.FC<HomeAudienceCardProps> = ({
  variant,
  eyebrow,
  headline,
  subhead,
  bullets,
  ctaLabel,
  onCta,
}) => {
  const styles = variantStyles[variant];

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-3xl border shadow-lg backdrop-blur ${styles.card}`}
    >
      <div className={`h-1.5 w-full ${styles.bar}`} />
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.12em] ${styles.chipText}`}
        >
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold leading-tight text-primary md:text-3xl">
          {headline}
        </h2>
        <p className="mt-3 text-base text-muted">{subhead}</p>
        <ul className="mt-6 flex-1 space-y-3">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-3 text-sm text-primary">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-sm ${styles.chip}`}
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onCta}
          className={`mt-6 w-full rounded-lg px-6 py-3 text-base font-semibold shadow-md transition ${styles.cta}`}
        >
          {ctaLabel}
        </button>
      </div>
    </article>
  );
};
