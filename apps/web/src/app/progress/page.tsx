import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { ProgressClient } from "@/components/ProgressClient";

export const metadata: Metadata = { title: "Progress · Forge" };

export default function ProgressPage() {
  return (
    <>
      <Nav active="progress" />
      <ProgressClient />
    </>
  );
}
