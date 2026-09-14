package com.eia.camelracing.registration.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.common.service.CurrentUserService;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.race.repository.RaceRepository;
import com.eia.camelracing.registration.dto.RaceRegistrationRequest;
import com.eia.camelracing.registration.dto.RaceRegistrationResponse;
import com.eia.camelracing.registration.dto.RegistrationApprovalRequest;
import com.eia.camelracing.registration.dto.RegistrationRejectRequest;
import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.mapper.RaceRegistrationMapper;
import com.eia.camelracing.registration.repository.RaceRegistrationRepository;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.repository.TeamMemberRepository;
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
public class RaceRegistrationService {

    private static final List<RegistrationStatus> APPROVED_REGISTRATION_STATUSES = List.of(
            RegistrationStatus.APPROVED);

    private static final List<RegistrationStatus> PARTICIPATING_REGISTRATION_STATUSES = List.of(
            RegistrationStatus.PENDING,
            RegistrationStatus.APPROVED);

    private final RaceRegistrationRepository registrationRepository;
    private final RaceRepository raceRepository;
    private final CompetitorRepository competitorRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;

    @Transactional
    public RaceRegistrationResponse createRegistration(
            UUID raceId,
            RaceRegistrationRequest request) {
        Race race = findRaceById(raceId);
        validateRaceOpenForRegistration(race);

        User currentUser = currentUserService.getOrSynchronizeCurrentUser();
        validateOrganizerPermission(race, currentUser);

        validateParticipantType(race.getRaceType(), request);

        RaceRegistration registration = RaceRegistration.builder()
                .race(race)
                .registeredAt(LocalDateTime.now())
                .status(RegistrationStatus.PENDING)
                .startingPosition(null)
                .registeredBy(currentUser)
                .build();

        if (request.competitorId() != null) {
            Competitor competitor = findCompetitorById(request.competitorId());
            validateIndividualRegistration(race, competitor);
            registration.setCompetitor(competitor);
        } else {
            Team team = findTeamById(request.teamId());
            validateTeamRegistration(race, team, true);
            registration.setTeam(team);
        }

        return RaceRegistrationMapper.toResponse(registrationRepository.save(registration));
    }

    @Transactional(readOnly = true)
    public List<RaceRegistrationResponse> getRegistrationsByRaceId(UUID raceId) {
        findRaceById(raceId);

        return registrationRepository.findByRaceIdOrderByRegisteredAtAsc(raceId)
                .stream()
                .map(RaceRegistrationMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RaceRegistrationResponse getRegistrationById(UUID id) {
        return RaceRegistrationMapper.toResponse(findDetailedRegistrationById(id));
    }

    @Transactional
    public RaceRegistrationResponse approveRegistration(
            UUID id,
            RegistrationApprovalRequest request) {
        RaceRegistration registration = findDetailedRegistrationById(id);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        validateOrganizerPermission(registration.getRace(), currentUser);

        if (registration.getStatus() != RegistrationStatus.PENDING) {
            throw new ConflictException("Only pending registrations can be approved");
        }

        Race race = registration.getRace();

        if (registration.getTeam() != null) {
            validateTeamRegistration(race, registration.getTeam(), false);
        } else if (registration.getCompetitor() != null) {
            validateIndividualRegistrationForApproval(race, registration.getCompetitor());
        }

        validateCapacity(race);
        validateStartingPosition(race, request.startingPosition());

        RegistrationStatus previousStatus = registration.getStatus();
        registration.setStartingPosition(request.startingPosition());
        registration.setStatus(RegistrationStatus.APPROVED);

        RaceRegistration savedRegistration = registrationRepository.save(registration);

        auditLogService.log(
                currentUser,
                AuditLogService.ACTION_REGISTRATION_APPROVED,
                "REGISTRATION",
                savedRegistration.getId().toString(),
                "Registration approved",
                "status=" + previousStatus,
                "status=" + RegistrationStatus.APPROVED);

        return RaceRegistrationMapper.toResponse(savedRegistration);
    }

    @Transactional
    public RaceRegistrationResponse rejectRegistration(
            UUID id,
            RegistrationRejectRequest request) {
        RaceRegistration registration = findDetailedRegistrationById(id);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        validateOrganizerPermission(registration.getRace(), currentUser);

        if (registration.getStatus() != RegistrationStatus.PENDING) {
            throw new ConflictException("Only pending registrations can be rejected");
        }

        RegistrationStatus previousStatus = registration.getStatus();
        registration.setStatus(RegistrationStatus.REJECTED);
        registration.setValidationNotes(request.reason());

        RaceRegistration savedRegistration = registrationRepository.save(registration);

        auditLogService.log(
                currentUser,
                AuditLogService.ACTION_REGISTRATION_REJECTED,
                "REGISTRATION",
                savedRegistration.getId().toString(),
                "Registration rejected",
                "status=" + previousStatus,
                "status=" + RegistrationStatus.REJECTED
                        + ", reason=" + savedRegistration.getValidationNotes());

        return RaceRegistrationMapper.toResponse(savedRegistration);
    }

    @Transactional
    public void cancelRegistration(UUID id) {
        RaceRegistration registration = findDetailedRegistrationById(id);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        validateOrganizerPermission(registration.getRace(), currentUser);

        if (registration.getStatus() == RegistrationStatus.CANCELLED) {
            return;
        }

        if (registration.getStatus() != RegistrationStatus.PENDING
                && registration.getStatus() != RegistrationStatus.APPROVED) {
            throw new ConflictException("Only pending or approved registrations can be cancelled");
        }

        RegistrationStatus previousStatus = registration.getStatus();
        registration.setStatus(RegistrationStatus.CANCELLED);

        RaceRegistration savedRegistration = registrationRepository.save(registration);

        auditLogService.log(
                currentUser,
                AuditLogService.ACTION_REGISTRATION_CANCELLED,
                "REGISTRATION",
                savedRegistration.getId().toString(),
                "Registration cancelled",
                "status=" + previousStatus,
                "status=" + RegistrationStatus.CANCELLED);
    }

    private void validateRaceOpenForRegistration(Race race) {
        if (race.getStatus() != RaceStatus.OPEN_FOR_REGISTRATION) {
            throw new ConflictException("Race is not open for registration");
        }

        if (!LocalDateTime.now().isBefore(race.getRegistrationDeadline())) {
            throw new ConflictException("Registration deadline has passed");
        }
    }

    private void validateCapacity(Race race) {
        long occupiedCapacity = registrationRepository.countByRaceIdAndStatusIn(
                race.getId(),
                APPROVED_REGISTRATION_STATUSES);

        if (occupiedCapacity >= race.getMaxParticipants()) {
            throw new ConflictException("Race capacity has been reached");
        }
    }

    private void validateStartingPosition(Race race, Integer startingPosition) {
        if (startingPosition > race.getMaxParticipants()) {
            throw new ConflictException(
                    "Starting position must be between 1 and " + race.getMaxParticipants());
        }

        boolean alreadyAssigned = registrationRepository
                .existsByRaceIdAndStartingPositionAndStatusIn(
                        race.getId(),
                        startingPosition,
                        APPROVED_REGISTRATION_STATUSES);

        if (alreadyAssigned) {
            throw new ConflictException("Starting position is already assigned");
        }
    }

    private void validateParticipantType(
            RaceType raceType,
            RaceRegistrationRequest request) {
        if (raceType == RaceType.INDIVIDUAL && request.teamId() != null) {
            throw new ConflictException("Individual races do not accept teams");
        }

        if (raceType == RaceType.TEAM && request.competitorId() != null) {
            throw new ConflictException("Team races do not accept individual competitors");
        }
    }

    private void validateIndividualRegistration(Race race, Competitor competitor) {
        validateActiveCompetitor(competitor);

        if (registrationRepository.existsByRaceIdAndCompetitorId(race.getId(), competitor.getId())) {
            throw new ConflictException("Competitor is already registered in this race");
        }

        validateCompetitorNotParticipatingThroughTeam(race, competitor);
    }

    private void validateIndividualRegistrationForApproval(
            Race race,
            Competitor competitor) {
        validateActiveCompetitor(competitor);
        validateCompetitorNotParticipatingThroughTeam(race, competitor);
    }

    private void validateActiveCompetitor(Competitor competitor) {
        if (competitor.getStatus() != CompetitorStatus.ACTIVE) {
            throw new ConflictException("Only active competitors can be registered");
        }
    }

    private void validateCompetitorNotParticipatingThroughTeam(
            Race race,
            Competitor competitor) {
        if (registrationRepository.existsActiveTeamRegistrationForCompetitor(
                race.getId(),
                competitor.getId(),
                PARTICIPATING_REGISTRATION_STATUSES)) {
            throw new ConflictException("Competitor is already participating through a registered team");
        }
    }

    private void validateTeamRegistration(
            Race race,
            Team team,
            boolean validateDuplicateTeamRegistration) {
        validateEligibleTeam(team);

        if (registrationRepository.existsIndividualRegistrationForActiveTeamMember(
                race.getId(),
                team,
                PARTICIPATING_REGISTRATION_STATUSES)) {
            throw new ConflictException(
                    "An active team member is already registered individually in this race");
        }

        if (validateDuplicateTeamRegistration
                && registrationRepository.existsByRaceIdAndTeamId(race.getId(), team.getId())) {
            throw new ConflictException("Team is already registered in this race");
        }
    }

    private void validateEligibleTeam(Team team) {
        if (team.getStatus() != TeamStatus.ACTIVE) {
            throw new ConflictException("Only active teams can be registered");
        }

        long activeMemberCount = teamMemberRepository.countByTeamIdAndActiveTrue(team.getId());

        if (activeMemberCount == 0) {
            throw new ConflictException("Team must have at least one active member");
        }

        long nonActiveCompetitorCount = teamMemberRepository
                .countActiveMembersWithDifferentCompetitorStatus(
                        team.getId(),
                        CompetitorStatus.ACTIVE);

        if (nonActiveCompetitorCount > 0) {
            throw new ConflictException("All active team members must be active competitors");
        }
    }

    private void validateOrganizerPermission(Race race, User currentUser) {
        if (hasAdministratorRole()) {
            return;
        }

        if (!race.getOrganizer().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException(
                    "Race organizer can only manage registrations for own races");
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

    private Competitor findCompetitorById(UUID id) {
        return competitorRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Competitor with id " + id + " was not found"));
    }

    private Team findTeamById(UUID id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Team with id " + id + " was not found"));
    }

    private RaceRegistration findDetailedRegistrationById(UUID id) {
        return registrationRepository.findDetailedById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Registration with id " + id + " was not found"));
    }
}