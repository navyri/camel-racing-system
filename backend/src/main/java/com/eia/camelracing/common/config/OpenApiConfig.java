package com.eia.camelracing.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.OAuthFlow;
import io.swagger.v3.oas.models.security.OAuthFlows;
import io.swagger.v3.oas.models.security.Scopes;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {

        private static final String OAUTH_SCHEME = "keycloak";
        private static final String REALM_NAME = "camel-racing";

        @Value("${app.security.keycloak-public-url:http://localhost:8180}")
        private String keycloakPublicUrl;

        @Bean
        public OpenAPI camelRacingOpenApi() {
                return new OpenAPI()
                                .components(new Components().addSecuritySchemes(OAUTH_SCHEME, keycloakScheme()))
                                .addSecurityItem(new SecurityRequirement().addList(OAUTH_SCHEME))
                                .info(new Info()
                                                .title("The Great EIA Camel vs. Dwarf Racing System API")
                                                .version("1.0.0")
                                                .description("""
                                                                REST API for the EIA Camel vs. Dwarf Racing System.

                                                                Use Authorize to sign in through Keycloak.

                                                                Demonstration users:

                                                                - admin / AdminCamel2026
                                                                - organizer / OrganizerCamel2026
                                                                - viewer / ViewerCamel2026

                                                                The API will expose protected domain modules as they are implemented.
                                                                """)
                                                .license(new License().name("Academic use")));
        }

        private SecurityScheme keycloakScheme() {
                String openIdBaseUrl = keycloakPublicUrl
                                + "/realms/"
                                + REALM_NAME
                                + "/protocol/openid-connect";

                OAuthFlow authorizationCode = new OAuthFlow()
                                .authorizationUrl(openIdBaseUrl + "/auth")
                                .tokenUrl(openIdBaseUrl + "/token")
                                .scopes(new Scopes()
                                                .addString("openid", "Identify the authenticated user")
                                                .addString("profile", "Access basic profile information")
                                                .addString("email", "Access email information"));

                return new SecurityScheme()
                                .type(SecurityScheme.Type.OAUTH2)
                                .description("Keycloak login using Authorization Code Flow with PKCE")
                                .flows(new OAuthFlows().authorizationCode(authorizationCode));
        }
}