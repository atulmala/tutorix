import React from 'react';
import type { WebUser } from '../../types/web-user';
import { HomeFooter } from './HomeFooter';
import { HomeHeader } from './HomeHeader';
import type { AudienceDetailCopy, AudienceFeature } from './audience-detail-copy';

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
    link: 'text-[#1d4ed8] hover:text-[#1e40af]',
    readyPrompt: 'Ready to find a tutor beyond your neighbourhood?',
  },
  tutor: {
    chip: 'text-[#0f766e]',
    step: 'bg-[#1FBBA6] text-white',
    cta: 'bg-[#1FBBA6] text-white hover:bg-[#17a394]',
    panel: 'border-[#1FBBA6]/40 bg-[#e6f7f4]/80',
    link: 'text-[#0f766e] hover:text-[#0f5f58]',
    readyPrompt: 'Ready to teach more and earn more?',
  },
} as const;

const orbitArt = {
  student: {
    src: '/home/10-student-benefits-visible-mobile-screen-transparent.png',
    alt: 'A student using the Tutorix app to browse certified tutors and class options',
    nudgeTitle: 'Study online or offline',
  },
  tutor: {
    src: '/home/16-tutor-fully-focused-online-student-transparent.png',
    alt: 'A tutor teaching an online student while managing bookings, payments, and schedule',
    nudgeTitle: null,
  },
} as const;

const FEATURE_ORBIT_ANGLES_DEG = [-90, -18, 54, 126, 198];

function FeatureOrbit({
  features,
  panelClassName,
  imageSrc,
  imageAlt,
  nudgeTitle,
}: {
  features: AudienceFeature[];
  panelClassName: string;
  imageSrc: string;
  imageAlt: string;
  nudgeTitle: string | null;
}) {
  return (
    <div className="relative mx-auto mt-3 w-full max-w-6xl lg:aspect-[6/5]">
      <img
        src={imageSrc}
        alt={imageAlt}
        className="mx-auto h-auto w-full max-h-64 object-contain sm:max-h-72 lg:absolute lg:left-1/2 lg:top-1/2 lg:max-h-[22rem] lg:w-[34%] lg:max-w-sm lg:-translate-x-1/2 lg:-translate-y-1/2"
      />
      <ul className="mt-4 grid grid-cols-1 justify-items-center gap-4 sm:grid-cols-2 lg:contents">
        {features.map((feature, index) => {
          const angle =
            ((FEATURE_ORBIT_ANGLES_DEG[index] ?? -90) * Math.PI) / 180;
          const left = 50 + Math.cos(angle) * 36;
          const top = 50 + Math.sin(angle) * 36;
          const nudged = nudgeTitle !== null && feature.title === nudgeTitle;
          return (
            <li
              key={feature.title}
              className={`lg:absolute lg:left-[var(--orbit-left)] lg:top-[var(--orbit-top)] ${
                nudged
                  ? 'lg:translate-x-[calc(-50%+1cm)] lg:translate-y-[calc(-50%+1cm)]'
                  : 'lg:-translate-x-1/2 lg:-translate-y-1/2'
              }`}
              style={
                {
                  '--orbit-left': `${left}%`,
                  '--orbit-top': `${top}%`,
                } as React.CSSProperties
              }
            >
              <OrbitFeatureCard feature={feature} panelClassName={panelClassName} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OrbitFeatureCard({
  feature,
  panelClassName,
}: {
  feature: AudienceFeature;
  panelClassName: string;
}) {
  return (
    <div
      className={`flex h-72 w-72 flex-col items-center justify-center rounded-full border px-8 text-center shadow-sm md:h-80 md:w-80 md:px-9 ${panelClassName}`}
    >
      <h3 className="text-base font-semibold leading-snug text-primary md:text-lg">
        {feature.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
    </div>
  );
}

export const AudienceDetailPage: React.FC<AudienceDetailPageProps> = ({
  copy,
  currentUser,
  onHome,
  onLogin,
  onSignUp,
  onLogout,
}) => {
  const styles = variantStyles[copy.variant];
  const art = orbitArt[copy.variant];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-[#E9F5FE] to-[#e8f1ff] text-primary">
      <HomeHeader
        currentUser={currentUser}
        onHome={onHome}
        onLogin={onLogin}
        onSignUp={onSignUp}
        onLogout={onLogout}
      />

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-6 py-5 md:px-12 md:py-7">
        <button
          type="button"
          onClick={onHome}
          className="text-sm font-semibold text-[#1d4ed8] hover:underline"
        >
          ← Back to home
        </button>

        <p className={`mt-4 text-sm font-semibold uppercase tracking-[0.12em] ${styles.chip}`}>
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight text-primary md:text-4xl">
          {copy.headline}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-muted md:text-base">{copy.lead}</p>

        <section className="mt-6" aria-labelledby="audience-features-heading">
          <h2
            id="audience-features-heading"
            className="text-lg font-bold text-primary md:text-xl"
          >
            How Tutorix helps
          </h2>
          <FeatureOrbit
            features={copy.features}
            panelClassName={styles.panel}
            imageSrc={art.src}
            imageAlt={art.alt}
            nudgeTitle={art.nudgeTitle}
          />
        </section>

        <section className="mt-6" aria-labelledby="audience-steps-heading">
          <h2
            id="audience-steps-heading"
            className="text-lg font-bold text-primary md:text-xl"
          >
            How it works?
          </h2>
          <ol className="mt-3 grid gap-3 md:grid-cols-3">
            {copy.steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-2xl border border-subtle bg-white/80 p-4 shadow-sm"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${styles.step}`}
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-primary">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-subtle bg-white/80 px-5 py-4 shadow-sm">
          <p className="text-sm font-semibold text-primary md:text-base">{styles.readyPrompt}</p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onSignUp}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold shadow-md transition md:text-base ${styles.cta}`}
            >
              {copy.ctaLabel}
            </button>
            <p className="text-sm text-muted md:text-base">
              Already registered?{' '}
              <a
                href="#login"
                className={`font-semibold underline ${styles.link}`}
                onClick={(event) => {
                  event.preventDefault();
                  onLogin();
                }}
              >
                Login
              </a>
            </p>
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
};
