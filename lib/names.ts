// Fictional names for status history
export const FICTIONAL_NAMES = [
  "Ahmed Hassan",
  "Sarah Johnson",
  "Mohammed Ali",
  "Emily Chen",
  "Fatima Ahmed",
  "David Smith",
  "Aisha Khan",
  "John Williams",
  "Omar Abdullah",
  "Lisa Martinez",
  "Khalid Rahman",
  "Jennifer Lee",
  "Hassan Ibrahim",
  "Maria Garcia",
  "Abdullah Malik",
  "Sophie Anderson",
]

// Get a random fictional name
export function getRandomName(): string {
  return FICTIONAL_NAMES[Math.floor(Math.random() * FICTIONAL_NAMES.length)]
}

// Get a consistent name based on a seed (for consistent display)
export function getNameBySeed(seed: number): string {
  return FICTIONAL_NAMES[seed % FICTIONAL_NAMES.length]
}
