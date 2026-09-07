import React from 'react';
import type { WebUser } from '../../types/web-user';
import { HomeFooter } from './HomeFooter';
import { HomeHeader } from './HomeHeader';
import type { AudienceDetailCopy } from './audience-detail-copy';

type AudienceDetailPageProps = {
  copy: AudienceDetailCopy;
  currentUser: WebUser | null;
  onHome: () => void;
  onLogin: () => void;
  onSignUp: () => void;
  onLogout: () => void;
};

const variantStyles = {
  student: {
    chip: 'text-[#1d4ed8]',
    step: 'bg-[#5fa8ff] text-white',
    cta: 'bg-[#5fa8ff] text-white hover:bg-[#4a97f5]',
    panel: 'border-[#5fa8ff]/40 bg-[#e8f1ff]/80',
  },
  tutor: {
    chip: 'text-[#0f766e]',
    step: 'bg-[#1FBBA6] text-white',
    cta: 'bg-[#1FBBA6] text-white hover:bg-[#17a394]',
    panel: 'border-[#1FBBA6]/40 bg-[#e6f7f4]/80',
  },
} as const;

export const AudienceDetailPage: React.FC<AudienceDetailPageProps> = ({
  copy,
  currentUser,
  onHome,
  onLogin,
  onSignUp,
  onLogout,
}) => {
  const styles = variantStyles[copy.variant];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-[#E9F5FE] to-[#e8f1ff] text-primary">
      <HomeHeader
        currentUser={currentUser}
        onHome={onHome}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
      />

      <main className="relative mx-auto w-full max-w-4xl flex-1 px-6 py-8 md:px-12 md:py-12">
        <button
          type="button"
          onClick={onHome}
          className="text-sm font-semibold text-[#1d4ed8] hover:underline"
        >
          ← Back to home
        </button>

        <p className={`mt-6 text-sm font-semibold uppercase tracking-[0.12em] ${styles.chip}`}>
          {copy.eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-primary md:text-5xl">
          {copy.headline}
        </h1>
        <p className="mt-4 max-w-3xl text-base text-muted md:text-lg">{copy.lead}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSignUp}
            className={`rounded-lg px-6 py-3 text-base font-semibold shadow-md transition ${styles.cta}`}
          >
            {copy.ctaLabel}
          </button>
          <button
            type="button"
            onClick={onLogin}
            className="rounded-lg border border-subtle px-6 py-3 text-base font-semibold text-primary shadow-sm transition hover:border-primary"
          >
            I already have an account
          </button>
        </div>

        <section className="mt-12" aria-labelledby="audience-features-heading">
          <h2 id="audience-features-heading" className="text-2xl font-bold text-primary">
            How Tutorix helps
          </h2>
          <ul className="mt-6 space-y-4">
            {copy.features.map((feature) => (
              <li
                key={feature.title}
                className={`rounded-2xl border p-5 shadow-sm md:p-6 ${styles.panel}`}
              >
                <h3 className="text-lg font-semibold text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" aria-labelledby="audience-steps-heading">
          <h2 id="audience-steps-heading" className="text-2xl font-bold text-primary">
            How it works
          </h2>
          <ol className="mt-6 space-y-4">
            {copy.steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-2xl border border-subtle bg-white/80 p-5 shadow-sm">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${styles.step}`}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-primary">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted md:text-base">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-12 rounded-3xl border border-subtle bg-white/80 p-6 text-center shadow-md md:p-8">
          <p className="text-xl font-bold text-primary">{copy.headline}</p>
          <p className="mt-2 text-muted">{copy.lead}</p>
          <button
            type="button"
            onClick={onSignUp}
            className={`mt-6 rounded-lg px-6 py-3 text-base font-semibold shadow-md transition ${styles.cta}`}
          >
            {copy.ctaLabel}
          </button>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
};
