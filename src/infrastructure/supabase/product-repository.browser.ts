/**
 * Implementación browser-only: Product Repository con Supabase
 *
 * Versión solo para uso en Client Components ("use client").
 * No importa ni referencia next/headers ni ningún módulo server-only.
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
 * Repositorio de productos para uso exclusivo en el navegador.
 * Usa el cliente Supabase de browser (no usa cookies de servidor).
 */
export class BrowserProductRepository implements IProductRepository {
  private tableName = 'products'
  private client: SupabaseClient

  constructor() {
    this.client = createBrowserClient()
  }

  async findAll(filter?: ProductFilter): Promise<PagedResult<Product>> {
    const limit = filter?.limit ?? 100
    const offset = filter?.offset ?? 0

    let query = this.client
      .from(this.tableName)
      .select(`
        *,
        categories (name),
        knasta_prices (price)
      `, { count: 'exact' })

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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const data = ProductMapper.toDatabase(product)

    const { error } = await this.client.from(this.tableName).insert(data)

    if (error) {
      console.error('Error creating product:', error)
      throw new Error('No se pudo crear el producto')
    }

    return product
  }

  async update(product: Product): Promise<Product> {
    const data = ProductMapper.toDatabase(product)

    const { error } = await this.client
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
    const { error } = await this.client.from(this.tableName).delete().eq('id', id)

    if (error) {
      console.error('Error deleting product:', error)
      throw new Error('No se pudo eliminar el producto')
    }
  }

  async exists(id: string): Promise<boolean> {
    const { data } = await this.client
      .from(this.tableName)
      .select('id')
      .eq('id', id)
      .single()

    return !!data
  }

  async count(): Promise<number> {
    const { count } = await this.client
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })

    return count ?? 0
  }
}
