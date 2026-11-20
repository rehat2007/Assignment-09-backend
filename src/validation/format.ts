import type { ZodError } from "zod";

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export function formatZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    code: issue.code,
    message: issue.message,
  }));
}
