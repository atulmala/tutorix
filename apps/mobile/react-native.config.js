const path = require('path');

// These packages are hoisted to the workspace root. Autolinking from
// apps/mobile only sees them when their root is set here.
const workspacePackage = (name) =>
  path.resolve(__dirname, '../../node_modules', name);

module.exports = {
  dependencies: {
    '@react-native-firebase/messaging': {
      root: workspacePackage('@react-native-firebase/messaging'),
    },
    'react-native-agora': {
      root: workspacePackage('react-native-agora'),
    },
    'agora-react-native-rtm': {
      root: workspacePackage('agora-react-native-rtm'),
    },
    '@netless/react-native-whiteboard': {
      root: workspacePackage('@netless/react-native-whiteboard'),
    },
    'react-native-webview': {
      root: workspacePackage('react-native-webview'),
    },
  },
};
