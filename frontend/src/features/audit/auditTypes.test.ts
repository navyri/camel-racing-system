import { describe, expect, it } from 'vitest'
import {
    auditLogPageSizes,
    formatAuditAction,
    formatAuditEntity,
    formatAuditUser,
    formatAuditValue,
} from './auditTypes'

describe('auditTypes', () => {
    it('provides the supported audit log page sizes', () => {
        expect(auditLogPageSizes).toEqual([5, 10, 25, 50, 100])
    })

    it('formats audit values with a safe fallback', () => {
        expect(formatAuditValue('status=PENDING')).toBe('status=PENDING')
        expect(formatAuditValue('   ')).toBe('No value')
        expect(formatAuditValue(null)).toBe('No value')
    })

    it('formats audit users with username and system fallbacks', () => {
        expect(formatAuditUser('administrator', 'user-id')).toBe(
            'administrator',
        )
        expect(formatAuditUser(null, 'user-id')).toBe('user-id')
        expect(formatAuditUser(null, null)).toBe('System')
    })

    it('formats audit entities with optional identifiers', () => {
        expect(formatAuditEntity('REGISTRATION', 'registration-id')).toBe(
            'REGISTRATION: registration-id',
        )
        expect(formatAuditEntity('SYSTEM', null)).toBe('SYSTEM')
    })

    it('formats underscore audit actions into readable labels', () => {
        expect(formatAuditAction('REGISTRATION_APPROVED')).toBe(
            'Registration Approved',
        )
        expect(formatAuditAction('USER_CREATED')).toBe('User Created')
    })
})