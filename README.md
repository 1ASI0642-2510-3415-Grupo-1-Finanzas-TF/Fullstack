# 🧮 Sistema de Bonos - Motor de Cálculos Financieros

Sistema completo para la gestión y cálculo de bonos financieros con método americano, desarrollado en Next.js 14 y TypeScript.

## 🎯 Características Principales

* **Motor de Cálculos Financieros** basado en fórmulas exactas (equivalente a Excel)
* **Flujos de Caja Unificados** para emisores e inversionistas
* **APIs RESTful** integradas con Next.js App Router
* **Base de Datos** gestionada con Prisma ORM y PostgreSQL
* **Custom Hooks** en React usando SWR para consumo de APIs
* **Tests Automatizados** con Jest (> 95% cobertura)
* **TypeScript** con tipado estricto para precisión en cálculos
* **Validación** de datos de entrada y resultados (Zod)
* **Performance** optimizado para cálculos complejos

## 🏗️ Arquitectura del Sistema

```text
Frontend (Next.js) → API Routes → Services → Database
     ↑                ↑                ↑           ↑
  Custom Hooks     Validación     Cálculos     PostgreSQL
     │                │                │           ↑
    SWR             Zod Schema      Excel.js    Prisma ORM
```

## 🚀 Inicio Rápido

### 1. Requisitos Previos

* Node.js v18+
* pnpm instalado globalmente (`npm install -g pnpm`)
* PostgreSQL 14+

Verifica las versiones:

```bash
node --version    # v18.0.0+
pnpm --version    # última versión
psql --version    # PostgreSQL 14+
```

### 2. Clonar e Instalar Dependencias

```bash
git clone <tu-repo-url>
cd sistema-bonos
pnpm install
```

### 3. Configurar Variables de Entorno

Copia el ejemplo y actualiza:

```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales y configuraciones
```

### 4. Preparar Base de Datos

```bash
createdb bonos_dev
createdb bonos_test
pnpm prisma generate
pnpm prisma migrate dev --name init
```

### 5. Ejecutar en Desarrollo

```bash
pnpm run dev           # Inicia servidor Next.js (http://localhost:3000)
pnpm run test          # Ejecuta todos los tests
pnpm run test:calculations   # Tests de cálculos financieros
```

## 📊 Motor de Cálculos Financieros

El `FinancialCalculator` implementa todas las fórmulas necesarias para el método americano:

1. **Cálculos Intermedios**

    * Frecuencia de cupón en días
    * Tasa efectiva anual y periódica
    * Costes iniciales (emisor/bonista)
2. **Flujos por Período**

    * Cupón de interés
    * Amortización de principal
    * Prima de emisión
    * Escudo fiscal
    * Flujos netos para emisores e inversionistas
3. **Métricas Financieras**

    * VAN (Valor Actual Neto)
    * TIR (Tasa Interna de Retorno)
    * TCEA y TREA
    * Duración y Duración Modificada
    * Convexidad

### Ejemplo de Uso

```typescript
import { FinancialCalculator } from '@/lib/services/calculations/FinancialCalculator';

const calculator = new FinancialCalculator();
const resultado = await calculator.calculate({
  valorNominal: 1000,
  valorComercial: 1050,
  numAnios: 5,
  frecuenciaCupon: 'semestral',
  tasaAnual: 0.08,
  inflacionSerie: [0.10, 0.10, 0.10, 0.10, 0.10],
  graciaSerie: ['S','S','S','S','S'],
});

console.log('TCEA Emisor:', resultado.metricas.tceaEmisor);
console.log('TREA Bonista:', resultado.metricas.treaBonista);
console.log('Flujos:', resultado.flujos);
```

> **Nota:** `inflacionSerie` y `graciaSerie` deben tener exactamente `numAnios` elementos.

## 🔌 APIs Disponibles

### Cálculo de Bonos

| Método | Ruta                            | Descripción                   |
| ------ | ------------------------------- | ----------------------------- |
| POST   | `/api/bonds/{bondId}/calculate` | Inicia o fuerza recálculo     |
| GET    | `/api/bonds/{bondId}/calculate` | Obtiene estado y resultados   |
| DELETE | `/api/bonds/{bondId}/calculate` | Elimina resultados existentes |

### Flujos de Caja

| Método | Ruta                                            | Descripción                |
| ------ | ----------------------------------------------- | -------------------------- |
| GET    | `/api/bonds/{bondId}/flows?role=...&format=...` | Descarga o muestra flujos  |
| POST   | `/api/bonds/{bondId}/flows`                     | Genera recálculo de flujos |

## 🛠 Scripts Disponibles

```bash
pnpm run dev                   # Desarrollo
pnpm run build                 # Build producción
pnpm run start                 # Iniciar en producción
pnpm run db:migrate            # Migraciones
pnpm run db:reset              # Reset BD completo
pnpm run db:seed               # Seeds de ejemplo
pnpm run test                  # Tests completos
pnpm run test:watch            # Tests modo watch
pnpm run test:coverage         # Reporte de cobertura
pnpm run calculate:bonds       # Benchmark de cálculos
pnpm run validate:excel        # Validación vs Excel
pnpm run lint                  # ESLint
pnpm run type-check            # Verificar tipos TypeScript
```

## 📁 Estructura del Proyecto

```text
proyecto-bonos/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   ├── emisor/             # Frontend de emisores
│   └── inversionista/      # Frontend de inversionistas
│
├── lib/                    # Lógica central
│   ├── services/calculations/  # Motor de cálculos
│   ├── models/             # Modelos de datos
│   ├── hooks/              # Custom hooks (SWR)
│   └── types/              # Definiciones TypeScript
│
├── tests/                  # Tests automatizados
├── scripts/                # Scripts de utilidades
├── docs/                   # Documentación adicional
└── examples/               # Ejemplos de uso
```

## 🔒 Seguridad

* Validación y sanitización de inputs con Zod
* Autenticación JWT y gestión de sesiones NextAuth
* Rate limiting en endpoints de cálculo
* Auditoría completa de operaciones

## 🚀 Deployment

### Producción

```bash
NODE_ENV=production
DATABASE_URL=postgresql://<USER>:<PASS>@host:5432/bonos_prod
FORCE_HTTPS=true
SECURE_COOKIES=true
pnpm run build
pnpm run start
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile --prod
COPY . .
RUN pnpm run build
EXPOSE 3000
CMD ["pnpm", "run", "start"]
```

## 🤝 Contribuir

1. Fork del repositorio
2. `git checkout -b feature/NombreFeature`
3. `pnpm install && pnpm run test`
4. `git push origin feature/NombreFeature`
5. Abre un Pull Request

---

**Desarrollado con ❤️ para la gestión profesional de bonos financieros**
