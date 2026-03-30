/**
 * SmarterOS MCP Server para Ecocupon.cl
 * 
 * Herramientas disponibles:
 * - validar_qr: Valida un código QR de usuario
 * - consultar_saldo: Consulta el saldo de puntos de un usuario
 * - registrar_reciclaje: Registra una transacción de reciclaje (basura/residuos)
 * - analizar_placa: Analiza/valida una placa patente (texto o imagen OCR)
 * - registrar_por_placa: Registra reciclaje por placa patente
 * - emitir_cupon: Emite un nuevo cupón de descuento
 * - registrar_basura: Registra basura/residuos con foto
 * - listar_cupones_activos: Lista cupones activos
 * 
 * Sin JWT - Comunicación directa en VPS controlado
 */

import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// Configuración desde variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL || "https://uyxvzztnsvfcqmgkrnol.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_KEY no configurada. Setea SUPABASE_KEY o SUPABASE_ANON_KEY");
  process.exit(1);
}

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Crear servidor MCP
const server = new McpServer({
  name: "smarteros-mcp",
  version: "1.0.0",
  description: "MCP Server para Ecocupon.cl - Gestión de QR, Saldo, Reciclaje y Cupones"
});

/**
 * Herramienta: validar_qr
 */
server.tool(
  "validar_qr",
  "Valida un código QR de usuario y retorna la información del usuario asociado",
  {
    qr_code: z.string().describe("El código QR a validar")
  },
  async ({ qr_code }) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, points, created_at")
        .eq("qr_code", qr_code)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                valid: false,
                message: "QR no encontrado o inválido",
                qr_code
              })
            }]
          };
        }
        throw error;
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            valid: true,
            message: "QR válido",
            user: {
              id: data.id,
              email: data.email,
              full_name: data.full_name,
              points: data.points
            }
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            valid: false,
            message: "Error al validar QR",
            error: error.message
          })
        }]
      };
    }
  }
);

/**
 * Herramienta: consultar_saldo
 */
server.tool(
  "consultar_saldo",
  "Consulta el saldo de puntos de un usuario por su ID o email",
  {
    user_identifier: z.string().describe("ID del usuario o email"),
    identifier_type: z.enum(["id", "email"]).describe("Tipo de identificador: 'id' o 'email'")
  },
  async ({ user_identifier, identifier_type }) => {
    try {
      const query = identifier_type === "id"
        ? supabase.from("users").select("id, email, full_name, points, updated_at").eq("id", user_identifier)
        : supabase.from("users").select("id, email, full_name, points, updated_at").eq("email", user_identifier);

      const { data, error } = await query.single();

      if (error) {
        if (error.code === "PGRST116") {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                success: false,
                message: "Usuario no encontrado",
                identifier: user_identifier
              })
            }]
          };
        }
        throw error;
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            user: {
              id: data.id,
              email: data.email,
              full_name: data.full_name
            },
            saldo: {
              points: data.points,
              updated_at: data.updated_at
            }
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: "Error al consultar saldo",
            error: error.message
          })
        }]
      };
    }
  }
);

/**
 * Herramienta: registrar_reciclaje
 */
server.tool(
  "registrar_reciclaje",
  "Registra una transacción de reciclaje y suma puntos al usuario",
  {
    user_id: z.string().describe("ID del usuario"),
    material_type: z.string().describe("Tipo de material: plastico, vidrio, papel, aluminio, organico"),
    weight_kg: z.number().describe("Peso en kilogramos"),
    points_to_add: z.number().optional().describe("Puntos a sumar (opcional, se calcula si no se proporciona)")
  },
  async ({ user_id, material_type, weight_kg, points_to_add }) => {
    try {
      const points = points_to_add ?? Math.round(weight_kg * 10);

      const { data: transaction, error: transactionError } = await supabase
        .from("recycling_transactions")
        .insert({
          user_id,
          material_type,
          weight_kg,
          points_earned: points
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      const { error: updateError } = await supabase.rpc("increment_user_points", {
        user_id,
        points_to_add: points
      });

      if (updateError && updateError.code === "42883") {
        await supabase
          .from("users")
          .update({ points: supabase.raw(`points + ${points}`) })
          .eq("id", user_id);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Reciclaje registrado exitosamente",
            transaction: {
              id: transaction.id,
              material_type: transaction.material_type,
              weight_kg: transaction.weight_kg,
              points_earned: points
            }
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: "Error al registrar reciclaje",
            error: error.message
          })
        }]
      };
    }
  }
);

/**
 * Herramienta: emitir_cupon
 */
server.tool(
  "emitir_cupon",
  "Emite un nuevo cupón de descuento para un usuario",
  {
    user_id: z.string().describe("ID del usuario"),
    coupon_type: z.string().describe("Tipo de cupón: descuento_porcentaje, descuento_fijo, envio_gratis"),
    value: z.number().describe("Valor del cupón (porcentaje o monto fijo)"),
    min_purchase: z.number().optional().describe("Compra mínima requerida (opcional)"),
    expires_in_days: z.number().optional().describe("Días de validez (default: 30)")
  },
  async ({ user_id, coupon_type, value, min_purchase, expires_in_days }) => {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 30));

      const couponCode = `ECO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: coupon, error } = await supabase
        .from("coupons")
        .insert({
          user_id,
          code: couponCode,
          type: coupon_type,
          value,
          min_purchase: min_purchase || 0,
          expires_at: expiresAt.toISOString(),
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Cupón emitido exitosamente",
            coupon: {
              id: coupon.id,
              code: coupon.code,
              type: coupon.type,
              value: coupon.value,
              min_purchase: coupon.min_purchase,
              expires_at: coupon.expires_at
            }
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: "Error al emitir cupón",
            error: error.message
          })
        }]
      };
    }
  }
);

/**
 * Herramienta: listar_cupones_activos
 */
server.tool(
  "listar_cupones_activos",
  "Lista los cupones activos de un usuario",
  {
    user_id: z.string().describe("ID del usuario")
  },
  async ({ user_id }) => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("id, code, type, value, min_purchase, expires_at, created_at")
        .eq("user_id", user_id)
        .eq("status", "active")
        .gte("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: true });

      if (error) throw error;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            count: data?.length || 0,
            coupons: data || []
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: "Error al listar cupones",
            error: error.message
          })
        }]
      };
    }
  }
);

/**
 * Herramienta: analizar_placa
 */
server.tool(
  "analizar_placa",
  "Valida y normaliza una placa patente chilena. Retorna el formato normalizado y si es válido.",
  {
    plate_text: z.string().describe("Texto de la placa (ingresado manualmente o desde OCR)"),
    source: z.enum(["manual", "ocr"]).describe("Origen: 'manual' o 'ocr'")
  },
  async ({ plate_text, source }) => {
    try {
      const normalized = plate_text.toUpperCase().trim();
      
      const patterns = [
        { regex: /^([A-Z]{4})(\d{2})$/, format: "ABCD-12", example: "ABCD-12" },
        { regex: /^([A-Z]{3})(\d{2})$/, format: "ABC-12", example: "ABC-12" },
        { regex: /^([A-Z]{2})-?(\d{2})-?(\d{2})$/, format: "AA-12-34", example: "AA-12-34" }
      ];

      let validFormat = null;
      let formattedPlate = normalized;

      for (const pattern of patterns) {
        const match = normalized.match(pattern.regex);
        if (match) {
          validFormat = pattern.format;
          
          if (pattern.format === "ABCD-12") {
            formattedPlate = `${match[1]}-${match[2]}`;
          } else if (pattern.format === "ABC-12") {
            formattedPlate = `${match[1]}-${match[2]}`;
          } else if (pattern.format === "AA-12-34") {
            formattedPlate = `${match[1]}-${match[2]}-${match[3]}`;
          }
          break;
        }
      }

      const isValid = validFormat !== null;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: isValid,
            plate: formattedPlate,
            original: plate_text,
            format: validFormat || "desconocido",
            source: source || "manual",
            message: isValid ? "Placa válida" : "Formato de placa no reconocido"
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: "Error al analizar placa",
            error: error.message
          })
        }]
      };
    }
  }
);

/**
 * Herramienta: registrar_por_placa
 */
server.tool(
  "registrar_por_placa",
  "Registra un evento de reciclaje asociado a una placa patente de vehículo",
  {
    plate: z.string().describe("Placa patente del vehículo"),
    material_type: z.string().describe("Tipo de material: plastico, vidrio, papel, aluminio, organico, mixto"),
    weight_kg: z.number().optional().describe("Peso en kilogramos (opcional)"),
    points: z.number().optional().describe("Puntos a asignar (default: 100)"),
    user_id: z.string().optional().describe("ID del usuario (opcional si no está autenticado)")
  },
  async ({ plate, material_type, weight_kg, points, user_id }) => {
    try {
      const normalized = plate.toUpperCase().trim();
      const pointsValue = points || 100;

      const { data: event, error } = await supabase
        .from("recycling_events")
        .insert({
          user_id: user_id || null,
          plate: normalized,
          material_type,
          weight_kg: weight_kg || null,
          points_earned: pointsValue,
          status: "completed",
          source: "smartermcp"
        })
        .select()
        .single();

      if (error) throw error;

      if (user_id) {
        await supabase
          .from("users")
          .update({ points: supabase.raw(`points + ${pointsValue}`) })
          .eq("id", user_id);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Reciclaje registrado por placa",
            event: {
              id: event.id,
              plate: event.plate,
              material_type: event.material_type,
              points: event.points_earned,
              status: event.status
            }
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: "Error al registrar por placa",
            error: error.message
          })
        }]
      };
    }
  }
);

/**
 * Herramienta: registrar_basura
 */
server.tool(
  "registrar_basura",
  "Registra un evento de reciclaje de basura/residuos sin vehículo",
  {
    user_id: z.string().describe("ID del usuario"),
    material_type: z.string().describe("Tipo de material: plastico, vidrio, papel, aluminio, organico, mixto"),
    weight_kg: z.number().describe("Peso en kilogramos"),
    photo_url: z.string().optional().describe("URL de la foto del residuo (opcional)")
  },
  async ({ user_id, material_type, weight_kg, photo_url }) => {
    try {
      const points = Math.round(weight_kg * 50);

      const { data: event, error } = await supabase
        .from("recycling_events")
        .insert({
          user_id,
          material_type,
          weight_kg,
          photo_url: photo_url || null,
          points_earned: points,
          status: "completed",
          source: "smartermcp_basura"
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("users")
        .update({ points: supabase.raw(`points + ${points}`) })
        .eq("id", user_id);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: "Basura registrada exitosamente",
            event: {
              id: event.id,
              material_type: event.material_type,
              weight_kg: event.weight_kg,
              points: event.points_earned
            }
          })
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: "Error al registrar basura",
            error: error.message
          })
        }]
      };
    }
  }
);

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SmarterOS MCP Server corriendo en VPS...");
  console.error("Tools: validar_qr, consultar_saldo, registrar_reciclaje, registrar_basura, registrar_por_placa, analizar_placa, emitir_cupon, listar_cupones_activos");
}

main().catch(console.error);
