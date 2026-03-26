/**
 * Domain: Product
 *
 * Módulo de productos del catálogo
 *
 * @domain product
 */

// Entidades y Value Objects (classes)
export {
  Price,
  ImageUrl,
  ProductFactory,
  ProductMapper,
} from './entities/product'

// Types (interfaces y type aliases)
export type {
  Product,
  ProductId,
  CategoryId,
} from './entities/product'

// Repositorios (solo tipos)
export type {
  IProductRepository,
  ProductFilter,
  PagedResult,
} from './repositories/product-repository'
