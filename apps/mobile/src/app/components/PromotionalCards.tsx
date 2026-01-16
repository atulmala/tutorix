import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { styles } from '../styles';

export const NxOpenSourceCard: React.FC = () => {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        onPress={() =>
          Linking.openURL('https://nx.dev/nx-cloud?utm_source=nx-project')
        }
      >
        <View style={[styles.listItem, styles.shadowBox]}>
          <Svg width={48} height={48} fill="#000000" viewBox="0 0 24 24">
            <Path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </Svg>
          <View style={styles.listItemTextContainer}>
            <Text
              style={[
                styles.textMd,
                styles.textBold,
                styles.marginBottomSm,
              ]}
            >
              Nx is open source
            </Text>
            <Text style={[styles.textXS, styles.textLight]}>
              Love Nx? Give us a star!
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const VSCodeExtensionCard: React.FC = () => {
  return (
    <View style={[styles.section, styles.shadowBox]}>
      <TouchableOpacity
        onPress={() =>
          Linking.openURL(
            'https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console&utm_source=nx-project',
          )
        }
      >
        <View style={[styles.listItem, styles.learning]}>
          <Svg
            width={48}
            height={48}
            fill="rgba(0, 122, 204, 1)"
            viewBox="0 0 24 24"
          >
            <Path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
          </Svg>
          <View style={styles.listItemTextContainer}>
            <Text
              style={[
                styles.textMd,
                styles.textBold,
                styles.marginBottomSm,
              ]}
            >
              Install Nx Console for VSCode
            </Text>
            <Text style={[styles.textXS, styles.textLight]}>
              The official VSCode extension for Nx.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const JetBrainsExtensionCard: React.FC = () => {
  return (
    <View style={[styles.section, styles.shadowBox]}>
      <TouchableOpacity
        onPress={() =>
          Linking.openURL(
            'https://plugins.jetbrains.com/plugin/21060-nx-console',
          )
        }
      >
        <View style={[styles.listItem, styles.learning]}>
          <Svg width={48} height={48} viewBox="20 20 60 60">
            <Path d="m22.5 22.5h60v60h-60z" />
            <G fill="#fff">
              <Path d="m29.03 71.25h22.5v3.75h-22.5z" />
              <Path d="m28.09 38 1.67-1.58a1.88 1.88 0 0 0 1.47.87c.64 0 1.06-.44 1.06-1.31v-5.98h2.58v6a3.48 3.48 0 0 1 -.87 2.6 3.56 3.56 0 0 1 -2.57.95 3.84 3.84 0 0 1 -3.34-1.55z" />
              <Path d="m36 30h7.53v2.19h-5v1.44h4.49v2h-4.42v1.49h5v2.21h-7.6z" />
              <Path d="m47.23 32.29h-2.8v-2.29h8.21v2.27h-2.81v7.1h-2.6z" />
              <Path d="m29.13 43.08h4.42a3.53 3.53 0 0 1 2.55.83 2.09 2.09 0 0 1 .6 1.53 2.16 2.16 0 0 1 -1.44 2.09 2.27 2.27 0 0 1 1.86 2.29c0 1.61-1.31 2.59-3.55 2.59h-4.44zm5 2.89c0-.52-.42-.8-1.18-.8h-1.29v1.64h1.24c.79 0 1.25-.26 1.25-.81zm-.9 2.66h-1.57v1.73h1.62c.8 0 1.24-.31 1.24-.86 0-.5-.4-.87-1.27-.87z" />
              <Path d="m38 43.08h4.1a4.19 4.19 0 0 1 3 1 2.93 2.93 0 0 1 .9 2.19 3 3 0 0 1 -1.93 2.89l2.24 3.27h-3l-1.88-2.84h-.87v2.84h-2.56zm4 4.5c.87 0 1.39-.43 1.39-1.11 0-.75-.54-1.12-1.4-1.12h-1.44v2.26z" />
              <Path d="m49.59 43h2.5l4 9.44h-2.79l-.67-1.69h-3.63l-.67 1.69h-2.71zm2.27 5.73-1-2.65-1.06 2.65z" />
              <Path d="m56.46 43.05h2.6v9.37h-2.6z" />
              <Path d="m60.06 43.05h2.42l3.37 5v-5h2.57v9.37h-2.26l-3.53-5.14v5.14h-2.57z" />
              <Path d="m68.86 51 1.45-1.73a4.84 4.84 0 0 0 3 1.13c.71 0 1.08-.24 1.08-.65 0-.4-.31-.6-1.59-.91-2-.46-3.53-1-3.53-2.93 0-1.74 1.37-3 3.62-3a5.89 5.89 0 0 1 3.86 1.25l-1.26 1.84a4.63 4.63 0 0 0 -2.62-.92c-.63 0-.94.25-.94.6 0 .42.32.61 1.63.91 2.14.46 3.44 1.16 3.44 2.91 0 1.91-1.51 3-3.79 3a6.58 6.58 0 0 1 -4.35-1.5z" />
            </G>
          </Svg>
          <View style={styles.listItemTextContainer}>
            <Text
              style={[
                styles.textMd,
                styles.textBold,
                styles.marginBottomSm,
              ]}
            >
              Install Nx Console for JetBrains
            </Text>
            <Text style={[styles.textXS, styles.textLight]}>
              Available for WebStorm, Intellij IDEA Ultimate and more!
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const NxCloudCard: React.FC = () => {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        onPress={() =>
          Linking.openURL('https://nx.dev/nx-cloud?utm_source=nx-project')
        }
      >
        <View style={styles.shadowBox}>
          <View style={[styles.listItem, styles.learning]}>
            <Svg
              width={48}
              height={48}
              role="img"
              stroke="currentColor"
              fill="transparent"
              viewBox="0 0 24 24"
            >
              <Path
                strokeWidth="2"
                d="M23 3.75V6.5c-3.036 0-5.5 2.464-5.5 5.5s-2.464 5.5-5.5 5.5-5.5 2.464-5.5 5.5H3.75C2.232 23 1 21.768 1 20.25V3.75C1 2.232 2.232 1 3.75 1h16.5C21.768 1 23 2.232 23 3.75Z"
              />
              <Path
                strokeWidth="2"
                d="M23 6v14.1667C23 21.7307 21.7307 23 20.1667 23H6c0-3.128 2.53867-5.6667 5.6667-5.6667 3.128 0 5.6666-2.5386 5.6666-5.6666C17.3333 8.53867 19.872 6 23 6Z"
              />
            </Svg>
            <View style={styles.listItemTextContainer}>
              <Text
                style={[
                  styles.textMd,
                  styles.textBold,
                  styles.marginBottomSm,
                ]}
              >
                Nx Cloud
              </Text>
              <Text style={[styles.textSm, styles.textLight]}>
                Enable faster CI & better DX
              </Text>
            </View>
          </View>
          <View style={styles.listItemTextContainer}>
            <Text style={[styles.textXS, styles.textLight]}>
              You can activate distributed tasks executions and caching by
              running:
            </Text>
          </View>
          <View style={styles.codeBlock}>
            <Text style={[styles.monospace]}>nx connect</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};
