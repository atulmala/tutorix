import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  StatusBar,
} from 'react-native';
import { WelcomeScreen } from './WelcomeScreen';
import { HeroSection } from './HeroSection';
import { LearningMaterials } from './LearningMaterials';
import {
  NxOpenSourceCard,
  VSCodeExtensionCard,
  JetBrainsExtensionCard,
  NxCloudCard,
} from './PromotionalCards';
import { NextSteps } from './NextSteps';
import { styles } from '../styles';

export const AppContent: React.FC = () => {
  const [whatsNextYCoord, setWhatsNextYCoord] = useState<number>(0);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const handleWhatsNextPress = () => {
    scrollViewRef.current?.scrollTo({
      x: 0,
      y: whatsNextYCoord,
    });
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          ref={(ref) => {
            scrollViewRef.current = ref;
          }}
          contentInsetAdjustmentBehavior="automatic"
          style={styles.scrollView}
        >
          <WelcomeScreen />
          <HeroSection onWhatsNextPress={handleWhatsNextPress} />
          <LearningMaterials />
          <NxOpenSourceCard />
          <VSCodeExtensionCard />
          <JetBrainsExtensionCard />
          <NxCloudCard />
          <NextSteps
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setWhatsNextYCoord(layout.y);
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};
