"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageUploader } from "@/components/ui/image-uploader"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Database } from "@/lib/database.types"

type Product = Database["public"]["Tables"]["products"]["Row"]
type Category = Database["public"]["Tables"]["categories"]["Row"]

interface ProductFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSuccess?: () => void
}

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [plate, setPlate] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const isEditing = !!product

  // Cargar categorías y datos del producto
  useEffect(() => {
    if (open) {
      fetchCategories()
      if (product) {
        setName(product.name)
        setDescription(product.description || "")
        setPrice(product.price.toString())
        setPlate((product as any).plate || "")
        setCategoryId(product.category_id || "")
        setImageUrl(product.image || "")
      } else {
        resetForm()
      }
    }
  }, [open, product])

  async function fetchCategories() {
    const { data, error } = await supabase.from("categories").select("*").order("name")
    if (error) {
      console.error("Error fetching categories:", error)
    } else {
      setCategories(data || [])
    }
  }

  function resetForm() {
    setName("")
    setDescription("")
    setPrice("")
    setPlate("")
    setCategoryId("")
    setImageUrl("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Validaciones
      if (!name.trim()) {
        throw new Error("El nombre es requerido")
      }
      if (!price || isNaN(Number(price)) || Number(price) <= 0) {
        throw new Error("El precio debe ser mayor a 0")
      }
      if (!categoryId) {
        throw new Error("Selecciona una categoría")
      }

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Math.round(Number(price)),
        plate: plate.trim().toUpperCase() || null,
        category_id: categoryId,
        image: imageUrl || null,
      }

      let error

      if (isEditing && product) {
        // Actualizar producto
        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id)
        error = updateError
      } else {
        // Crear producto
        const { error: insertError } = await supabase.from("products").insert([productData])
        error = insertError
      }

      if (error) throw error

      toast({
        title: isEditing ? "Producto actualizado" : "Producto creado",
        description: isEditing
          ? "El producto se actualizó correctamente"
          : "El producto se creó correctamente",
      })

      resetForm()
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error saving product:", error)
      toast({
        title: "Error",
        description: error?.message || "No se pudo guardar el producto",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica la información del producto"
              : "Completa los datos para crear un nuevo producto"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Imagen del producto */}
            <div className="space-y-2">
              <Label>Imagen del producto</Label>
              <ImageUploader value={imageUrl} onChange={setImageUrl} folder="products" />
              {imageUrl && (
                <p className="text-xs text-muted-foreground break-all">URL: {imageUrl}</p>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Samsung Galaxy S23"
                required
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción del producto..."
                rows={3}
              />
            </div>

            {/* Precio y Categoría */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (CLP) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Placa Patente */}
            <div className="space-y-2">
              <Label htmlFor="plate">Placa Patente (opcional)</Label>
              <Input
                id="plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="Ej: ABCD-12 o AA-12-34"
                className="uppercase"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Ingresa la placa patente del vehículo para asociarla al producto
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (isEditing ? "Actualizando..." : "Creando...") : isEditing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
