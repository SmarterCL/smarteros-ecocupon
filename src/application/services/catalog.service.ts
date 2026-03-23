/**
 * Application Service: Catalog Service
 * 
 * Casos de uso para operaciones del catálogo
 * 
 * @application service
 */

import { SupabaseProductRepository } from '@/infrastructure'
import { SupabaseCategoryRepository } from '@/infrastructure'
import type { Product, Category, PagedResult } from '@/ddd'

/**
 * Servicio de Aplicación para el Catálogo
 */
export class CatalogService {
  private productRepo: SupabaseProductRepository
  private categoryRepo: SupabaseCategoryRepository

  constructor() {
    this.productRepo = SupabaseProductRepository.forServer()
    this.categoryRepo = SupabaseCategoryRepository.forServer()
  }

  /**
   * Caso de uso: Obtener todos los productos para el home
   */
  async getHomeProducts(limit = 20): Promise<PagedResult<Product>> {
    return await this.productRepo.findAll({ limit })
  }

  /**
   * Caso de uso: Obtener productos por categoría
   */
  async getProductsByCategory(categorySlug: string, limit = 20): Promise<{
    category: Category | null
    products: Product[]
  }> {
    const category = await this.categoryRepo.findBySlug(categorySlug)
    
    if (!category) {
      return { category: null, products: [] }
    }

    const products = await this.productRepo.findByCategory(category.id, limit)

    return { category, products }
  }

  /**
   * Caso de uso: Buscar productos
   */
  async searchProducts(term: string, limit = 10): Promise<Product[]> {
    return await this.productRepo.search(term, limit)
  }

  /**
   * Caso de uso: Obtener todas las categorías
   */
  async getAllCategories(): Promise<Category[]> {
    return await this.categoryRepo.findAll()
  }

  /**
   * Caso de uso: Obtener categorías con conteo de productos
   */
  async getCategoriesWithProductCount(): Promise<Array<Category & { productCount: number }>> {
    return await this.categoryRepo.findAllWithProductCount()
  }
}
