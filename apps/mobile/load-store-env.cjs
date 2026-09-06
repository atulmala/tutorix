const path = require('path');
const { config } = require('dotenv');

function isStoreBuild(env = process.env) {
  return env.TUTORIX_STORE_BUILD === '1' || env.TUTORIX_STORE_BUILD === 'true';
}

/**
 * Overlay production store URLs on top of the root `.env` so release
 * bundles cannot inherit localhost GraphQL from local development.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
function applyStoreEnv(env = process.env) {
  if (!isStoreBuild(env)) {
    return false;
  }
  config({
    path: path.resolve(__dirname, '.env.store'),
    override: true,
  });
  return true;
}

module.exports = { isStoreBuild, applyStoreEnv };
