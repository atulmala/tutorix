import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { styles } from '../styles';

const TerminalIcon = () => (
  <Svg width={24} height={24} stroke="#000000" fill="none" viewBox="0 0 24 24">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </Svg>
);

type NextStepItem = {
  title: string;
  commands: string[];
};

const nextStepItems: NextStepItem[] = [
  {
    title: 'Build, test and lint your app',
    commands: [
      '# Build',
      'nx build Mobile',
      '# Test',
      'nx test Mobile',
      '# Lint',
      'nx lint Mobile',
      '# Run them together!',
      'nx run-many -p Mobile -t build test lint',
    ],
  },
  {
    title: 'View project details',
    commands: ['nx show project Mobile'],
  },
  {
    title: 'View interactive project graph',
    commands: ['nx graph'],
  },
  {
    title: 'Add UI library',
    commands: [
      '# Generate UI lib',
      'nx g @nx/react-native:lib ui',
      '# Add a component',
      'nx g \\',
      '@nx/react-native:component \\',
      'ui/src/lib/button',
    ],
  },
];

import { LayoutChangeEvent } from 'react-native';

export const NextSteps: React.FC<{
  onLayout: (event: LayoutChangeEvent) => void;
}> = ({ onLayout }) => {
  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.shadowBox}>
        <Text style={[styles.textLg, styles.marginBottomMd]}>Next steps</Text>
        <Text
          style={[styles.textSm, styles.textLight, styles.marginBottomMd]}
        >
          Here are some things you can do with Nx:
        </Text>
        {nextStepItems.map((item, index) => (
          <React.Fragment key={index}>
            <View style={styles.listItem}>
              <TerminalIcon />
              <View style={styles.listItemTextContainer}>
                <Text style={styles.textSm}>{item.title}</Text>
              </View>
            </View>
            <View
              style={[
                styles.codeBlock,
                index < nextStepItems.length - 1
                  ? styles.marginBottomLg
                  : undefined,
              ]}
            >
              {item.commands.map((command, cmdIndex) => (
                <Text
                  key={cmdIndex}
                  style={[
                    styles.textXS,
                    styles.monospace,
                    command.startsWith('#')
                      ? styles.comment
                      : undefined,
                    cmdIndex < item.commands.length - 1
                      ? styles.marginBottomMd
                      : undefined,
                  ]}
                >
                  {command}
                </Text>
              ))}
            </View>
          </React.Fragment>
        ))}
      </View>
      <View style={[styles.listItem, styles.love]}>
        <Text style={styles.textSubtle}>Carefully crafted with </Text>
        <Svg
          width={24}
          height={24}
          fill="rgba(252, 165, 165, 1)"
          stroke="none"
          viewBox="0 0 24 24"
        >
          <Path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </Svg>
      </View>
    </View>
  );
};
