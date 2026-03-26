/**
 * Entidad de Dominio: Producto
 * 
 * Representa un producto en el catálogo de EcoCupon
 * 
 * @domain product
 * @boundedContext Catalog
 */

export type ProductId = string
export type CategoryId = string

export interface Product {
  readonly id: ProductId
  readonly name: string
  readonly description: string | null
  readonly price: Price
  readonly imageUrl: ImageUrl | null
  readonly categoryId: CategoryId | null
  readonly categoryName?: string | null
  readonly knastaPrices?: readonly KnastaPrice[]
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface KnastaPrice {
  readonly price: number
  readonly store: string
  readonly url?: string
}

/**
 * Value Object: Price
 * Representa un precio en CLP con validaciones de dominio
 */
export class Price {
  constructor(readonly value: number, readonly currency: string = 'CLP') {
    if (value < 0) {
      throw new Error('El precio no puede ser negativo')
    }
    // Redondear a entero (CLP no usa decimales)
    this.value = Math.round(value)
  }

  /**
   * Calcula el descuento porcentual respecto a otro precio
   */
  discountPercent(otherPrice: Price): number {
    if (otherPrice.value === 0) return 0
    return Math.round(((otherPrice.value - this.value) / otherPrice.value) * 100)
  }

  /**
   * Verifica si este precio es menor que otro
   */
  isLessThan(other: Price): boolean {
    return this.value < other.value
  }

  /**
   * Formatea el precio como string
   */
  toString(): string {
    return `$${this.value.toLocaleString('es-CL')}`
  }

  /**
   * Crea un Price desde un número
   */
  static create(value: number, currency?: string): Price {
    return new Price(value, currency)
  }
}

/**
 * Value Object: ImageUrl
 * Representa una URL de imagen válida
 */
export class ImageUrl {
  constructor(readonly value: string) {
    if (!this.isValidUrl(value)) {
      throw new Error('URL de imagen inválida')
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  toString(): string {
    return this.value
  }

  static create(value: string): ImageUrl {
    return new ImageUrl(value)
  }
}

/**
 * Factory para crear Productos
 */
export class ProductFactory {
  static create(params: {
    id: ProductId
    name: string
    description?: string | null
    price: number
    imageUrl?: string | null
    categoryId?: CategoryId | null
    categoryName?: string | null
    knastaPrices?: readonly KnastaPrice[]
    createdAt?: Date
    updatedAt?: Date
  }): Product {
    return {
      id: params.id,
      name: params.name,
      description: params.description ?? null,
      price: Price.create(params.price),
      imageUrl: params.imageUrl ? ImageUrl.create(params.imageUrl) : null,
      categoryId: params.categoryId ?? null,
      categoryName: params.categoryName ?? null,
      knastaPrices: params.knastaPrices,
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    }
  }
}

/**
 * Mapper para convertir desde/ hacia tipos de Supabase
 */
export class ProductMapper {
  /**
   * Convierte desde tipo de base de datos a entidad de dominio
   */
  static fromDatabase(row: {
    id: string
    name: string
    description: string | null
    price: number
    image: string | null
    category_id: string | null
    categories?: { name: string } | null
    knasta_prices?: any[]
    created_at: string
    updated_at: string
  }): Product {
    return ProductFactory.create({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      imageUrl: row.image,
      categoryId: row.category_id,
      categoryName: row.categories?.name ?? null,
      knastaPrices: row.knasta_prices?.map(p => ({
        price: p.price,
        store: p.store,
        url: p.url,
      })),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })
  }

  /**
   * Convierte desde entidad de dominio a tipo de base de datos
   */
  static toDatabase(product: Product): {
    id: string
    name: string
    description: string | null
    price: number
    image: string | null
    category_id: string | null
    created_at: string
    updated_at: string
  } {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price.value,
      image: product.imageUrl?.value ?? null,
      category_id: product.categoryId,
      created_at: product.createdAt.toISOString(),
      updated_at: product.updatedAt.toISOString(),
    }
  }
}
