/**
 * Domain: Pricing
 *
 * Módulo de precios y comparaciones
 *
 * @domain pricing
 */

// Entidades y Value Objects (classes)
export {
  KnastaPriceFactory,
  KnastaPriceMapper,
  PriceComparisonService,
  Price,
  ProductUrl,
} from './entities/knasta-price'

// Tipos con alias para evitar conflictos
export type {
  KnastaPrice,
  KnastaPriceId,
  KnastaPriceId as PricingKnastaPriceId,
  ProductId as PricingProductId,
  Price as PricingPrice,
} from './entities/knasta-price'
