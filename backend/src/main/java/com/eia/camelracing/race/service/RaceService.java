package com.eia.camelracing.race.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.common.service.CurrentUserService;
import com.eia.camelracing.race.dto.RaceRequest;
import com.eia.camelracing.race.dto.RaceResponse;
import com.eia.camelracing.race.dto.RaceStatusRequest;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.race.mapper.RaceMapper;
import com.eia.camelracing.race.repository.RaceRepository;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.repository.RaceRegistrationRepository;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.result.repository.RaceResultRepository;
import com.eia.camelracing.user.entity.User;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RaceService {

    private static final int WINNER_POSITION = 1;
    private static final int MINIMUM_APPROVED_PARTICIPANTS = 2;

    private static final List<RegistrationStatus> APPROVED_REGISTRATION_STATUSES = List.of(
            RegistrationStatus.APPROVED);

    private static final List<RaceStatus> UPCOMING_EXCLUDED_STATUSES = List.of(
            RaceStatus.COMPLETED,
            RaceStatus.CANCELLED);

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 100;

    private static final int DEFAULT_UPCOMING_LIMIT = 5;
    private static final int MAX_UPCOMING_LIMIT = 100;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "name",
            "scheduledAt",
            "registrationDeadline",
            "createdAt",
            "updatedAt",
            "maxParticipants");

    private final RaceRepository raceRepository;
    private final RaceRegistrationRepository registrationRepository;
    private final RaceResultRepository resultRepository;
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;

    @Transactional
    public RaceResponse createRace(RaceRequest request) {
        User organizer = currentUserService.getOrSynchronizeCurrentUser();

        Race race = RaceMapper.toEntity(request, organizer);
        LocalDateTime now = LocalDateTime.now();

        race.setCreatedAt(now);
        race.setUpdatedAt(now);

        return RaceMapper.toResponse(raceRepository.save(race));
    }

    @Transactional(readOnly = true)
    public PageResponse<RaceResponse> getRaces(
            RaceStatus status,
            RaceType raceType,
            String search,
            Integer page,
            Integer size,
            String sort) {
        Pageable pageable = buildPageable(page, size, sort);

        Page<RaceResponse> races = raceRepository.findAllByFilters(
                status,
                raceType,
                normalizeFilter(search),
                pageable).map(RaceMapper::toResponse);

        return PageResponse.from(races);
    }

    @Transactional(readOnly = true)
    public List<RaceResponse> getUpcomingRaces(Integer limit) {
        int resolvedLimit = resolveUpcomingLimit(limit);
        Pageable pageable = PageRequest.of(0, resolvedLimit, Sort.by("scheduledAt").ascending());

        return raceRepository.findUpcomingRaces(
                LocalDateTime.now(),
                UPCOMING_EXCLUDED_STATUSES,
                pageable).stream()
                .map(RaceMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RaceResponse getRaceById(UUID id) {
        return RaceMapper.toResponse(findRaceById(id));
    }

    @Transactional
    public RaceResponse updateRace(UUID id, RaceRequest request) {
        Race race = findRaceById(id);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        validateRaceManagementPermission(race, currentUser);

        if (isTerminal(race.getStatus())) {
            throw new ConflictException("Terminal races cannot be updated");
        }

        RaceMapper.updateEntity(race, request);
        race.setUpdatedAt(LocalDateTime.now());

        return RaceMapper.toResponse(raceRepository.save(race));
    }

    @Transactional
    public RaceResponse updateRaceStatus(UUID id, RaceStatusRequest request) {
        Race race = findRaceById(id);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        validateRaceManagementPermission(race, currentUser);
        validateStatusTransition(race.getStatus(), request.status());
        validateMinimumApprovedParticipants(race, request.status());

        if (race.getStatus() == RaceStatus.IN_PROGRESS
                && request.status() == RaceStatus.COMPLETED
                && !resultRepository.existsOfficialWinnerByRaceId(
                        race.getId(),
                        ResultStatus.FINISHED,
                        WINNER_POSITION)) {
            throw new ConflictException(
                    "Race cannot be completed without an official winner");
        }

        RaceStatus previousStatus = race.getStatus();

        race.setStatus(request.status());
        race.setUpdatedAt(LocalDateTime.now());

        Race savedRace = raceRepository.save(race);

        if (request.status() == RaceStatus.CANCELLED) {
            auditLogService.log(
                    currentUser,
                    AuditLogService.ACTION_RACE_CANCELLED,
                    "RACE",
                    savedRace.getId().toString(),
                    "Race cancelled",
                    "status=" + previousStatus,
                    "status=" + RaceStatus.CANCELLED);
        }

        return RaceMapper.toResponse(savedRace);
    }

    @Transactional
    public void cancelRace(UUID id) {
        Race race = findRaceById(id);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        validateRaceManagementPermission(race, currentUser);

        if (race.getStatus() == RaceStatus.CANCELLED) {
            return;
        }

        if (race.getStatus() == RaceStatus.COMPLETED) {
            throw new ConflictException("Completed races cannot be cancelled");
        }

        if (race.getStatus() == RaceStatus.IN_PROGRESS) {
            throw new ConflictException("In-progress races cannot be cancelled");
        }

        RaceStatus previousStatus = race.getStatus();

        race.setStatus(RaceStatus.CANCELLED);
        race.setUpdatedAt(LocalDateTime.now());

        raceRepository.save(race);

        auditLogService.log(
                currentUser,
                AuditLogService.ACTION_RACE_CANCELLED,
                "RACE",
                race.getId().toString(),
                "Race cancelled",
                "status=" + previousStatus,
                "status=" + RaceStatus.CANCELLED);
    }

    private void validateMinimumApprovedParticipants(
            Race race,
            RaceStatus requestedStatus) {
        boolean requiresApprovedParticipants = (race.getStatus() == RaceStatus.OPEN_FOR_REGISTRATION
                && requestedStatus == RaceStatus.CLOSED_FOR_REGISTRATION)
                || (race.getStatus() == RaceStatus.CLOSED_FOR_REGISTRATION
                        && requestedStatus == RaceStatus.IN_PROGRESS);

        if (!requiresApprovedParticipants) {
            return;
        }

        long approvedParticipantCount = registrationRepository.countByRaceIdAndStatusIn(
                race.getId(),
                APPROVED_REGISTRATION_STATUSES);

        if (approvedParticipantCount < MINIMUM_APPROVED_PARTICIPANTS) {
            throw new ConflictException(
                    "A race needs at least two approved participants before it can be closed or started");
        }
    }

    private void validateRaceManagementPermission(Race race, User currentUser) {
        if (hasAdministratorRole()) {
            return;
        }

        if (!race.getOrganizer().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException(
                    "Race organizer can only manage own races");
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

    private void validateStatusTransition(
            RaceStatus currentStatus,
            RaceStatus requestedStatus) {
        if (currentStatus == requestedStatus) {
            return;
        }

        boolean isValidTransition = switch (currentStatus) {
            case DRAFT -> requestedStatus == RaceStatus.OPEN_FOR_REGISTRATION
                    || requestedStatus == RaceStatus.CANCELLED;
            case OPEN_FOR_REGISTRATION -> requestedStatus == RaceStatus.CLOSED_FOR_REGISTRATION
                    || requestedStatus == RaceStatus.CANCELLED;
            case CLOSED_FOR_REGISTRATION -> requestedStatus == RaceStatus.IN_PROGRESS
                    || requestedStatus == RaceStatus.CANCELLED;
            case IN_PROGRESS -> requestedStatus == RaceStatus.COMPLETED;
            case COMPLETED, CANCELLED -> false;
        };

        if (!isValidTransition) {
            throw new ConflictException(
                    "Invalid race status transition from "
                            + currentStatus
                            + " to "
                            + requestedStatus);
        }
    }

    private boolean isTerminal(RaceStatus status) {
        return status == RaceStatus.COMPLETED || status == RaceStatus.CANCELLED;
    }

    private Pageable buildPageable(Integer page, Integer size, String sort) {
        int resolvedPage = page == null ? DEFAULT_PAGE : page;
        int resolvedSize = size == null ? DEFAULT_SIZE : size;

        if (resolvedPage < 0) {
            throw new IllegalArgumentException("Page must be zero or greater");
        }

        if (resolvedSize < 1 || resolvedSize > MAX_SIZE) {
            throw new IllegalArgumentException("Size must be between 1 and " + MAX_SIZE);
        }

        return PageRequest.of(resolvedPage, resolvedSize, buildSort(sort));
    }

    private int resolveUpcomingLimit(Integer limit) {
        int resolvedLimit = limit == null ? DEFAULT_UPCOMING_LIMIT : limit;

        if (resolvedLimit < 1 || resolvedLimit > MAX_UPCOMING_LIMIT) {
            throw new IllegalArgumentException(
                    "Limit must be between 1 and " + MAX_UPCOMING_LIMIT);
        }

        return resolvedLimit;
    }

    private Sort buildSort(String sort) {
        String resolvedSort = sort == null || sort.isBlank()
                ? "scheduledAt,asc"
                : sort.trim();

        String[] parts = resolvedSort.split(",", -1);

        if (parts.length != 2) {
            throw new IllegalArgumentException("Sort must use the format field,direction");
        }

        String field = parts[0].trim();
        String direction = parts[1].trim();

        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new IllegalArgumentException("Sort field is not allowed");
        }

        if ("asc".equalsIgnoreCase(direction)) {
            return Sort.by(field).ascending();
        }

        if ("desc".equalsIgnoreCase(direction)) {
            return Sort.by(field).descending();
        }

        throw new IllegalArgumentException("Sort direction must be asc or desc");
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}