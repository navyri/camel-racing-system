<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=waving&height=190&color=7D2E2E&text=Camel%20Racing%20Backend&fontColor=FFF4E0&fontSize=40&fontAlignY=36&desc=Spring%20Boot%20%2B%20PostgreSQL%20%2B%20Keycloak&descAlignY=59&descSize=18"
    alt="Camel Racing Backend"
  />
</p>

<p align="center">
  <img
    src="https://minecraft.wiki/images/thumb/Camel_Idle.gif/200px-Camel_Idle.gif?72667"
    alt="Camel Racing System visual"
    height="200"
  />
</p>

<p align="center">
  <strong>API REST responsable de reglas de negocio, persistencia, seguridad, resultados, standings y audit log.</strong>
</p>

<p align="center">
  <a href="../README.md">Documentacion principal</a>
  ·
  <a href="#arquitectura-del-backend">Arquitectura</a>
  ·
  <a href="#seguridad">Seguridad</a>
  ·
  <a href="#api-rest">API</a>
  ·
  <a href="#pruebas">Pruebas</a>
</p>

<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=rect&height=6&color=7D2E2E"
    alt=""
  />
</p>

## Descripcion

Este directorio contiene el backend de Camel Racing System. La API REST fue construida con Spring Boot y concentra las reglas de negocio, seguridad, acceso a datos, validaciones, resultados, standings y auditoria.

El backend se conecta a PostgreSQL para la persistencia y utiliza Keycloak como proveedor de identidad. Spring Security valida los JWT emitidos por Keycloak y aplica las reglas de acceso por rol.

## Tecnologias

| Tecnologia | Uso |
|---|---|
| Java | Lenguaje principal |
| Spring Boot | Framework de aplicacion y API REST |
| Spring Security | Autenticacion y autorizacion |
| Spring Data JPA | Persistencia y repositorios |
| PostgreSQL | Base de datos relacional |
| Keycloak | Identidad, usuarios y roles |
| Gradle | Build y ejecucion de pruebas |
| Swagger / OpenAPI | Documentacion interactiva de API |
| JUnit, Mockito, Spring Test | Pruebas automatizadas |

## Arquitectura del backend

```text
Cliente autenticado
        |
        | JWT
        v
Spring Security
        |
        v
Controllers
        |
        v
Services
        |
        v
Repositories
        |
        v
PostgreSQL
```

La capa de servicios concentra las reglas de negocio. Los controladores exponen contratos HTTP mediante DTOs y los repositorios administran la persistencia con Spring Data JPA.

## Modulos de dominio

| Modulo | Responsabilidad |
|---|---|
| `competitor` | Gestion de competidores, estados, retiro y estadisticas |
| `team` | Gestion de equipos e integrantes |
| `race` | Gestion de carreras, ownership y transiciones de estado |
| `registration` | Inscripciones individuales, por equipo, aprobacion, rechazo y cancelacion |
| `result` | Registro, actualizacion y ranking de resultados |
| `standing` | Clasificacion de competidores y equipos |
| `audit` | Trazabilidad de operaciones relevantes |
| `user` | Usuarios locales vinculados con la identidad autenticada |
| `common` | Seguridad, excepciones, configuracion y utilidades compartidas |

## Seguridad

El backend funciona como OAuth 2.0 Resource Server.

- Recibe JWT emitidos por Keycloak
- Valida firma e issuer del token
- Convierte roles de Keycloak a autoridades con prefijo `ROLE_`
- Aplica autorizacion por ruta y por reglas de negocio
- Verifica ownership para que un `RACE_ORGANIZER` solo administre carreras propias
- Restringe la consulta de Audit Log a `ADMINISTRATOR`
- Mantiene la seguridad en backend aunque la interfaz oculte acciones no permitidas

### Roles

| Rol | Permisos principales |
|---|---|
| `ADMINISTRATOR` | Gestiona todos los recursos y consulta Audit Log |
| `RACE_ORGANIZER` | Gestiona carreras, inscripciones y resultados de su propiedad; consulta competidores y equipos |
| `VIEWER` | Consulta recursos permitidos sin operaciones de escritura |

## Reglas de negocio principales

- Una carrera puede ser `INDIVIDUAL`, `TEAM` o `MIXED`
- Una inscripcion representa exactamente un competidor o un equipo
- Un registro nuevo inicia como `PENDING`
- Solo los registros `APPROVED` consumen cupo y ocupan posicion de salida
- Un equipo debe estar activo y tener integrantes activos para registrarse
- Un competidor activo no puede tener conflictos entre participacion individual y participacion por equipo en la misma carrera
- Los resultados solo se registran para inscripciones aprobadas y carreras `IN_PROGRESS`
- Una carrera necesita un ganador oficial para pasar a `COMPLETED`
- Las estadisticas y standings se recalculan a partir de resultados
- Audit Log registra operaciones relevantes realizadas por servicios del backend

## Ejecucion local

Los servicios de infraestructura y backend se levantan desde la raiz del repositorio, donde se encuentra `compose.yml`.

```powershell
docker compose up -d --build
docker compose ps
```

El backend queda disponible en:

```text
http://localhost:8080
```

### Health check

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/actuator/health
```

Respuesta esperada:

```json
{
  "status": "UP"
}
```

### Logs

Desde la raiz del repositorio:

```powershell
docker compose logs -f backend
```

## Swagger y OpenAPI

Swagger UI esta disponible cuando el backend esta en ejecucion:

```text
http://localhost:8080/swagger-ui/index.html
```

Para consumir endpoints protegidos desde Swagger:

1. Abre Swagger UI
2. Presiona `Authorize`
3. Inicia sesion mediante Keycloak
4. Ejecuta las operaciones permitidas por el rol autenticado

El cliente Swagger usa Authorization Code Flow con PKCE.

## API REST

| Recurso | Ruta base |
|---|---|
| Competidores | `/api/competitors` |
| Equipos | `/api/teams` |
| Carreras | `/api/races` |
| Inscripciones | `/api/races/{raceId}/registrations` |
| Resultados | `/api/races/{raceId}/results` |
| Standings | `/api/standings` |
| Audit Log | `/api/audit-logs` |

### Ejemplo de consulta autenticada

```powershell
$headers = @{
  Authorization = "Bearer <JWT_DE_KEYCLOAK>"
}

Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:8080/api/competitors?page=0&size=5" `
  -Headers $headers
```

### Ejemplo de creacion de competidor

```powershell
$headers = @{
  Authorization = "Bearer <JWT_DE_KEYCLOAK>"
  "Content-Type" = "application/json"
}

$body = @{
  name = "Demo Rider"
  nickname = "Sand Runner"
  competitorType = "CAMEL"
  approximateAge = 24
  weightKg = 70
  heightCm = 175
  origin = "Desert Camp"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:8080/api/competitors" `
  -Headers $headers `
  -Body $body
```

No publiques tokens JWT reales en el repositorio, capturas o documentacion.

## Modelo de persistencia

El backend utiliza PostgreSQL y Spring Data JPA. Las tablas principales son:

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

Las relaciones relevantes son:

```text
User -> Role
User -> Race / RaceRegistration / RaceResult / AuditLog
Race -> RaceRegistration -> RaceResult
Team -> TeamMember -> Competitor
```

Consulta el modelo completo en el [README principal](../README.md#modelo-de-base-de-datos).

## Pruebas

Desde la carpeta `backend`:

```powershell
.\gradlew.bat test
```

Resultado esperado:

```text
BUILD SUCCESSFUL
```

La suite cubre controladores, servicios, repositorios, seguridad, validaciones y reglas de negocio de los modulos principales.

## Datos demo

El seed de demostracion se encuentra en la raiz del repositorio:

```text
../seed-dark-fantasy-demo.sql
```

El script inserta datos directamente en PostgreSQL y debe ejecutarse contra una base completamente limpia. Esto incluye:

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

El seed crea tres usuarios locales vinculados a los sujetos reales de Keycloak y les asigna los roles `ADMINISTRATOR`, `RACE_ORGANIZER` y `VIEWER`. Tambien inserta nueve competidores, tres equipos, siete carreras, trece inscripciones y nueve resultados.

Ejecuta el seed desde la raiz del repositorio:

```powershell
Get-Content .\seed-dark-fantasy-demo.sql |
    docker exec -i camel-racing-db psql -v ON_ERROR_STOP=1 -U camel_racing_user -d camel_racing_db
```

El seed no genera eventos de Audit Log porque las inserciones SQL no atraviesan los servicios del backend. Para generar auditoria, realiza acciones desde la interfaz o API despues de cargar los datos.

Consulta instrucciones completas en el [README principal](../README.md#datos-de-demostracion) y en [Keycloak](../keycloak/README.md#datos-demo-y-seed).

## Problemas frecuentes

| Situacion | Posible causa | Accion recomendada |
|---|---|---|
| Backend no responde | El contenedor aun no termina de iniciar | Ejecuta `docker compose ps` y revisa logs |
| Health check falla | Spring Boot no inicio correctamente | Ejecuta `docker compose logs -f backend` |
| Error de autenticacion | Keycloak no esta disponible o JWT invalido | Verifica Keycloak y vuelve a iniciar sesion |
| Error de base de datos | PostgreSQL no esta disponible | Revisa `docker compose ps` y logs del servicio |
| Swagger no autoriza | El flujo OIDC no finaliza o Keycloak no esta listo | Espera el inicio de Keycloak y revisa configuracion del realm |
| Error 403 para organizer | La carrera pertenece a otro organizador o el rol no tiene permiso | Usa una carrera propia o inicia sesion como administrador |
| Seed aborta por datos existentes | La base contiene usuarios, roles o datos de negocio | Usa una base limpia o ejecuta `docker compose down -v` si autorizas borrar el entorno local |

## Documentacion relacionada

- [README principal](../README.md)
- [Frontend](../frontend/README.md)
- [Keycloak](../keycloak/README.md)

<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=waving&height=110&section=footer&color=7D2E2E"
    alt=""
  />
</p>