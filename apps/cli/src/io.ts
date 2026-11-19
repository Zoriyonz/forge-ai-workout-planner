/** Everything the CLI touches in the outside world, injected so tests stay hermetic. */
export interface Io {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  writeFile: (path: string, data: string) => void;
  env: Record<string, string | undefined>;
  now: () => Date;
  fetch: typeof fetch;
}

/** Thrown for bad flags or values; the CLI prints the message and exits with code 2. */
export class UsageError extends Error {}
