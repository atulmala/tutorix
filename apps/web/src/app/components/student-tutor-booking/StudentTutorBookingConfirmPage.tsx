import React from 'react';
import type { StudentBookingDraft } from '@tutorix/shared-utils';

type StudentTutorBookingConfirmPageProps = {
  draft: Required<StudentBookingDraft>;
  onBooked: () => void;
  onOpenWallet: () => void;
};

/** Legacy entry point — direct slot booking was replaced by cart checkout + schedule credit. */
export const StudentTutorBookingConfirmPage: React.FC<
  StudentTutorBookingConfirmPageProps
> = ({ onBooked }) => {
  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Use your class credits</h1>
      <p className="text-sm text-slate-600">
        Paying for a single slot here is no longer supported. Add classes from the tutor profile,
        complete checkout, then schedule each purchased class from home or your credits list.
      </p>
      <button
        type="button"
        onClick={onBooked}
        className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
      >
        Go back
      </button>
    </div>
  );
};
