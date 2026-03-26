/**
 * Implementación: Product Repository con Supabase
 * 
 * Implementa IProductRepository usando Supabase como persistencia
 * 
 * @domain product
 * @infrastructure supabase
 */

import { ProductMapper } from '@/domains/product/entities/product'
import type { Product } from '@/domains/product/entities/product'
import type { IProductRepository, ProductFilter, PagedResult } from '@/domains/product/repositories/product-repository'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Implementación del repositorio de productos con Supabase
 */
export class SupabaseProductRepository implements IProductRepository {
  private tableName = 'products'

  constructor(private getClient: () => Promise<SupabaseClient> | SupabaseClient) {}

  /**
   * Factory method para crear repositorio para server (dynamic import para evitar next/headers en client)
   */
  static forServer(): SupabaseProductRepository {
    return new SupabaseProductRepository(async () => {
      const { createClient } = await import('@/lib/supabase/server')
      return await createClient()
    })
  }

  /**
   * Factory method para crear repositorio para browser
   */
  static forBrowser(): SupabaseProductRepository {
    return new SupabaseProductRepository(() => createBrowserClient())
  }

  async findAll(filter?: ProductFilter): Promise<PagedResult<Product>> {
    const client = await this.getClient()
    const limit = filter?.limit ?? 100
    const offset = filter?.offset ?? 0

    let query = client
      .from(this.tableName)
      .select(`
        *,
        categories (name),
        knasta_prices (price)
      `, { count: 'exact' })

    // Aplicar filtros
    if (filter?.categoryId) {
      query = query.eq('category_id', filter.categoryId)
    }

    if (filter?.search) {
      query = query.or(`name.ilike.%${filter.search}%,description.ilike.%${filter.search}%`)
    }

    if (filter?.minPrice !== undefined) {
      query = query.gte('price', filter.minPrice)
    }

    if (filter?.maxPrice !== undefined) {
      query = query.lte('price', filter.maxPrice)
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching products:', error)
      throw new Error('No se pudieron cargar los productos')
    }

    return {
      data: (data || []).map((row: any) => ProductMapper.fromDatabase(row as any)),
      total: count ?? 0,
      limit,
      offset,
    }
  }

  async findById(id: string): Promise<Product | null> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(this.tableName)
      .select(`
        *,
        categories (name),
        knasta_prices (price)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return ProductMapper.fromDatabase(data as any)
  }

  async findByCategory(categoryId: string, limit = 20): Promise<Product[]> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('category_id', categoryId)
      .limit(limit)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products by category:', error)
      return []
    }

    return (data || []).map((row: any) => ProductMapper.fromDatabase(row as any))
  }

  async search(term: string, limit = 10): Promise<Product[]> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      .limit(limit)

    if (error) {
      console.error('Error searching products:', error)
      return []
    }

    return (data || []).map((row: any) => ProductMapper.fromDatabase(row as any))
  }

  async create(product: Product): Promise<Product> {
    const client = await this.getClient()

    const data = ProductMapper.toDatabase(product)

    const { error } = await client.from(this.tableName).insert(data)

    if (error) {
      console.error('Error creating product:', error)
      throw new Error('No se pudo crear el producto')
    }

    return product
  }

  async update(product: Product): Promise<Product> {
    const client = await this.getClient()

    const data = ProductMapper.toDatabase(product)

    const { error } = await client
      .from(this.tableName)
      .update(data)
      .eq('id', product.id)

    if (error) {
      console.error('Error updating product:', error)
      throw new Error('No se pudo actualizar el producto')
    }

    return product
  }

  async delete(id: string): Promise<void> {
    const client = await this.getClient()

    const { error } = await client.from(this.tableName).delete().eq('id', id)

    if (error) {
      console.error('Error deleting product:', error)
      throw new Error('No se pudo eliminar el producto')
    }
  }

  async exists(id: string): Promise<boolean> {
    const client = await this.getClient()

    const { data } = await client
      .from(this.tableName)
      .select('id')
      .eq('id', id)
      .single()

    return !!data
  }

  async count(): Promise<number> {
    const client = await this.getClient()

    const { count } = await client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    return count ?? 0
  }
}
