package com.eia.camelracing.audit.service;

import java.time.LocalDateTime;

import com.eia.camelracing.audit.dto.AuditLogResponse;
import com.eia.camelracing.audit.entity.AuditLog;
import com.eia.camelracing.audit.mapper.AuditLogMapper;
import com.eia.camelracing.audit.repository.AuditLogRepository;
import com.eia.camelracing.common.dto.PageResponse;
import com.eia.camelracing.user.entity.User;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    public static final String ACTION_USER_CREATED = "USER_CREATED";
    public static final String ACTION_COMPETITOR_CREATED = "COMPETITOR_CREATED";
    public static final String ACTION_COMPETITOR_UPDATED = "COMPETITOR_UPDATED";
    public static final String ACTION_COMPETITOR_STATUS_CHANGED = "COMPETITOR_STATUS_CHANGED";
    public static final String ACTION_COMPETITOR_RETIRED = "COMPETITOR_RETIRED";
    public static final String ACTION_RACE_CREATED = "RACE_CREATED";
    public static final String ACTION_RACE_STATUS_CHANGED = "RACE_STATUS_CHANGED";
    public static final String ACTION_RACE_CANCELLED = "RACE_CANCELLED";
    public static final String ACTION_RACE_COMPLETED = "RACE_COMPLETED";
    public static final String ACTION_REGISTRATION_APPROVED = "REGISTRATION_APPROVED";
    public static final String ACTION_REGISTRATION_REJECTED = "REGISTRATION_REJECTED";
    public static final String ACTION_REGISTRATION_CANCELLED = "REGISTRATION_CANCELLED";
    public static final String ACTION_RESULT_CREATED = "RESULT_CREATED";
    public static final String ACTION_RESULT_UPDATED = "RESULT_UPDATED";

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 100;

    private final AuditLogRepository auditLogRepository;

    @Transactional
    public void log(
            User user,
            String action,
            String entityType,
            String entityId,
            String description,
            String previousValue,
            String newValue) {
        AuditLog auditLog = AuditLog.builder()
                .user(user)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .previousValue(previousValue)
                .newValue(newValue)
                .createdAt(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> getAuditLogs(
            Integer page,
            Integer size) {
        Pageable pageable = buildPageable(page, size);

        Page<AuditLogResponse> auditLogs = auditLogRepository
                .findAllByOrderByCreatedAtDesc(pageable)
                .map(AuditLogMapper::toResponse);

        return PageResponse.from(auditLogs);
    }

    private Pageable buildPageable(Integer page, Integer size) {
        int resolvedPage = page == null ? DEFAULT_PAGE : page;
        int resolvedSize = size == null ? DEFAULT_SIZE : size;

        if (resolvedPage < 0) {
            throw new IllegalArgumentException("Page must be zero or greater");
        }

        if (resolvedSize < 1 || resolvedSize > MAX_SIZE) {
            throw new IllegalArgumentException("Size must be between 1 and " + MAX_SIZE);
        }

        return PageRequest.of(resolvedPage, resolvedSize);
    }
}