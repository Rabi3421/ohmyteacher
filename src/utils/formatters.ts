export function getInitials(name: string, maximum = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maximum)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

export function capitalizeWords(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(-10);
  return digits.length === 10
    ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    : value;
}
