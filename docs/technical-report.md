# Informe Técnico

## Camel Racing System

**Curso:** Implementación e Integración de Software  
**Institución:** Universidad EIA  
**Autora:** Mary  
**Tipo de proyecto:** Desarrollo individual  
**Repositorio:** https://github.com/navyri/camel-racing-system

## 1. Objetivo

Camel Racing System es una plataforma web para administrar competencias ficticias de carreras entre camellos, enanos y competidores de tamaño mediano. El sistema permite gestionar competidores, equipos, carreras, inscripciones, resultados, standings y auditoría de operaciones relevantes.

El objetivo técnico fue construir una solución completa con una API REST en Java, una interfaz gráfica web, persistencia relacional, autenticación y autorización por roles, pruebas automatizadas y ejecución integral mediante Docker.

## 2. Arquitectura

La solución sigue una arquitectura cliente-servidor compuesta por cuatro servicios principales:

```text
Frontend React
      |
      | HTTP con Bearer Token
      v
Backend Spring Boot
      |
      +--------------------+
      |                    |
      v                    v
PostgreSQL             Keycloak
```

| Componente | Responsabilidad |
|---|---|
| Frontend | Interfaz gráfica, navegación, formularios, validaciones de experiencia y consumo de la API |
| Backend | API REST, reglas de negocio, autorización, validación, persistencia, standings y auditoría |
| PostgreSQL | Almacenamiento relacional persistente |
| Keycloak | Autenticación, emisión de JWT, administración de usuarios y roles |
| Docker Compose | Orquestación de servicios, red interna, volumen y configuración local |

El backend se organiza por capas y dominios:

```text
controller
service
repository
entity
dto
mapper
security
exception
config
```

Los controladores reciben solicitudes HTTP y validan el formato de entrada. La lógica de negocio se concentra en servicios. Los repositorios administran la persistencia con Spring Data JPA. Los DTO separan la API de las entidades JPA.

## 3. Tecnologías

| Capa | Tecnologías |
|---|---|
| Frontend | React, TypeScript, Vite, CSS, Nginx |
| Backend | Java, Spring Boot, Spring Web, Spring Security, Spring Data JPA, Gradle |
| Persistencia | PostgreSQL |
| Identidad | Keycloak, OAuth 2.0, OpenID Connect, JWT |
| API | REST, Swagger, OpenAPI |
| Pruebas frontend | Vitest, Testing Library |
| Pruebas backend | JUnit, Mockito, Spring Test |
| Contenedores | Docker, Docker Compose |

## 4. Modelo de datos

El modelo relacional contiene las siguientes entidades principales:

```text
users
roles
user_roles
competitors
teams
team_members
races
race_registrations
race_results
audit_logs
```

El diagrama entidad-relación detallado está disponible en:

- [Diagrama de base de datos](./database-diagram.md)

Relaciones principales:

```text
User -> Race
User -> RaceRegistration
User -> RaceResult
User -> AuditLog
User <-> Role through UserRole
Team -> TeamMember -> Competitor
Race -> RaceRegistration -> RaceResult
```

La entidad central es `RaceRegistration`. Una inscripción representa exactamente un competidor individual o un equipo, pero nunca ambos al mismo tiempo. Esta regla se mantiene mediante una restricción de base de datos equivalente a:

```text
competitor_id XOR team_id
```

Cada inscripción puede tener como máximo un resultado oficial.

## 5. Seguridad

Keycloak centraliza la autenticación y administra los roles del realm `camel-racing`. El frontend utiliza OpenID Connect para iniciar y cerrar sesión. El backend opera como OAuth 2.0 Resource Server y valida los JWT emitidos por Keycloak.

El backend no genera JWT propios. Keycloak administra la firma, expiración y metadatos de validación de los tokens. Por esa razón, la aplicación no depende de variables locales `JWT_SECRET` ni `JWT_EXPIRATION`.

La seguridad se aplica en dos niveles:

1. El frontend adapta rutas y controles visuales al rol autenticado.
2. El backend valida permisos y ownership antes de ejecutar operaciones.

El segundo nivel es la autoridad final y evita que una petición directa a la API omita la restricción de interfaz.

### Roles

| Rol | Permisos principales |
|---|---|
| `ADMINISTRATOR` | Administra competidores, equipos, carreras, inscripciones y resultados. Consulta Audit Log |
| `RACE_ORGANIZER` | Administra únicamente carreras propias, sus inscripciones y resultados. Consulta competidores y equipos |
| `VIEWER` | Consulta información permitida sin operaciones de escritura |

El sistema responde con `401 Unauthorized` ante tokens ausentes o inválidos, y con `403 Forbidden` cuando el usuario autenticado no tiene permisos suficientes.

## 6. Módulos funcionales

### 6.1 Competidores

Permite crear, consultar, editar, filtrar, ordenar y paginar competidores. Cada competidor incluye nombre, nickname único, tipo, estado, edad aproximada o fecha de nacimiento, peso, altura, origen y estadísticas.

Reglas principales:

- El nickname es único.
- Peso y altura deben ser positivos.
- Solo competidores `ACTIVE` pueden participar en nuevas carreras.
- Un competidor con historial oficial se retira o cambia de estado en lugar de eliminarse físicamente.

### 6.2 Equipos

Permite crear equipos, consultar detalles, editar, desactivar y gestionar integrantes.

Reglas principales:

- El nombre del equipo es único.
- Un competidor no puede pertenecer a más de un equipo activo.
- Un equipo activo necesita integrantes activos para participar.
- Las membresías se conservan históricamente mediante `active` y `left_at`.

### 6.3 Carreras

Permite crear, listar, filtrar, editar, cambiar estado y cancelar carreras.

Tipos soportados:

```text
INDIVIDUAL
TEAM
MIXED
```

Estados soportados:

```text
DRAFT
OPEN_FOR_REGISTRATION
CLOSED_FOR_REGISTRATION
IN_PROGRESS
COMPLETED
CANCELLED
```

Reglas principales:

- La distancia debe ser positiva.
- La carrera debe programarse para una fecha futura.
- La fecha límite de inscripción debe ser anterior a la fecha programada.
- La capacidad mínima es dos participantes.
- Una carrera completada no puede editarse.
- Una carrera cancelada no recibe inscripciones.
- Una carrera necesita un ganador oficial antes de pasar a `COMPLETED`.
- Un organizer solo administra carreras de su propiedad.

### 6.4 Inscripciones

Permite registrar competidores o equipos, aprobar, rechazar y cancelar participaciones.

Reglas principales:

- Una inscripción representa exactamente un competidor o un equipo.
- Las inscripciones nuevas se crean como `PENDING`.
- Solo las inscripciones `APPROVED` consumen cupo y reservan posición de salida.
- La aprobación requiere una posición válida y no duplicada.
- Las inscripciones rechazadas requieren una razón.
- No se permiten duplicados.
- Un competidor no puede participar individualmente y mediante un equipo activo en la misma carrera.

### 6.5 Resultados y standings

Permite registrar y actualizar resultados oficiales de participantes aprobados en carreras `IN_PROGRESS`.

Estados de resultado:

```text
FINISHED
DISQUALIFIED
DID_NOT_FINISH
DID_NOT_START
```

Reglas principales:

- Solo inscripciones aprobadas reciben resultados.
- Cada inscripción tiene como máximo un resultado oficial.
- Un resultado `FINISHED` requiere posición final y tiempo positivo.
- Las posiciones finales no se duplican entre finalistas.
- Las estadísticas de victorias, derrotas y carreras completadas se actualizan a partir de resultados.
- Los standings asignan puntos a competidores y equipos según sus posiciones oficiales.

### 6.6 Audit Log

El sistema registra eventos relevantes realizados desde servicios del backend.

Eventos auditados incluyen:

```text
USER_CREATED
COMPETITOR_UPDATED
COMPETITOR_STATUS_CHANGED
COMPETITOR_RETIRED
RACE_CANCELLED
REGISTRATION_APPROVED
REGISTRATION_REJECTED
REGISTRATION_CANCELLED
RESULT_UPDATED
```

Solo el rol `ADMINISTRATOR` puede consultar el endpoint `GET /api/audit-logs`.

## 7. Interfaz gráfica

La interfaz web fue desarrollada con React, TypeScript y Vite. Se sirve mediante Nginx dentro de Docker para el entorno integrado.

La interfaz incluye:

- Inicio de sesión y cierre de sesión con Keycloak.
- Listado, búsqueda, filtros, ordenamiento y paginación.
- Formularios de creación y edición.
- Validaciones de campos y mensajes comprensibles.
- Estados de carga, vacío, éxito y error.
- Confirmación para acciones destructivas o de cambio de estado.
- Páginas de acceso denegado y recurso no encontrado.
- Rutas protegidas y controles visuales adaptados al rol.
- Pantallas para competidores, equipos, carreras, inscripciones, resultados, standings y administración.

La interfaz no accede directamente a PostgreSQL. Toda interacción de datos se realiza mediante la API REST autenticada.

## 8. API REST y manejo de errores

La API REST utiliza convenciones HTTP:

| Operación | Método |
|---|---|
| Consultar | `GET` |
| Crear | `POST` |
| Actualizar | `PUT` |
| Cambio parcial o transición | `PATCH` |
| Desactivar o cancelar | `DELETE` |

Códigos de respuesta relevantes:

| Código | Uso |
|---|---|
| `200 OK` | Consulta o actualización exitosa |
| `201 Created` | Recurso creado |
| `204 No Content` | Operación de eliminación o desactivación exitosa |
| `400 Bad Request` | Datos inválidos |
| `401 Unauthorized` | Token faltante o inválido |
| `403 Forbidden` | Usuario autenticado sin permiso |
| `404 Not Found` | Recurso inexistente |
| `409 Conflict` | Conflicto con reglas de negocio |

Swagger UI se encuentra disponible en:

```text
http://localhost:8080/swagger-ui/index.html
```

La colección Postman para verificación adicional está disponible en:

```text
docs/postman/camel-racing-system.postman_collection.json
```

## 9. Pruebas automatizadas

El proyecto incluye pruebas automatizadas para reglas de negocio, controladores, autorización, validaciones y comportamiento de frontend.

Backend:

```powershell
Set-Location .\backend
.\gradlew.bat test
```

Frontend:

```powershell
Set-Location .\frontend
npm run lint
npx vitest run
npm run build
```

Las validaciones registradas incluyen pruebas de creación, validación, duplicados, roles, inscripciones, resultados, standings, auditoría y componentes de interfaz.

## 10. Docker y ejecución local

Docker Compose levanta los siguientes servicios:

| Servicio | Puerto | Responsabilidad |
|---|---:|---|
| Frontend | 5173 | React compilado y servido por Nginx |
| Backend | 8080 | API REST Spring Boot |
| PostgreSQL | 5432 | Base de datos relacional |
| Keycloak | 8180 | Autenticación y roles |

El sistema se inicia con:

```powershell
docker compose up -d
```

Verificación de servicios:

```powershell
docker compose ps
Invoke-WebRequest -UseBasicParsing http://localhost:8080/actuator/health
Invoke-WebRequest -UseBasicParsing http://localhost:5173/health
Invoke-WebRequest -UseBasicParsing http://localhost:8180/realms/camel-racing/.well-known/openid-configuration
```

Docker Compose configura:

- Contenedor de backend.
- Contenedor de PostgreSQL.
- Contenedor de frontend.
- Contenedor de Keycloak.
- Volumen nombrado persistente para PostgreSQL.
- Red bridge aislada.
- Puertos publicados para acceso local.
- Política `restart: unless-stopped`.
- Health checks para los servicios.

## 11. Datos de demostración

El archivo `seed-dark-fantasy-demo.sql` carga datos de demostración en una base vacía.

Incluye:

| Entidad | Cantidad |
|---|---:|
| Usuarios locales | 3 |
| Roles | 3 |
| Competidores | 9 |
| Equipos | 3 |
| Integrantes de equipos | 6 |
| Carreras | 7 |
| Inscripciones | 13 |
| Resultados | 9 |

Distribución de competidores:

```text
DWARF: 5
CAMEL: 2
MEDIUM: 2
```

El seed se ejecuta desde la raíz del repositorio:

```powershell
Get-Content .\seed-dark-fantasy-demo.sql |
    docker exec -i camel-racing-db psql -v ON_ERROR_STOP=1 -U camel_racing_user -d camel_racing_db
```

El seed inserta datos directamente en PostgreSQL y por ello no genera Audit Log. Los eventos de auditoría se generan al realizar operaciones desde la interfaz o API.

## 12. Limitaciones conocidas

- El entorno está diseñado para desarrollo y demostración local, no para producción.
- Las cuentas demo y credenciales de desarrollo no deben reutilizarse fuera del entorno académico.
- El seed requiere una base completamente limpia.
- Las inserciones SQL del seed no generan eventos de auditoría.
- La consola de Keycloak se utiliza solo para administración local.
- El video de demostración debe agregarse al repositorio o documentación final.

## 13. Mejoras futuras

- Agregar filtros avanzados de Audit Log por usuario, acción, entidad y rango de fechas.
- Exportar standings y reportes.
- Incorporar métricas y observabilidad de producción.
- Agregar control de concurrencia para operaciones simultáneas.
- Implementar índices adicionales para consultas administrativas de auditoría.
- Evaluar exportación CSV o PDF.
- Añadir una canalización CI/CD con GitHub Actions.
- Agregar el video final de demostración.