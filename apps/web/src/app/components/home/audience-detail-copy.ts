export type AudienceVariant = 'student' | 'tutor';

export type AudienceFeature = {
  title: string;
  body: string;
};

export type AudienceDetailCopy = {
  variant: AudienceVariant;
  eyebrow: string;
  headline: string;
  lead: string;
  features: AudienceFeature[];
  steps: AudienceFeature[];
  ctaLabel: string;
};

export const studentDetailCopy: AudienceDetailCopy = {
  variant: 'student',
  eyebrow: 'For students',
  headline: 'Get tutors beyond your neighbourhood',
  lead:
    'Tutorix matches you with certified tutors on cost, timings, and learning style — not just whoever happens to live nearby.',
  features: [
    {
      title: 'Why stay limited to your neighbourhood?',
      body:
        'The best tutor for you may not be the one around the corner. Choose from a wide pool of certified tutors so you can match on subject, budget, schedule, and the way you like to learn.',
    },
    {
      title: 'Certified tutors at affordable prices',
      body:
        'Every tutor completes Tutorix certification before they teach. You see rates up front and pick a tutor whose fees fit your budget — without giving up quality.',
    },
    {
      title: 'Study online or offline',
      body:
        'Learn face to face when that works, or join a live class from home. You choose the format that fits each subject and each week.',
    },
    {
      title: 'Learn in a batch or one-on-one',
      body:
        'Some students thrive in a small group. Others need undivided attention. Pick batch classes or one-on-one sessions based on how you learn best.',
    },
    {
      title: 'Your schedule, in one app',
      body:
        'Upcoming classes, reminders, and your timetable live in a user-friendly app so you spend less time coordinating and more time learning.',
    },
  ],
  steps: [
    {
      title: 'Create your student account',
      body: 'Sign up with your basic details and verify your phone and email.',
    },
    {
      title: 'Tell us what you need',
      body: 'Share subjects, budget, timings, and whether you prefer online, offline, batch, or one-on-one.',
    },
    {
      title: 'Choose a tutor and start',
      body: 'Browse certified tutors, book classes, and manage everything from the app.',
    },
  ],
  ctaLabel: 'Create a student account',
};

export const tutorDetailCopy: AudienceDetailCopy = {
  variant: 'tutor',
  eyebrow: 'For tutors',
  headline: 'Teach more. Earn more.',
  lead:
    'Expand your teaching profession beyond the students you already know. Tutorix helps you reach more learners and run classes as a practice, not a side hustle.',
  features: [
    {
      title: 'Reach more students',
      body:
        'Students look for tutors who fit their cost, timings, and learning style — not only someone in their neighbourhood. A complete Tutorix profile puts your teaching in front of that wider pool.',
    },
    {
      title: 'Assured class bookings',
      body:
        'Students book against the availability you publish. You spend less time chasing confirmations and more time teaching.',
    },
    {
      title: 'Timely payments',
      body:
        'Fees for the classes you teach are tracked on the platform so you can see what is due and get paid on time.',
    },
    {
      title: 'Your teaching schedule, with reminders',
      body:
        'Keep upcoming classes in one calendar. Get reminders before each session so nothing slips — whether you teach one student or a full week of batches.',
    },
    {
      title: 'Teach offline or online',
      body:
        'Continue face-to-face classes, or teach live online with the built-in classroom in the Tutorix app. Offer both if you want to fill more slots.',
    },
  ],
  steps: [
    {
      title: 'Create your tutor account',
      body: 'Sign up and complete Tutorix certification so students can trust your profile.',
    },
    {
      title: 'Set your rates and availability',
      body: 'Publish online and offline offerings, batch size, and the hours you can teach.',
    },
    {
      title: 'Take bookings and get paid',
      body: 'Students book your slots. You teach, track the schedule, and receive timely payments.',
    },
  ],
  ctaLabel: 'Create a tutor account',
};
