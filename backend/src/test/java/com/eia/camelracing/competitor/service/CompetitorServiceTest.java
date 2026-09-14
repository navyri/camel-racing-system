package com.eia.camelracing.competitor.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import com.eia.camelracing.audit.service.AuditLogService;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.common.exception.ConflictException;
import com.eia.camelracing.common.service.CurrentUserService;
import com.eia.camelracing.competitor.dto.CompetitorRequest;
import com.eia.camelracing.competitor.dto.CompetitorResponse;
import com.eia.camelracing.competitor.dto.CompetitorStatusRequest;
import com.eia.camelracing.competitor.entity.Competitor;
import com.eia.camelracing.competitor.entity.CompetitorStatus;
import com.eia.camelracing.competitor.entity.CompetitorType;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
@DisplayName("Competitor service")
class CompetitorServiceTest {

        @Mock
        private CompetitorRepository competitorRepository;

        @Mock
        private CurrentUserService currentUserService;

        @Mock
        private AuditLogService auditLogService;

        @InjectMocks
        private CompetitorService competitorService;

        @Test
        @DisplayName("creates a valid competitor with initial values")
        void createsValidCompetitorWithInitialValues() {
                when(competitorRepository.findByNicknameIgnoreCase("ByteTheCamel"))
                                .thenReturn(Optional.empty());

                when(competitorRepository.save(any(Competitor.class)))
                                .thenAnswer(invocation -> {
                                        Competitor competitor = invocation.getArgument(0);
                                        competitor.setId(UUID.randomUUID());
                                        return competitor;
                                });

                CompetitorResponse response = competitorService.createCompetitor(requestWithDateOfBirth());

                ArgumentCaptor<Competitor> captor = ArgumentCaptor.forClass(Competitor.class);
                verify(competitorRepository).save(captor.capture());

                Competitor savedCompetitor = captor.getValue();

                assertThat(response.id()).isNotNull();
                assertThat(savedCompetitor.getStatus()).isEqualTo(CompetitorStatus.ACTIVE);
                assertThat(savedCompetitor.getRegistrationDate()).isNotNull();
                assertThat(savedCompetitor.getVictories()).isZero();
                assertThat(savedCompetitor.getDefeats()).isZero();
                assertThat(savedCompetitor.getCompletedRaces()).isZero();
        }

        @Test
        @DisplayName("rejects duplicated nickname ignoring case")
        void rejectsDuplicatedNicknameIgnoringCase() {
                Competitor existingCompetitor = competitor("Byte", "byte");

                when(competitorRepository.findByNicknameIgnoreCase("ByteTheCamel"))
                                .thenReturn(Optional.of(existingCompetitor));

                assertThatThrownBy(() -> competitorService.createCompetitor(requestWithDateOfBirth()))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Nickname is already in use");
        }

        @Test
        @DisplayName("allows update when competitor keeps own nickname")
        void allowsUpdateWhenCompetitorKeepsOwnNickname() {
                UUID id = UUID.randomUUID();
                User currentUser = user("administrator");
                Competitor existingCompetitor = competitor("Byte", "ByteTheCamel");
                existingCompetitor.setId(id);

                when(competitorRepository.findById(id)).thenReturn(Optional.of(existingCompetitor));
                when(competitorRepository.findByNicknameIgnoreCase("ByteTheCamel"))
                                .thenReturn(Optional.of(existingCompetitor));
                when(competitorRepository.save(existingCompetitor)).thenReturn(existingCompetitor);
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(currentUser);

                CompetitorResponse response = competitorService.updateCompetitor(
                                id,
                                requestWithDateOfBirth());

                assertThat(response.nickname()).isEqualTo("ByteTheCamel");
                verify(competitorRepository).save(existingCompetitor);
                verify(auditLogService).log(
                                eq(currentUser),
                                eq(AuditLogService.ACTION_COMPETITOR_UPDATED),
                                eq("COMPETITOR"),
                                eq(id.toString()),
                                eq("Competitor information updated"),
                                eq("name=Byte, nickname=ByteTheCamel, competitorType=CAMEL, dateOfBirth=2016-05-20, approximateAge=null, weightKg=400.00, heightCm=220.00, origin=Colombia, status=ACTIVE"),
                                eq("name=Byte, nickname=ByteTheCamel, competitorType=CAMEL, dateOfBirth=2016-05-20, approximateAge=null, weightKg=400.00, heightCm=220.00, origin=Colombia, status=ACTIVE"));
        }

        @Test
        @DisplayName("rejects update when nickname belongs to another competitor")
        void rejectsUpdateWhenNicknameBelongsToAnotherCompetitor() {
                UUID id = UUID.randomUUID();
                Competitor competitorToUpdate = competitor("Byte", "ByteTheCamel");
                competitorToUpdate.setId(id);

                Competitor anotherCompetitor = competitor("Other", "TinyDocker");
                anotherCompetitor.setId(UUID.randomUUID());

                CompetitorRequest request = requestWithApproximateAge();

                when(competitorRepository.findById(id)).thenReturn(Optional.of(competitorToUpdate));
                when(competitorRepository.findByNicknameIgnoreCase("TinyDocker"))
                                .thenReturn(Optional.of(anotherCompetitor));

                assertThatThrownBy(() -> competitorService.updateCompetitor(id, request))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("Nickname is already in use");
        }

        @Test
        @DisplayName("updates competitor status and records audit log")
        void updatesCompetitorStatusAndRecordsAuditLog() {
                UUID id = UUID.randomUUID();
                User currentUser = user("administrator");
                Competitor existingCompetitor = competitor("Byte", "ByteTheCamel");
                existingCompetitor.setId(id);

                when(competitorRepository.findById(id)).thenReturn(Optional.of(existingCompetitor));
                when(competitorRepository.save(existingCompetitor)).thenReturn(existingCompetitor);
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(currentUser);

                CompetitorResponse response = competitorService.updateCompetitorStatus(
                                id,
                                new CompetitorStatusRequest(CompetitorStatus.SUSPENDED));

                assertThat(response.status()).isEqualTo(CompetitorStatus.SUSPENDED);
                verify(competitorRepository).save(existingCompetitor);
                verify(auditLogService).log(
                                eq(currentUser),
                                eq(AuditLogService.ACTION_COMPETITOR_STATUS_CHANGED),
                                eq("COMPETITOR"),
                                eq(id.toString()),
                                eq("Competitor status changed"),
                                eq("status=ACTIVE"),
                                eq("status=SUSPENDED"));
        }

        @Test
        @DisplayName("retires competitor through status update and records retirement audit log")
        void retiresCompetitorThroughStatusUpdateAndRecordsRetirementAuditLog() {
                UUID id = UUID.randomUUID();
                User currentUser = user("administrator");
                Competitor existingCompetitor = competitor("Byte", "ByteTheCamel");
                existingCompetitor.setId(id);

                when(competitorRepository.findById(id)).thenReturn(Optional.of(existingCompetitor));
                when(competitorRepository.save(existingCompetitor)).thenReturn(existingCompetitor);
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(currentUser);

                CompetitorResponse response = competitorService.updateCompetitorStatus(
                                id,
                                new CompetitorStatusRequest(CompetitorStatus.RETIRED));

                assertThat(response.status()).isEqualTo(CompetitorStatus.RETIRED);
                verify(competitorRepository).save(existingCompetitor);
                verify(auditLogService).log(
                                eq(currentUser),
                                eq(AuditLogService.ACTION_COMPETITOR_RETIRED),
                                eq("COMPETITOR"),
                                eq(id.toString()),
                                eq("Competitor retired"),
                                eq("status=ACTIVE"),
                                eq("status=RETIRED"));
        }

        @Test
        @DisplayName("retires competitor and returns without changes when already retired")
        void retiresCompetitorIdempotently() {
                UUID id = UUID.randomUUID();
                User currentUser = user("administrator");
                Competitor competitor = competitor("Byte", "ByteTheCamel");
                competitor.setId(id);

                when(competitorRepository.findById(id)).thenReturn(Optional.of(competitor));
                when(competitorRepository.save(competitor)).thenReturn(competitor);
                when(currentUserService.getOrSynchronizeCurrentUser()).thenReturn(currentUser);

                competitorService.retireCompetitor(id);

                assertThat(competitor.getStatus()).isEqualTo(CompetitorStatus.RETIRED);
                verify(competitorRepository).save(competitor);
                verify(auditLogService).log(
                                eq(currentUser),
                                eq(AuditLogService.ACTION_COMPETITOR_RETIRED),
                                eq("COMPETITOR"),
                                eq(id.toString()),
                                eq("Competitor retired"),
                                eq("status=ACTIVE"),
                                eq("status=RETIRED"));

                competitorService.retireCompetitor(id);

                verify(competitorRepository, times(2)).findById(id);
                verify(competitorRepository, times(1)).save(competitor);
                verify(auditLogService, times(1)).log(
                                any(User.class),
                                eq(AuditLogService.ACTION_COMPETITOR_RETIRED),
                                eq("COMPETITOR"),
                                eq(id.toString()),
                                eq("Competitor retired"),
                                any(String.class),
                                any(String.class));
        }

        @Test
        @DisplayName("rejects reactivation of retired competitor")
        void rejectsReactivationOfRetiredCompetitor() {
                UUID id = UUID.randomUUID();
                Competitor competitor = competitor("Byte", "ByteTheCamel");
                competitor.setId(id);
                competitor.setStatus(CompetitorStatus.RETIRED);

                when(competitorRepository.findById(id)).thenReturn(Optional.of(competitor));

                assertThatThrownBy(() -> competitorService.updateCompetitorStatus(
                                id,
                                new CompetitorStatusRequest(CompetitorStatus.ACTIVE)))
                                .isInstanceOf(ConflictException.class)
                                .hasMessage("A retired competitor cannot be reactivated");
        }

        @Test
        @DisplayName("returns filtered paginated competitors")
        void returnsFilteredPaginatedCompetitors() {
                Competitor competitor = competitor("Byte", "ByteTheCamel");
                competitor.setId(UUID.randomUUID());

                PageRequest pageable = PageRequest.of(0, 10, Sort.by("name").ascending());

                when(competitorRepository.findAllByFilters(
                                CompetitorType.CAMEL,
                                CompetitorStatus.ACTIVE,
                                "Colombia",
                                "byte",
                                pageable)).thenReturn(new PageImpl<>(List.of(competitor), pageable, 1));

                PageResponse<CompetitorResponse> response = competitorService.getCompetitors(
                                CompetitorType.CAMEL,
                                CompetitorStatus.ACTIVE,
                                "Colombia",
                                "byte",
                                0,
                                10,
                                "name,asc");

                assertThat(response.content()).hasSize(1);
                assertThat(response.content().getFirst().nickname()).isEqualTo("ByteTheCamel");
                assertThat(response.totalElements()).isEqualTo(1);
                assertThat(response.first()).isTrue();
                assertThat(response.last()).isTrue();
        }

        @Test
        @DisplayName("rejects invalid page size")
        void rejectsInvalidPageSize() {
                assertThatThrownBy(() -> competitorService.getCompetitors(
                                null,
                                null,
                                null,
                                null,
                                0,
                                101,
                                "name,asc"))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Size must be between 1 and 100");
        }

        @Test
        @DisplayName("rejects invalid sort field")
        void rejectsInvalidSortField() {
                assertThatThrownBy(() -> competitorService.getCompetitors(
                                null,
                                null,
                                null,
                                null,
                                0,
                                10,
                                "status,asc"))
                                .isInstanceOf(IllegalArgumentException.class)
                                .hasMessage("Sort field is not allowed");
        }

        @Test
        @DisplayName("throws not found when competitor does not exist")
        void throwsNotFoundWhenCompetitorDoesNotExist() {
                UUID id = UUID.randomUUID();

                when(competitorRepository.findById(id)).thenReturn(Optional.empty());

                assertThatThrownBy(() -> competitorService.getCompetitorById(id))
                                .isInstanceOf(NoSuchElementException.class)
                                .hasMessageContaining("Competitor with id");
        }

        private CompetitorRequest requestWithDateOfBirth() {
                return new CompetitorRequest(
                                "Byte",
                                "ByteTheCamel",
                                CompetitorType.CAMEL,
                                LocalDate.of(2016, 5, 20),
                                null,
                                new BigDecimal("400.00"),
                                new BigDecimal("220.00"),
                                "Colombia");
        }

        private CompetitorRequest requestWithApproximateAge() {
                return new CompetitorRequest(
                                "Tiny Docker",
                                "TinyDocker",
                                CompetitorType.DWARF,
                                null,
                                21,
                                new BigDecimal("50.00"),
                                new BigDecimal("120.00"),
                                "Colombia");
        }

        private Competitor competitor(String name, String nickname) {
                return Competitor.builder()
                                .name(name)
                                .nickname(nickname)
                                .competitorType(CompetitorType.CAMEL)
                                .dateOfBirth(LocalDate.of(2016, 5, 20))
                                .weightKg(new BigDecimal("400.00"))
                                .heightCm(new BigDecimal("220.00"))
                                .origin("Colombia")
                                .status(CompetitorStatus.ACTIVE)
                                .registrationDate(LocalDateTime.now())
                                .victories(0)
                                .defeats(0)
                                .completedRaces(0)
                                .build();
        }

        private User user(String username) {
                return User.builder()
                                .id(UUID.randomUUID())
                                .keycloakSubject("issuer|" + username)
                                .username(username)
                                .email(username + "@camel-racing.test")
                                .firstName("Test")
                                .lastName("User")
                                .enabled(true)
                                .createdAt(LocalDateTime.now())
                                .build();
        }
}