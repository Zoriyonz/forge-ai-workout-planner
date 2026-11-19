import { EXERCISES, MUSCLES, type Equipment, type Exercise } from "@forge/planner";
import { UsageError, type Io } from "../io";
import { parseEquipment } from "../validate";

export interface ExerciseFlags {
  muscle?: string;
  equipment?: string;
  level?: string;
  json?: boolean;
}

export function filterExercises(flags: ExerciseFlags): Exercise[] {
  let list = EXERCISES;

  if (flags.muscle !== undefined) {
    const m = flags.muscle.toLowerCase();
    if (!(MUSCLES as readonly string[]).includes(m)) {
      throw new UsageError(
        `--muscle must be one of: ${MUSCLES.join(", ")} (got "${flags.muscle}").`,
      );
    }
    list = list.filter((x) => x.primary === m);
  }

  if (flags.equipment !== undefined) {
    const owned = new Set<Equipment>(parseEquipment(flags.equipment));
    list = list.filter((x) => x.requires.every((r) => owned.has(r)));
  }

  if (flags.level !== undefined) {
    const level = Number(flags.level);
    if (![1, 2, 3].includes(level))
      throw new UsageError(`--level must be 1, 2 or 3 (got "${flags.level}").`);
    list = list.filter((x) => x.level === level);
  }

  return list;
}

export function exercisesCommand(flags: ExerciseFlags, io: Io): void {
  const list = filterExercises(flags);

  if (flags.json) {
    io.stdout(`${JSON.stringify(list, null, 2)}\n`);
    return;
  }
  if (list.length === 0) {
    io.stdout("No exercises match those filters.\n");
    return;
  }

  const w = (s: string, n: number) => s.padEnd(n);
  const nameW = Math.max(...list.map((x) => x.name.length));
  io.stdout(`${w("EXERCISE", nameW)}  ${w("MUSCLE", 10)}${w("PATTERN", 10)}LVL  NEEDS\n`);
  for (const x of list) {
    const needs = x.requires.length ? x.requires.join(", ") : "bodyweight";
    io.stdout(
      `${w(x.name, nameW)}  ${w(x.primary, 10)}${w(x.pattern, 10)}${x.level}    ${needs}\n`,
    );
  }
  io.stdout(`\n${list.length} exercise${list.length === 1 ? "" : "s"}\n`);
}
