import { useContext } from 'react'

import { AuthContext } from '../../auth/AuthContext'

export function UserSessionPanel() {
    const auth = useContext(AuthContext)

    if (!auth?.authenticated || !auth.user) {
        return null
    }

    return (
        <div className="user-session">
            <span>
                {auth.user.displayName}
            </span>

            <button
                type="button"
                onClick={auth.logout}
            >
                Sign out
            </button>
        </div>
    )
}