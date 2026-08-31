// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build loads a wa-sqlite WASM binary — Metro needs to treat
// .wasm as a bundleable asset for the web target.
config.resolver.assetExts.push('wasm');

// Required so the browser allows SharedArrayBuffer, which wa-sqlite's worker
// uses for OPFS-backed persistence on web.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    middleware(req, res, next);
  };
};

module.exports = config;
