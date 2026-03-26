/**
 * Domain: Catalog
 *
 * Módulo de categorías y catálogo
 *
 * @domain catalog
 */

// Entidades y Value Objects (classes)
export {
  CategoryFactory,
  CategoryMapper,
  CategorySlugVO,
} from './entities/category'

// Types (interfaces y type aliases)
export type {
  Category,
  CategoryId,
  CategorySlug,
} from './entities/category'

// Repositorios (solo tipos)
export type { ICategoryRepository } from './repositories/category-repository'
