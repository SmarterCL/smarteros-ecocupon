import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Share2, ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ProductCoupon } from "@/components/product-coupon"
import { ProductService } from "@/application"
import { PriceComparisonService } from "@/domains/pricing"
import { formatPrice } from "@/lib/utils"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

async function getProductDetails(id: string) {
  const productService = new ProductService()
  const product = await productService.getProductById(id)
  
  if (!product) return null

  // TODO: Obtener categoría y specs desde sus respectivos servicios
  // Por ahora usamos la estructura simple del dominio Product
  
  return {
    ...product,
    categoryName: "Categoría", // TODO: obtener desde category service
    categorySlug: "all", // TODO: obtener desde category service
    specs: [], // TODO: obtener desde specs service
    knastaPrice: null, // TODO: obtener desde pricing service
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params
  const product = await getProductDetails(id)

  if (!product) notFound()

  // Calcular descuento usando domain service
  const discount = product.knastaPrice?.price && product.knastaPrice.price < product.price
    ? PriceComparisonService.calculateSavings(
        { value: product.knastaPrice.price, currency: 'CLP' } as any,
        { value: product.price, currency: 'CLP' } as any
      ).discountPercent
    : 0

  const savings = product.knastaPrice ? product.price - product.knastaPrice.price : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
      {/* Breadcrumb */}
      <Link
        href={`/category/${product.categorySlug}`}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground sm:mb-6"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Volver a {product.categoryName}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={product.imageUrl || "/placeholder.svg?height=500&width=500"}
            alt={product.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="mb-4">
            <Badge variant="secondary" className="mb-3">
              {product.categoryName}
            </Badge>
            <h1 className="mb-3 text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <p className="text-sm text-muted-foreground sm:text-base">{product.description}</p>
          </div>

          <Separator className="my-4" />

          {/* Pricing */}
          <div className="mb-6">
            <div className="mb-2 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                ${formatPrice(product.knastaPrice?.price ?? product.price)}
              </span>
              {product.knastaPrice && product.knastaPrice.price < product.price && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ${formatPrice(product.price)}
                  </span>
                  <Badge className="bg-primary text-primary-foreground">
                    -{discount}%
                  </Badge>
                </>
              )}
            </div>
            {savings > 0 && (
              <p className="text-sm text-muted-foreground">
                Ahorras: <span className="font-medium text-primary">${formatPrice(savings)}</span>
              </p>
            )}
          </div>

          {/* Coupon */}
          {discount > 0 && (
            <ProductCoupon
              product={{
                id: product.id,
                name: product.name,
                price: product.price,
                knastaPrice: product.knastaPrice ? { price: product.knastaPrice.price } : null,
              }}
              discount={discount}
            />
          )}

          {/* Actions */}
          <div className="mt-auto flex gap-3">
            <Button size="lg" className="flex-1">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Ir a la tienda
            </Button>
            <Button size="lg" variant="outline">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Specs */}
      {product.specs && product.specs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Especificaciones</h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  {product.specs.map((spec, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-3 font-medium text-muted-foreground">{spec.name}</td>
                      <td className="py-3 text-right">{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
