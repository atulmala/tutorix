import React from 'react';
import { NavHeader } from '../NavHeader';

type TutorNavHeaderProps = {
  title: string;
  onLogout: () => void;
  onBack?: () => void;
};

export const TutorNavHeader: React.FC<TutorNavHeaderProps> = ({
  title,
  onLogout,
  onBack,
}) => {
  return (
    <NavHeader
      title={title}
      onBack={onBack}
      onLogout={onLogout}
    />
  );
};
