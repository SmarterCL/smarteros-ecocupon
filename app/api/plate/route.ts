import { NextRequest, NextResponse } from "next/server"
import { validatePlate } from "@/lib/validators/plate.validator"
import { createClient } from "@/lib/supabase/server"

export interface PlateInfo {
  plate: string
  patente: string
  digito_verificador?: string
  marca?: string
  modelo?: string
  ano_fabricacion?: string
  tipo_vehiculo?: string
  color?: string
  motor_numero?: string
  vin?: string
  propietario?: {
    nombre?: string
    rut?: string
  }
  tasacion_fiscal?: number
  region_procedencia?: string
}

export interface PlateValidationResponse {
  success: boolean
  valid: boolean
  format?: string
  normalized?: string
  error?: string
  remaining?: number
  message: string
  info?: PlateInfo
}

const DAILY_LIMIT = 10

/**
 * Consulta información de placa patente desde Boostr.cl API
 * Docs: https://docs.boostr.cl/reference/car-plate
 */
async function fetchPlateInfo(plate: string): Promise<PlateInfo | null> {
  const apiKey = process.env.BOOTSTR_API_KEY
  
  if (!apiKey) {
    console.error('❌ BOOTSTR_API_KEY no configurada')
    return null
  }

  try {
    // Boostr.cl API endpoint correcto: GET /vehicle/{plate}.json
    // Auth: api_key header (no Bearer)
    const url = `https://api.boostr.cl/vehicle/${encodeURIComponent(plate)}.json`
    
    console.log('🔍 Consultando Boostr API:', url)
    console.log('🔑 API Key presente:', !!apiKey)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api_key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('📡 Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Boostr API error:', response.status, errorText)
      
      if (response.status === 404) {
        console.log('Placa no encontrada en Boostr API')
        return null
      }
      if (response.status === 401 || response.status === 403) {
        console.error('API Key inválida o sin permisos')
        return null
      }
      if (response.status === 429) {
        console.warn('Boostr API rate limit excedido')
        return null
      }
      throw new Error(`Boostr API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ Boostr API response:', JSON.stringify(data, null, 2))
    
    // Normalize response to our interface
    return {
      plate: plate,
      patente: data.patente || plate,
      digito_verificador: data.digito_verificador,
      marca: data.marca,
      modelo: data.modelo,
      ano_fabricacion: data.ano_fabricacion,
      tipo_vehiculo: data.tipo_vehiculo,
      color: data.color,
      motor_numero: data.motor_numero,
      vin: data.vin,
      propietario: data.propietario ? {
        nombre: data.propietario.nombre,
        rut: data.propietario.rut
      } : undefined,
      tasacion_fiscal: data.tasacion_fiscal,
      region_procedencia: data.region_procedencia
    }
  } catch (error: any) {
    console.error('❌ Error fetching plate info from Boostr:', error.message)
    return null
  }
}

/**
 * POST /api/plate
 * Valida una placa patente chilena y obtiene información del vehículo
 * 
 * Body: { plate: string }
 * Response: PlateValidationResponse
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plate } = body

    if (!plate || typeof plate !== 'string') {
      return NextResponse.json<PlateValidationResponse>({
        success: false,
        valid: false,
        message: 'La placa patente es requerida',
        error: 'PLATE_REQUIRED'
      }, { status: 400 })
    }

    // Validate plate format first
    const validation = validatePlate(plate)

    if (!validation.valid) {
      return NextResponse.json<PlateValidationResponse>({
        success: false,
        valid: false,
        message: validation.error || 'Formato de placa inválido',
        error: 'INVALID_FORMAT'
      }, { status: 400 })
    }

    // Get user from session
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Check daily limit for authenticated users
    let remaining = DAILY_LIMIT
    if (user && !authError) {
      const today = new Date().toISOString().split('T')[0]

      const { count, error: countError } = await supabase
        .from('plate_detection_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today)

      if (countError) {
        console.error('Error checking daily limit:', countError)
      }

      const used = count || 0
      if (used >= DAILY_LIMIT) {
        return NextResponse.json<PlateValidationResponse>({
          success: false,
          valid: false,
          message: 'Límite de 10 placas alcanzado por hoy. Intenta mañana.',
          error: 'DAILY_LIMIT_REACHED',
          remaining: 0
        }, { status: 429 })
      }
      remaining = DAILY_LIMIT - used
    }

    // Fetch plate info from Boostr API
    const plateInfo = await fetchPlateInfo(validation.normalized)

    // Log the detection
    if (user && !authError) {
      const { error: logError } = await supabase
        .from('plate_detection_logs')
        .insert({
          user_id: user.id,
          detected_plate: validation.normalized,
          original_input: plate,
          confidence: 100,
          status: 'success',
          api_response: { 
            format: validation.format,
            hasInfo: !!plateInfo,
            marca: plateInfo?.marca,
            modelo: plateInfo?.modelo
          }
        })

      if (logError) {
        console.error('Error logging detection:', logError)
      }
    }

    return NextResponse.json<PlateValidationResponse>({
      success: true,
      valid: true,
      format: validation.format,
      normalized: validation.normalized,
      message: plateInfo 
        ? 'Placa validada correctamente' 
        : 'Formato válido, pero no hay información disponible',
      remaining: user && !authError ? remaining - 1 : undefined,
      info: plateInfo || undefined
    })

  } catch (error) {
    console.error('Plate validation API error:', error)
    return NextResponse.json<PlateValidationResponse>({
      success: false,
      valid: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
