const path = require('path');
const { config } = require('dotenv');
const { applyDevLanHost, applyGraphqlEndpointAlias } = require('./detect-lan-host.cjs');

config({ path: path.resolve(__dirname, '../../.env') });
applyDevLanHost();
applyGraphqlEndpointAlias();

module.exports = function (api) {
  api.cache.using(
    () =>
      `${process.env.DEV_LAN_HOST || ''}|${process.env.NX_GRAPHQL_ENDPOINT || ''}|${process.env.VITE_GRAPHQL_ENDPOINT || ''}`,
  );

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
              varName === 'VITE_GRAPHQL_ENDPOINT' ||
              varName === 'DEV_LAN_HOST' ||
              varName === 'GOOGLE_MAPS_API_KEY' ||
              varName === 'VITE_GOOGLE_MAPS_API_KEY'
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
