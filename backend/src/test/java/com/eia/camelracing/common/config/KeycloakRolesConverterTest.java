package com.eia.camelracing.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

@DisplayName("Keycloak roles converter")
class KeycloakRolesConverterTest {

        private final SecurityConfig.KeycloakRolesConverter converter = new SecurityConfig.KeycloakRolesConverter();

        @Test
        @DisplayName("converts realm roles to Spring authorities")
        void convertsRealmRolesToSpringAuthorities() {
                Collection<GrantedAuthority> authorities = converter.convert(
                                tokenWithRoles(List.of("administrator", "race_organizer", "viewer")));

                assertThat(authorityNames(authorities))
                                .containsExactly(
                                                "ROLE_ADMINISTRATOR",
                                                "ROLE_RACE_ORGANIZER",
                                                "ROLE_VIEWER");
        }

        @Test
        @DisplayName("converts a single realm role")
        void convertsSingleRealmRole() {
                Collection<GrantedAuthority> authorities = converter.convert(
                                tokenWithRoles(List.of("viewer")));

                assertThat(authorityNames(authorities))
                                .containsExactly("ROLE_VIEWER");
        }

        @Test
        @DisplayName("returns empty authorities when realm access is absent")
        void returnsEmptyAuthoritiesWhenRealmAccessIsAbsent() {
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .claim("preferred_username", "newuser")
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .build();

                assertThat(converter.convert(jwt)).isEmpty();
        }

        @Test
        @DisplayName("returns empty authorities when roles are absent")
        void returnsEmptyAuthoritiesWhenRolesAreAbsent() {
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .claim("realm_access", Map.of())
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .build();

                assertThat(converter.convert(jwt)).isEmpty();
        }

        @Test
        @DisplayName("returns empty authorities when role list is empty")
        void returnsEmptyAuthoritiesWhenRoleListIsEmpty() {
                assertThat(converter.convert(tokenWithRoles(List.of()))).isEmpty();
        }

        @Test
        @DisplayName("converts additional internal Keycloak roles")
        void convertsAdditionalInternalKeycloakRoles() {
                Collection<GrantedAuthority> authorities = converter.convert(
                                tokenWithRoles(List.of("offline_access", "default-roles-camel-racing")));

                assertThat(authorityNames(authorities))
                                .containsExactly(
                                                "ROLE_DEFAULT-ROLES-CAMEL-RACING",
                                                "ROLE_OFFLINE_ACCESS");
        }

        private Jwt tokenWithRoles(List<String> roles) {
                return Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .claim("preferred_username", "demouser")
                                .claim("realm_access", Map.of("roles", roles))
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .build();
        }

        private List<String> authorityNames(Collection<GrantedAuthority> authorities) {
                return authorities.stream()
                                .map(authority -> authority.getAuthority())
                                .sorted()
                                .toList();
        }
}