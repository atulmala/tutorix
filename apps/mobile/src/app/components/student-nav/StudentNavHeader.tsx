import React from 'react';
import { NavHeader } from '../NavHeader';
import { CartChip } from '../student-cart/CartChip';

type StudentNavHeaderProps = {
  title: string;
  onLogout: () => void;
  onOpenCart?: () => void;
  onBack?: () => void;
};

export const StudentNavHeader: React.FC<StudentNavHeaderProps> = ({
  title,
  onLogout,
  onOpenCart,
  onBack,
}) => {
  return (
    <NavHeader
      title={title}
      onBack={onBack}
      onLogout={onLogout}
      rightBeforeLogout={
        onOpenCart ? <CartChip onOpenCart={onOpenCart} /> : undefined
      }
    />
  );
};
