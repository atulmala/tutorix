import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { styles } from '../styles';

type HeroSectionProps = {
  onWhatsNextPress: () => void;
};

export const HeroSection: React.FC<HeroSectionProps> = ({ onWhatsNextPress }) => {
  return (
    <View style={styles.section}>
      <View style={styles.hero}>
        <View style={styles.heroTitle}>
          <Svg
            width={32}
            height={32}
            stroke="hsla(162, 47%, 50%, 1)"
            fill="none"
            viewBox="0 0 24 24"
          >
            <Path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </Svg>
          <Text style={[styles.textLg, styles.heroTitleText]}>
            You're up and running
          </Text>
        </View>
        <TouchableOpacity
          style={styles.whatsNextButton}
          onPress={onWhatsNextPress}
        >
          <Text style={[styles.textMd, styles.textCenter]}>
            What's next?
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
