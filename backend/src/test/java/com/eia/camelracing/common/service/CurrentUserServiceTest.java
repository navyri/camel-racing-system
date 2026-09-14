package com.eia.camelracing.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.exception.ConflictException;
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

        @Mock
        private AuditLogService auditLogService;

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
                when(userRepository.findByEmail("organizer@camel-racing.test"))
                                .thenReturn(Optional.empty());
                when(userRepository.save(any(User.class)))
                                .thenAnswer(invocation -> {
                                        User savedUser = invocation.getArgument(0);
                                        savedUser.setId(UUID.randomUUID());
                                        return savedUser;
                                });

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

                verify(auditLogService).log(
                                eq(savedUser),
                                eq(AuditLogService.ACTION_USER_CREATED),
                                eq("USER"),
                                eq(savedUser.getId().toString()),
                                eq("Local user created from authenticated JWT"),
                                eq(null),
                                eq("username=organizer, email=organizer@camel-racing.test"));
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

                assertThat(user.getKeycloakSubject()).isEqualTo("keycloak-subject");
                assertThat(user.getUsername()).isEqualTo("updated-organizer");
                assertThat(user.getEmail()).isEqualTo("updated@camel-racing.test");
                assertThat(user.getFirstName()).isEqualTo("Updated");
                assertThat(user.getLastName()).isEqualTo("Organizer");
                assertThat(user.isEnabled()).isTrue();

                verify(userRepository).save(existingUser);
                verify(userRepository, never()).findByEmail(any(String.class));
                verify(auditLogService, never()).log(
                                any(User.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class));
        }

        @Test
        @DisplayName("migrates a legacy local user with matching email and username")
        void migratesLegacyLocalUserWithMatchingEmailAndUsername() {
                JwtAuthenticationToken authentication = authentication(
                                "current-keycloak-subject",
                                "admin",
                                "admin@camel-racing.test",
                                "System",
                                "Administrator");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User legacyUser = User.builder()
                                .id(UUID.randomUUID())
                                .keycloakSubject(
                                                "http://localhost:8180/realms/camel-racing|admin")
                                .username("admin")
                                .email("admin@camel-racing.test")
                                .firstName("Legacy")
                                .lastName("Administrator")
                                .enabled(true)
                                .build();

                when(userRepository.findByKeycloakSubject("current-keycloak-subject"))
                                .thenReturn(Optional.empty());
                when(userRepository.findByEmail("admin@camel-racing.test"))
                                .thenReturn(Optional.of(legacyUser));
                when(userRepository.save(legacyUser)).thenReturn(legacyUser);

                User user = currentUserService.getOrSynchronizeCurrentUser();

                assertThat(user).isSameAs(legacyUser);
                assertThat(user.getKeycloakSubject()).isEqualTo("current-keycloak-subject");
                assertThat(user.getUsername()).isEqualTo("admin");
                assertThat(user.getEmail()).isEqualTo("admin@camel-racing.test");
                assertThat(user.getFirstName()).isEqualTo("System");
                assertThat(user.getLastName()).isEqualTo("Administrator");

                verify(userRepository).save(legacyUser);
                verify(auditLogService, never()).log(
                                any(User.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class));
        }

        @Test
        @DisplayName("rejects email matches that are not compatible with a legacy identity")
        void rejectsEmailMatchesThatAreNotCompatibleWithALegacyIdentity() {
                JwtAuthenticationToken authentication = authentication(
                                "current-keycloak-subject",
                                "admin",
                                "admin@camel-racing.test",
                                "System",
                                "Administrator");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User existingUser = User.builder()
                                .keycloakSubject("another-keycloak-subject")
                                .username("admin")
                                .email("admin@camel-racing.test")
                                .firstName("Another")
                                .lastName("User")
                                .enabled(true)
                                .build();

                when(userRepository.findByKeycloakSubject("current-keycloak-subject"))
                                .thenReturn(Optional.empty());
                when(userRepository.findByEmail("admin@camel-racing.test"))
                                .thenReturn(Optional.of(existingUser));

                assertThatThrownBy(() -> currentUserService.getOrSynchronizeCurrentUser())
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Local user identity conflicts with the authenticated user");

                verify(userRepository, never()).save(any(User.class));
                verify(auditLogService, never()).log(
                                any(User.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class));
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
                                .id(UUID.randomUUID())
                                .keycloakSubject(FALLBACK_KEYCLOAK_SUBJECT)
                                .username(FALLBACK_USERNAME)
                                .email("organizer@camel-racing.test")
                                .firstName("Race")
                                .lastName("Organizer")
                                .enabled(true)
                                .build();

                when(userRepository.findByKeycloakSubject(FALLBACK_KEYCLOAK_SUBJECT))
                                .thenReturn(Optional.empty(), Optional.of(createdUser));
                when(userRepository.findByEmail("organizer@camel-racing.test"))
                                .thenReturn(Optional.empty());
                when(userRepository.save(any(User.class)))
                                .thenAnswer(invocation -> {
                                        User savedUser = invocation.getArgument(0);

                                        if (savedUser.getId() == null) {
                                                savedUser.setId(UUID.randomUUID());
                                        }

                                        return savedUser;
                                });

                User firstUser = currentUserService.getOrSynchronizeCurrentUser();
                User secondUser = currentUserService.getOrSynchronizeCurrentUser();

                ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
                verify(userRepository, times(2))
                                .findByKeycloakSubject(FALLBACK_KEYCLOAK_SUBJECT);
                verify(userRepository).findByEmail("organizer@camel-racing.test");
                verify(userRepository, times(2)).save(captor.capture());

                List<User> savedUsers = captor.getAllValues();

                assertThat(firstUser.getKeycloakSubject())
                                .isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);
                assertThat(secondUser).isSameAs(createdUser);
                assertThat(savedUsers).hasSize(2);
                assertThat(savedUsers.getFirst().getKeycloakSubject())
                                .isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);
                assertThat(savedUsers.getLast()).isSameAs(createdUser);
                assertThat(savedUsers.getLast().getKeycloakSubject())
                                .isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);

                verify(auditLogService).log(
                                eq(firstUser),
                                eq(AuditLogService.ACTION_USER_CREATED),
                                eq("USER"),
                                eq(firstUser.getId().toString()),
                                eq("Local user created from authenticated JWT"),
                                eq(null),
                                eq("username=organizer, email=organizer@camel-racing.test"));
                verify(auditLogService, times(1)).log(
                                any(User.class),
                                eq(AuditLogService.ACTION_USER_CREATED),
                                eq("USER"),
                                any(String.class),
                                eq("Local user created from authenticated JWT"),
                                eq(null),
                                any(String.class));
        }

        @Test
        @DisplayName("rejects missing authenticated JWT")
        void rejectsMissingAuthenticatedJwt() {
                SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken("user", "password"));

                assertThatThrownBy(() -> currentUserService.getOrSynchronizeCurrentUser())
                                .isInstanceOf(IllegalStateException.class)
                                .hasMessage("Authenticated JWT user is required");

                verify(auditLogService, never()).log(
                                any(User.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class));
        }

        private JwtAuthenticationToken authentication(
                        String subject,
                        String username,
                        String email,
                        String firstName,
                        String lastName) {
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .issuer(FALLBACK_ISSUER)
                                .subject(subject)
                                .claim("preferred_username", username)
                                .claim("email", email)
                                .claim("given_name", firstName)
                                .claim("family_name", lastName)
                                .claim("realm_access", Map.of(
                                                "roles",
                                                List.of("RACE_ORGANIZER")))
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
                                .claim("realm_access", Map.of(
                                                "roles",
                                                List.of("RACE_ORGANIZER")))
                                .issuedAt(Instant.now())
                                .expiresAt(Instant.now().plusSeconds(300))
                                .build();

                return new JwtAuthenticationToken(jwt);
        }
}