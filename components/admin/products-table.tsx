"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Edit, MoreHorizontal, Plus, Trash } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { ProductFormModal } from "@/components/admin/product-form-modal"
import { BrowserProductRepository } from "@/infrastructure/supabase/product-repository.browser"
import type { Database } from "@/lib/database.types"

type ProductWithRelations = Database["public"]["Tables"]["products"]["Row"] & {
  categories: { name: string } | null
  knastaPrices: { price: number }[]
}

export function ProductsTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [products, setProducts] = useState<ProductWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithRelations | null>(null)
  const { toast } = useToast()
  const productRepo = new BrowserProductRepository()

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const result = await productRepo.findAll({ limit: 100 })
      setProducts(result.data as unknown as ProductWithRelations[])
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  function refreshProducts() {
    fetchProducts()
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    )
  }

  const toggleAllProducts = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map((product) => product.id))
    }
  }

  const handleEdit = (product: ProductWithRelations) => {
    setEditingProduct(product)
    setFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingProduct(null)
    setFormOpen(true)
  }

  const deleteSelectedProducts = async () => {
    if (!selectedProducts.length) return

    const supabase = createClient()
    const { error } = await supabase.from("products").delete().in("id", selectedProducts)

    if (error) {
      console.error("Error deleting products:", error)
      toast({
        title: "Error",
        description: "No se pudieron eliminar los productos",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: `${selectedProducts.length} productos eliminados correctamente`,
      })
      setSelectedProducts([])
      fetchProducts()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar productos..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex items-center gap-2">
          {selectedProducts.length > 0 && (
            <Button variant="outline" size="sm" className="text-red-500" onClick={deleteSelectedProducts}>
              <Trash className="h-4 w-4 mr-2" />
              Eliminar ({selectedProducts.length})
            </Button>
          )}
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Añadir Producto
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleAllProducts}
                  aria-label="Seleccionar todos"
                />
              </TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Precio Knasta</TableHead>
              <TableHead>Diferencia</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Cargando productos...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron productos
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const knastaPrice =
                  product.knastaPrices && product.knastaPrices.length > 0 ? product.knastaPrices[0].price : null

                const priceDifference =
                  knastaPrice !== null ? Math.round(((product.price - knastaPrice) / product.price) * 100) : null

                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                        aria-label={`Seleccionar ${product.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.categories?.name || "Sin categoría"}</TableCell>
                    <TableCell>${product.price.toLocaleString()}</TableCell>
                    <TableCell>{knastaPrice !== null ? `$${knastaPrice.toLocaleString()}` : "No disponible"}</TableCell>
                    <TableCell>
                      {priceDifference !== null && (
                        <span
                          className={
                            priceDifference > 0
                              ? "text-green-600"
                              : priceDifference < 0
                                ? "text-red-600"
                                : "text-gray-500"
                          }
                        >
                          {priceDifference > 0
                            ? `-${priceDifference}%`
                            : priceDifference < 0
                              ? `+${-priceDifference}%`
                              : "0%"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSuccess={refreshProducts}
      />
    </div>
  )
}
