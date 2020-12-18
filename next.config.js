const withTM = require("next-transpile-modules")(["ky"]);

function compose(...plugins) {
  return (options) => {
    return plugins.filter(Boolean).reduce((a, b) => {
      return b(a);
    }, options);
  };
}

module.exports = compose(
  withTM,
  process.env.ANALYZE === "true" && require("@next/bundle-analyzer")()
)({
  experimental: {
    workerThreads: true,
    modern: true,
    plugins: true,
    sprFlushToDisk: true,
    optimizeImages: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  devIndicators: {
    autoPrerender: false,
  },
});
