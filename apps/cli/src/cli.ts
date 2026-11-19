import { parseArgs } from "node:util";
import { exercisesCommand } from "./commands/exercises";
import { planCommand } from "./commands/plan";
import { HELP, VERSION } from "./help";
import { UsageError, type Io } from "./io";

const STRING = { type: "string" } as const;

const OPTIONS = {
  goal: STRING,
  height: STRING,
  weight: STRING,
  age: STRING,
  days: STRING,
  minutes: STRING,
  experience: STRING,
  equipment: STRING,
  limits: STRING,
  waist: STRING,
  hips: STRING,
  format: STRING,
  out: STRING,
  start: STRING,
  weeks: STRING,
  hour: STRING,
  muscle: STRING,
  level: STRING,
  ai: { type: "boolean" },
  json: { type: "boolean" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
} as const;

/** Runs the CLI and returns the process exit code: 0 ok, 1 failure, 2 bad usage. */
export async function run(argv: string[], io: Io): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    });

    if (values.version) {
      io.stdout(`${VERSION}\n`);
      return 0;
    }

    const [command, ...rest] = positionals;
    if (values.help || command === undefined || command === "help") {
      io.stdout(HELP);
      return command === undefined && !values.help ? 2 : 0;
    }
    if (rest.length > 0) throw new UsageError(`Unexpected argument: ${rest[0]}`);

    switch (command) {
      case "plan":
        await planCommand(values, io);
        return 0;
      case "exercises":
        exercisesCommand(values, io);
        return 0;
      default:
        throw new UsageError(`Unknown command "${command}". Run "forge --help".`);
    }
  } catch (err) {
    if (err instanceof UsageError) {
      io.stderr(`forge: ${err.message}\n`);
      return 2;
    }
    // parseArgs reports unknown flags as TypeErrors with a code.
    if (
      err instanceof TypeError &&
      "code" in err &&
      String(err.code).startsWith("ERR_PARSE_ARGS")
    ) {
      io.stderr(`forge: ${err.message}\n`);
      return 2;
    }
    io.stderr(`forge: ${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}
