# 📱 Super Arroz - Sistema de Ventas

## 🎯 Descripción
Aplicación web profesional para la venta de Super Arroz 25x500g con integración directa a WhatsApp.

---

## ✨ Características Principales

### 👥 Para Clientes:
- ✅ Visualización del producto con imagen y precio actualizado
- ✅ Formulario simple para realizar pedidos
- ✅ Cálculo automático del total
- ✅ Envío directo del pedido a WhatsApp (+57 320 613 4987)
- ✅ Diseño responsive y profesional

### 🔐 Para Administradores:
- ✅ Panel de administración seguro con autenticación JWT
- ✅ Cambio dinámico del precio del producto
- ✅ Historial completo de pedidos
- ✅ Información detallada de cada cliente y pedido

---

## 🚀 Cómo Usar la Aplicación

### Para Clientes:

1. **Acceder a la Tienda**
   - Abre la aplicación en tu navegador
   - Por defecto verás la vista de "Tienda"

2. **Ver el Producto**
   - Verás la imagen del Super Arroz 25x500g
   - El precio se muestra claramente
   - Peso: 500 gramos por bolsa

3. **Realizar un Pedido**
   - Llena el formulario con tus datos:
     * Nombre Completo
     * Teléfono / Celular
     * Dirección de Entrega
     * Cantidad de Unidades
   
4. **Enviar Pedido**
   - El total se calcula automáticamente
   - Haz clic en "Enviar Pedido por WhatsApp"
   - Se abrirá WhatsApp con tu pedido pre-cargado
   - El pedido se guarda en la base de datos

---

### Para Administradores:

1. **Acceder al Panel Admin**
   - Haz clic en el botón "Admin" en la navegación superior
   
2. **Iniciar Sesión**
   - **Usuario por defecto:** `admin`
   - **Contraseña por defecto:** `admin123`
   - ⚠️ **IMPORTANTE:** Cambia estas credenciales en producción

3. **Cambiar el Precio**
   - Ve a la sección "Gestión de Precio"
   - El precio actual se muestra en grande
   - Ingresa el nuevo precio
   - Haz clic en "Actualizar Precio"
   - ✅ ¡El cambio se aplica inmediatamente!

4. **Ver Historial de Pedidos**
   - Haz clic en "Mostrar Pedidos"
   - Verás todos los pedidos con:
     * Datos del cliente (nombre, teléfono, dirección)
     * Cantidad y total del pedido
     * Fecha y hora del pedido

5. **Cerrar Sesión**
   - Haz clic en "Cerrar Sesión" en la esquina superior derecha

---

## 📱 Integración con WhatsApp

Cuando un cliente hace un pedido, se genera automáticamente un mensaje con:
- 👤 Nombre del cliente
- 📱 Teléfono
- 📍 Dirección de entrega
- 📦 Producto: Super Arroz 25x500g
- 🔢 Cantidad de unidades
- 💵 Precio unitario y total
- 📅 Fecha y hora del pedido
- 🆔 ID único del pedido

El mensaje se envía a: **+57 320 613 4987**

---

## 🎨 Diseño

La aplicación usa los colores de la marca Super Arroz:
- 🔴 Rojo (#E31E24) - Color principal
- 🟡 Amarillo (#FFD700) - Acentos
- 🟢 Verde (#2D5F2E) - Elementos secundarios

Diseño completamente responsive, funciona en:
- 💻 Desktop
- 📱 Móviles
- 📱 Tablets

---

## 🔒 Seguridad

### Características de Seguridad:
1. **Autenticación JWT**
   - Tokens con expiración de 24 horas
   - Cifrado con bcrypt
   
2. **Contraseñas Hasheadas**
   - Las contraseñas nunca se almacenan en texto plano
   - Usa bcrypt con algoritmo de hashing seguro

3. **Validación de Datos**
   - Validación en frontend y backend
   - Protección contra inyecciones

4. **CORS Configurado**
   - Protección contra accesos no autorizados

### ⚠️ IMPORTANTE para Producción:
1. Cambia las credenciales por defecto del admin
2. Cambia la variable `JWT_SECRET` en el archivo `.env` del backend
3. Usa HTTPS en producción

---

## 🛠️ Tecnologías Utilizadas

### Backend:
- **FastAPI** - Framework web moderno
- **MongoDB** - Base de datos NoSQL
- **JWT** - Autenticación segura
- **Bcrypt** - Cifrado de contraseñas
- **Motor** - Driver async de MongoDB

### Frontend:
- **React 19** - Librería UI
- **Tailwind CSS** - Diseño moderno
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos

---

## 📊 Estructura de Base de Datos

### Colecciones:

1. **admins**
   - `id` (UUID)
   - `username`
   - `password_hash`
   - `created_at`

2. **products**
   - `id` (UUID)
   - `name` (Super Arroz 25x500g)
   - `description`
   - `price`
   - `image_url`
   - `updated_at`

3. **orders**
   - `id` (UUID)
   - `customer_name`
   - `customer_phone`
   - `customer_address`
   - `quantity`
   - `unit_price`
   - `total_price`
   - `status` (pending)
   - `created_at`

---

## 🔧 Comandos Útiles

### Reiniciar Servicios:
```bash
sudo supervisorctl restart all
```

### Ver Estado de Servicios:
```bash
sudo supervisorctl status
```

### Ver Logs del Backend:
```bash
tail -f /var/log/supervisor/backend.*.log
```

### Ver Logs del Frontend:
```bash
tail -f /var/log/supervisor/frontend.*.log
```

---

## 📞 Soporte

Para cualquier duda o problema, contacta al desarrollador o revisa los logs de la aplicación.

---

## 📝 Notas Adicionales

- El precio por defecto está configurado en $50,000 COP
- Puedes cambiar el precio en cualquier momento desde el panel admin
- Todos los pedidos se guardan automáticamente
- La imagen del producto se carga desde el servidor

---

**Desarrollado con ❤️ para Super Arroz**
**Calidad Premium desde 1985**
