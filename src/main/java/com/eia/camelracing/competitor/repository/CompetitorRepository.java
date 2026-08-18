package com.eia.camelracing.competitor.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.eia.camelracing.competitor.entity.Competitor;

public interface CompetitorRepository extends JpaRepository<Competitor, UUID> {

    boolean existsByNicknameIgnoreCase(String nickname);

    Optional<Competitor> findByNicknameIgnoreCase(String nickname);
}