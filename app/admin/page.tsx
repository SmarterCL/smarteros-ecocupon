import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductsTable } from "@/components/admin/products-table"
import { CategoriesTable } from "@/components/admin/categories-table"
import { KnastaUpdates } from "@/components/admin/knasta-updates"
import { DashboardStats } from "@/components/admin/dashboard-stats"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { logError } from "@/lib/logger"
import type { Database } from "@/lib/database.types"

export const revalidate = 0 // Don't cache admin pages

async function verifyAdminAccess() {
  const supabase = await createClient()
  
  if (!supabase) {
    redirect("/auth/login?error=Error de conexión con el servidor")
  }

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login?error=Debes iniciar sesión para acceder al panel de administración")
  }
  
  // Verificar si el usuario tiene rol de administrador
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  
  if (profile?.role !== "admin") {
    redirect("/auth/login?error=No tienes permisos de administrador")
  }
  
  return user
}

async function getStats() {
  const supabase = await createClient()
  if (!supabase) {
    return { productCount: 0, categoryCount: 0, discountCount: 0, averagePrice: 0 }
  }

  // Get product count
  const { count: productCount } = await supabase.from("products").select("*", { count: "exact", head: true })

  // Get category count
  const { count: categoryCount } = await supabase.from("categories").select("*", { count: "exact", head: true })

  // Get discount products count
  type ProductWithKnasta = {
    id: string
    price: number
    knasta_prices: { price: number }[]
  }

  const { data: products, error } = await supabase.from("products").select(`
      id,
      price,
      knasta_prices (
        price
      )
    `)

  if (error) {
    logError("AdminPage:getStats", "Error fetching products for stats", error)
  }

  const discountProducts =
    (products as ProductWithKnasta[])?.filter(
      (product) => product.knasta_prices.length > 0 && product.knasta_prices[0].price < product.price,
    ) || []

  // Calculate average price
  const totalPrice = (products as ProductWithKnasta[])?.reduce((sum, product) => sum + product.price, 0) || 0
  const averagePrice = products && products.length > 0 ? Math.round(totalPrice / products.length) : 0

  return {
    productCount: productCount || 0,
    categoryCount: categoryCount || 0,
    discountCount: discountProducts.length,
    averagePrice,
  }
}

export default async function AdminPage() {
  await verifyAdminAccess()
  const stats = await getStats()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <Button>Añadir Producto</Button>
      </div>

      <DashboardStats stats={stats} />

      <Tabs defaultValue="products" className="mt-8">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="knasta">Actualizaciones Knasta</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Productos</CardTitle>
              <CardDescription>Administra los productos de tu tienda y sus comparaciones con Knasta.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProductsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Categorías</CardTitle>
              <CardDescription>Administra las categorías de productos de tu tienda.</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoriesTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knasta">
          <Card>
            <CardHeader>
              <CardTitle>Actualizaciones de Knasta</CardTitle>
              <CardDescription>Actualiza los precios y enlaces de Knasta para tus productos.</CardDescription>
            </CardHeader>
            <CardContent>
              <KnastaUpdates />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
