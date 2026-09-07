import React from 'react';
import { LegalFooter } from '../LegalFooter';

export const HomeFooter: React.FC = () => {
  return (
    <footer className="relative z-10 px-6 pb-8 pt-4">
      <p className="text-center text-xs text-muted">
        Questions?{' '}
        <a
          href="mailto:info@tutorix.tech"
          className="font-semibold text-[#1d4ed8] hover:underline"
        >
          info@tutorix.tech
        </a>
      </p>
      <LegalFooter className="mt-2" />
    </footer>
  );
};
