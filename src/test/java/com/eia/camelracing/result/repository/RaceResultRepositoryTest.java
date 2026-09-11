package com.eia.camelracing.result.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.race.entity.Race;
import com.eia.camelracing.race.entity.RaceStatus;
import com.eia.camelracing.race.entity.RaceType;
import com.eia.camelracing.race.repository.RaceRepository;
import com.eia.camelracing.registration.entity.RaceRegistration;
import com.eia.camelracing.registration.entity.RegistrationStatus;
import com.eia.camelracing.registration.repository.RaceRegistrationRepository;
import com.eia.camelracing.result.entity.RaceResult;
import com.eia.camelracing.result.entity.ResultStatus;
import com.eia.camelracing.team.entity.Team;
import com.eia.camelracing.team.entity.TeamStatus;
import com.eia.camelracing.team.repository.TeamRepository;
import com.eia.camelracing.user.entity.User;
import com.eia.camelracing.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceUnitUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;

@Tag("integracion")
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class RaceResultRepositoryTest {

    private static final int WINNER_POSITION = 1;
    private static final int SECOND_POSITION = 2;

    @Autowired
    private RaceResultRepository raceResultRepository;

    @Autowired
    private RaceRegistrationRepository registrationRepository;

    @Autowired
    private RaceRepository raceRepository;

    @Autowired
    private CompetitorRepository competitorRepository;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    private User recordedBy;
    private Race race;
    private Competitor competitor;
    private Team team;
    private LocalDateTime baseTime;

    @BeforeEach
    void setUp() {
        baseTime = LocalDateTime.of(2026, 9, 11, 8, 0);

        recordedBy = userRepository.save(createUser());
        race = raceRepository.save(createRace(recordedBy));
        competitor = competitorRepository.save(createCompetitor("Desert Star", "desert-star"));
        team = teamRepository.save(createTeam("Sand Riders"));
    }

    @Test
    void shouldFindExistingRegistrationAndFinishedPositionForRace() {
        RaceRegistration registration = saveIndividualRegistration(competitor, baseTime);
        RaceResult result = saveResult(
                registration,
                WINNER_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(10));

        boolean hasRegistrationResult = raceResultRepository.existsByRegistrationId(registration.getId());

        boolean hasFinishedWinnerPosition = raceResultRepository
                .existsByRegistration_Race_IdAndFinalPositionAndStatus(
                        race.getId(),
                        WINNER_POSITION,
                        ResultStatus.FINISHED);

        boolean hasDifferentFinishedPosition = raceResultRepository
                .existsByRegistration_Race_IdAndFinalPositionAndStatus(
                        race.getId(),
                        SECOND_POSITION,
                        ResultStatus.FINISHED);

        boolean hasPositionExcludingCurrentResult = raceResultRepository
                .existsByRegistration_Race_IdAndFinalPositionAndStatusAndIdNot(
                        race.getId(),
                        WINNER_POSITION,
                        ResultStatus.FINISHED,
                        result.getId());

        boolean hasPositionIncludingDifferentResult = raceResultRepository
                .existsByRegistration_Race_IdAndFinalPositionAndStatusAndIdNot(
                        race.getId(),
                        WINNER_POSITION,
                        ResultStatus.FINISHED,
                        UUID.randomUUID());

        assertThat(hasRegistrationResult).isTrue();
        assertThat(hasFinishedWinnerPosition).isTrue();
        assertThat(hasDifferentFinishedPosition).isFalse();
        assertThat(hasPositionExcludingCurrentResult).isFalse();
        assertThat(hasPositionIncludingDifferentResult).isTrue();
    }

    @Test
    void shouldReturnDetailedResultsOrderedByFinishedPositionThenRecordedAt() {
        RaceRegistration winnerRegistration = saveIndividualRegistration(competitor, baseTime);

        Competitor secondCompetitor = competitorRepository.save(
                createCompetitor("Golden Dune", "golden-dune"));
        RaceRegistration secondRegistration = saveIndividualRegistration(
                secondCompetitor,
                baseTime.plusMinutes(1));

        Team disqualifiedTeam = teamRepository.save(createTeam("Desert Storm"));
        RaceRegistration disqualifiedRegistration = saveTeamRegistration(
                disqualifiedTeam,
                baseTime.plusMinutes(2));

        Team didNotFinishTeam = teamRepository.save(createTeam("Oasis Runners"));
        RaceRegistration didNotFinishRegistration = saveTeamRegistration(
                didNotFinishTeam,
                baseTime.plusMinutes(3));

        RaceResult secondPlace = saveResult(
                secondRegistration,
                SECOND_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(20));

        RaceResult winner = saveResult(
                winnerRegistration,
                WINNER_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(21));

        RaceResult disqualified = saveResult(
                disqualifiedRegistration,
                null,
                ResultStatus.DISQUALIFIED,
                baseTime.plusMinutes(22));

        RaceResult didNotFinish = saveResult(
                didNotFinishRegistration,
                null,
                ResultStatus.DID_NOT_FINISH,
                baseTime.plusMinutes(23));

        entityManager.flush();
        entityManager.clear();

        List<RaceResult> results = raceResultRepository.findDetailedByRaceId(
                race.getId(),
                ResultStatus.FINISHED);

        PersistenceUnitUtil persistenceUnitUtil = entityManager
                .getEntityManagerFactory()
                .getPersistenceUnitUtil();

        assertThat(results)
                .extracting(RaceResult::getId)
                .containsExactly(
                        winner.getId(),
                        secondPlace.getId(),
                        disqualified.getId(),
                        didNotFinish.getId());

        assertThat(persistenceUnitUtil.isLoaded(results.get(0).getRegistration())).isTrue();
        assertThat(persistenceUnitUtil.isLoaded(results.get(0).getRegistration().getRace())).isTrue();
        assertThat(persistenceUnitUtil.isLoaded(results.get(0).getRegistration().getCompetitor())).isTrue();
        assertThat(persistenceUnitUtil.isLoaded(results.get(0).getRecordedBy())).isTrue();
        assertThat(persistenceUnitUtil.isLoaded(results.get(2).getRegistration().getTeam())).isTrue();
    }

    @Test
    void shouldFindDetailedResultById() {
        RaceRegistration registration = saveIndividualRegistration(competitor, baseTime);
        RaceResult savedResult = saveResult(
                registration,
                WINNER_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(10));

        entityManager.flush();
        entityManager.clear();

        RaceResult result = raceResultRepository.findDetailedById(savedResult.getId()).orElseThrow();

        PersistenceUnitUtil persistenceUnitUtil = entityManager
                .getEntityManagerFactory()
                .getPersistenceUnitUtil();

        assertThat(result.getId()).isEqualTo(savedResult.getId());
        assertThat(persistenceUnitUtil.isLoaded(result.getRegistration())).isTrue();
        assertThat(persistenceUnitUtil.isLoaded(result.getRegistration().getRace())).isTrue();
        assertThat(persistenceUnitUtil.isLoaded(result.getRegistration().getCompetitor())).isTrue();
        assertThat(persistenceUnitUtil.isLoaded(result.getRecordedBy())).isTrue();

        assertThat(raceResultRepository.findDetailedById(UUID.randomUUID())).isEmpty();
    }

    @Test
    void shouldDetectOfficialWinnerOnlyForFinishedWinnerPosition() {
        RaceRegistration registration = saveIndividualRegistration(competitor, baseTime);
        saveResult(
                registration,
                SECOND_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(10));

        boolean hasWinnerBeforeWinnerResult = raceResultRepository.existsOfficialWinnerByRaceId(
                race.getId(),
                ResultStatus.FINISHED,
                WINNER_POSITION);

        assertThat(hasWinnerBeforeWinnerResult).isFalse();

        Competitor winnerCompetitor = competitorRepository.save(
                createCompetitor("Red Sand", "red-sand"));
        RaceRegistration winnerRegistration = saveIndividualRegistration(
                winnerCompetitor,
                baseTime.plusMinutes(1));
        saveResult(
                winnerRegistration,
                WINNER_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(11));

        boolean hasWinnerAfterWinnerResult = raceResultRepository.existsOfficialWinnerByRaceId(
                race.getId(),
                ResultStatus.FINISHED,
                WINNER_POSITION);

        assertThat(hasWinnerAfterWinnerResult).isTrue();
    }

    @Test
    void shouldCountCompetitorStatisticsWithoutDidNotStartResults() {
        RaceRegistration winnerRegistration = saveIndividualRegistration(competitor, baseTime);
        saveResult(
                winnerRegistration,
                WINNER_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(10));

        Race secondRace = raceRepository.save(createRace(recordedBy));
        RaceRegistration didNotFinishRegistration = saveIndividualRegistration(
                competitor,
                secondRace,
                baseTime.plusMinutes(1));
        saveResult(
                didNotFinishRegistration,
                null,
                ResultStatus.DID_NOT_FINISH,
                baseTime.plusMinutes(11));

        Race thirdRace = raceRepository.save(createRace(recordedBy));
        RaceRegistration disqualifiedRegistration = saveIndividualRegistration(
                competitor,
                thirdRace,
                baseTime.plusMinutes(2));
        saveResult(
                disqualifiedRegistration,
                null,
                ResultStatus.DISQUALIFIED,
                baseTime.plusMinutes(12));

        Race fourthRace = raceRepository.save(createRace(recordedBy));
        RaceRegistration didNotStartRegistration = saveIndividualRegistration(
                competitor,
                fourthRace,
                baseTime.plusMinutes(3));
        saveResult(
                didNotStartRegistration,
                null,
                ResultStatus.DID_NOT_START,
                baseTime.plusMinutes(13));

        long completedRaces = raceResultRepository.countByCompetitorIdAndStatusIn(
                competitor.getId(),
                List.of(
                        ResultStatus.FINISHED,
                        ResultStatus.DID_NOT_FINISH,
                        ResultStatus.DISQUALIFIED));

        long victories = raceResultRepository.countByCompetitorIdAndStatusAndFinalPosition(
                competitor.getId(),
                ResultStatus.FINISHED,
                WINNER_POSITION);

        long defeats = raceResultRepository.countDefeatsByCompetitorId(
                competitor.getId(),
                ResultStatus.FINISHED,
                ResultStatus.DID_NOT_FINISH,
                ResultStatus.DISQUALIFIED,
                WINNER_POSITION);

        assertThat(completedRaces).isEqualTo(3);
        assertThat(victories).isEqualTo(1);
        assertThat(defeats).isEqualTo(2);
    }

    @Test
    void shouldCountTeamStatisticsWithoutDidNotStartResults() {
        RaceRegistration winnerRegistration = saveTeamRegistration(team, baseTime);
        saveResult(
                winnerRegistration,
                WINNER_POSITION,
                ResultStatus.FINISHED,
                baseTime.plusMinutes(10));

        Race secondRace = raceRepository.save(createRace(recordedBy));
        RaceRegistration didNotFinishRegistration = saveTeamRegistration(
                team,
                secondRace,
                baseTime.plusMinutes(1));
        saveResult(
                didNotFinishRegistration,
                null,
                ResultStatus.DID_NOT_FINISH,
                baseTime.plusMinutes(11));

        Race thirdRace = raceRepository.save(createRace(recordedBy));
        RaceRegistration disqualifiedRegistration = saveTeamRegistration(
                team,
                thirdRace,
                baseTime.plusMinutes(2));
        saveResult(
                disqualifiedRegistration,
                null,
                ResultStatus.DISQUALIFIED,
                baseTime.plusMinutes(12));

        Race fourthRace = raceRepository.save(createRace(recordedBy));
        RaceRegistration didNotStartRegistration = saveTeamRegistration(
                team,
                fourthRace,
                baseTime.plusMinutes(3));
        saveResult(
                didNotStartRegistration,
                null,
                ResultStatus.DID_NOT_START,
                baseTime.plusMinutes(13));

        long victories = raceResultRepository.countVictoriesByTeamId(
                team.getId(),
                ResultStatus.FINISHED,
                WINNER_POSITION);

        long defeats = raceResultRepository.countDefeatsByTeamId(
                team.getId(),
                ResultStatus.FINISHED,
                ResultStatus.DID_NOT_FINISH,
                ResultStatus.DISQUALIFIED,
                WINNER_POSITION);

        assertThat(victories).isEqualTo(1);
        assertThat(defeats).isEqualTo(2);
    }

    private User createUser() {
        return User.builder()
                .keycloakSubject("repository-test-subject")
                .username("repository-test-user")
                .email("repository-test@example.com")
                .firstName("Repository")
                .lastName("Tester")
                .enabled(true)
                .createdAt(baseTime)
                .build();
    }

    private Race createRace(User organizer) {
        return Race.builder()
                .name("Repository Test Race " + UUID.randomUUID())
                .description("Race used for repository integration tests")
                .scheduledAt(baseTime.plusDays(1))
                .startLocation("Desert Gate")
                .finishLocation("Oasis Finish")
                .distanceMeters(new BigDecimal("5000.00"))
                .maxParticipants(20)
                .raceType(RaceType.MIXED)
                .status(RaceStatus.IN_PROGRESS)
                .organizer(organizer)
                .registrationDeadline(baseTime.minusDays(1))
                .createdAt(baseTime)
                .updatedAt(baseTime)
                .build();
    }

    private Competitor createCompetitor(String name, String nickname) {
        return Competitor.builder()
                .name(name)
                .nickname(nickname)
                .competitorType(CompetitorType.CAMEL)
                .dateOfBirth(LocalDate.of(2020, 1, 1))
                .approximateAge(null)
                .weightKg(new BigDecimal("450.00"))
                .heightCm(new BigDecimal("180.00"))
                .origin("Desert")
                .status(CompetitorStatus.ACTIVE)
                .registrationDate(baseTime)
                .victories(0)
                .defeats(0)
                .completedRaces(0)
                .build();
    }

    private Team createTeam(String name) {
        return Team.builder()
                .name(name)
                .description("Team used for repository integration tests")
                .coachName("Repository Coach")
                .status(TeamStatus.ACTIVE)
                .createdAt(baseTime)
                .victories(0)
                .defeats(0)
                .build();
    }

    private RaceRegistration saveIndividualRegistration(
            Competitor registeredCompetitor,
            LocalDateTime registeredAt) {
        return saveIndividualRegistration(registeredCompetitor, race, registeredAt);
    }

    private RaceRegistration saveIndividualRegistration(
            Competitor registeredCompetitor,
            Race registeredRace,
            LocalDateTime registeredAt) {
        return registrationRepository.save(
                RaceRegistration.builder()
                        .race(registeredRace)
                        .competitor(registeredCompetitor)
                        .team(null)
                        .registeredAt(registeredAt)
                        .status(RegistrationStatus.APPROVED)
                        .startingPosition(null)
                        .validationNotes(null)
                        .registeredBy(recordedBy)
                        .build());
    }

    private RaceRegistration saveTeamRegistration(
            Team registeredTeam,
            LocalDateTime registeredAt) {
        return saveTeamRegistration(registeredTeam, race, registeredAt);
    }

    private RaceRegistration saveTeamRegistration(
            Team registeredTeam,
            Race registeredRace,
            LocalDateTime registeredAt) {
        return registrationRepository.save(
                RaceRegistration.builder()
                        .race(registeredRace)
                        .competitor(null)
                        .team(registeredTeam)
                        .registeredAt(registeredAt)
                        .status(RegistrationStatus.APPROVED)
                        .startingPosition(null)
                        .validationNotes(null)
                        .registeredBy(recordedBy)
                        .build());
    }

    private RaceResult saveResult(
            RaceRegistration registration,
            Integer finalPosition,
            ResultStatus status,
            LocalDateTime recordedAt) {
        return raceResultRepository.save(
                RaceResult.builder()
                        .registration(registration)
                        .startingPosition(registration.getStartingPosition())
                        .finalPosition(finalPosition)
                        .completionTime(
                                status == ResultStatus.FINISHED
                                        ? Duration.ofSeconds(600)
                                        : Duration.ZERO)
                        .penaltyTime(Duration.ZERO)
                        .status(status)
                        .notes(null)
                        .recordedBy(recordedBy)
                        .recordedAt(recordedAt)
                        .build());
    }
}