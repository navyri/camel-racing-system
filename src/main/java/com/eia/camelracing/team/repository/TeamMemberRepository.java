package com.eia.camelracing.team.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.team.entity.TeamMember;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {

    boolean existsByTeamIdAndCompetitorId(UUID teamId, UUID competitorId);

    boolean existsByCompetitorIdAndActiveTrue(UUID competitorId);

    long countByTeamIdAndActiveTrue(UUID teamId);

    Optional<TeamMember> findByTeamIdAndCompetitorIdAndActiveTrue(
            UUID teamId,
            UUID competitorId
    );

    @EntityGraph(attributePaths = "competitor")
    List<TeamMember> findByTeamIdAndActiveTrueOrderByJoinedAtAsc(UUID teamId);
}