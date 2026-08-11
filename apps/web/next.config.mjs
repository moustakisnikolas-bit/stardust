/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @stardust/shared-types ships raw TypeScript source (no build step) -
  // webpack only applies TS-aware module resolution (the .js -> .ts
  // extension mapping used by its NodeNext-style relative imports) to
  // packages listed here; without it, resolution only worked by accident
  // for type-only imports (erased before bundling) and broke the first
  // time a page imported a real runtime value from the package.
  transpilePackages: ["@stardust/shared-types"],
};

export default nextConfig;
