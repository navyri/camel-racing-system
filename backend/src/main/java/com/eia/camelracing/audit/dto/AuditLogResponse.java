package com.eia.camelracing.audit.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID userId,
        String username,
        String action,
        String entityType,
        String entityId,
        String description,
        String previousValue,
        String newValue,
        LocalDateTime createdAt
) {
}