# 🚀 GUÍA RÁPIDA: Activar WhatsApp en 3 Pasos

## ✅ Paso 1: Activar tu número (3217366758)

### En tu WhatsApp personal:

1. **Agregar contacto**: 
   - Número: `+34 644 27 69 50`
   - Nombre: "CallMeBot"

2. **Enviar mensaje**:
   ```
   I allow callmebot to send me messages
   ```

3. **Copiar tu API Key**:
   - Recibirás algo como: "Your APIKey is: 123456"
   - Copia ese número (123456)

---

## ✅ Paso 2: Configurar el sistema

1. **Editar archivo de configuración**:
   - Abrir: `/app/backend/.env`
   
2. **Pegar tu API Key**:
   - Buscar la línea: `WHATSAPP_BUSINESS_APIKEY=""`
   - Cambiar por: `WHATSAPP_BUSINESS_APIKEY="123456"` (tu key real)

3. **Guardar el archivo**

---

## ✅ Paso 3: Reiniciar y probar

1. **Reiniciar**:
   ```bash
   sudo supervisorctl restart backend
   ```

2. **Hacer una venta de prueba** en la app

3. **¡Recibirás el mensaje en tu WhatsApp!** 📱

---

## 🎯 ¿Qué pasará?

✅ Cada vez que haya una venta → Recibirás notificación en WhatsApp  
✅ Stock bajo → Recibirás alerta en WhatsApp  
✅ Si el cliente está registrado → Él recibe su comprobante  

---

## 📝 Ejemplo del .env configurado:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"

WHATSAPP_BUSINESS_APIKEY="123456"
WHATSAPP_CLIENTS_APIKEYS=""
```

---

## ❓ ¿Y los clientes?

Si quieres que los clientes reciban comprobantes:

1. Ellos deben activar CallMeBot (Paso 1)
2. Te dan su API Key
3. Agregas en `.env`:
   ```
   WHATSAPP_CLIENTS_APIKEYS="573201234567:cliente_key1,573109876543:cliente_key2"
   ```

---

## 🆘 Problemas?

- **No llega mensaje**: Verificar que el API Key esté correcto en `.env`
- **Error en logs**: Asegurarse que no haya espacios extra en el API Key
- **Cliente no recibe**: Verificar que su número y API Key estén en la configuración

---

## ✨ ¡Listo!

Tu sistema NOVAVENTA ahora envía WhatsApp automáticos.  
**100% GRATIS** - Sin límites - Sin costos ocultos

🚀 **¡Disfruta de tu sistema automatizado!**
