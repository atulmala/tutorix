const path = require('path');

// Messaging is hoisted to the workspace root; Android autolink only scanned
// apps/mobile/node_modules, so RNFBMessaging never made it into the APK.
module.exports = {
  dependencies: {
    '@react-native-firebase/messaging': {
      root: path.resolve(
        __dirname,
        '../../node_modules/@react-native-firebase/messaging',
      ),
    },
  },
};
