/**
 * Public API of the `auth-by-email` feature (ADR 0065/0066). The Server Actions
 * and schemas stay internal — consumers compose the UI, not the wiring.
 */
export { SignInForm } from "./ui/SignInForm";
export { SignUpForm } from "./ui/SignUpForm";
export { SignOutButton } from "./ui/SignOutButton";
