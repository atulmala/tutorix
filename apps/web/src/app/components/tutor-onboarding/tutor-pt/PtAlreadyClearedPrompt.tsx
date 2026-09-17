import React from 'react';
import { PT_ALREADY_CLEARED_MESSAGE } from '@tutorix/shared-utils';

type PtAlreadyClearedPromptProps = {
  onAcknowledge: () => void;
  acknowledging?: boolean;
  error?: string | null;
};

export const PtAlreadyClearedPrompt: React.FC<PtAlreadyClearedPromptProps> = ({
  onAcknowledge,
  acknowledging = false,
  error,
}) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-primary">{PT_ALREADY_CLEARED_MESSAGE}</p>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAcknowledge}
          disabled={acknowledging}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:opacity-50"
        >
          {acknowledging ? 'Please wait…' : 'OK'}
        </button>
      </div>
    </div>
  );
};
