package com.eia.camelracing.audit.mapper;

import com.eia.camelracing.audit.dto.AuditLogResponse;
import com.eia.camelracing.audit.entity.AuditLog;

public final class AuditLogMapper {

    private AuditLogMapper() {
    }

    public static AuditLogResponse toResponse(AuditLog auditLog) {
        if (auditLog == null) {
            return null;
        }

        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getUser() == null ? null : auditLog.getUser().getId(),
                auditLog.getUser() == null ? null : auditLog.getUser().getUsername(),
                auditLog.getAction(),
                auditLog.getEntityType(),
                auditLog.getEntityId(),
                auditLog.getDescription(),
                auditLog.getPreviousValue(),
                auditLog.getNewValue(),
                auditLog.getCreatedAt()
        );
    }
}