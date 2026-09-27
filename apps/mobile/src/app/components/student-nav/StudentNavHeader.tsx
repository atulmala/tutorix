import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  initialsFromProfileName,
  profilePictureAvatarUrl,
} from '@tutorix/shared-utils';
import { NavHeader } from '../NavHeader';
import { CartChip } from '../student-cart/CartChip';
import { WalletBalanceChip } from '../wallet';

type StudentNavHeaderProps = {
  title: string;
  onLogout: () => void;
  onOpenWallet: () => void;
  onOpenCart?: () => void;
  onBack?: () => void;
  onProfilePress: () => void;
};

export const StudentNavHeader: React.FC<StudentNavHeaderProps> = ({
  title,
  onLogout,
  onOpenWallet,
  onOpenCart,
  onBack,
  onProfilePress,
}) => {
  const { data } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const user = data?.myStudentProfile?.user;

  return (
    <NavHeader
      title={title}
      onBack={onBack}
      onLogout={onLogout}
      avatarUrl={profilePictureAvatarUrl(user)}
      userInitials={initialsFromProfileName(user?.firstName, user?.lastName)}
      onProfilePress={onProfilePress}
      profileAlign="right"
      rightBeforeLogout={
        <>
          {onOpenCart ? <CartChip onOpenCart={onOpenCart} /> : null}
          <WalletBalanceChip onOpenWallet={onOpenWallet} />
        </>
      }
    />
  );
};
