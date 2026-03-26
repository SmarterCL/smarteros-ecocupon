# 🚗 Implementación de Placa Patente - EcoCupon.cl

## Resumen

Se ha agregado la funcionalidad para **ingresar y validar placa patente de vehículos** en el formulario de productos con:

- ✅ **Ingreso manual mediante texto**
- ✅ **Validación automática de formato chileno**
- ✅ **Límite de 10 validaciones por día** (plan free)
- ✅ **Normalización automática** (uppercase, guiones)
- ✅ **Tracking de uso en tiempo real**

---

## ✅ Qué Está Implementado

### 1. Base de Datos
- **Columna `plate`** en tabla `products`
- **Tabla `plate_detection_logs`** para tracking de uso
- **Validación de formato** chileno (ABCD-12, AA-12-34)
- **Índices** para búsquedas rápidas
- **RLS policies** para seguridad
- **Scripts de migración**:
  - `scripts/add-plate-column.sql`
  - `scripts/add-plate-detection-logs.sql`

### 2. Backend
- **Types actualizados**: `lib/database.types.ts` incluye campo `plate`
- **Validador**: `lib/validators/plate.validator.ts`
  - Valida formatos de patente chilena
  - Normaliza automáticamente
  - Soporta múltiples formatos
- **Hook de detección**: `hooks/use-plate-detection.ts`
  - Límite de 10 por día
  - Tracking en Supabase
  - Estadísticas de uso

### 3. Frontend
- **Campo en formulario**: `components/admin/product-form-modal.tsx`
  - Input de texto con maxLength 10
  - Conversión automática a mayúsculas (onBlur)
  - Botón "Validar" para verificación
  - Contador de uso: `X/10 usadas hoy`
  - Alerta cuando quedan ≤ 2 validaciones
  - Placeholder con ejemplos

---

## 📋 Límite de Uso

### Plan Free: 10 Validaciones por Día

| Concepto | Límite | Reinicio |
|----------|--------|----------|
| Validaciones de placa | 10/día | 00:00 hora local |
| Ingreso manual (sin validar) | Ilimitado | N/A |

**Nota:** El límite aplica solo a validaciones con el botón "Validar". El ingreso manual directo no consume cupo.

### Tracking de Uso

El sistema muestra:
- **Contador**: `3/10 usadas hoy`
- **Alerta temprana**: `⚠️ Te quedan 2 validaciones hoy`
- **Error al alcanzar límite**: `Límite de 10 placas alcanzado por hoy. Intenta mañana.`

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
