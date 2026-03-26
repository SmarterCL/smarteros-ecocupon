# 🚗 Implementación de Placa Patente - EcoCupon.cl

## Resumen

Se ha agregado la funcionalidad para **ingresar placa patente de vehículos** en el formulario de productos de forma **manual mediante texto**.

---

## ✅ Qué Está Implementado

### 1. Base de Datos
- **Columna `plate`** agregada a la tabla `products`
- **Validación de formato** chileno (ABCD-12, AA-12-34)
- **Índice** para búsquedas rápidas
- **Script de migración**: `scripts/add-plate-column.sql`

### 2. Backend
- **Types actualizados**: `lib/database.types.ts` incluye campo `plate`
- **Validador**: `lib/validators/plate.validator.ts`
  - Valida formatos de patente chilena
  - Normaliza automáticamente (uppercase, guiones)
  - Soporta múltiples formatos

### 3. Frontend
- **Campo en formulario**: `components/admin/product-form-modal.tsx`
  - Input de texto con maxLength 10
  - Conversión automática a mayúsculas
  - Placeholder con ejemplos
  - Campo opcional

---

## 📋 Formatos de Placa Soportados

| Formato | Ejemplo | Tipo |
|---------|---------|------|
| ABCD-12 | `ABCD-12` | Patente antigua (4 letras + 2 números) |
| ABC-12 | `ABC-12` | Patente antigua (3 letras + 2 números) |
| AA-12-34 | `AA-12-34` | Patente nueva (2-2-2) |

### Normalización Automática
El sistema convierte automáticamente:
- `abcd12` → `ABCD-12`
- `aa1234` → `AA-12-34`
- `AbCd-12` → `ABCD-12`

---

## 🔧 Cómo Usar

### 1. Ejecutar Migración en Supabase

```bash
# Opción A: Desde el Dashboard de Supabase
# 1. Ve a SQL Editor
# 2. Copia y pega el contenido de scripts/add-plate-column.sql
# 3. Ejecuta

# Opción B: Desde CLI
supabase db execute --file scripts/add-plate-column.sql
```

### 2. Crear/Editar Producto

1. Ve a `/admin` en tu aplicación
2. Click en "Añadir Producto" o edita uno existente
3. Completa los datos del producto
4. **Ingresa la placa patente** en el campo "Placa Patente (opcional)"
5. Guarda el producto

---

## 📁 Archivos Modificados/Creados

### Modificados:
- `components/admin/product-form-modal.tsx` - Campo de placa patente
- `lib/database.types.ts` - Types actualizados

### Creados:
- `scripts/add-plate-column.sql` - Migración de base de datos
- `lib/validators/plate.validator.ts` - Validador de placas
- `docs/PLATE-IMPLEMENTATION.md` - Esta documentación

---

## 🔮 Futuras Mejoras (Opcional)

### OCR Automático desde Imagen
Si en el futuro quieres detectar la placa automáticamente desde una imagen:

**Opciones:**
1. **Boostr.cl** - Requiere upgrade del plan (plan free no incluye placas)
2. **Google Cloud Vision API** - Key disponible en Vault
3. **AWS Rekognition** - Alternativa enterprise

**Archivos necesarios:**
- `app/api/ocr/plate/route.ts` - API route
- `lib/services/boostr.service.ts` - Cliente API
- `components/plate-detector.tsx` - Componente UI con OCR

---

## 🛠️ Troubleshooting

### Error: "column plate does not exist"
**Solución:** Ejecuta la migración en Supabase (ver paso 1 arriba)

### Error: "Formato de placa inválido"
**Solución:** El sistema acepta estos formatos:
- ✅ `ABCD-12`
- ✅ `ABC-12`
- ✅ `AA-12-34`
- ❌ `1234-AB` (números primero no válido)

### La placa no se guarda
**Verifica:**
1. Que la migración se ejecutó correctamente
2. Que el campo `plate` existe en la tabla `products`
3. Revisa la consola del navegador por errores

---

## 📞 Soporte

Para dudas o problemas con esta implementación, revisa:
- `SECURITY.md` - Políticas de seguridad
- `SETUP.md` - Configuración del proyecto
- `README.md` - Documentación general
