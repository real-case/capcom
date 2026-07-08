/**
 * Public API of the `events-explorer` widget (ADR 0065/0066/0097). Consumers (the
 * `/events` route) import `@/widgets/events-explorer`, never a deep segment path.
 */
export { EventsExplorer } from "./ui/EventsExplorer";
