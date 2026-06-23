import { z } from "zod";

/**
 * The single validation authority for the email/password auth forms (ADR 0017).
 * The SAME schema validates on the client (via `zodResolver`) and re-validates on
 * the server inside the Server Action (ADR 0020) — types are inferred with
 * `z.infer`, never hand-written. Messages carry the `[form:*]` origin marker so a
 * validation failure names its boundary; the UI renders translated copy keyed off
 * the field instead of showing these raw strings (ADR 0030).
 */

export const signInSchema = z.object({
  email: z.email({ error: "[form:sign-in] Enter a valid email address" }),
  password: z.string().min(1, { error: "[form:sign-in] Password is required" }),
});

export type SignInValues = z.infer<typeof signInSchema>;

// Sign-up enforces the local stack's minimum password length (config.toml
// auth.minimum_password_length); Supabase re-checks it server-side regardless.
export const signUpSchema = z.object({
  email: z.email({ error: "[form:sign-up] Enter a valid email address" }),
  password: z
    .string()
    .min(8, { error: "[form:sign-up] Password must be at least 8 characters" }),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
