import React from 'react';

type LegalFooterProps = {
  className?: string;
  signupPrefix?: boolean;
};

export const LegalFooter: React.FC<LegalFooterProps> = ({
  className = '',
  signupPrefix = false,
}) => {
  return (
    <p className={`text-center text-xs text-muted ${className}`.trim()}>
      {signupPrefix ? 'By continuing you agree to our ' : null}
      <a href="/privacy" className="font-semibold text-[#1d4ed8] hover:underline">
        Privacy Policy
      </a>
      {' and '}
      <a href="/terms" className="font-semibold text-[#1d4ed8] hover:underline">
        Terms of Service
      </a>
      {signupPrefix ? '.' : null}
      <br />
      <a href="/refunds" className="font-semibold text-[#1d4ed8] hover:underline">
        Refunds &amp; Cancellations
      </a>
      {' · '}
      <a href="/contact" className="font-semibold text-[#1d4ed8] hover:underline">
        Contact Us
      </a>
    </p>
  );
};
