export const SECTION_TITLES = {
  overview: "Overview",
  requests: "Requests",
  clients: "Clients",
  lessons: "Lessons",
  payments: "Payments",
  notes: "Notes",
} as const;

export type Section = keyof typeof SECTION_TITLES;

export const isSection = (value: string): value is Section => Object.hasOwn(SECTION_TITLES, value);
