package com.eia.camelracing.result.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.eia.camelracing.result.entity.RaceResult;
import com.eia.camelracing.result.entity.ResultStatus;

public interface RaceResultRepository extends JpaRepository<RaceResult, UUID> {

    boolean existsByRegistrationId(UUID registrationId);

    boolean existsByRegistration_Race_IdAndFinalPositionAndStatus(
            UUID raceId,
            Integer finalPosition,
            ResultStatus status
    );

    List<RaceResult> findByRegistration_Race_IdOrderByFinalPositionAsc(UUID raceId);
}