<img src="logo.png" alt="HoldHabits" width="80" style="border-radius:16px"/>

# HoldHabits

**HoldHabits** es una app Android nativa para registrar y dar seguimiento a tus hábitos diarios. Con recordatorios personalizados, calendario visual y estadísticas detalladas, te ayuda a mantener el rumbo día a día.

<img src="screenshots/home.png" width="200" alt="Home screen" /> <img src="screenshots/calendar.png" width="200" alt="Calendar" /> <img src="screenshots/stats.png" width="200" alt="Stats" />

## ✨ Características

- ✅ **Registro con un toque** – Marca hábitos completados al instante con feedback háptico
- 🔔 **Recordatorios inteligentes** – Notificaciones diarias, cada X días, semanas o meses, con selección de días específicos (L/M/X/J/V/S/D)
- 📅 **Calendario mensual** – Vista clara con colores: verde (completado), ámbar (parcial), rojo (pendiente). Heatmap anual incluido
- 🔥 **Rachas** – Racha actual y mejor racha histórica por hábito y global
- 📊 **Estadísticas** – Barras semanales, cumplimiento a 7 y 30 días por hábito, minicalendario mensual con navegación
- 📂 **Categorías** – Agrupa hábitos por tipo (Salud, Ejercicio, Estudio, Trabajo, Hogar, Ocio, Social)
- 🎨 **Iconos y colores personalizados** – Emojis, colores por hábito y emoji personalizado
- 📦 **Archivar** – Oculta hábitos sin perder datos. Restáuralos cuando quieras
- 🔄 **Reordenar** – Arrastra para cambiar el orden de tus hábitos
- 📤 **Backup / Restore** – Exporta e importa tus datos como JSON
- 🌙 **Modo oscuro automático** – Sigue la configuración del sistema
- 📱 **Enfoque** – Modo focus para ver solo hábitos pendientes del día

## 🛠️ Tecnologías

- **React Native** (Expo SDK 54)
- **TypeScript**
- **React Navigation** (native-stack + bottom-tabs)
- **react-native-draggable-flatlist** (reordenar hábitos)
- **expo-notifications** (recordatorios)
- **react-native-reanimated** (animaciones)
- **AsyncStorage** (persistencia local)
- **date-fns** (manejo de fechas)
- **Jest + Testing Library** (tests unitarios)

## 🚀 Cómo empezar

```bash
# Clonar
git clone https://github.com/DavidencoHD/HoldHabits.git
cd HoldHabits

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npx expo start
```

Escanea el QR con **Expo Go** (Android) o presiona `a` para abrir el emulador.

### Tests

```bash
npm test
```

## 📁 Estructura

```
HoldHabits/
├── App.tsx                  # Entrada principal, navegación y onboarding
├── src/
│   ├── screens/             # Pantallas
│   │   ├── HomeScreen       # Vista del día con tarjetas y progreso
│   │   ├── CalendarScreen   # Calendario mensual y heatmap anual
│   │   ├── HabitsScreen     # CRUD de hábitos con drag reorder
│   │   ├── StatsScreen      # Estadísticas y backup
│   │   ├── LogScreen        # Registro manual para fechas pasadas
│   │   └── OnboardingScreen # Tutorial inicial (3 pantallas)
│   ├── components/          # Componentes reutilizables
│   │   └── ErrorBoundary    # Captura de errores con UI de reintento
│   ├── utils/               # Lógica compartida
│   │   ├── AppContext        # Estado global (hábitos, entradas, notificaciones)
│   │   ├── storage           # AsyncStorage, streaks, export/import
│   │   ├── notifications     # Programación y categorías de notificaciones
│   │   └── theme             # Colores claro/oscuro
│   ├── __tests__/           # Tests unitarios
│   └── types.ts             # Interfaces TypeScript
├── assets/                  # Iconos y splash
├── app.json                 # Configuración Expo
├── tsconfig.json            # Configuración TypeScript
└── jest.config.js           # Configuración de tests
```

## 📱 Pantallas

| Pantalla | Descripción |
|----------|-------------|
| **Hoy** | Tarjeta de progreso circular, hábitos agrupados por categoría, modo enfoque, racha actual |
| **Estadísticas** | Barras de la última semana, cumplimiento por hábito (30d + 7d), minicalendario mensual navegable, export CSV y backup |
| **Historial** | Calendario mensual con colores por estado, heatmap anual plegable, detalle al tocar un día |
| **Hábitos** | CRUD completo, arrastrar para reordenar, selector de frecuencia, días de la semana, emoji personalizado, archivar/restaurar |

## 📄 Licencia

Este proyecto es de uso personal.
