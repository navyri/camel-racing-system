package com.eia.camelracing.result.service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.common.service.CurrentUserService;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.repository.RaceRepository;
import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.repository.RaceRegistrationRepository;
import com.eia.camelracing.result.dto.RaceResultRequest;
import com.eia.camelracing.result.dto.RaceResultResponse;
import com.eia.camelracing.result.dto.RaceResultUpdateRequest;
import com.eia.camelracing.result.entity.RaceResult;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.result.mapper.RaceResultMapper;
import com.eia.camelracing.result.repository.RaceResultRepository;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.repository.TeamRepository;
import com.eia.camelracing.user.entity.User;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RaceResultService {

    private static final int WINNER_POSITION = 1;

    private static final List<ResultStatus> COMPLETED_RACE_STATUSES = List.of(
            ResultStatus.FINISHED,
            ResultStatus.DID_NOT_FINISH,
            ResultStatus.DISQUALIFIED);

    private final RaceResultRepository resultRepository;
    private final RaceRegistrationRepository registrationRepository;
    private final RaceRepository raceRepository;
    private final CompetitorRepository competitorRepository;
    private final TeamRepository teamRepository;
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;

    @Transactional
    public RaceResultResponse createResult(UUID raceId, RaceResultRequest request) {
        RaceRegistration registration = findDetailedRegistrationById(request.registrationId());
        Race race = registration.getRace();

        validateRequestedRace(raceId, race);
        validateRaceInProgress(race);

        User currentUser = currentUserService.getOrSynchronizeCurrentUser();
        validateOrganizerPermission(race, currentUser);

        validateApprovedRegistration(registration);

        if (resultRepository.existsByRegistrationId(registration.getId())) {
            throw new ConflictException("Registration already has an official result");
        }

        ResultValues resultValues = resolveResultValues(
                race.getId(),
                request.finalPosition(),
                request.completionTimeSeconds(),
                request.penaltyTimeSeconds(),
                request.status(),
                null);

        RaceResult result = RaceResult.builder()
                .registration(registration)
                .startingPosition(registration.getStartingPosition())
                .finalPosition(resultValues.finalPosition())
                .completionTime(resultValues.completionTime())
                .penaltyTime(resultValues.penaltyTime())
                .status(request.status())
                .notes(normalizeNotes(request.notes()))
                .recordedBy(currentUser)
                .recordedAt(LocalDateTime.now())
                .build();

        RaceResult savedResult = resultRepository.save(result);
        recalculateStatistics(savedResult.getRegistration());

        return RaceResultMapper.toResponse(savedResult);
    }

    @Transactional(readOnly = true)
    public List<RaceResultResponse> getResultsByRaceId(UUID raceId) {
        findRaceById(raceId);

        return resultRepository.findDetailedByRaceId(
                raceId,
                ResultStatus.FINISHED).stream()
                .map(RaceResultMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RaceResultResponse getResultById(UUID id) {
        return RaceResultMapper.toResponse(findDetailedResultById(id));
    }

    @Transactional
    public RaceResultResponse updateResult(UUID id, RaceResultUpdateRequest request) {
        RaceResult result = findDetailedResultById(id);
        RaceRegistration registration = result.getRegistration();
        Race race = registration.getRace();

        validateRaceInProgress(race);

        User currentUser = currentUserService.getOrSynchronizeCurrentUser();
        validateOrganizerPermission(race, currentUser);

        String previousValue = resultSnapshot(result);

        ResultValues resultValues = resolveResultValues(
                race.getId(),
                request.finalPosition(),
                request.completionTimeSeconds(),
                request.penaltyTimeSeconds(),
                request.status(),
                result.getId());

        result.setFinalPosition(resultValues.finalPosition());
        result.setCompletionTime(resultValues.completionTime());
        result.setPenaltyTime(resultValues.penaltyTime());
        result.setStatus(request.status());
        result.setNotes(normalizeNotes(request.notes()));

        RaceResult savedResult = resultRepository.save(result);
        recalculateStatistics(savedResult.getRegistration());

        auditLogService.log(
                currentUser,
                AuditLogService.ACTION_RESULT_UPDATED,
                "RESULT",
                savedResult.getId().toString(),
                "Race result updated",
                previousValue,
                resultSnapshot(savedResult));

        return RaceResultMapper.toResponse(savedResult);
    }

    private void validateRequestedRace(UUID raceId, Race race) {
        if (!race.getId().equals(raceId)) {
            throw new ConflictException("Registration does not belong to the requested race");
        }
    }

    private void validateRaceInProgress(Race race) {
        if (race.getStatus() != RaceStatus.IN_PROGRESS) {
            throw new ConflictException("Results can only be recorded for an in-progress race");
        }
    }

    private void validateApprovedRegistration(RaceRegistration registration) {
        if (registration.getStatus() != RegistrationStatus.APPROVED) {
            throw new ConflictException("Only approved registrations can receive results");
        }
    }

    private ResultValues resolveResultValues(
            UUID raceId,
            Integer finalPosition,
            Long completionTimeSeconds,
            Long penaltyTimeSeconds,
            ResultStatus status,
            UUID currentResultId) {
        if (status != ResultStatus.FINISHED) {
            return new ResultValues(null, Duration.ZERO, Duration.ZERO);
        }

        if (finalPosition == null) {
            throw new ConflictException("Finished results require a final position");
        }

        if (completionTimeSeconds == null || completionTimeSeconds <= 0) {
            throw new ConflictException("Finished results require a positive completion time");
        }

        if (penaltyTimeSeconds == null || penaltyTimeSeconds < 0) {
            throw new ConflictException("Finished results require a zero or positive penalty time");
        }

        boolean duplicatedPosition = currentResultId == null
                ? resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatus(
                        raceId,
                        finalPosition,
                        ResultStatus.FINISHED)
                : resultRepository.existsByRegistration_Race_IdAndFinalPositionAndStatusAndIdNot(
                        raceId,
                        finalPosition,
                        ResultStatus.FINISHED,
                        currentResultId);

        if (duplicatedPosition) {
            throw new ConflictException("Final position is already assigned to another finished result");
        }

        return new ResultValues(
                finalPosition,
                Duration.ofSeconds(completionTimeSeconds),
                Duration.ofSeconds(penaltyTimeSeconds));
    }

    private void recalculateStatistics(RaceRegistration registration) {
        if (registration.getCompetitor() != null) {
            recalculateCompetitorStatistics(registration.getCompetitor());
            return;
        }

        recalculateTeamStatistics(registration.getTeam());
    }

    private void recalculateCompetitorStatistics(Competitor competitor) {
        long completedRaces = resultRepository.countByCompetitorIdAndStatusIn(
                competitor.getId(),
                COMPLETED_RACE_STATUSES);
        long victories = resultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                competitor.getId(),
                ResultStatus.FINISHED,
                WINNER_POSITION);
        long defeats = resultRepository.countDefeatsByCompetitorId(
                competitor.getId(),
                ResultStatus.FINISHED,
                ResultStatus.DID_NOT_FINISH,
                ResultStatus.DISQUALIFIED,
                WINNER_POSITION);

        competitor.setCompletedRaces(Math.toIntExact(completedRaces));
        competitor.setVictories(Math.toIntExact(victories));
        competitor.setDefeats(Math.toIntExact(defeats));

        competitorRepository.save(competitor);
    }

    private void recalculateTeamStatistics(Team team) {
        long victories = resultRepository.countVictoriesByTeamId(
                team.getId(),
                ResultStatus.FINISHED,
                WINNER_POSITION);
        long defeats = resultRepository.countDefeatsByTeamId(
                team.getId(),
                ResultStatus.FINISHED,
                ResultStatus.DID_NOT_FINISH,
                ResultStatus.DISQUALIFIED,
                WINNER_POSITION);

        team.setVictories(Math.toIntExact(victories));
        team.setDefeats(Math.toIntExact(defeats));

        teamRepository.save(team);
    }

    private void validateOrganizerPermission(Race race, User currentUser) {
        if (hasAdministratorRole()) {
            return;
        }

        if (!race.getOrganizer().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException(
                    "Race organizer can only manage results for own races");
        }
    }

    private boolean hasAdministratorRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            return false;
        }

        return authentication.getAuthorities().contains(
                new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"));
    }

    private Race findRaceById(UUID id) {
        return raceRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Race with id " + id + " was not found"));
    }

    private RaceRegistration findDetailedRegistrationById(UUID id) {
        return registrationRepository.findDetailedById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Registration with id " + id + " was not found"));
    }

    private RaceResult findDetailedResultById(UUID id) {
        return resultRepository.findDetailedById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Result with id " + id + " was not found"));
    }

    private String normalizeNotes(String notes) {
        if (notes == null || notes.isBlank()) {
            return null;
        }

        return notes.trim();
    }

    private String resultSnapshot(RaceResult result) {
        return "finalPosition=" + valueOf(result.getFinalPosition())
                + ", completionTimeSeconds=" + durationSeconds(result.getCompletionTime())
                + ", penaltyTimeSeconds=" + durationSeconds(result.getPenaltyTime())
                + ", status=" + result.getStatus()
                + ", notes=" + valueOf(result.getNotes());
    }

    private String durationSeconds(Duration duration) {
        return duration == null ? "null" : Long.toString(duration.getSeconds());
    }

    private String valueOf(Integer value) {
        return value == null ? "null" : value.toString();
    }

    private String valueOf(String value) {
        return value == null ? "null" : value;
    }

    private record ResultValues(
            Integer finalPosition,
            Duration completionTime,
            Duration penaltyTime) {
    }
}