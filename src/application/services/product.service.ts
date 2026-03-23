/**
 * Application Service: Product Service
 * 
 * Casos de uso para operaciones con productos
 * 
 * @application service
 */

import { SupabaseProductRepository } from '@/infrastructure'
import { SupabaseCategoryRepository } from '@/infrastructure'
import type { Product, CategoryId } from '@/ddd'

/**
 * Servicio de Aplicación para Productos
 */
export class ProductService {
  private productRepo: SupabaseProductRepository
  private categoryRepo: SupabaseCategoryRepository

  constructor() {
    this.productRepo = SupabaseProductRepository.forServer()
    this.categoryRepo = SupabaseCategoryRepository.forServer()
  }

  /**
   * Caso de uso: Obtener producto por ID
   */
  async getProductById(id: string): Promise<Product | null> {
    return await this.productRepo.findById(id)
  }

  /**
   * Caso de uso: Crear producto
   */
  async createProduct(params: {
    name: string
    description: string | null
    price: number
    imageUrl: string | null
    categoryId: CategoryId
  }): Promise<Product> {
    const product: Product = {
      id: crypto.randomUUID(),
      name: params.name,
      description: params.description,
      price: { value: params.price, currency: 'CLP', toString: () => `$${params.price.toLocaleString('es-CL')}` } as any,
      imageUrl: params.imageUrl,
      categoryId: params.categoryId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return await this.productRepo.create(product)
  }

  /**
   * Caso de uso: Actualizar producto
   */
  async updateProduct(id: string, params: Partial<{
    name: string
    description: string | null
    price: number
    imageUrl: string | null
    categoryId: CategoryId
  }>): Promise<Product> {
    const existing = await this.productRepo.findById(id)
    
    if (!existing) {
      throw new Error('Producto no encontrado')
    }

    const updated: Product = {
      ...existing,
      name: params.name ?? existing.name,
      description: params.description ?? existing.description,
      price: params.price !== undefined 
        ? { value: params.price, currency: 'CLP', toString: () => `$${params.price.toLocaleString('es-CL')}` } as any
        : existing.price,
      imageUrl: params.imageUrl !== undefined ? params.imageUrl : existing.imageUrl,
      categoryId: params.categoryId ?? existing.categoryId,
      updatedAt: new Date(),
    }

    return await this.productRepo.update(updated)
  }

  /**
   * Caso de uso: Eliminar producto
   */
  async deleteProduct(id: string): Promise<void> {
    await this.productRepo.delete(id)
  }

  /**
   * Caso de uso: Contar productos
   */
  async countProducts(): Promise<number> {
    return await this.productRepo.count()
  }
}
