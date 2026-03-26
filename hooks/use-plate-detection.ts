"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { validatePlate, type PlateValidation } from "@/lib/validators/plate.validator"

export interface PlateDetectionResult {
  success: boolean
  plate?: string
  validation?: PlateValidation
  error?: string
  remaining?: number
}

export interface PlateDetectionStats {
  used: number
  limit: number
  remaining: number
  resetAt: string
}

/**
 * Hook para detección/validación de placa patente chilena
 * - Límite: 10 detecciones por día (plan free)
 * - Validación de formato chileno
 * - Normalización automática
 * - Tracking de uso en Supabase
 */
export function usePlateDetection() {
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<PlateDetectionStats | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const DAILY_LIMIT = 10

  /**
   * Obtiene estadísticas de uso del día actual
   */
  const getStats = useCallback(async (): Promise<PlateDetectionStats | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const today = new Date().toISOString().split('T')[0]

      const { count, error } = await supabase
        .from('plate_detection_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today)

      if (error) {
        console.error('Error fetching stats:', error)
        return null
      }

      const used = count || 0
      const remaining = Math.max(0, DAILY_LIMIT - used)
      const resetAt = new Date()
      resetAt.setHours(24, 0, 0, 0)

      const statsData = {
        used,
        limit: DAILY_LIMIT,
        remaining,
        resetAt: resetAt.toISOString(),
      }

      setStats(statsData)
      return statsData
    } catch (error) {
      console.error('Error getting stats:', error)
      return null
    }
  }, [supabase])

  /**
   * Detecta/valida una placa patente desde texto
   * - Valida formato chileno
   * - Normaliza automáticamente
   * - Registra en logs para tracking diario
   */
  const detectPlate = useCallback(async (
    plateInput: string,
    productId?: string
  ): Promise<PlateDetectionResult> => {
    setDetecting(true)
    setError(null)

    try {
      // 1. Validar límite diario
      const currentStats = await getStats()
      
      if (currentStats && currentStats.remaining <= 0) {
        const errorMsg = 'Límite de 10 placas alcanzado por hoy. Intenta mañana.'
        setError(errorMsg)
        toast({
          title: 'Límite alcanzado',
          description: errorMsg,
          variant: 'destructive',
        })
        return {
          success: false,
          error: errorMsg,
          remaining: 0,
        }
      }

      // 2. Validar formato de placa
      const validation = validatePlate(plateInput)

      if (!validation.valid) {
        const errorMsg = validation.error || 'Formato de placa inválido'
        setError(errorMsg)
        toast({
          title: 'Formato inválido',
          description: errorMsg,
          variant: 'destructive',
        })
        return {
          success: false,
          validation,
          error: errorMsg,
          remaining: currentStats?.remaining,
        }
      }

      // 3. Registrar en logs para tracking
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error: logError } = await supabase
          .from('plate_detection_logs')
          .insert({
            user_id: user.id,
            product_id: productId,
            detected_plate: validation.normalized,
            original_input: plateInput,
            confidence: 100, // 100% porque es ingreso manual validado
            status: 'success',
            api_response: { format: validation.format },
          })

        if (logError) {
          console.error('Error logging detection:', logError)
        }
      }

      // 4. Actualizar stats
      const updatedStats = await getStats()

      toast({
        title: 'Placa validada',
        description: `Formato ${validation.format} reconocido correctamente`,
      })

      setDetecting(false)

      return {
        success: true,
        plate: validation.normalized,
        validation,
        remaining: updatedStats?.remaining,
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al detectar la placa'
      setError(errorMessage)
      setDetecting(false)

      toast({
        title: 'Error en detección',
        description: errorMessage,
        variant: 'destructive',
      })

      return {
        success: false,
        error: errorMessage,
        remaining: stats?.remaining,
      }
    }
  }, [getStats, supabase, toast, stats])

  /**
   * Verifica si puede detectar más placas hoy
   */
  const canDetectMore = useCallback(() => {
    if (!stats) return true
    return stats.remaining > 0
  }, [stats])

  /**
   * Formatea placa para mostrar
   */
  const formatPlate = useCallback((plate: string): string => {
    const validation = validatePlate(plate)
    return validation.valid ? validation.normalized : plate
  }, [])

  return {
    detectPlate,
    formatPlate,
    getStats,
    canDetectMore,
    detecting,
    error,
    stats,
    dailyLimit: DAILY_LIMIT,
  }
}
