package com.eia.camelracing.team.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.team.entity.TeamMember;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamMemberRepository extends JpaRepository<TeamMember, UUID> {

        boolean existsByTeamIdAndCompetitorId(UUID teamId, UUID competitorId);

        boolean existsByCompetitorIdAndActiveTrue(UUID competitorId);

        long countByTeamIdAndActiveTrue(UUID teamId);

        Optional<TeamMember> findByTeamIdAndCompetitorIdAndActiveTrue(
                        UUID teamId,
                        UUID competitorId);

        @EntityGraph(attributePaths = "competitor")
        List<TeamMember> findByTeamIdAndActiveTrueOrderByJoinedAtAsc(UUID teamId);

        @Query("""
                        select count(member)
                        from TeamMember member
                        where member.team.id = :teamId
                                and member.active = true
                                and member.competitor.status <> :requiredStatus
                        """)
        long countActiveMembersWithDifferentCompetitorStatus(
                        @Param("teamId") UUID teamId,
                        @Param("requiredStatus") CompetitorStatus requiredStatus);
}