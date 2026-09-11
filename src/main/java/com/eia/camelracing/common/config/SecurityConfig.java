package com.eia.camelracing.common.config;

import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(
                                "/actuator/health",
                                "/h2-console/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/error")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/competitors/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .requestMatchers("/api/competitors/**")
                        .hasRole("ADMINISTRATOR")
                        .requestMatchers(HttpMethod.GET, "/api/teams/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .requestMatchers("/api/teams/**")
                        .hasRole("ADMINISTRATOR")
                        .requestMatchers(HttpMethod.GET, "/api/races/*/results")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .requestMatchers("/api/races/*/results")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER")
                        .requestMatchers(HttpMethod.GET, "/api/races/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .requestMatchers("/api/races/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER")
                        .requestMatchers(HttpMethod.GET, "/api/registrations/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .requestMatchers("/api/registrations/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER")
                        .requestMatchers(HttpMethod.GET, "/api/results/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .requestMatchers("/api/results/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/standings",
                                "/api/standings/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .requestMatchers(HttpMethod.GET, "/api/**")
                        .hasAnyRole("ADMINISTRATOR", "RACE_ORGANIZER", "VIEWER")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .headers(headers -> headers
                        .frameOptions(frameOptions -> frameOptions.sameOrigin()));

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRolesConverter());
        return converter;
    }

    static class KeycloakRolesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

        @Override
        public Collection<GrantedAuthority> convert(Jwt jwt) {
            Map<String, Object> realmAccess = jwt.getClaim("realm_access");

            if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
                return List.of();
            }

            return roles.stream()
                    .filter(role -> role != null)
                    .map(String::valueOf)
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                    .map(GrantedAuthority.class::cast)
                    .toList();
        }
    }
}