import { NextResponse } from "next/server"

/**
 * GET /api/test/boostr
 * Endpoint de test para verificar conexión con Boostr API
 */
export async function GET() {
  const apiKey = process.env.BOOTSTR_API_KEY

  const logs: any[] = []

  logs.push({
    step: "1. API Key check",
    configured: !!apiKey,
    length: apiKey?.length,
    firstChars: apiKey ? `${apiKey.substring(0, 15)}...` : "N/A"
  })

  if (!apiKey) {
    return NextResponse.json({
      error: "BOOTSTR_API_KEY no configurada",
      logs,
      solution: "Agrega la variable BOOTSTR_API_KEY en Vercel Settings → Environment Variables"
    }, { status: 500 })
  }

  // Test endpoint de Boostr
  const testPlate = "RA3752"
  const url = `https://api.boostr.cl/vehicle/${testPlate}.json`

  logs.push({
    step: "2. Testing Boostr API",
    url,
    method: "GET",
    headers: {
      api_key: "***",
      "Content-Type": "application/json"
    }
  })

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        api_key: apiKey,
        "Content-Type": "application/json"
      }
    })

    logs.push({
      step: "3. Response",
      status: response.status,
      statusText: response.statusText
    })

    if (!response.ok) {
      const errorText = await response.text()
      logs.push({
        step: "4. Error body",
        error: errorText
      })

      return NextResponse.json({
        success: false,
        message: `Error ${response.status}: ${response.statusText}`,
        logs,
        troubleshooting: {
          "401/403": "API Key inválida o sin permisos",
          "404": "Placa no encontrada en la base de datos de Boostr",
          "429": "Rate limit excedido",
          "500": "Error interno de Boostr"
        }
      }, { status: response.status })
    }

    const data = await response.json()
    logs.push({
      step: "4. Success response",
      data
    })

    return NextResponse.json({
      success: true,
      message: "Conexión exitosa con Boostr API",
      logs,
      data
    })

  } catch (error: any) {
    logs.push({
      step: "4. Exception",
      error: error.message
    })

    return NextResponse.json({
      success: false,
      message: "Error conectando con Boostr API",
      logs,
      error: error.message
    }, { status: 500 })
  }
}
