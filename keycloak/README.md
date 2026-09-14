<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=waving&height=190&color=D6A85D&text=Camel%20Racing%20Keycloak&fontColor=24170F&fontSize=40&fontAlignY=36&desc=Realm%2C%20roles%20and%20local%20authentication&descAlignY=59&descSize=18"
    alt="Camel Racing Keycloak"
  />
</p>

<p align="center">
  <img
    src="https://custom-doodle.com/wp-content/uploads/doodle/minecraft-dashingcamel/minecraft-camel%E2%80%8C-dashing-doodle.gif"
    alt="Camel Racing System visual"
    height="180"
  />
</p>

<p align="center">
  <strong>Configuracion de identidad, autenticacion y roles para el entorno academico local.</strong>
</p>

<p align="center">
  <a href="../README.md">Documentacion principal</a>
  ·
  <a href="#importacion-del-realm">Realm</a>
  ·
  <a href="#usuarios-de-demostracion">Usuarios demo</a>
  ·
  <a href="#swagger-y-autorizacion">Swagger</a>
</p>

<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=rect&height=6&color=D6A85D"
    alt=""
  />
</p>

## Descripcion

Este directorio contiene el realm de Keycloak utilizado por Camel Racing System en el entorno academico de desarrollo.

Keycloak centraliza la autenticacion, los usuarios y los roles. El frontend utiliza OpenID Connect para iniciar sesion y el backend valida los JWT emitidos por Keycloak antes de autorizar operaciones.

## Importacion del realm

Docker Compose inicia Keycloak usando la opcion:

```text
--import-realm
```

El archivo:

```text
realm-camel-racing.json
```

crea los recursos necesarios para la aplicacion:

- Realm: `camel-racing`
- Cliente publico para Swagger: `camel-racing-swagger`
- Cliente utilizado por el frontend: `camel-racing-frontend`
- Roles de realm:
  - `ADMINISTRATOR`
  - `RACE_ORGANIZER`
  - `VIEWER`
- Usuarios de demostracion

La importacion se ejecuta cuando Keycloak inicia sobre un entorno de desarrollo vacio.

## Roles

| Rol | Uso dentro del sistema |
|---|---|
| `ADMINISTRATOR` | Gestion completa de recursos y acceso a Audit Log |
| `RACE_ORGANIZER` | Gestion de carreras, inscripciones y resultados propios |
| `VIEWER` | Acceso de solo lectura |

El backend transforma estos roles en autoridades de Spring Security con el prefijo `ROLE_`.

## Usuarios de demostracion

Estas cuentas existen exclusivamente para desarrollo academico y demostracion local.

| Usuario | Contrasena | Rol |
|---|---|---|
| `admin` | `AdminCamel2026` | `ADMINISTRATOR` |
| `organizer` | `OrganizerCamel2026` | `RACE_ORGANIZER` |
| `viewer` | `ViewerCamel2026` | `VIEWER` |

Estas contrasenas no son credenciales personales y no deben reutilizarse fuera de este proyecto.

## Consola administrativa

Despues de iniciar Docker Compose, Keycloak queda disponible en:

```text
http://localhost:8180
```

La consola administrativa usa las variables:

```text
KEYCLOAK_ADMIN_USERNAME
KEYCLOAK_ADMIN_PASSWORD
```

Los valores de desarrollo se definen en `.env.template`. No subas un archivo `.env` real al repositorio si contiene credenciales locales.

## Swagger y autorizacion

Swagger UI esta disponible mediante el backend:

```text
http://localhost:8080/swagger-ui/index.html
```

Para autorizar solicitudes desde Swagger:

1. Inicia PostgreSQL, Keycloak y backend mediante Docker Compose.
2. Abre Swagger UI.
3. Presiona el boton `Authorize`.
4. Inicia sesion con uno de los usuarios de demostracion.
5. Ejecuta los endpoints permitidos por el rol autenticado.

El cliente de Swagger usa OAuth 2.0 Authorization Code Flow con PKCE. No se almacena un client secret en el navegador.

## URLs utilizadas

El navegador accede a Keycloak mediante la URL publica local:

```text
http://localhost:8180
```

El backend dentro de Docker accede a Keycloak a traves de la red interna:

```text
http://keycloak:8080
```

Ambas URLs son necesarias porque el navegador y los contenedores Docker resuelven Keycloak desde redes diferentes.

El backend obtiene las claves de firma desde la URL interna y valida el issuer del JWT contra la URL publica de localhost. Esta configuracion permite que el frontend, el backend y Keycloak funcionen correctamente en el entorno local.

## Verificacion OIDC

Puedes comprobar que el realm esta disponible con PowerShell:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8180/realms/camel-racing/.well-known/openid-configuration
```

Si la respuesta es exitosa, Keycloak ya expone su configuracion OpenID Connect.

## Documentacion relacionada

- [README principal](../README.md)
- [Frontend](../frontend/README.md)
- [Backend](../backend/README.md)

<p align="center">
  <img
    src="https://capsule-render.vercel.app/api?type=waving&height=110&section=footer&color=D6A85D"
    alt=""
  />
</p>