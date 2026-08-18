# Keycloak configuration

This directory contains the Keycloak realm used by the academic development environment.

## Realm import

Docker Compose starts Keycloak with the `--import-realm` option.

The file `realm-camel-racing.json` creates the following resources:

- Realm: `camel-racing`
- Public Swagger client: `camel-racing-swagger`
- Realm roles:
  - `ADMINISTRATOR`
  - `RACE_ORGANIZER`
  - `VIEWER`
- Demonstration users

The realm import runs when Keycloak starts with an empty development environment.

## Demonstration users

These accounts exist only for academic development and demonstration.

| Username | Password | Role |
|---|---|---|
| `admin` | `AdminCamel2026` | `ADMINISTRATOR` |
| `organizer` | `OrganizerCamel2026` | `RACE_ORGANIZER` |
| `viewer` | `ViewerCamel2026` | `VIEWER` |

These passwords are not personal credentials and must not be reused outside this academic project.

## Keycloak administration console

After starting Docker Compose, Keycloak is available at:

```text
http://localhost:8180
```

The administration console uses the variables below:

```text
KEYCLOAK_ADMIN_USERNAME
KEYCLOAK_ADMIN_PASSWORD
```

Their development defaults are defined in `.env.template`. Do not commit a real `.env` file.

## Swagger authentication

Swagger is available at:

```text
http://localhost:8080/swagger-ui.html
```

Use the `Authorize` button to sign in with one of the demonstration users.

The Swagger client uses OAuth2 Authorization Code Flow with PKCE and does not store a client secret in the browser.

## URLs used by the project

The browser accesses Keycloak through:

```text
http://localhost:8180
```

The backend container accesses Keycloak through the Docker network:

```text
http://keycloak:8080
```

The backend downloads signing keys from the internal URL but validates the JWT issuer against the public localhost URL. Both URLs are required because Docker containers and the browser resolve Keycloak differently.