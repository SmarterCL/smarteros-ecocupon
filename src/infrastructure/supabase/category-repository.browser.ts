/**
 * Implementación browser-only: Category Repository con Supabase
 *
 * Versión solo para uso en Client Components ("use client").
 * No importa ni referencia next/headers ni ningún módulo server-only.
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
 * Repositorio de categorías para uso exclusivo en el navegador.
 * Usa el cliente Supabase de browser (no usa cookies de servidor).
 */
export class BrowserCategoryRepository implements ICategoryRepository {
  private tableName = 'categories'
  private client: SupabaseClient

  constructor() {
    this.client = createBrowserClient()
  }

  async findAll(): Promise<Category[]> {
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const { data, error } = await this.client
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
    const data = CategoryMapper.toDatabase(category)

    const { error } = await this.client.from(this.tableName).insert(data)

    if (error) {
      console.error('Error creating category:', error)
      throw new Error('No se pudo crear la categoría')
    }

    return category
  }

  async update(category: Category): Promise<Category> {
    const data = CategoryMapper.toDatabase(category)

    const { error } = await this.client
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
    const { error } = await this.client.from(this.tableName).delete().eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      throw new Error('No se pudo eliminar la categoría')
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

  async findAllWithProductCount(): Promise<Array<Category & { productCount: number }>> {
    const { data, error } = await this.client
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
