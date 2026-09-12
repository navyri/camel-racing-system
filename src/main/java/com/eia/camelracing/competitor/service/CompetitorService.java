package com.eia.camelracing.competitor.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.Set;
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
import com.eia.camelracing.competitor.mapper.CompetitorMapper;
import com.eia.camelracing.competitor.repository.CompetitorRepository;
import com.eia.camelracing.user.entity.User;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CompetitorService {

    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 10;
    private static final int MAX_SIZE = 100;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "name",
            "nickname",
            "registrationDate",
            "victories",
            "defeats",
            "completedRaces");

    private final CompetitorRepository competitorRepository;
    private final CurrentUserService currentUserService;
    private final AuditLogService auditLogService;

    @Transactional
    public CompetitorResponse createCompetitor(CompetitorRequest request) {
        validateNicknameAvailable(request.nickname(), null);

        Competitor competitor = CompetitorMapper.toEntity(request);
        competitor.setRegistrationDate(LocalDateTime.now());
        competitor.setVictories(0);
        competitor.setDefeats(0);
        competitor.setCompletedRaces(0);

        return CompetitorMapper.toResponse(competitorRepository.save(competitor));
    }

    @Transactional(readOnly = true)
    public PageResponse<CompetitorResponse> getCompetitors(
            CompetitorType type,
            CompetitorStatus status,
            String origin,
            String search,
            Integer page,
            Integer size,
            String sort) {
        Pageable pageable = buildPageable(page, size, sort);

        Page<CompetitorResponse> competitors = competitorRepository.findAllByFilters(
                type,
                status,
                normalizeFilter(origin),
                normalizeFilter(search),
                pageable).map(CompetitorMapper::toResponse);

        return PageResponse.from(competitors);
    }

    @Transactional(readOnly = true)
    public CompetitorResponse getCompetitorById(UUID id) {
        return CompetitorMapper.toResponse(findCompetitorById(id));
    }

    @Transactional
    public CompetitorResponse updateCompetitor(UUID id, CompetitorRequest request) {
        Competitor competitor = findCompetitorById(id);
        validateNicknameAvailable(request.nickname(), id);

        String previousValue = competitorSnapshot(competitor);

        CompetitorMapper.updateEntity(competitor, request);

        Competitor savedCompetitor = competitorRepository.save(competitor);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        auditLogService.log(
                currentUser,
                AuditLogService.ACTION_COMPETITOR_UPDATED,
                "COMPETITOR",
                savedCompetitor.getId().toString(),
                "Competitor information updated",
                previousValue,
                competitorSnapshot(savedCompetitor));

        return CompetitorMapper.toResponse(savedCompetitor);
    }

    @Transactional
    public CompetitorResponse updateCompetitorStatus(UUID id, CompetitorStatusRequest request) {
        Competitor competitor = findCompetitorById(id);

        if (competitor.getStatus() == CompetitorStatus.RETIRED
                && request.status() != CompetitorStatus.RETIRED) {
            throw new ConflictException("A retired competitor cannot be reactivated");
        }

        CompetitorStatus previousStatus = competitor.getStatus();

        competitor.setStatus(request.status());

        Competitor savedCompetitor = competitorRepository.save(competitor);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        String action = request.status() == CompetitorStatus.RETIRED
                ? AuditLogService.ACTION_COMPETITOR_RETIRED
                : AuditLogService.ACTION_COMPETITOR_STATUS_CHANGED;
        String description = request.status() == CompetitorStatus.RETIRED
                ? "Competitor retired"
                : "Competitor status changed";

        auditLogService.log(
                currentUser,
                action,
                "COMPETITOR",
                savedCompetitor.getId().toString(),
                description,
                "status=" + previousStatus,
                "status=" + savedCompetitor.getStatus());

        return CompetitorMapper.toResponse(savedCompetitor);
    }

    @Transactional
    public void retireCompetitor(UUID id) {
        Competitor competitor = findCompetitorById(id);

        if (competitor.getStatus() == CompetitorStatus.RETIRED) {
            return;
        }

        CompetitorStatus previousStatus = competitor.getStatus();
        competitor.setStatus(CompetitorStatus.RETIRED);

        Competitor savedCompetitor = competitorRepository.save(competitor);
        User currentUser = currentUserService.getOrSynchronizeCurrentUser();

        auditLogService.log(
                currentUser,
                AuditLogService.ACTION_COMPETITOR_RETIRED,
                "COMPETITOR",
                savedCompetitor.getId().toString(),
                "Competitor retired",
                "status=" + previousStatus,
                "status=" + CompetitorStatus.RETIRED);
    }

    private Competitor findCompetitorById(UUID id) {
        return competitorRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException(
                        "Competitor with id " + id + " was not found"));
    }

    private void validateNicknameAvailable(String nickname, UUID competitorId) {
        competitorRepository.findByNicknameIgnoreCase(nickname)
                .filter(existingCompetitor -> competitorId == null
                        || !competitorId.equals(existingCompetitor.getId()))
                .ifPresent(existingCompetitor -> {
                    throw new ConflictException("Nickname is already in use");
                });
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

    private Sort buildSort(String sort) {
        String resolvedSort = sort == null || sort.isBlank() ? "name,asc" : sort.trim();
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

    private String competitorSnapshot(Competitor competitor) {
        return "name=" + competitor.getName()
                + ", nickname=" + competitor.getNickname()
                + ", competitorType=" + competitor.getCompetitorType()
                + ", dateOfBirth=" + valueOf(competitor.getDateOfBirth())
                + ", approximateAge=" + valueOf(competitor.getApproximateAge())
                + ", weightKg=" + decimalValue(competitor.getWeightKg())
                + ", heightCm=" + decimalValue(competitor.getHeightCm())
                + ", origin=" + competitor.getOrigin()
                + ", status=" + competitor.getStatus();
    }

    private String decimalValue(BigDecimal value) {
        return value == null ? "null" : value.toPlainString();
    }

    private String valueOf(LocalDate value) {
        return value == null ? "null" : value.toString();
    }

    private String valueOf(Integer value) {
        return value == null ? "null" : value.toString();
    }
}