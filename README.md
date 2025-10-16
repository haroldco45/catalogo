# 🎉 NOVAVENTA - Sistema de Gestión de Ventas e Inventario

**Aplicación completa para gestionar el emprendimiento de NOVAVENTA**

## 📋 Características Implementadas

### 🏪 Gestión de Inventario
- ✅ CRUD completo de productos
- ✅ 10 categorías de productos (Grupo Nutresa, cuidado personal, limpieza, etc.)
- ✅ Control de stock con alertas de stock bajo
- ✅ Búsqueda y filtros por categoría
- ✅ Stock mínimo configurable

### 🛒 Sistema de Ventas
- ✅ Carrito de compras intuitivo
- ✅ Selección de productos
- ✅ Gestión de clientes
- ✅ Múltiples métodos de pago (Efectivo, Tarjeta, Nequi, Daviplata, etc.)
- ✅ Actualización automática de inventario
- ✅ Notas opcionales por venta

### 👥 Gestión de Clientes
- ✅ CRUD completo de clientes
- ✅ Búsqueda por nombre o teléfono
- ✅ Historial de compras

### 📊 Reportes y Estadísticas
- ✅ Dashboard con KPIs en tiempo real
- ✅ Reportes diarios, semanales y mensuales
- ✅ Productos más vendidos
- ✅ Ventas totales por período
- ✅ **Exportación a Excel con formato profesional**

### 📱 WhatsApp Integration
- ✅ Notificaciones de nuevas ventas al 3217366758
- ✅ Alertas de stock bajo
- ⚠️ Actualmente registra en logs (pendiente integración API real)

### 🎨 Diseño
- ✅ Paleta de colores pasteles (rosa, púrpura, azul)
- ✅ UI moderna y responsive
- ✅ Opción para subir logo empresarial
- ✅ Gradientes y animaciones suaves

## 🚀 Tecnologías Utilizadas

### Backend
- FastAPI (Python)
- MongoDB (Motor async driver)
- OpenPyXL (Exportación Excel)
- Pytz (Timezone Colombia)

### Frontend
- React 19
- Tailwind CSS
- React Router
- Axios

## 📦 Datos Pre-cargados

### Productos (10 ejemplos):
1. Galletas Oreo - $5,000 COP
2. Chocolatina Jet - $2,500 COP
3. Helado Crem Helado - $8,000 COP
4. Café Colcafé - $12,000 COP
5. Salchichas Zenú - $9,000 COP
6. Shampoo Sedal - $15,000 COP
7. Detergente Ariel - $18,000 COP
8. Arroz Diana - $3,500 COP
9. Queso Curado - $25,000 COP
10. Camiseta Básica - $35,000 COP

### Clientes (3 ejemplos):
- María González
- Juan Pérez
- Ana Martínez

## 🔧 APIs Disponibles

### Productos
- `GET /api/categories` - Lista de categorías
- `GET /api/products` - Listar productos (con filtros)
- `POST /api/products` - Crear producto
- `PUT /api/products/{id}` - Actualizar producto
- `DELETE /api/products/{id}` - Eliminar producto

### Clientes
- `GET /api/customers` - Listar clientes
- `POST /api/customers` - Crear cliente
- `PUT /api/customers/{id}` - Actualizar cliente
- `DELETE /api/customers/{id}` - Eliminar cliente

### Ventas
- `GET /api/sales` - Listar ventas
- `POST /api/sales` - Registrar venta

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas generales

### Reportes
- `GET /api/reports/sales?period=daily|weekly|monthly` - Obtener reporte
- `GET /api/reports/export?period=daily|weekly|monthly` - Exportar a Excel

## 💡 Próximos Pasos (Mejoras Futuras)

1. **WhatsApp API Real**: Integrar servicio como Twilio o Whapi.cloud
2. **Códigos de Barras**: Scanner para productos
3. **Estadísticas Avanzadas**: Gráficos interactivos
4. **App Móvil**: Versión para dispositivos móviles
5. **Multi-tienda**: Soporte para múltiples puntos de venta

## 🎯 Uso de la Aplicación

### Crear una Venta
1. Ir a **Ventas**
2. Buscar y seleccionar productos
3. Ajustar cantidades en el carrito
4. Ingresar nombre del cliente
5. Seleccionar método de pago
6. Click en **Completar Venta**

### Ver Reportes
1. Ir a **Reportes**
2. Seleccionar período (Diario/Semanal/Mensual)
3. Click en **Exportar a Excel** para descargar

### Gestionar Inventario
1. Ir a **Inventario**
2. Usar filtros y búsqueda
3. Agregar/Editar/Eliminar productos
4. Ver alertas de stock bajo

## 📝 Notas Importantes

- ✅ Moneda: COP (Pesos Colombianos)
- ✅ Zona Horaria: Colombia (America/Bogota)
- ✅ Stock se actualiza automáticamente al vender
- ✅ WhatsApp notificaciones registradas para el 3217366758

---

**Desarrollado para NOVAVENTA** 🚀
