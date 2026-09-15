package com.eia.camelracing.common.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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

        private static final String ISSUER = "http://localhost:8180/realms/camel-racing";
        private static final String FALLBACK_USERNAME = "organizer";
        private static final String FALLBACK_KEYCLOAK_SUBJECT = ISSUER + "|" + FALLBACK_USERNAME;

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
        @DisplayName("creates local user from authenticated JWT claims with subject")
        void createsLocalUserFromAuthenticatedJwtClaimsWithSubject() {
                JwtAuthenticationToken authentication = authenticationWithSubject(
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
                when(userRepository.findByUsername("organizer"))
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
        @DisplayName("updates existing local user from authenticated JWT claims with subject")
        void updatesExistingLocalUserFromAuthenticatedJwtClaimsWithSubject() {
                JwtAuthenticationToken authentication = authenticationWithSubject(
                                "keycloak-subject",
                                "updated-organizer",
                                "updated@camel-racing.test",
                                "Updated",
                                "Organizer");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User existingUser = user(
                                "keycloak-subject",
                                "old-organizer",
                                "old@camel-racing.test",
                                "Old",
                                "Name");

                existingUser.setEnabled(false);

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
                verify(userRepository, never()).findByUsername(any(String.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("migrates legacy local user with subject when email matches")
        void migratesLegacyLocalUserWithSubjectWhenEmailMatches() {
                JwtAuthenticationToken authentication = authenticationWithSubject(
                                "current-keycloak-subject",
                                "admin",
                                "admin@camel-racing.test",
                                "System",
                                "Administrator");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User legacyUser = user(
                                ISSUER + "|admin",
                                "admin",
                                "admin@camel-racing.test",
                                "Legacy",
                                "Administrator");

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
                verify(userRepository, never()).findByUsername(any(String.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("reuses local user without subject when email and username match")
        void reusesLocalUserWithoutSubjectWhenEmailAndUsernameMatch() {
                JwtAuthenticationToken authentication = authenticationWithoutSubject(
                                "admin",
                                "admin@camel-racing.test",
                                "Academic",
                                "Administrator");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User existingUser = user(
                                "69ef73d0-bb6f-40e7-9f5a-518fd43385d8",
                                "admin",
                                "admin@camel-racing.test",
                                "Demo",
                                "Administrator");

                when(userRepository.findByEmail("admin@camel-racing.test"))
                                .thenReturn(Optional.of(existingUser));
                when(userRepository.save(existingUser)).thenReturn(existingUser);

                User user = currentUserService.getOrSynchronizeCurrentUser();

                assertThat(user).isSameAs(existingUser);
                assertThat(user.getKeycloakSubject())
                                .isEqualTo("69ef73d0-bb6f-40e7-9f5a-518fd43385d8");
                assertThat(user.getUsername()).isEqualTo("admin");
                assertThat(user.getEmail()).isEqualTo("admin@camel-racing.test");
                assertThat(user.getFirstName()).isEqualTo("Academic");
                assertThat(user.getLastName()).isEqualTo("Administrator");
                assertThat(user.isEnabled()).isTrue();

                verify(userRepository).save(existingUser);
                verify(userRepository, never()).findByKeycloakSubject(any(String.class));
                verify(userRepository, never()).findByUsername(any(String.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("reuses local user without subject and without email when username matches")
        void reusesLocalUserWithoutSubjectAndWithoutEmailWhenUsernameMatches() {
                JwtAuthenticationToken authentication = authenticationWithoutSubjectAndEmail(
                                "organizer",
                                "Race",
                                "Organizer");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User existingUser = user(
                                "legacy-organizer-subject",
                                "organizer",
                                "organizer@camel-racing.test",
                                "Legacy",
                                "Organizer");

                when(userRepository.findByUsername("organizer"))
                                .thenReturn(Optional.of(existingUser));
                when(userRepository.save(existingUser)).thenReturn(existingUser);

                User user = currentUserService.getOrSynchronizeCurrentUser();

                assertThat(user).isSameAs(existingUser);
                assertThat(user.getKeycloakSubject()).isEqualTo("legacy-organizer-subject");
                assertThat(user.getUsername()).isEqualTo("organizer");
                assertThat(user.getEmail()).isEqualTo("organizer@camel-racing.test");
                assertThat(user.getFirstName()).isEqualTo("Race");
                assertThat(user.getLastName()).isEqualTo("Organizer");
                assertThat(user.isEnabled()).isTrue();

                verify(userRepository).save(existingUser);
                verify(userRepository, never()).findByEmail(any(String.class));
                verify(userRepository, never()).findByKeycloakSubject(any(String.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("rejects local user without subject when email matches but username differs")
        void rejectsLocalUserWithoutSubjectWhenEmailMatchesButUsernameDiffers() {
                JwtAuthenticationToken authentication = authenticationWithoutSubject(
                                "admin",
                                "admin@camel-racing.test",
                                "Academic",
                                "Administrator");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User existingUser = user(
                                "69ef73d0-bb6f-40e7-9f5a-518fd43385d8",
                                "another-admin",
                                "admin@camel-racing.test",
                                "Demo",
                                "Administrator");

                when(userRepository.findByEmail("admin@camel-racing.test"))
                                .thenReturn(Optional.of(existingUser));

                assertThatThrownBy(() -> currentUserService.getOrSynchronizeCurrentUser())
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Local user identity conflicts with the authenticated user");

                verify(userRepository, never()).save(any(User.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("rejects local user without subject when username matches but JWT email differs")
        void rejectsLocalUserWithoutSubjectWhenUsernameMatchesButJwtEmailDiffers() {
                JwtAuthenticationToken authentication = authenticationWithoutSubject(
                                "admin",
                                "admin@keycloak.local",
                                "Academic",
                                "Administrator");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                User existingUser = user(
                                "69ef73d0-bb6f-40e7-9f5a-518fd43385d8",
                                "admin",
                                "admin@camel-racing.test",
                                "Demo",
                                "Administrator");

                when(userRepository.findByEmail("admin@keycloak.local"))
                                .thenReturn(Optional.empty());
                when(userRepository.findByUsername("admin"))
                                .thenReturn(Optional.of(existingUser));

                assertThatThrownBy(() -> currentUserService.getOrSynchronizeCurrentUser())
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Local user identity conflicts with the authenticated user");

                verify(userRepository, never()).save(any(User.class));
                verifyNoAuditLog();
        }

        @Test
        @DisplayName("creates user without subject when no local identity exists")
        void createsUserWithoutSubjectWhenNoLocalIdentityExists() {
                JwtAuthenticationToken authentication = authenticationWithoutSubject(
                                FALLBACK_USERNAME,
                                "organizer@camel-racing.test",
                                "Race",
                                "Organizer");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                when(userRepository.findByEmail("organizer@camel-racing.test"))
                                .thenReturn(Optional.empty());
                when(userRepository.findByUsername(FALLBACK_USERNAME))
                                .thenReturn(Optional.empty());
                when(userRepository.save(any(User.class)))
                                .thenAnswer(invocation -> {
                                        User savedUser = invocation.getArgument(0);
                                        savedUser.setId(UUID.randomUUID());
                                        return savedUser;
                                });

                User user = currentUserService.getOrSynchronizeCurrentUser();

                assertThat(user.getKeycloakSubject()).isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);
                assertThat(user.getUsername()).isEqualTo(FALLBACK_USERNAME);
                assertThat(user.getEmail()).isEqualTo("organizer@camel-racing.test");
                assertThat(user.getFirstName()).isEqualTo("Race");
                assertThat(user.getLastName()).isEqualTo("Organizer");
                assertThat(user.isEnabled()).isTrue();
                assertThat(user.getCreatedAt()).isNotNull();

                verify(auditLogService).log(
                                eq(user),
                                eq(AuditLogService.ACTION_USER_CREATED),
                                eq("USER"),
                                eq(user.getId().toString()),
                                eq("Local user created from authenticated JWT"),
                                eq(null),
                                eq("username=organizer, email=organizer@camel-racing.test"));
        }

        @Test
        @DisplayName("creates user without subject and without email when no local identity exists")
        void createsUserWithoutSubjectAndWithoutEmailWhenNoLocalIdentityExists() {
                JwtAuthenticationToken authentication = authenticationWithoutSubjectAndEmail(
                                FALLBACK_USERNAME,
                                "Race",
                                "Organizer");

                SecurityContextHolder.getContext().setAuthentication(authentication);

                when(userRepository.findByUsername(FALLBACK_USERNAME))
                                .thenReturn(Optional.empty());
                when(userRepository.save(any(User.class)))
                                .thenAnswer(invocation -> {
                                        User savedUser = invocation.getArgument(0);
                                        savedUser.setId(UUID.randomUUID());
                                        return savedUser;
                                });

                User user = currentUserService.getOrSynchronizeCurrentUser();

                assertThat(user.getKeycloakSubject()).isEqualTo(FALLBACK_KEYCLOAK_SUBJECT);
                assertThat(user.getUsername()).isEqualTo(FALLBACK_USERNAME);
                assertThat(user.getEmail()).isEqualTo("organizer@keycloak.local");
                assertThat(user.getFirstName()).isEqualTo("Race");
                assertThat(user.getLastName()).isEqualTo("Organizer");
                assertThat(user.isEnabled()).isTrue();
                assertThat(user.getCreatedAt()).isNotNull();

                verify(userRepository, never()).findByEmail(any(String.class));
                verify(auditLogService).log(
                                eq(user),
                                eq(AuditLogService.ACTION_USER_CREATED),
                                eq("USER"),
                                eq(user.getId().toString()),
                                eq("Local user created from authenticated JWT"),
                                eq(null),
                                eq("username=organizer, email=organizer@keycloak.local"));
        }

        @Test
        @DisplayName("rejects missing authenticated JWT")
        void rejectsMissingAuthenticatedJwt() {
                SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken("user", "password"));

                assertThatThrownBy(() -> currentUserService.getOrSynchronizeCurrentUser())
                                .isInstanceOf(IllegalStateException.class)
                                .hasMessage("Authenticated JWT user is required");

                verifyNoAuditLog();
        }

        private void verifyNoAuditLog() {
                verify(auditLogService, never()).log(
                                any(User.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class),
                                any(String.class));
        }

        private User user(
                        String keycloakSubject,
                        String username,
                        String email,
                        String firstName,
                        String lastName) {
                return User.builder()
                                .id(UUID.randomUUID())
                                .keycloakSubject(keycloakSubject)
                                .username(username)
                                .email(email)
                                .firstName(firstName)
                                .lastName(lastName)
                                .enabled(true)
                                .build();
        }

        private JwtAuthenticationToken authenticationWithSubject(
                        String subject,
                        String username,
                        String email,
                        String firstName,
                        String lastName) {
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .issuer(ISSUER)
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
                                .issuer(ISSUER)
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

        private JwtAuthenticationToken authenticationWithoutSubjectAndEmail(
                        String username,
                        String firstName,
                        String lastName) {
                Jwt jwt = Jwt.withTokenValue("token")
                                .header("alg", "RS256")
                                .issuer(ISSUER)
                                .claim("preferred_username", username)
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