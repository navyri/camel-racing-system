# Diagrama de Base de Datos

Este documento describe el modelo entidad-relacion de Camel Racing System.

## Diagrama Entidad-Relacion

```mermaid
erDiagram
    USERS {
        uuid id PK
        timestamp created_at
        varchar email UK
        boolean enabled
        varchar first_name
        varchar keycloak_subject UK
        varchar last_name
        varchar username UK
    }

    ROLES {
        uuid id PK
        varchar name UK
        varchar description
    }

    USER_ROLES {
        uuid user_id PK, FK
        uuid role_id PK, FK
    }

    COMPETITORS {
        uuid id PK
        varchar name
        varchar nickname UK
        varchar competitor_type
        varchar status
        integer approximate_age
        numeric weight_kg
        numeric height_cm
        integer victories
        integer defeats
        integer completed_races
    }

    TEAMS {
        uuid id PK
        varchar name UK
        varchar coach_name
        varchar status
        integer victories
        integer defeats
    }

    TEAM_MEMBERS {
        uuid id PK
        uuid team_id FK
        uuid competitor_id FK
        boolean active
        timestamp joined_at
        timestamp left_at
    }

    RACES {
        uuid id PK
        uuid organizer_id FK
        varchar name
        varchar race_type
        varchar status
        numeric distance_meters
        integer max_participants
        timestamp registration_deadline
        timestamp scheduled_at
    }

    RACE_REGISTRATIONS {
        uuid id PK
        uuid race_id FK
        uuid competitor_id FK
        uuid team_id FK
        uuid registered_by_user_id FK
        varchar status
        integer starting_position
        timestamp registered_at
    }

    RACE_RESULTS {
        uuid id PK
        uuid registration_id FK
        uuid recorded_by_user_id FK
        varchar status
        integer final_position
        numeric completion_time
        numeric penalty_time
        timestamp recorded_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar entity_type
        varchar entity_id
        timestamp created_at
    }

    USERS ||--o{ USER_ROLES : tiene
    ROLES ||--o{ USER_ROLES : asigna

    USERS ||--o{ RACES : organiza
    USERS ||--o{ RACE_REGISTRATIONS : registra
    USERS ||--o{ RACE_RESULTS : registra_resultado
    USERS o|--o{ AUDIT_LOGS : genera

    COMPETITORS ||--o{ TEAM_MEMBERS : pertenece
    TEAMS ||--o{ TEAM_MEMBERS : contiene

    RACES ||--o{ RACE_REGISTRATIONS : recibe
    COMPETITORS o|--o{ RACE_REGISTRATIONS : participa
    TEAMS o|--o{ RACE_REGISTRATIONS : participa

    RACE_REGISTRATIONS ||--o| RACE_RESULTS : produce
```

## Tablas y convenciones

Los nombres de tablas, columnas y enumeraciones se mantienen en inglés porque corresponden a los nombres técnicos reales del esquema PostgreSQL y las entidades Java. Las explicaciones y reglas del modelo se documentan en español.

- `PK`: clave primaria.
- `FK`: clave foránea.
- `UK`: restricción de valor único.
- `o|`: relación opcional de cero o uno.
- `o{`: relación de cero o muchos.

## Reglas de negocio y restricciones

La base de datos aplica las siguientes reglas relevantes:

- `users.email`, `users.username` y `users.keycloak_subject` son valores únicos.
- `roles.name` es único y acepta únicamente `ADMINISTRATOR`, `RACE_ORGANIZER` o `VIEWER`.
- `user_roles` utiliza una clave primaria compuesta por `user_id` y `role_id`.
- `competitors.nickname` es único.
- `teams.name` es único.
- Un equipo no puede incluir dos veces al mismo competidor porque `team_members` tiene una restricción única sobre `(team_id, competitor_id)`.
- Una inscripción de carrera representa exactamente un participante:

```text
competitor_id XOR team_id
```

- `race_results.registration_id` es único; por tanto, una inscripción puede tener como máximo un resultado oficial.
- `audit_logs.user_id` es opcional, porque algunos eventos pueden no tener una referencia a un usuario local.

## Flujo principal

```mermaid
flowchart LR
    C[Competidor]
    T[Equipo]
    TM[Integrante de equipo]
    R[Carrera]
    RR[Inscripcion]
    RES[Resultado]
    U[Usuario]
    ROLE[Rol]
    AUDIT[Registro de auditoria]

    C --> TM
    T --> TM
    C --> RR
    T --> RR
    R --> RR
    RR --> RES
    U --> R
    U --> RR
    U --> RES
    U --> AUDIT
    U --> ROLE
```

## Relacion central

La relación central del modelo es:

```text
Race -> RaceRegistration -> RaceResult
```

Una `RaceRegistration` representa la participación de un competidor individual o de un equipo dentro de una carrera. La regla `competitor_id XOR team_id` garantiza que una inscripción no represente ambos tipos de participante al mismo tiempo.

Los resultados se relacionan con una inscripción aprobada, lo que permite un flujo único para resultados individuales y por equipos.