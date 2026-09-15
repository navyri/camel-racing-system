package com.eia.camelracing.common.service;

import java.time.LocalDateTime;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.user.entity.User;
import com.eia.camelracing.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public User getOrSynchronizeCurrentUser() {
        Jwt jwt = getCurrentJwt();
        String username = getUsername(jwt);
        EmailClaim emailClaim = getEmailClaim(jwt, username);
        String firstName = getFirstName(jwt, username);
        String lastName = getLastName(jwt);
        String subject = jwt.getSubject();

        if (hasText(subject)) {
            return synchronizeUserWithSubject(
                    subject,
                    username,
                    emailClaim.value(),
                    firstName,
                    lastName);
        }

        return synchronizeUserWithoutSubject(
                username,
                emailClaim,
                firstName,
                lastName);
    }

    private Jwt getCurrentJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {
            throw new IllegalStateException("Authenticated JWT user is required");
        }

        return jwtAuthentication.getToken();
    }

    private User synchronizeUserWithSubject(
            String keycloakSubject,
            String username,
            String email,
            String firstName,
            String lastName) {
        return userRepository.findByKeycloakSubject(keycloakSubject)
                .map(user -> updateUser(user, keycloakSubject, username, email, firstName, lastName))
                .orElseGet(() -> findOrCreateUserWithSubject(
                        keycloakSubject,
                        username,
                        email,
                        firstName,
                        lastName));
    }

    private User synchronizeUserWithoutSubject(
            String username,
            EmailClaim emailClaim,
            String firstName,
            String lastName) {
        if (emailClaim.providedByJwt()) {
            return userRepository.findByEmail(emailClaim.value())
                    .map(user -> reuseUserWithoutSubject(
                            user,
                            username,
                            emailClaim,
                            firstName,
                            lastName))
                    .orElseGet(() -> userRepository.findByUsername(username)
                            .map(user -> reuseUserWithoutSubject(
                                    user,
                                    username,
                                    emailClaim,
                                    firstName,
                                    lastName))
                            .orElseGet(() -> createUser(
                                    fallbackKeycloakSubject(username),
                                    username,
                                    emailClaim.value(),
                                    firstName,
                                    lastName)));
        }

        return userRepository.findByUsername(username)
                .map(user -> reuseUserWithoutSubject(
                        user,
                        username,
                        emailClaim,
                        firstName,
                        lastName))
                .orElseGet(() -> createUser(
                        fallbackKeycloakSubject(username),
                        username,
                        emailClaim.value(),
                        firstName,
                        lastName));
    }

    private User findOrCreateUserWithSubject(
            String keycloakSubject,
            String username,
            String email,
            String firstName,
            String lastName) {
        return userRepository.findByEmail(email)
                .map(user -> migrateLegacyUser(
                        user,
                        keycloakSubject,
                        username,
                        email,
                        firstName,
                        lastName))
                .orElseGet(() -> userRepository.findByUsername(username)
                        .map(user -> migrateLegacyUser(
                                user,
                                keycloakSubject,
                                username,
                                email,
                                firstName,
                                lastName))
                        .orElseGet(() -> createUser(
                                keycloakSubject,
                                username,
                                email,
                                firstName,
                                lastName)));
    }

    private User reuseUserWithoutSubject(
            User user,
            String username,
            EmailClaim emailClaim,
            String firstName,
            String lastName) {
        if (!user.getUsername().equals(username)) {
            throw new ConflictException(
                    "Local user identity conflicts with the authenticated user");
        }

        if (emailClaim.providedByJwt() && !user.getEmail().equals(emailClaim.value())) {
            throw new ConflictException(
                    "Local user identity conflicts with the authenticated user");
        }

        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEnabled(true);

        return userRepository.save(user);
    }

    private User migrateLegacyUser(
            User user,
            String keycloakSubject,
            String username,
            String email,
            String firstName,
            String lastName) {
        if (!isLegacySubjectForUsername(user.getKeycloakSubject(), username)) {
            throw new ConflictException(
                    "Local user identity conflicts with the authenticated user");
        }

        return updateUser(user, keycloakSubject, username, email, firstName, lastName);
    }

    private String fallbackKeycloakSubject(String username) {
        Jwt jwt = getCurrentJwt();
        String issuer = jwt.getIssuer() == null ? "keycloak" : jwt.getIssuer().toString();

        return issuer + "|" + username;
    }

    private boolean isLegacySubjectForUsername(
            String storedKeycloakSubject,
            String username) {
        if (!hasText(storedKeycloakSubject) || !hasText(username)) {
            return false;
        }

        int separatorIndex = storedKeycloakSubject.lastIndexOf("|");

        if (separatorIndex <= 0 || separatorIndex == storedKeycloakSubject.length() - 1) {
            return false;
        }

        return storedKeycloakSubject.substring(separatorIndex + 1).equals(username);
    }

    private String getUsername(Jwt jwt) {
        String preferredUsername = jwt.getClaimAsString("preferred_username");

        if (hasText(preferredUsername)) {
            return preferredUsername;
        }

        String username = jwt.getClaimAsString("username");

        if (hasText(username)) {
            return username;
        }

        String email = jwt.getClaimAsString("email");

        if (hasText(email)) {
            int separatorIndex = email.indexOf("@");

            if (separatorIndex > 0) {
                return email.substring(0, separatorIndex);
            }

            return email;
        }

        throw new IllegalStateException("JWT does not contain a usable user identifier");
    }

    private EmailClaim getEmailClaim(Jwt jwt, String username) {
        String email = jwt.getClaimAsString("email");

        if (hasText(email)) {
            return new EmailClaim(email, true);
        }

        return new EmailClaim(username + "@keycloak.local", false);
    }

    private String getFirstName(Jwt jwt, String username) {
        String firstName = jwt.getClaimAsString("given_name");

        if (hasText(firstName)) {
            return firstName;
        }

        return username;
    }

    private String getLastName(Jwt jwt) {
        String lastName = jwt.getClaimAsString("family_name");

        if (hasText(lastName)) {
            return lastName;
        }

        return "Keycloak";
    }

    private User createUser(
            String keycloakSubject,
            String username,
            String email,
            String firstName,
            String lastName) {
        User user = User.builder()
                .keycloakSubject(keycloakSubject)
                .username(username)
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build();

        User savedUser = userRepository.save(user);

        auditLogService.log(
                savedUser,
                AuditLogService.ACTION_USER_CREATED,
                "USER",
                savedUser.getId().toString(),
                "Local user created from authenticated JWT",
                null,
                "username=" + savedUser.getUsername()
                        + ", email=" + savedUser.getEmail());

        return savedUser;
    }

    private User updateUser(
            User user,
            String keycloakSubject,
            String username,
            String email,
            String firstName,
            String lastName) {
        user.setKeycloakSubject(keycloakSubject);
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEnabled(true);

        return userRepository.save(user);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record EmailClaim(String value, boolean providedByJwt) {
    }
}