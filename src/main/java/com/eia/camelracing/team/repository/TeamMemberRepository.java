package com.eia.camelracing.team.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.eia.camelracing.team.entity.TeamMember;

public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {

    boolean existsByTeamIdAndCompetitorId(UUID teamId, UUID competitorId);

    boolean existsByCompetitorIdAndActiveTrue(UUID competitorId);

    List<TeamMember> findByTeamIdAndActiveTrue(UUID teamId);
}