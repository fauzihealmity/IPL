/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  outputFileTracingRoot: __dirname,

  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  serverExternalPackages: ["pdfkit"],
};

module.exports = nextConfig;