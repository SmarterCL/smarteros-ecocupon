/**
 * Domains - Índice Principal
 *
 * Exporta todos los dominios del sistema
 *
 * Uso:
 * ```typescript
 * import { Product, IProductRepository } from '@/domains'
 * ```
 */

// Product Domain (core exports)
export {
  Price,
  ImageUrl,
  ProductFactory,
  ProductMapper,
} from './product/index'

export type {
  Product,
  ProductId,
  CategoryId,
  IProductRepository,
  ProductFilter,
  PagedResult,
} from './product/index'

// Catalog Domain
export {
  CategoryFactory,
  CategoryMapper,
  CategorySlugVO,
} from './catalog/index'

export type {
  Category,
  CategoryId as CatalogCategoryId,
  CategorySlug,
  ICategoryRepository,
} from './catalog/index'

// Pricing Domain (con aliases para evitar conflictos)
export {
  PriceComparisonService,
  KnastaPriceFactory,
  KnastaPriceMapper,
} from './pricing/index'

export type {
  KnastaPrice,
  KnastaPriceId,
  PricingProductId,
  PricingPrice,
  PricingKnastaPriceId,
} from './pricing/index'
