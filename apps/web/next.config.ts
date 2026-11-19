import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@forge/planner"],
  reactStrictMode: true,
};

export default config;
