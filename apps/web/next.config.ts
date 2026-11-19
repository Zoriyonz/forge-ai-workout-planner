import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@forge/planner", "@forge/export"],
  reactStrictMode: true,
};

export default config;
