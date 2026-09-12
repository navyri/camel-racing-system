import Keycloak from 'keycloak-js'

const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081'
const keycloakRealm = import.meta.env.VITE_KEYCLOAK_REALM ?? 'camel-racing'
const keycloakClientId =
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'camel-racing-frontend'

export const keycloak = new Keycloak({
    url: keycloakUrl,
    realm: keycloakRealm,
    clientId: keycloakClientId,
})