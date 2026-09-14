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
import com.eia.camelracing.standing.projection.CompetitorStandingProjection;
import com.eia.camelracing.standing.projection.TeamStandingProjection;
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
        private static final int THIRD_POSITION = 3;
        private static final int FOURTH_POSITION = 4;
        private static final int FIFTH_POSITION = 5;
        private static final int SIXTH_POSITION = 6;

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
        void shouldFindExistingRegistrationResultAndDetailedFinishedResults() {
                RaceRegistration finishedRegistration = saveIndividualRegistration(competitor, baseTime);
                RaceResult finishedResult = saveResult(
                                finishedRegistration,
                                WINNER_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));

                Team didNotFinishTeam = teamRepository.save(createTeam("Oasis Runners"));
                RaceRegistration didNotFinishRegistration = saveTeamRegistration(
                                didNotFinishTeam,
                                baseTime.plusMinutes(1));
                saveResult(
                                didNotFinishRegistration,
                                null,
                                ResultStatus.DID_NOT_FINISH,
                                baseTime.plusMinutes(11));

                entityManager.flush();
                entityManager.clear();

                boolean hasRegistrationResult = raceResultRepository.existsByRegistrationId(
                                finishedRegistration.getId());

                List<RaceResult> finishedResults = raceResultRepository.findDetailedFinishedByRaceId(
                                race.getId(),
                                ResultStatus.FINISHED);

                PersistenceUnitUtil persistenceUnitUtil = entityManager
                                .getEntityManagerFactory()
                                .getPersistenceUnitUtil();

                assertThat(hasRegistrationResult).isTrue();
                assertThat(finishedResults)
                                .extracting(RaceResult::getId)
                                .containsExactly(finishedResult.getId());
                assertThat(persistenceUnitUtil.isLoaded(finishedResults.get(0).getRegistration())).isTrue();
                assertThat(persistenceUnitUtil.isLoaded(
                                finishedResults.get(0).getRegistration().getRace())).isTrue();
                assertThat(persistenceUnitUtil.isLoaded(
                                finishedResults.get(0).getRegistration().getCompetitor())).isTrue();
                assertThat(persistenceUnitUtil.isLoaded(finishedResults.get(0).getRecordedBy())).isTrue();
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

        @Test
        void shouldCalculateCompetitorPointsForFinishedPositionsOneThroughFive() {
                Competitor first = competitorRepository.save(createCompetitor("First Runner", "first-runner"));
                Competitor second = competitorRepository.save(createCompetitor("Second Runner", "second-runner"));
                Competitor third = competitorRepository.save(createCompetitor("Third Runner", "third-runner"));
                Competitor fourth = competitorRepository.save(createCompetitor("Fourth Runner", "fourth-runner"));
                Competitor fifth = competitorRepository.save(createCompetitor("Fifth Runner", "fifth-runner"));

                saveResult(
                                saveIndividualRegistration(first, baseTime),
                                WINNER_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));
                saveResult(
                                saveIndividualRegistration(second, baseTime.plusMinutes(1)),
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(11));
                saveResult(
                                saveIndividualRegistration(third, baseTime.plusMinutes(2)),
                                THIRD_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(12));
                saveResult(
                                saveIndividualRegistration(fourth, baseTime.plusMinutes(3)),
                                FOURTH_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(13));
                saveResult(
                                saveIndividualRegistration(fifth, baseTime.plusMinutes(4)),
                                FIFTH_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(14));

                entityManager.flush();
                entityManager.clear();

                List<CompetitorStandingProjection> standings = raceResultRepository
                                .findCompetitorStandings(ResultStatus.FINISHED);

                assertThat(standings)
                                .extracting(
                                                CompetitorStandingProjection::name,
                                                CompetitorStandingProjection::points)
                                .containsExactly(
                                                org.assertj.core.groups.Tuple.tuple("First Runner", 10L),
                                                org.assertj.core.groups.Tuple.tuple("Second Runner", 7L),
                                                org.assertj.core.groups.Tuple.tuple("Third Runner", 5L),
                                                org.assertj.core.groups.Tuple.tuple("Fourth Runner", 3L),
                                                org.assertj.core.groups.Tuple.tuple("Fifth Runner", 1L));
        }

        @Test
        void shouldIncludeCompetitorsWithZeroPointsAndExcludeCompetitorsWithoutResults() {
                Competitor sixthPlace = competitorRepository.save(
                                createCompetitor("Sixth Runner", "sixth-runner"));
                Competitor didNotFinish = competitorRepository.save(
                                createCompetitor("Did Not Finish", "did-not-finish"));
                Competitor disqualified = competitorRepository.save(
                                createCompetitor("Disqualified Runner", "disqualified-runner"));
                Competitor didNotStart = competitorRepository.save(
                                createCompetitor("Did Not Start", "did-not-start"));
                Competitor withoutResult = competitorRepository.save(
                                createCompetitor("Without Result", "without-result"));

                saveResult(
                                saveIndividualRegistration(sixthPlace, baseTime),
                                SIXTH_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));
                saveResult(
                                saveIndividualRegistration(didNotFinish, baseTime.plusMinutes(1)),
                                null,
                                ResultStatus.DID_NOT_FINISH,
                                baseTime.plusMinutes(11));
                saveResult(
                                saveIndividualRegistration(disqualified, baseTime.plusMinutes(2)),
                                null,
                                ResultStatus.DISQUALIFIED,
                                baseTime.plusMinutes(12));
                saveResult(
                                saveIndividualRegistration(didNotStart, baseTime.plusMinutes(3)),
                                null,
                                ResultStatus.DID_NOT_START,
                                baseTime.plusMinutes(13));

                entityManager.flush();
                entityManager.clear();

                List<CompetitorStandingProjection> standings = raceResultRepository
                                .findCompetitorStandings(ResultStatus.FINISHED);

                assertThat(standings)
                                .extracting(
                                                CompetitorStandingProjection::competitorId,
                                                CompetitorStandingProjection::points)
                                .contains(
                                                org.assertj.core.groups.Tuple.tuple(sixthPlace.getId(), 0L),
                                                org.assertj.core.groups.Tuple.tuple(didNotFinish.getId(), 0L),
                                                org.assertj.core.groups.Tuple.tuple(disqualified.getId(), 0L),
                                                org.assertj.core.groups.Tuple.tuple(didNotStart.getId(), 0L))
                                .doesNotContain(
                                                org.assertj.core.groups.Tuple.tuple(withoutResult.getId(), 0L));
        }

        @Test
        void shouldAccumulateCompetitorPointsAcrossRaces() {
                RaceRegistration firstRegistration = saveIndividualRegistration(
                                competitor,
                                race,
                                baseTime);

                saveResult(
                                firstRegistration,
                                WINNER_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));

                Race secondRace = raceRepository.save(createRace(recordedBy));
                RaceRegistration secondRegistration = saveIndividualRegistration(
                                competitor,
                                secondRace,
                                baseTime.plusMinutes(1));

                saveResult(
                                secondRegistration,
                                THIRD_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(11));

                entityManager.flush();
                entityManager.clear();

                List<CompetitorStandingProjection> standings = raceResultRepository
                                .findCompetitorStandings(ResultStatus.FINISHED);

                assertThat(standings)
                                .filteredOn(projection -> projection.competitorId().equals(competitor.getId()))
                                .extracting(CompetitorStandingProjection::points)
                                .containsExactly(15L);
        }

        @Test
        void shouldCalculateTeamPointsAndKeepTeamAndCompetitorRankingsSeparated() {
                Team firstTeam = teamRepository.save(createTeam("First Team"));
                Team zeroPointTeam = teamRepository.save(createTeam("Zero Point Team"));

                RaceRegistration teamWinnerRegistration = saveTeamRegistration(firstTeam, baseTime);
                saveResult(
                                teamWinnerRegistration,
                                WINNER_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));

                RaceRegistration teamZeroPointRegistration = saveTeamRegistration(
                                zeroPointTeam,
                                baseTime.plusMinutes(1));
                saveResult(
                                teamZeroPointRegistration,
                                null,
                                ResultStatus.DID_NOT_START,
                                baseTime.plusMinutes(11));

                RaceRegistration individualRegistration = saveIndividualRegistration(
                                competitor,
                                baseTime.plusMinutes(2));
                saveResult(
                                individualRegistration,
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(12));

                entityManager.flush();
                entityManager.clear();

                List<CompetitorStandingProjection> competitorStandings = raceResultRepository
                                .findCompetitorStandings(ResultStatus.FINISHED);

                List<TeamStandingProjection> teamStandings = raceResultRepository
                                .findTeamStandings(ResultStatus.FINISHED);

                assertThat(competitorStandings)
                                .extracting(CompetitorStandingProjection::competitorId)
                                .contains(competitor.getId())
                                .doesNotContain(firstTeam.getId(), zeroPointTeam.getId());

                assertThat(competitorStandings)
                                .filteredOn(projection -> projection.competitorId().equals(competitor.getId()))
                                .extracting(CompetitorStandingProjection::points)
                                .containsExactly(7L);

                assertThat(teamStandings)
                                .extracting(TeamStandingProjection::teamId)
                                .contains(firstTeam.getId(), zeroPointTeam.getId())
                                .doesNotContain(competitor.getId());

                assertThat(teamStandings)
                                .extracting(
                                                TeamStandingProjection::teamId,
                                                TeamStandingProjection::points)
                                .contains(
                                                org.assertj.core.groups.Tuple.tuple(firstTeam.getId(), 10L),
                                                org.assertj.core.groups.Tuple.tuple(zeroPointTeam.getId(), 0L));
        }

        @Test
        void shouldAccumulateTeamPointsAcrossRaces() {
                RaceRegistration firstRegistration = saveTeamRegistration(
                                team,
                                race,
                                baseTime);

                saveResult(
                                firstRegistration,
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));

                Race secondRace = raceRepository.save(createRace(recordedBy));
                RaceRegistration secondRegistration = saveTeamRegistration(
                                team,
                                secondRace,
                                baseTime.plusMinutes(1));

                saveResult(
                                secondRegistration,
                                FIFTH_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(11));

                entityManager.flush();
                entityManager.clear();

                List<TeamStandingProjection> standings = raceResultRepository
                                .findTeamStandings(ResultStatus.FINISHED);

                assertThat(standings)
                                .filteredOn(projection -> projection.teamId().equals(team.getId()))
                                .extracting(TeamStandingProjection::points)
                                .containsExactly(8L);
        }

        @Test
        void shouldOrderCompetitorStandingsByPointsNameNicknameAndId() {
                Competitor alpha = competitorRepository.save(
                                createCompetitor("Alpha", "alpha"));
                Competitor betaOne = competitorRepository.save(
                                createCompetitor("Beta", "beta-one"));
                Competitor betaTwo = competitorRepository.save(
                                createCompetitor("Beta", "beta-two"));

                saveResult(
                                saveIndividualRegistration(betaTwo, baseTime),
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));
                saveResult(
                                saveIndividualRegistration(betaOne, baseTime.plusMinutes(1)),
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(11));
                saveResult(
                                saveIndividualRegistration(alpha, baseTime.plusMinutes(2)),
                                SECOND_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(12));

                entityManager.flush();
                entityManager.clear();

                List<CompetitorStandingProjection> standings = raceResultRepository
                                .findCompetitorStandings(ResultStatus.FINISHED);

                assertThat(standings)
                                .extracting(
                                                CompetitorStandingProjection::name,
                                                CompetitorStandingProjection::nickname)
                                .containsExactly(
                                                org.assertj.core.groups.Tuple.tuple("Alpha", "alpha"),
                                                org.assertj.core.groups.Tuple.tuple("Beta", "beta-one"),
                                                org.assertj.core.groups.Tuple.tuple("Beta", "beta-two"));
        }

        @Test
        void shouldOrderTeamStandingsByPointsNameAndId() {
                Team alpha = teamRepository.save(createTeam("Alpha Team"));
                Team beta = teamRepository.save(createTeam("Beta Team"));

                saveResult(
                                saveTeamRegistration(beta, baseTime),
                                THIRD_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(10));
                saveResult(
                                saveTeamRegistration(alpha, baseTime.plusMinutes(1)),
                                THIRD_POSITION,
                                ResultStatus.FINISHED,
                                baseTime.plusMinutes(11));

                entityManager.flush();
                entityManager.clear();

                List<TeamStandingProjection> standings = raceResultRepository
                                .findTeamStandings(ResultStatus.FINISHED);

                assertThat(standings)
                                .extracting(TeamStandingProjection::name)
                                .containsExactly("Alpha Team", "Beta Team");
        }

        @Test
        void shouldReturnEmptyStandingsWhenNoResultsExist() {
                entityManager.flush();
                entityManager.clear();

                List<CompetitorStandingProjection> competitorStandings = raceResultRepository
                                .findCompetitorStandings(ResultStatus.FINISHED);

                List<TeamStandingProjection> teamStandings = raceResultRepository
                                .findTeamStandings(ResultStatus.FINISHED);

                assertThat(competitorStandings).isEmpty();
                assertThat(teamStandings).isEmpty();
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