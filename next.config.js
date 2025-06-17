const { createVanillaExtractPlugin } = require('@vanilla-extract/next-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const path = require('path');

const withVanillaExtract = createVanillaExtractPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer, nextRuntime }) {
    if(!isServer) {
      const emptyFs = path.resolve(__dirname, '/src/empty-fs.js');

      // lightweight stubs for most Node built-ins
      config.plugins.push(new NodePolyfillPlugin());

      // but give Babel a real module for fs
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        fs: emptyFs,
        'node:fs': emptyFs,
        'fs/promises': emptyFs,
      };
    }

    return config;
  },
}

module.exports = withVanillaExtract(nextConfig);
