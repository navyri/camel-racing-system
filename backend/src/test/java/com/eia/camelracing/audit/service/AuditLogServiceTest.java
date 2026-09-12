package com.eia.camelracing.audit.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import com.eia.camelracing.audit.dto.AuditLogResponse;
import com.eia.camelracing.audit.entity.AuditLog;
import com.eia.camelracing.audit.repository.AuditLogRepository;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.user.entity.User;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
@DisplayName("Audit log service")
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditLogService auditLogService;

    @Nested
    @DisplayName("log")
    class Log {

        @Test
        @DisplayName("persists audit log with received values")
        void persistsAuditLogWithReceivedValues() {
            User user = user("administrator");

            auditLogService.log(
                    user,
                    AuditLogService.ACTION_RACE_CANCELLED,
                    "RACE",
                    "race-id",
                    "Race cancelled",
                    "status=OPEN_FOR_REGISTRATION",
                    "status=CANCELLED");

            ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);

            verify(auditLogRepository).save(captor.capture());

            AuditLog savedAuditLog = captor.getValue();

            assertThat(savedAuditLog.getUser()).isEqualTo(user);
            assertThat(savedAuditLog.getAction()).isEqualTo(
                    AuditLogService.ACTION_RACE_CANCELLED);
            assertThat(savedAuditLog.getEntityType()).isEqualTo("RACE");
            assertThat(savedAuditLog.getEntityId()).isEqualTo("race-id");
            assertThat(savedAuditLog.getDescription()).isEqualTo("Race cancelled");
            assertThat(savedAuditLog.getPreviousValue()).isEqualTo(
                    "status=OPEN_FOR_REGISTRATION");
            assertThat(savedAuditLog.getNewValue()).isEqualTo("status=CANCELLED");
            assertThat(savedAuditLog.getCreatedAt()).isNotNull();
        }

        @Test
        @DisplayName("persists null optional values")
        void persistsNullOptionalValues() {
            User user = user("administrator");

            auditLogService.log(
                    user,
                    AuditLogService.ACTION_USER_CREATED,
                    "USER",
                    "user-id",
                    "Local user created from authenticated JWT",
                    null,
                    null);

            ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);

            verify(auditLogRepository).save(captor.capture());

            AuditLog savedAuditLog = captor.getValue();

            assertThat(savedAuditLog.getPreviousValue()).isNull();
            assertThat(savedAuditLog.getNewValue()).isNull();
        }
    }

    @Nested
    @DisplayName("get audit logs")
    class GetAuditLogs {

        @Test
        @DisplayName("uses default pagination and maps audit logs")
        void usesDefaultPaginationAndMapsAuditLogs() {
            User user = user("administrator");
            AuditLog auditLog = AuditLog.builder()
                    .id(UUID.randomUUID())
                    .user(user)
                    .action(AuditLogService.ACTION_RACE_CANCELLED)
                    .entityType("RACE")
                    .entityId("race-id")
                    .description("Race cancelled")
                    .previousValue("status=OPEN_FOR_REGISTRATION")
                    .newValue("status=CANCELLED")
                    .createdAt(LocalDateTime.now())
                    .build();

            when(auditLogRepository.findAllByOrderByCreatedAtDesc(
                    PageRequest.of(0, 10))).thenReturn(new PageImpl<>(
                            List.of(auditLog),
                            PageRequest.of(0, 10),
                            1));

            PageResponse<AuditLogResponse> response = auditLogService.getAuditLogs(null, null);

            assertThat(response.content()).hasSize(1);
            assertThat(response.page()).isZero();
            assertThat(response.size()).isEqualTo(10);
            assertThat(response.totalElements()).isEqualTo(1);
            assertThat(response.content().getFirst().username()).isEqualTo("administrator");

            verify(auditLogRepository).findAllByOrderByCreatedAtDesc(
                    PageRequest.of(0, 10));
        }

        @Test
        @DisplayName("uses requested pagination")
        void usesRequestedPagination() {
            when(auditLogRepository.findAllByOrderByCreatedAtDesc(
                    PageRequest.of(1, 5))).thenReturn(new PageImpl<>(
                            List.of(),
                            PageRequest.of(1, 5),
                            0));

            PageResponse<AuditLogResponse> response = auditLogService.getAuditLogs(1, 5);

            assertThat(response.page()).isEqualTo(1);
            assertThat(response.size()).isEqualTo(5);

            verify(auditLogRepository).findAllByOrderByCreatedAtDesc(
                    PageRequest.of(1, 5));
        }

        @Test
        @DisplayName("rejects negative page")
        void rejectsNegativePage() {
            assertThatThrownBy(() -> auditLogService.getAuditLogs(-1, 10))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Page must be zero or greater");
        }

        @Test
        @DisplayName("rejects invalid size")
        void rejectsInvalidSize() {
            assertThatThrownBy(() -> auditLogService.getAuditLogs(0, 0))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Size must be between 1 and 100");

            assertThatThrownBy(() -> auditLogService.getAuditLogs(0, 101))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Size must be between 1 and 100");
        }
    }

    private User user(String username) {
        return User.builder()
                .id(UUID.randomUUID())
                .keycloakSubject("issuer|" + username)
                .username(username)
                .email(username + "@camel-racing.test")
                .firstName("Audit")
                .lastName("User")
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build();
    }
}