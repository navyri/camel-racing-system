import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotFoundPage } from './NotFoundPage'

describe('NotFoundPage', () => {
    it('renders a clear missing route message and home link', () => {
        render(
            <MemoryRouter>
                <NotFoundPage />
            </MemoryRouter>,
        )

        expect(
            screen.getByRole('heading', {
                name: 'Page not found',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'The page you requested does not exist or may have moved.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', {
                name: 'Return to home',
            }),
        ).toHaveAttribute('href', '/')
    })

    it('renders a decorative illustration excluded from assistive technology', () => {
        const { container } = render(
            <MemoryRouter>
                <NotFoundPage />
            </MemoryRouter>,
        )

        const illustration = container.querySelector(
            '.not-found-illustration',
        )

        expect(illustration).not.toBeNull()
        expect(illustration).toHaveAttribute('alt', '')
        expect(illustration).toHaveAttribute('aria-hidden', 'true')
        expect(illustration).toHaveAttribute(
            'src',
            '/images/camello-mc.gif',
        )
    })
})