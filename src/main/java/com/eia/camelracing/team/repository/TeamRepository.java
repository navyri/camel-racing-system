package com.eia.camelracing.team.repository;

import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeamRepository extends JpaRepository<Team, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Team> findByNameIgnoreCase(String name);

    @Query("""
            select team
            from Team team
            where (:status is null or team.status = :status)
                and (
                    coalesce(:search, '') = ''
                    or lower(team.name) like lower(concat('%', coalesce(:search, ''), '%'))
                    or lower(team.coachName) like lower(concat('%', coalesce(:search, ''), '%'))
                )
            """)
    Page<Team> findAllByFilters(
            @Param("status") TeamStatus status,
            @Param("search") String search,
            Pageable pageable);
}