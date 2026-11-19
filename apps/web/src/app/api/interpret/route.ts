import { interpretGoal } from "@forge/planner";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Receives only the goal text. Body measurements and photos never reach the
 * server; they stay in the browser.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const goalText = (body as { goalText?: unknown } | null)?.goalText;
  if (typeof goalText !== "string" || goalText.trim().length < 3) {
    return NextResponse.json({ error: "Please describe your goal." }, { status: 400 });
  }
  if (goalText.length > 2000) {
    return NextResponse.json({ error: "Goal is too long." }, { status: 413 });
  }

  const interpretation = await interpretGoal(goalText, process.env);
  return NextResponse.json({ interpretation });
}
