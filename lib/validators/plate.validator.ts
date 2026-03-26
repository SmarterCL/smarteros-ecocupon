/**
 * Validador de Placa Patente Chilena
 * 
 * Formatos válidos:
 * - ABCD-12 (patente antigua, 4 letras + 2 números)
 * - AA-12-34 (patente nueva, 2 letras + 2 números + 2 números)
 * - ABC-12 (variante, 3 letras + 2 números)
 */

export interface PlateValidation {
  valid: boolean
  format: 'old' | 'new' | 'unknown'
  normalized: string
  error?: string
}

/**
 * Valida y normaliza una placa patente chilena
 */
export function validatePlate(plate: string): PlateValidation {
  if (!plate || typeof plate !== 'string') {
    return {
      valid: false,
      format: 'unknown',
      normalized: '',
      error: 'La placa patente es requerida',
    }
  }

  // Normalizar: uppercase, sin espacios
  const normalized = plate.trim().toUpperCase().replace(/\s/g, '')

  // Validar formato antiguo: ABCD-12 o ABC-12
  const oldFormatRegex = /^[A-Z]{3,4}-\d{2}$/
  
  // Validar formato nuevo: AA-12-34
  const newFormatRegex = /^[A-Z]{2}-\d{2}-\d{2}$/

  if (oldFormatRegex.test(normalized)) {
    return {
      valid: true,
      format: 'old',
      normalized,
    }
  }

  if (newFormatRegex.test(normalized)) {
    return {
      valid: true,
      format: 'new',
      normalized,
    }
  }

  // Intentar normalizar si no tiene guiones
  if (!normalized.includes('-')) {
    // Intentar formato antiguo sin guión: ABCD12 -> ABCD-12
    const oldMatch = normalized.match(/^([A-Z]{3,4})(\d{2})$/)
    if (oldMatch) {
      return {
        valid: true,
        format: 'old',
        normalized: `${oldMatch[1]}-${oldMatch[2]}`,
      }
    }

    // Intentar formato nuevo sin guión: AA1234 -> AA-12-34
    const newMatch = normalized.match(/^([A-Z]{2})(\d{2})(\d{2})$/)
    if (newMatch) {
      return {
        valid: true,
        format: 'new',
        normalized: `${newMatch[1]}-${newMatch[2]}-${newMatch[3]}`,
      }
    }
  }

  return {
    valid: false,
    format: 'unknown',
    normalized: '',
    error: 'Formato de placa inválido. Usa: ABCD-12 o AA-12-34',
  }
}

/**
 * Formatea una placa patente para mostrar
 */
export function formatPlate(plate: string): string {
  const validation = validatePlate(plate)
  return validation.valid ? validation.normalized : plate
}
