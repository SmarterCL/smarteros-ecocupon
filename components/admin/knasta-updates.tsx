"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, RefreshCw, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

type ProductWithPrices = Database["public"]["Tables"]["products"]["Row"] & {
  knastaPrices: {
    id: number
    price: number
    url: string | null
    last_updated: string
  }[]
}

export function KnastaUpdates() {
  const [updating, setUpdating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [products, setProducts] = useState<ProductWithPrices[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedProducts, setUpdatedProducts] = useState<string[]>([])
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    const { data, error } = await supabase.from("products").select(`
        *,
        knasta_prices (
          id,
          price,
          url,
          last_updated
        )
      `)

    if (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      })
    } else {
      setProducts((data as ProductWithPrices[]) || [])
    }
    setLoading(false)
  }

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const handleUpdateAll = async () => {
    setUpdating(true)

    // Simulación de actualización de todos los productos
    // En un caso real, aquí se haría una llamada a una API externa para obtener los precios actualizados

    const updates = products.map((product) => {
      // Simulamos un cambio de precio aleatorio entre -10% y +10%
      const currentPrice = product.knastaPrices.length > 0 ? product.knastaPrices[0].price : product.price

      const priceChange = Math.random() * 0.2 - 0.1 // Entre -10% y +10%
      const newPrice = Math.round(currentPrice * (1 + priceChange))

      return {
        product_id: product.id,
        price: newPrice,
        url:
          product.knastaPrices.length > 0 && product.knastaPrices[0].url
            ? product.knastaPrices[0].url
            : `https://knasta.cl/producto/${product.id}`,
        last_updated: new Date().toISOString(),
      }
    })

    // Actualizar o insertar precios de Knasta
    for (const update of updates) {
      const { error } = await supabase.from("knasta_prices").upsert(update, { onConflict: "product_id" })

      if (error) {
        console.error("Error updating Knasta price:", error)
      }
    }

    toast({
      title: "Éxito",
      description: "Todos los precios han sido actualizados",
    })

    setUpdatedProducts(products.map((p) => p.id))
    fetchProducts()
    setUpdating(false)
  }

  const handleUpdateProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    // Simulamos un cambio de precio aleatorio entre -10% y +10%
    const currentPrice = product.knastaPrices.length > 0 ? product.knastaPrices[0].price : product.price

    const priceChange = Math.random() * 0.2 - 0.1 // Entre -10% y +10%
    const newPrice = Math.round(currentPrice * (1 + priceChange))

    // Generar URL segura
    const baseUrl = product.knastaPrices.length > 0 && product.knastaPrices[0].url
      ? product.knastaPrices[0].url
      : `https://knasta.cl/producto/${productId}`

    const update = {
      product_id: productId,
      price: newPrice,
      url: baseUrl,
      last_updated: new Date().toISOString(),
    }

    const { error } = await supabase.from("knasta_prices").upsert(update, { onConflict: "product_id" })

    if (error) {
      console.error("Error updating Knasta price:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el precio",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Precio actualizado correctamente",
      })
      setUpdatedProducts((prev) => [...prev, productId])
      fetchProducts()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Actualización de precios de Knasta</h3>
              <p className="text-muted-foreground">Actualiza los precios de Knasta para todos los productos</p>
            </div>
            <Button onClick={handleUpdateAll} disabled={updating}>
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar todos
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center">
          <Input
            placeholder="Buscar productos..."
            className="max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="ghost" size="icon" className="ml-2">
            <Search className="h-4 w-4" />
            <span className="sr-only">Buscar</span>
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Precio actual</TableHead>
                <TableHead>Precio Knasta</TableHead>
                <TableHead>Última actualización</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const knastaPrice = product.knastaPrices.length > 0 ? product.knastaPrices[0] : null
                  const lastUpdated = knastaPrice ? new Date(knastaPrice.last_updated) : null

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>${product.price.toLocaleString()}</TableCell>
                      <TableCell>{knastaPrice ? `$${knastaPrice.price.toLocaleString()}` : "No disponible"}</TableCell>
                      <TableCell>
                        {lastUpdated
                          ? lastUpdated.toLocaleString("es-CL", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Nunca actualizado"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateProduct(product.id)}
                          disabled={updatedProducts.includes(product.id)}
                        >
                          {updatedProducts.includes(product.id) ? (
                            <>
                              <Check className="h-4 w-4 mr-2 text-green-600" />
                              Actualizado
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Actualizar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
