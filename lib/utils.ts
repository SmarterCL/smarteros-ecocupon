import { type ClassValue, clsx } from "clsx"

/**
 * Combina clases CSS de forma condicional
 * Reemplazo para tailwind-merge - solo usa clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function formatPrice(price: number): string {
  return price.toLocaleString("es-CL")
}

export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + "..."
}

export function validatePhoneNumber(phone: string): boolean {
  // Formato Chile: +56 9 XXXX XXXX
  const regex = /^\+56\s?9\s?\d{4}\s?\d{4}$/
  return regex.test(phone)
}

