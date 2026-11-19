import type { Metadata } from "next";
import { BuildClient } from "@/components/BuildClient";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = { title: "My plan · Forge" };

export default function BuildPage() {
  return (
    <>
      <Nav active="build" />
      <BuildClient />
    </>
  );
}
