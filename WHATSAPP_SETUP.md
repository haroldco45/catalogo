# 📱 Configuración de WhatsApp para NOVAVENTA

## 🎯 API Gratuita: CallMeBot

NOVAVENTA usa **CallMeBot**, una API **100% GRATUITA** para enviar mensajes de WhatsApp.

---

## ⚡ Configuración Rápida (5 minutos)

### **Paso 1: Activar el Negocio (3217366758)**

1. **Agregar contacto**: 
   - Guarda este número en tus contactos: `+34 644 27 69 50`
   - Ponle un nombre como "CallMeBot"

2. **Enviar mensaje de activación**:
   - Abre WhatsApp
   - Busca el contacto "CallMeBot" 
   - Envía exactamente este mensaje:
   ```
   I allow callmebot to send me messages
   ```

3. **Recibir API Key**:
   - En unos segundos recibirás una respuesta con tu **API Key**
   - Será algo como: "Your APIKey is: 123456"

4. **Configurar en el sistema**:
   - Abre el archivo `/app/backend/.env`
   - Reemplaza esta línea:
   ```
   WHATSAPP_BUSINESS_APIKEY=""
   ```
   Por:
   ```
   WHATSAPP_BUSINESS_APIKEY="TU_API_KEY_AQUI"
   ```

---

### **Paso 2: Activar Clientes (Opcional)**

Si quieres que tus clientes reciban comprobantes:

**Para cada cliente:**

1. El **cliente** debe agregar `+34 644 27 69 50` a sus contactos

2. El **cliente** debe enviar:
   ```
   I allow callmebot to send me messages
   ```

3. El **cliente** te compartirá su API Key

4. **Tú agregas** en `/app/backend/.env`:
   ```
   WHATSAPP_CLIENTS_APIKEYS="3201234567:123456,3109876543:654321"
   ```
   (Formato: `teléfono:apikey,teléfono:apikey`)

---

## 🚀 Reiniciar el Sistema

Después de configurar los API keys:

```bash
sudo supervisorctl restart backend
```

---

## ✅ Verificar que Funciona

### **Prueba 1: Venta al Negocio**
1. Crear cualquier venta
2. Verificar logs: `tail -f /var/log/supervisor/backend.err.log`
3. Deberías ver: `✅ WhatsApp ENVIADO a 3217366758`
4. **Recibirás el mensaje en WhatsApp** 📱

### **Prueba 2: Comprobante al Cliente**
1. Crear una venta seleccionando un cliente registrado
2. El cliente debe recibir el comprobante en WhatsApp 📱

---

## 🔍 Troubleshooting

### "Solo aparece en logs, no llega el mensaje"
✅ **Solución**: Verificar que el API Key esté correctamente configurado en `.env`

### "Error 401 o 403"
✅ **Solución**: El API Key es incorrecto. Repetir el proceso de activación.

### "Cliente no recibe comprobante"
✅ **Verificar**:
- Que el cliente tenga teléfono registrado en el sistema
- Que el API Key del cliente esté en `.env`
- Que el cliente haya activado CallMeBot

---

## 💡 Notas Importantes

- ✅ **100% Gratuito**: No tiene costo
- ✅ **Sin límites**: CallMeBot no tiene límite de mensajes
- ✅ **Instantáneo**: Los mensajes llegan en segundos
- ⚠️ **Requiere activación**: Cada número debe activarse individualmente
- ⚠️ **Formato**: Los números deben incluir código de país (57 para Colombia)

---

## 📞 Formato de Números

CallMeBot requiere formato internacional **SIN el símbolo +**:

❌ Incorrecto: `+57 321 7366758` o `321 7366758`  
✅ Correcto: `573217366758`

**Para Colombia**: Agregar `57` antes del número (sin el 0 inicial)
- Ejemplo: `3217366758` → `573217366758`

---

## 🔐 Seguridad

- Los API Keys son personales y únicos
- No compartir tu API Key públicamente
- Cada número tiene su propio API Key

---

## 🎉 Listo!

Una vez configurado, NOVAVENTA enviará automáticamente:
- ✅ Notificaciones de ventas al negocio
- ✅ Comprobantes a los clientes
- ✅ Alertas de stock bajo

**¡Tu negocio ahora tiene WhatsApp automático!** 🚀
