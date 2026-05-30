export function mathPower(num: number): string {
  if (num < 999) {
    return String(num)
  }
  return `${mathPower(~~(num / 1000))},${`00${~~(num % 1000)}`.slice(
    -3,
    -3 + 3,
  )}`
}
