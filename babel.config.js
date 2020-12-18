module.exports = (api) => {
  api.cache(() => process.env.NODE_ENV === "production");
  return {
    presets: ["next/babel"],
    plugins: [["styled-components", { ssr: true, displayName: false }]],
  };
};
