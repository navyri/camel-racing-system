<p align="center">
  <img
    src=https://capsule-render.vercel.app/api?type=waving&height=190&color=6d3f15&text=Camel%20Racing%20Frontend&fontColor=FFF4E0&fontSize=40&fontAlignY=36&desc=React%20%2B%20TypeScript%20%2B%20Vite%20%2B%20Nginx&descAlignY=59&descSize=18"
    alt="Camel Racing Frontend"
  />
</p>

<p align="center">
  <img
    src="https://static.wikia.nocookie.net/minecraft_gamepedia/images/5/50/Camel_Sitting.png/revision/latest/scale-to-width/360?cb=20221019205909"
    alt="Camel Racing System visual"
    height="150"
  />
</p>

<p align="center">
  <strong>Interfaz web de Camel Racing System con autenticacion, autorizacion por roles y gestion visual de competencias.</strong>
</p>

<p align="center">
  <a href="../README.md">Documentacion principal</a>
  ·
  <a href="#requisitos">Requisitos</a>
  ·
  <a href="#ejecucion-con-docker">Docker</a>
  ·
  <a href="#desarrollo-local">Desarrollo local</a>
  ·
  <a href="#modulos">Modulos</a>
  ·
  <a href="#pruebas">Pruebas</a>
</p>

<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=rect&height=6&color=6d3f15"
    alt=""
  />
</p>

## Descripcion

Este directorio contiene el frontend de Camel Racing System. La interfaz fue construida con React, TypeScript y Vite, y permite consumir de forma autenticada la API REST del backend.

Para la ejecucion completa con Docker, Vite compila la aplicacion y Nginx sirve el build de produccion. Esto permite que toda la solucion se inicie con un unico comando de Docker Compose.

La aplicacion adapta las acciones disponibles segun el rol autenticado. El backend mantiene siempre la validacion definitiva de permisos y reglas de negocio.

La direccion visual del proyecto es **Dark Desert Shrine**, con una estetica de registro antiguo de carreras, expedicion por el desierto y club de competencia misterioso.

## Tecnologias

| Tecnologia | Uso |
|---|---|
| React | Construccion de la interfaz |
| TypeScript | Tipado estatico y contratos de frontend |
| Vite | Desarrollo local y build de produccion |
| Nginx | Servicio del build de produccion dentro de Docker |
| Keycloak JS | Autenticacion mediante OpenID Connect |
| Vitest | Ejecucion de pruebas unitarias |
| Testing Library | Pruebas de componentes e interacciones |
| CSS | Estilos, responsive y estetica Dark Desert Shrine |

## Requisitos

Para ejecutar la solucion completa con Docker:

| Herramienta | Uso |
|---|---|
| Docker Desktop | Construye y ejecuta todos los servicios |
| Docker Compose | Orquesta frontend, backend, PostgreSQL y Keycloak |

Para desarrollo local del frontend y ejecucion de pruebas:

| Herramienta | Uso |
|---|---|
| Node.js | Instalar dependencias y ejecutar Vite |
| npm | Scripts de desarrollo, lint, pruebas y build |

Los servicios esperados son:

| Servicio | Direccion |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend Spring Boot | `http://localhost:8080` |
| Keycloak | `http://localhost:8180` |

## Ejecucion con Docker

Desde la raiz del repositorio:

```powershell
docker compose up -d
```

Este comando construye el frontend con Vite y lo sirve con Nginx junto con los demas servicios del sistema.

Verifica los contenedores:

```powershell
docker compose ps
```

Abre la interfaz:

```text
http://localhost:5173
```

Verifica el health check del frontend:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5173/health
```

Si realizas cambios en el codigo fuente y necesitas reconstruir la imagen:

```powershell
docker compose up -d --build frontend
```

Para consultar logs:

```powershell
docker compose logs -f frontend
```

## Desarrollo local

Para trabajar con hot reload de Vite sin reconstruir la imagen Docker:

```powershell
docker compose stop frontend
Set-Location .\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Vite iniciara normalmente en:

```text
http://localhost:5173
```

Antes de iniciar Vite manualmente se detiene el contenedor frontend para liberar el puerto `5173`.

Cuando quieras volver a usar el frontend en Docker:

```powershell
Set-Location ..
docker compose start frontend
```

## Variables de entorno

Para Docker, las variables publicas necesarias se inyectan durante el build desde `compose.yml`.

Para ejecutar Vite manualmente, crea un archivo `.env` local:

```powershell
Copy-Item .env.example .env
```

Configuracion esperada:

```text
VITE_API_BASE_URL=http://localhost:8080
VITE_KEYCLOAK_URL=http://localhost:8180
VITE_KEYCLOAK_REALM=camel-racing
VITE_KEYCLOAK_CLIENT_ID=camel-racing-frontend
```

No subas el archivo `.env` si contiene configuracion local o secretos.

## Modulos

| Modulo | Funcion principal |
|---|---|
| Home | Muestra standings de competidores y equipos |
| Competitors | Gestiona competidores, filtros, detalle, edicion y estados |
| Teams | Gestiona equipos, integrantes, detalle, edicion y desactivacion |
| Races | Gestiona carreras, filtros, detalle, formulario y transiciones de estado |
| Registrations | Gestiona inscripciones individuales, por equipo y mixtas |
| Results | Consulta, registra y actualiza resultados de carrera |
| Administration | Muestra Audit Log para el rol administrador |
| Auth | Gestiona inicio de sesion, cierre de sesion, roles y rutas protegidas |

## Rutas principales

| Ruta | Descripcion |
|---|---|
| `/` | Home y standings |
| `/competitors` | Listado de competidores |
| `/competitors/new` | Crear competidor |
| `/competitors/:competitorId` | Detalle de competidor |
| `/teams` | Listado de equipos |
| `/teams/new` | Crear equipo |
| `/teams/:teamId` | Detalle de equipo |
| `/races` | Listado de carreras |
| `/races/new` | Crear carrera |
| `/races/:raceId` | Detalle de carrera |
| `/races/:raceId/registrations` | Inscripciones de una carrera |
| `/races/:raceId/results` | Resultados de una carrera |
| `/administration` | Audit Log para administrador |
| `/forbidden` | Acceso denegado |
| `*` | Pagina no encontrada |

Nginx usa un fallback hacia `index.html` para que React Router pueda resolver las rutas internas despues de una recarga directa.

## Autenticacion y autorizacion

El frontend utiliza Keycloak para iniciar y cerrar sesion. El contexto de autenticacion mantiene el usuario autenticado, sus roles y las operaciones de login/logout.

Los componentes de interfaz aplican controles visuales segun el rol:

| Rol | Comportamiento de interfaz |
|---|---|
| `ADMINISTRATOR` | Visualiza y administra todos los recursos disponibles |
| `RACE_ORGANIZER` | Gestiona recursos asociados a sus propias carreras |
| `VIEWER` | Visualiza informacion sin acciones de escritura |

El frontend incluye guards de ruta y controles de interfaz, pero estos no reemplazan las verificaciones de seguridad del backend.

## Estructura principal

```text
frontend/
├── public/
│   ├── images/
│   └── silent-check-sso.html
├── src/
│   ├── api/
│   ├── app/
│   ├── auth/
│   ├── components/
│   │   ├── common/
│   │   └── layout/
│   ├── features/
│   │   ├── audit/
│   │   ├── competitors/
│   │   ├── races/
│   │   ├── registrations/
│   │   ├── results/
│   │   └── teams/
│   ├── pages/
│   ├── styles/
│   └── utils/
├── .env.example
├── Dockerfile
├── nginx.conf
├── package.json
├── vite.config.ts
└── README.md
```

## Accesibilidad y experiencia

La interfaz incluye practicas orientadas a accesibilidad y usabilidad:

- Etiquetas asociadas a campos de formulario
- Estados de carga, error y vacio
- Tablas semanticas para listados
- Navegacion por teclado
- Foco visible
- Dialogos con soporte para Escape y clic sobre backdrop cuando aplica
- Retorno de foco al control que abrio un dialogo
- Prevencion de doble envio en acciones de escritura
- Adaptacion para pantallas angostas y zoom elevado

## Pruebas

Desde la carpeta `frontend`:

```powershell
npm run lint
npx vitest run
npm run build
```

Estas validaciones cubren:

| Comando | Proposito |
|---|---|
| `npm run lint` | Revisar reglas de calidad y estilo |
| `npx vitest run` | Ejecutar pruebas automatizadas |
| `npm run build` | Verificar el build de produccion |

La ultima validacion registrada fue:

```text
48 test files passed
372 tests passed
Build successful
```

## Problemas frecuentes

| Situacion | Posible causa | Accion recomendada |
|---|---|---|
| La pagina no carga datos | El backend no esta disponible | Verifica `http://localhost:8080/actuator/health` |
| El login no funciona | Keycloak no ha terminado de iniciar o las variables no coinciden | Revisa `docker compose ps`, logs de Keycloak y configuracion del frontend |
| El frontend no abre en 5173 | El contenedor no inicio o el puerto esta ocupado | Ejecuta `docker compose ps` y `docker compose logs -f frontend` |
| Vite no inicia localmente | Dependencias no instaladas | Ejecuta `npm install` |
| Error de API o 401 | No hay sesion valida o el token expiro | Cierra sesion, vuelve a iniciar y verifica Keycloak |
| Accion no visible | El usuario no tiene el rol o ownership necesario | Prueba con `admin` o revisa la propiedad de la carrera |
| Recarga directa devuelve error | Configuracion Nginx ausente o desactualizada | Reconstruye el servicio frontend con `docker compose up -d --build frontend` |

## Documentacion relacionada

- [README principal](../README.md)
- [Backend](../backend/README.md)
- [Keycloak](../keycloak/README.md)

<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=waving&height=110&section=footer&color=6d3f15"
    alt=""
  />
</p>