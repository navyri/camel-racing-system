package com.eia.camelracing.competitor.repository;

import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompetitorRepository extends JpaRepository<Competitor, UUID> {

    boolean existsByNicknameIgnoreCase(String nickname);

    Optional<Competitor> findByNicknameIgnoreCase(String nickname);

    @Query("""
            select competitor
            from Competitor competitor
            where (:competitorType is null or competitor.competitorType = :competitorType)
                and (:status is null or competitor.status = :status)
                and (
                    :origin is null
                    or lower(competitor.origin) like lower(concat('%', :origin, '%'))
                )
                and (
                    :search is null
                    or lower(competitor.name) like lower(concat('%', :search, '%'))
                    or lower(competitor.nickname) like lower(concat('%', :search, '%'))
                )
            """)
    Page<Competitor> findAllByFilters(
            @Param("competitorType") CompetitorType competitorType,
            @Param("status") CompetitorStatus status,
            @Param("origin") String origin,
            @Param("search") String search,
            Pageable pageable);
        }