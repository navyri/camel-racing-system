package com.eia.camelracing.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.eia.camelracing.user.entity.User;
import com.eia.camelracing.user.repository.UserRepository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

@ExtendWith(MockitoExtension.class)
@DisplayName("Current user service")
class CurrentUserServiceTest {

        private static final String FALLBACK_ISSUER = "http://localhost:8180/realms/camel-racing";
        private static final String FALLBACK_USERNAME = "organizer";
        private static final String FALLBACK_KEYCLOAK_SUBJECT = FALLBACK_ISSUER + "|" + FALLBACK_USERNAME;

        @Mock
        private UserRepository userRepository;

        @InjectMocks
        private CurrentUserService currentUserService;

        @AfterEach
        void clearSecurityContext() {
                SecurityContextHolder.clearContext();
        }

        @Test
        @DisplayName("creates local user from authenticated JWT claims")
        void createsLocalUserFromAuthenticatedJwtClaims() {
                JwtAuthenticationToken authentication = authentication(
                                "keycloak-subject",
                                "organizer",
                                "organizer@camel-racing.test",
                                "Race",
                                "Organizer");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                when(userRepository.findByKeycloakSubject("keycloak-subject"))
                                .thenReturn(Optional.empty());
                when(userRepository.save(any(User.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                User user = currentUserService.getOrSynchronizeCurrentUser();

                ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
                verify(userRepository).save(captor.capture());

                User savedUser = captor.getValue();

                assertThat(user.getKeycloakSubject()).isEqualTo("keycloak-subject");
                assertThat(savedUser.getUsername()).isEqualTo("organizer");
                assertThat(savedUser.getEmail()).isEqualTo("organizer@camel-racing.test");
                assertThat(savedUser.getFirstName()).isEqualTo("Race");
                assertThat(savedUser.getLastName()).isEqualTo("Organizer");
                assertThat(savedUser.isEnabled()).isTrue();
                assertThat(savedUser.getCreatedAt()).isNotNull();
        }

        @Test
        @DisplayName("updates existing local user from authenticated JWT claims")
        void updatesExistingLocalUserFromAuthenticatedJwtClaims() {
                JwtAuthenticationToken authentication = authentication(
                                "keycloak-subject",
                                "updated-organizer",
                                "updated@camel-racing.test",
                                "Updated",
                                "Organizer");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User existingUser = User.builder()
                                .keycloakSubject("keycloak-subject")
                                .username("old-organizer")
                                .email("old@camel-racing.test")
                                .firstName("Old")
                                .lastName("Name")
                                .enabled(false)
                                .build();

                when(userRepository.findByKeycloakSubject("keycloak-subject"))
                                .thenReturn(Optional.of(existingUser));
                when(userRepository.save(existingUser)).thenReturn(existingUser);

                User user = currentUserService.getOrSynchronizeCurrentUser();

                assertThat(user.getUsername()).isEqualTo("updated-organizer");
                assertThat(user.getEmail()).isEqualTo("updated@camel-racing.test");
                assertThat(user.getFirstName()).isEqualTo("Updated");
                assertThat(user.getLastName()).isEqualTo("Organizer");
                assertThat(user.isEnabled()).isTrue();

                verify(userRepository).save(existingUser);
        }

        @Test
        @DisplayName("reuses local user when JWT has no subject")
        void reusesLocalUserWhenJwtHasNoSubject() {
                JwtAuthenticationToken authentication = authenticationWithoutSubject(
                                FALLBACK_USERNAME,
                                "organizer@camel-racing.test",
                                "Race",
                                "Organizer");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User createdUser = User.builder()
                                .keycloakSubject(FALLBACK_KEYCLOAK_SUBJECT)
                                .username(FALLBACK_USERNAME)
                                .email("organizer@camel-racing.test")
                                .firstName("Race")
                                .lastName("Organizer")
                                .enabled(true)
                                .build();

                when(userRepository.findByKeycloakSubject(FALLBACK_KEYCLOAK_SUBJECT))
                                .thenReturn(Optional.<User>empty(), Optional.of(createdUser));
                when(userRepository.save(any(User.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                User firstUser = currentUserService.getOrSynchronizeCurrentUser();
                User secondUser = currentUserService.getOrSynchronizeCurrentUser();

                ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
                verify(userRepository, times(2)).findByKeycloakSubject(FALLBACK_KEYCLOAK_SUBJECT);
                verify(userRepository, times(2)).save(captor.capture());

                List<User> savedUsers = captor.getAllValues();

                assertThat(firstUser.getKeycloakSubject()).isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);
                assertThat(secondUser).isSameAs(createdUser);
                assertThat(savedUsers).hasSize(2);
                assertThat(savedUsers.getFirst().getKeycloakSubject()).isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);
                assertThat(savedUsers.getLast()).isSameAs(createdUser);
                assertThat(savedUsers.getLast().getKeycloakSubject()).isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);
        }

        @Test
        @DisplayName("rejects missing authenticated JWT")
        void rejectsMissingAuthenticatedJwt() {
                SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken("user", "password"));

                assertThatThrownBy(() -> currentUserService.getOrSynchronizeCurrentUser())
                                .isInstanceOf(IllegalStateException.class)
                                .hasMessage("Authenticated JWT user is required");
        }

        private JwtAuthenticationToken authentication(
                        String subject,
                        String username,
                        String email,
                        String firstName,
                        String lastName) {
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .issuer("http://localhost:8180/realms/camel-racing")
                                .subject(subject)
                                .claim("preferred_username", username)
                                .claim("email", email)
                                .claim("given_name", firstName)
                                .claim("family_name", lastName)
                                .claim("realm_access", Map.of("roles", List.of("RACE_ORGANIZER")))
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .build();

                return new JwtAuthenticationToken(jwt);
        }

        private JwtAuthenticationToken authenticationWithoutSubject(
                        String username,
                        String email,
                        String firstName,
                        String lastName) {
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .issuer(FALLBACK_ISSUER)
                                .claim("preferred_username", username)
                                .claim("email", email)
                                .claim("given_name", firstName)
                                .claim("family_name", lastName)
                                .claim("realm_access", Map.of("roles", List.of("RACE_ORGANIZER")))
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .build();

                return new JwtAuthenticationToken(jwt);
        }
}