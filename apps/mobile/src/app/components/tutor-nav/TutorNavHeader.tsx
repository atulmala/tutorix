import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  initialsFromProfileName,
  profilePictureAvatarUrl,
} from '@tutorix/shared-utils';
import { NavHeader } from '../NavHeader';
import { WalletBalanceChip } from '../wallet';

type TutorNavHeaderProps = {
  title: string;
  onLogout: () => void;
  onOpenWallet: () => void;
  onBack?: () => void;
  onProfilePress?: () => void;
};

export const TutorNavHeader: React.FC<TutorNavHeaderProps> = ({
  title,
  onLogout,
  onOpenWallet,
  onBack,
  onProfilePress,
}) => {
  const { data } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const user = data?.myTutorProfile?.user;

  return (
    <NavHeader
      title={title}
      onBack={onBack}
      onLogout={onLogout}
      avatarUrl={profilePictureAvatarUrl(user)}
      userInitials={initialsFromProfileName(user?.firstName, user?.lastName)}
      onProfilePress={onProfilePress}
      rightBeforeLogout={<WalletBalanceChip onOpenWallet={onOpenWallet} />}
    />
  );
};
