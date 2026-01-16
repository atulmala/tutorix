import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { styles } from '../styles';

type LearningItem = {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
};

const learningItems: LearningItem[] = [
  {
    title: 'Documentation',
    description: 'Everything is in there',
    url: 'https://nx.dev/getting-started/intro?utm_source=nx-project',
    icon: (
      <Svg width={24} height={24} stroke="#000000" fill="none" viewBox="0 0 24 24">
        <Path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </Svg>
    ),
  },
  {
    title: 'Blog',
    description: 'Changelog, features & events',
    url: 'https://nx.dev/blog/?utm_source=nx-project',
    icon: (
      <Svg width={24} height={24} stroke="#000000" fill="none" viewBox="0 0 24 24">
        <Path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
        />
      </Svg>
    ),
  },
  {
    title: 'Youtube channel',
    description: 'Nx Show, talks & tutorials',
    url: 'https://www.youtube.com/@NxDevtools/videos?utm_source=nx-project',
    icon: (
      <Svg width={24} height={24} fill="#000000" viewBox="0 0 24 24">
        <Path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </Svg>
    ),
  },
  {
    title: 'Interactive tutorials',
    description: 'Create an app, step by step',
    url: 'https://nx.dev/recipes/react/react-native#react-native-with-nx',
    icon: (
      <Svg width={24} height={24} stroke="#000000" fill="none" viewBox="0 0 24 24">
        <Path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
        />
      </Svg>
    ),
  },
];

const ArrowIcon = () => (
  <Svg width={18} height={18} stroke="#000000" fill="none" viewBox="0 0 24 24">
    <Path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 5l7 7-7 7"
    />
  </Svg>
);

export const LearningMaterials: React.FC = () => {
  return (
    <View style={styles.section}>
      <View style={[styles.shadowBox]}>
        <Text style={[styles.marginBottomMd, styles.textLg]}>
          Learning materials
        </Text>
        {learningItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.listItem, styles.learning]}
            onPress={() => Linking.openURL(item.url)}
          >
            {item.icon}
            <View style={styles.listItemTextContainer}>
              <Text style={[styles.textMd]}>{item.title}</Text>
              <Text style={[styles.text2XS, styles.textSubtle]}>
                {item.description}
              </Text>
            </View>
            <ArrowIcon />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
