type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

function write(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = {
    time: new Date().toISOString(),
    level,
    event,
    ...fields,
  };

  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

export const logger = {
  info(event: string, fields?: LogFields) {
    write("info", event, fields);
  },
  warn(event: string, fields?: LogFields) {
    write("warn", event, fields);
  },
  error(event: string, fields?: LogFields) {
    write("error", event, fields);
  },
};
