import React from 'react';

export type LegalDocumentKind = 'privacy' | 'terms';

type LegalPageProps = {
  kind: LegalDocumentKind;
};

export const LegalPage: React.FC<LegalPageProps> = ({ kind }) => {
  const isPrivacy = kind === 'privacy';
  return (
    <div className="min-h-screen bg-subtle text-primary">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <a href="/" className="text-sm font-semibold text-[#1d4ed8] hover:underline">
          Tutorix
        </a>
        <article className="mt-4 rounded-2xl border border-subtle bg-white p-8 shadow-md">
          <h1 className="text-2xl font-bold text-primary">
            {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
          </h1>
          <p className="mt-1 text-sm text-muted">Last updated: 4 September 2026</p>
          {isPrivacy ? <PrivacyBody /> : <TermsBody />}
          <p className="mt-8 text-sm text-muted">
            <a href="/" className="text-[#1d4ed8] hover:underline">
              Home
            </a>
            {' · '}
            <a
              href={isPrivacy ? '/terms' : '/privacy'}
              className="text-[#1d4ed8] hover:underline"
            >
              {isPrivacy ? 'Terms of Service' : 'Privacy Policy'}
            </a>
          </p>
        </article>
      </main>
    </div>
  );
};

function PrivacyBody() {
  return (
    <div className="mt-6 space-y-4 text-sm text-primary">
      <p>
        Tutorix (“we”, “us”) operates the Tutorix website and mobile apps. This
        policy describes the personal data we collect when you create an account,
        complete onboarding, pay fees, or contact us. It is a product description
        of current practice and is not legal advice. Counsel should review this
        page before store submission.
      </p>
      <h2 className="text-base font-semibold">Data we collect</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>
          Account details: name, email, mobile number, date of birth, gender,
          password (stored hashed), and role (tutor or student).
        </li>
        <li>
          Profile and onboarding: addresses, education, parent or guardian details
          (students), qualifications, teaching experience, availability, offerings,
          and profile photographs.
        </li>
        <li>
          Identity and finance (tutors): government ID and education documents
          (for example Aadhaar, PAN, marksheets), and bank details used for
          payouts.
        </li>
        <li>
          Payments: order and wallet records. Card and UPI checkout is handled by
          Razorpay; we do not store full card numbers.
        </li>
        <li>
          Device and diagnostics: push notification tokens, crash reports, and
          analytics events via Firebase (Analytics and Crashlytics).
        </li>
      </ul>
      <h2 className="text-base font-semibold">How we use data</h2>
      <p className="text-muted">
        We use this information to run accounts, verify tutors, process
        registration and wallet payments, send transactional email and push
        notifications, improve the product, and meet legal or safety obligations.
      </p>
      <h2 className="text-base font-semibold">Who we share with</h2>
      <p className="text-muted">
        We share data with processors who help us operate the service, including
        Amazon Web Services (hosting, file storage, email), Razorpay (payments),
        and Google Firebase (analytics, crash reporting, push). We do not sell
        personal data.
      </p>
      <h2 className="text-base font-semibold">Retention and deletion</h2>
      <p className="text-muted">
        You can delete your account from the Tutorix mobile app (Account → Delete
        account) or by emailing{' '}
        <a className="text-[#1d4ed8] hover:underline" href="mailto:info@tutorix.tech">
          info@tutorix.tech
        </a>
        . After deletion we deactivate the login and anonymize contact details.
        Payment and invoice records may be retained as required by law.
      </p>
    </div>
  );
}

function TermsBody() {
  return (
    <div className="mt-6 space-y-4 text-sm text-primary">
      <p>
        These terms govern use of the Tutorix website and mobile applications. By
        creating an account you agree to them. This page describes how the
        product works today and should be reviewed by counsel before store
        submission.
      </p>
      <h2 className="text-base font-semibold">The service</h2>
      <p className="text-muted">
        Tutorix is a marketplace that helps students find tutors and helps tutors
        complete onboarding, verification, and profile setup. Teaching itself is a
        real-world or live service arranged between tutor and student.
      </p>
      <h2 className="text-base font-semibold">Accounts</h2>
      <p className="text-muted">
        You must provide accurate information and keep your login secure. Tutors
        may be asked to upload identity and qualification documents. We may
        suspend accounts that we reasonably believe are fraudulent or abusive.
      </p>
      <h2 className="text-base font-semibold">Payments</h2>
      <p className="text-muted">
        Registration fees and wallet top-ups are processed by Razorpay (UPI,
        cards, and netbanking). Wallet balances are for Tutorix platform fees and
        related tutoring services.
      </p>
      <h2 className="text-base font-semibold">Contact</h2>
      <p className="text-muted">
        <a className="text-[#1d4ed8] hover:underline" href="mailto:info@tutorix.tech">
          info@tutorix.tech
        </a>
      </p>
    </div>
  );
}
