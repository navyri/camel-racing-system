package com.eia.camelracing.user.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.eia.camelracing.user.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByKeycloakSubject(String keycloakSubject);

    Optional<User> findByUsername(String username);

    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesByUsername(String username);
}