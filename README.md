# Mis Pastillas — App Android

Tracker de pastillas nativo para Android con recordatorios diarios.

## Características
- ✅ Registra tomas con un solo toque
- 🔔 Notificaciones diarias a la hora que elijas
- 📅 Calendario visual (verde = tomada, rojo = olvidada)
- 🔥 Racha de días consecutivos
- 📊 Estadísticas mensuales
- 💊 Múltiples pastillas/hábitos
- 🌙 Modo oscuro automático

---

## Cómo instalar en tu Android (Windows)

### Paso 1 — Instala Node.js
1. Ve a https://nodejs.org y descarga la versión **LTS**
2. Instálala con las opciones por defecto
3. Abre el **Símbolo del sistema** (cmd) y comprueba: `node --version`

### Paso 2 — Instala Expo CLI y EAS CLI
Abre cmd y ejecuta:
```
npm install -g expo-cli eas-cli
```

### Paso 3 — Crea una cuenta gratuita en Expo
1. Ve a https://expo.dev y regístrate (es gratis)
2. En cmd, inicia sesión: `eas login`

### Paso 4 — Prepara el proyecto
1. Descomprime la carpeta `PillTracker` donde quieras (ej: `C:\PillTracker`)
2. En cmd, navega hasta ella:
```
cd C:\PillTracker
```
3. Instala las dependencias:
```
npm install
```

### Paso 5 — Configura el proyecto en Expo
```
eas init
```
Esto pedirá que elijas un nombre para el proyecto. Pon **MisPastillas**.  
Después actualizará el `app.json` automáticamente.

### Paso 6 — Compila el APK en la nube
```
eas build --platform android --profile preview
```
- La primera vez tardará unos **5-10 minutos** (Expo lo compila en sus servidores, no en tu PC)
- Cuando termine, te dará un **enlace de descarga** del APK

### Paso 7 — Instala el APK en tu móvil
1. Descarga el APK desde el enlace que te dio Expo
2. Pásalo a tu móvil (por cable, WhatsApp, email, etc.)
3. En tu Android: **Ajustes → Seguridad → Instalar apps desconocidas** → actívalo para el archivo manager o el navegador
4. Abre el APK y pulsa **Instalar**

¡Listo! La app aparecerá en tu menú como **"Mis Pastillas"** 💊

---

## Desarrollo local (opcional)
Si quieres ver los cambios en tiempo real sin compilar:

1. Instala la app **Expo Go** en tu móvil (Play Store)
2. Conecta el móvil y el PC a la **misma WiFi**
3. En la carpeta del proyecto: `npx expo start`
4. Escanea el QR con Expo Go

---

## Estructura del proyecto
```
PillTracker/
├── App.js                    # Navegación principal
├── app.json                  # Configuración de la app
├── eas.json                  # Configuración de compilación
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js     # Pantalla principal (hoy)
│   │   ├── CalendarScreen.js # Calendario e historial
│   │   ├── HabitsScreen.js   # Gestión de pastillas
│   │   └── LogScreen.js      # Registro manual
│   └── utils/
│       ├── AppContext.js      # Estado global
│       ├── storage.js         # Persistencia de datos
│       ├── notifications.js   # Notificaciones push
│       └── theme.js           # Colores y estilos
└── assets/                   # Iconos (añadir manualmente)
```

---

## Solución de problemas

**"eas no se reconoce como comando"**  
→ Cierra y vuelve a abrir cmd después de instalar Node.js

**El APK no se instala**  
→ Asegúrate de tener activado "Instalar apps de fuentes desconocidas" en los ajustes de Android

**Las notificaciones no llegan**  
→ Abre la app → pulsa "Activar recordatorios" → ve a Ajustes del móvil → Apps → Mis Pastillas → Notificaciones → actívalas todas

**Error "project not found" en eas build**  
→ Ejecuta primero `eas login` y luego `eas init`
