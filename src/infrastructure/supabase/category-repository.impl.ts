/**
 * Implementación: Category Repository con Supabase
 * 
 * Implementa ICategoryRepository usando Supabase como persistencia
 * 
 * @domain catalog
 * @infrastructure supabase
 */

import { CategoryMapper } from '@/domains/catalog/entities/category'
import type { Category } from '@/domains/catalog/entities/category'
import type { ICategoryRepository } from '@/domains/catalog/repositories/category-repository'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

/**
 * Implementación del repositorio de categorías con Supabase
 */
export class SupabaseCategoryRepository implements ICategoryRepository {
  private tableName = 'categories'

  constructor(private getClient: () => Promise<SupabaseClient> | SupabaseClient) {}

  /**
   * Factory method para crear repositorio para server (dynamic import para evitar next/headers en client)
   */
  static forServer(): SupabaseCategoryRepository {
    return new SupabaseCategoryRepository(async () => {
      const { createClient } = await import('@/lib/supabase/server')
      return await createClient()
    })
  }

  /**
   * Factory method para crear repositorio para browser
   */
  static forBrowser(): SupabaseCategoryRepository {
    return new SupabaseCategoryRepository(() => createBrowserClient())
  }

  async findAll(): Promise<Category[]> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return []
    }

    return (data || []).map((row: any) => CategoryMapper.fromDatabase(row))
  }

  async findById(id: string): Promise<Category | null> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return null
    }

    return CategoryMapper.fromDatabase(data)
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(this.tableName)
      .select('*')
      .eq('slug', slug)
      .single()

    if (error || !data) {
      return null
    }

    return CategoryMapper.fromDatabase(data)
  }

  async create(category: Category): Promise<Category> {
    const client = await this.getClient()

    const data = CategoryMapper.toDatabase(category)

    const { error } = await client.from(this.tableName).insert(data)

    if (error) {
      console.error('Error creating category:', error)
      throw new Error('No se pudo crear la categoría')
    }

    return category
  }

  async update(category: Category): Promise<Category> {
    const client = await this.getClient()

    const data = CategoryMapper.toDatabase(category)

    const { error } = await client
      .from(this.tableName)
      .update(data)
      .eq('id', category.id)

    if (error) {
      console.error('Error updating category:', error)
      throw new Error('No se pudo actualizar la categoría')
    }

    return category
  }

  async delete(id: string): Promise<void> {
    const client = await this.getClient()

    const { error } = await client.from(this.tableName).delete().eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      throw new Error('No se pudo eliminar la categoría')
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

  async findAllWithProductCount(): Promise<Array<Category & { productCount: number }>> {
    const client = await this.getClient()

    const { data, error } = await client
      .from(this.tableName)
      .select(`
        *,
        product_count:products(count)
      `)
      .order('name')

    if (error) {
      console.error('Error fetching categories with product count:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      ...CategoryMapper.fromDatabase(row),
      productCount: row.product_count?.[0]?.count ?? 0,
    }))
  }
}
