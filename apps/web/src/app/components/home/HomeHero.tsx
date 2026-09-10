import React from 'react';
import { BRAND_NAME } from '../../config';
import { HomeAudienceCard } from './HomeAudienceCard';

type HomeHeroProps = {
  onStudentDetails: () => void;
  onTutorDetails: () => void;
};

const studentBullets = [
  'Why restrict yourself to the tutor in your neighbourhood?',
  'Choose from a vast pool of certified tutors at affordable prices',
  'Study online or offline',
  'Learn in a batch or one-on-one',
  'Manage it in a user-friendly app: schedule and reminders for upcoming classes',
];

const tutorBullets = [
  'Assured class bookings',
  'Timely payments',
  'Track your schedule and get reminders for upcoming classes',
  'Teach offline or online with the built-in online class feature',
];

export const HomeHero: React.FC<HomeHeroProps> = ({
  onStudentDetails,
  onTutorDetails,
}) => {
  return (
    <div className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -left-16 top-4 h-56 w-56 rounded-full bg-[#5fa8ff]/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 top-20 h-64 w-64 rounded-full bg-[#1FBBA6]/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-8 left-1/3 h-40 w-40 rounded-full bg-[#fbbf24]/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#4a97f5]">
          Connect, Learn, Grow
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-primary md:text-5xl">
          Tutors beyond your neighbourhood. A teaching practice that grows.
        </h1>
        <p className="mt-4 text-base text-muted md:text-lg">
          {BRAND_NAME} matches students with certified tutors on cost, timings, and
          learning style — and helps tutors teach more students.
        </p>
      </div>

      <div className="relative mx-auto mt-8 w-full max-w-3xl md:mt-10 md:max-w-4xl">
        <img
          src="/home/01-discover-tutors-beyond-neighbourhood-transparent.png"
          alt="A student discovering certified tutors across India, beyond her neighbourhood"
          className="mx-auto h-auto w-full"
        />
      </div>

      <div className="relative mt-10 grid gap-6 md:grid-cols-2 md:items-stretch">
        <HomeAudienceCard
          variant="student"
          eyebrow="For students"
          headline="Get tutors beyond your neighbourhood"
          subhead="Suit your cost, timings, and learning style — not just whoever lives nearby."
          bullets={studentBullets}
          ctaLabel="I'm a student"
          onCta={onStudentDetails}
        />
        <HomeAudienceCard
          variant="tutor"
          eyebrow="For tutors"
          headline="Teach more. Earn more."
          subhead="Expand your teaching profession and reach more students."
          bullets={tutorBullets}
          ctaLabel="I'm a tutor"
          onCta={onTutorDetails}
        />
      </div>
    </div>
  );
};
