import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CatalogService } from "@/application"
import { PriceComparisonService } from "@/domains/pricing"
import { formatPrice } from "@/lib/utils"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

async function getCategoryData(slug: string) {
  const catalogService = new CatalogService()
  
  if (slug === "all") {
    const productsResult = await catalogService.getHomeProducts(100)
    return {
      category: { id: "all", name: "Todas las ofertas", slug: "all", description: "Todas las ofertas disponibles" },
      products: productsResult.data,
    }
  }

  const result = await catalogService.getProductsByCategory(slug, 100)
  return result
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const data = await getCategoryData(slug)

  if (!data.category) notFound()

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground sm:mb-6"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Volver al inicio
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{data.category.name}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{data.category.description}</p>
      </div>

      {/* Products */}
      {data.products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No hay productos en esta categoría todavía.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.products.map((product) => {
            const knastaPrice = product.knastaPrices?.[0]?.price
            const discount = knastaPrice
              ? PriceComparisonService.calculateSavings(
                  { value: knastaPrice, currency: 'CLP' } as any,
                  { value: product.price, currency: 'CLP' } as any
                ).discountPercent
              : 0

            return (
              <Link key={product.id} href={`/product/${product.id}`} className="group">
                <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative aspect-square bg-muted">
                    <Image
                      src={product.imageUrl?.value || "/placeholder.svg?height=300&width=300"}
                      alt={product.name}
                      fill
                      className="object-contain p-3"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                    {discount > 0 && (
                      <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">
                        -{discount}%
                      </Badge>
                    )}
                  </div>
                  <CardContent className="flex flex-1 flex-col p-2.5 sm:p-4">
                    <span className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
                      {product.categoryName || "General"}
                    </span>
                    <h3 className="mb-2 line-clamp-2 text-xs font-medium leading-snug group-hover:underline sm:text-sm">
                      {product.name}
                    </h3>
                    <div className="mt-auto">
                      <span className="block text-xs text-muted-foreground line-through">
                        ${formatPrice(product.price.value)}
                      </span>
                      <span className="text-base font-bold sm:text-lg">
                        ${formatPrice(knastaPrice ?? product.price.value)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
