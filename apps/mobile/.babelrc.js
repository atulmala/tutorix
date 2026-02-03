module.exports = function (api) {
  api.cache(true);

  // Load environment variables from .env file
  const path = require('path');
  const { config } = require('dotenv');
  try {
    config({ path: path.resolve(__dirname, '../../.env') });
  } catch {
    // Silently fail if .env doesn't exist
  }

  // Simple inline plugin to replace process.env variables with actual values
  const inlineEnvPlugin = function ({ types: t }) {
    return {
      visitor: {
        MemberExpression(path) {
          // Replace process.env['VAR_NAME'] or process.env.VAR_NAME
          if (
            path.node.object &&
            path.node.object.type === 'MemberExpression' &&
            path.node.object.object &&
            path.node.object.object.type === 'Identifier' &&
            path.node.object.object.name === 'process' &&
            path.node.object.property &&
            path.node.object.property.type === 'Identifier' &&
            path.node.object.property.name === 'env' &&
            path.node.property &&
            (path.node.property.type === 'StringLiteral' ||
              path.node.property.type === 'Identifier')
          ) {
            let varName;
            if (path.node.property.type === 'StringLiteral') {
              varName = path.node.property.value;
            } else if (path.node.property.type === 'Identifier') {
              varName = path.node.property.name;
            }

            if (
              varName === 'NX_GRAPHQL_ENDPOINT' ||
              varName === 'GRAPHQL_ENDPOINT' ||
              varName === 'GOOGLE_MAPS_API_KEY'
            ) {
              const value = process.env[varName];
              if (value !== undefined) {
                path.replaceWith(t.stringLiteral(value));
              }
            }
          }
        },
      },
    };
  };

  if (
    process.env.NX_TASK_TARGET_TARGET === 'build' ||
    process.env.NX_TASK_TARGET_TARGET?.includes('storybook')
  ) {
    return {
      presets: [
        [
          '@nx/react/babel',
          {
            runtime: 'automatic',
          },
        ],
      ],
    };
  }

  return {
    presets: [
      ['module:@react-native/babel-preset', { useTransformReactJSX: true }],
    ],
    plugins: [inlineEnvPlugin],
  };
};
