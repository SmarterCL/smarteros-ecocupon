"use client"

import { useState, useRef, useCallback } from "react"
import { Camera, X, Check, AlertCircle, RefreshCw, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { usePlateDetection } from "@/hooks/use-plate-detection"

export default function ScanPage() {
  const [image, setImage] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [manualPlate, setManualPlate] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const { toast } = useToast()
  const { detectPlate, stats, getStats } = usePlateDetection()

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera on mobile
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast({
        title: "Error de cámara",
        description: "No se pudo acceder a la cámara. Verifica los permisos.",
        variant: "destructive"
      })
    }
  }, [toast])

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }, [])

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL("image/png")
    setImage(imageData)
    stopCamera()
  }, [stopCamera])

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setImage(event.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }, [])

  // Analyze image (simulated - in production would use OCR API)
  const analyzeImage = useCallback(async () => {
    if (!image) return
    
    setAnalyzing(true)
    setResult(null)

    // Simulate OCR analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // In production, this would call an OCR service
    // For now, we'll prompt for manual entry
    setAnalyzing(false)
    toast({
      title: "Imagen capturada",
      description: "Ingresa la placa patente manualmente para continuar"
    })
  }, [image, toast])

  // Submit plate manually
  const handleSubmitPlate = useCallback(async () => {
    if (!manualPlate.trim()) {
      toast({
        title: "Placa requerida",
        description: "Ingresa la placa patente del vehículo",
        variant: "destructive"
      })
      return
    }

    const supabase = createClient()
    if (!supabase) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con el servidor de autenticación",
        variant: "destructive"
      })
      return
    }

    const response = await supabase.auth.getUser()
    const user = response.data?.user

    if (!user) {
      toast({
        title: "Autenticación requerida",
        description: "Debes iniciar sesión para registrar placas",
        variant: "destructive"
      })
      return
    }

    const detectionResult = await detectPlate(manualPlate)
    
    if (detectionResult.success && detectionResult.plate) {
      setResult(detectionResult.plate)
      
      // Register recycling event
      const { error } = await supabase
        .from("recycling_events")
        .insert({
          user_id: user.id,
          plate: detectionResult.plate,
          status: "pending",
          points: 100
        })

      if (!error) {
        toast({
          title: "¡Registro exitoso!",
          description: `Placa ${detectionResult.plate} registrada. Ganaste 100 puntos`,
        })
        await getStats()
      }
    }
  }, [manualPlate, detectPlate, toast, getStats])

  // Reset
  const reset = useCallback(() => {
    setImage(null)
    setResult(null)
    setManualPlate("")
    setAnalyzing(false)
  }, [])

  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Escanear Residuos</h1>
          <p className="text-muted-foreground">
            Captura una foto de los residuos para reciclar y ganar puntos
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Uso diario:</span>
                <span className="font-medium">
                  {stats.used} / {stats.limit}
                </span>
                <span className="text-muted-foreground">
                  Restantes: {stats.remaining}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Camera/Upload Section */}
        {!image && !cameraActive && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <Camera className="w-16 h-16 text-muted-foreground" />
                </div>
                
                <div className="flex gap-4">
                  <Button onClick={startCamera} className="gap-2">
                    <Camera className="w-4 h-4" />
                    Usar Cámara
                  </Button>
                  
                  <label>
                    <Button variant="outline" className="gap-2" asChild>
                      <span>
                        <ImageIcon className="w-4 h-4" />
                        Subir Foto
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Camera View */}
        {cameraActive && (
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video object-cover rounded-lg bg-black"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={stopCamera}
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  <Button
                    size="icon"
                    className="w-16 h-16 rounded-full"
                    onClick={capturePhoto}
                  >
                    <div className="w-12 h-12 rounded-full border-4 border-white" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Preview */}
        {image && !cameraActive && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={image}
                    alt="Captura"
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={reset}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {!result && (
                  <>
                    <Button 
                      onClick={analyzeImage} 
                      disabled={analyzing}
                      className="w-full gap-2"
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Analizando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirmar Imagen
                        </>
                      )}
                    </Button>

                    <div className="space-y-2">
                      <label htmlFor="plate" className="text-sm font-medium">
                        Placa Patente (formato chileno)
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="plate"
                          type="text"
                          value={manualPlate}
                          onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                          placeholder="ABCD12 o AB12CD-0"
                          className="flex-1 px-3 py-2 border rounded-md uppercase"
                          maxLength={8}
                        />
                        <Button onClick={handleSubmitPlate}>
                          Registrar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ejemplos: ABCD12, AB12CD-0, ABCD-12
                      </p>
                    </div>
                  </>
                )}

                {/* Success Result */}
                {result && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">¡Registro Exitoso!</p>
                      <p className="text-muted-foreground">
                        Placa: <span className="font-mono font-bold">{result}</span>
                      </p>
                      <p className="text-green-600 font-medium">+100 puntos</p>
                    </div>
                    <Button onClick={reset} variant="outline" className="w-full">
                      Escanear Otro
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">
                  ¿Cómo funciona?
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Toma una foto de los residuos a reciclar</li>
                  <li>Ingresa la placa patente del vehículo</li>
                  <li>Recibe puntos canjeables por premios</li>
                  <li>Límite: 10 escaneos por día</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
