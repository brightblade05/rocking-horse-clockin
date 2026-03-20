'use client'

import { deleteGuardian } from '@/app/actions/children'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ArchiveButton({ id }: { id: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)

    const handleArchive = async () => {
        setLoading(true)
        await deleteGuardian(id)
        router.push('/admin/children')
    }

    return (
        <>
            <button 
                type="button"
                onClick={() => setShowModal(true)}
                disabled={loading}
                className="btn" 
                style={{ background: '#fff0f0', color: '#e63946', border: '1px solid #ffcccc' }}
            >
                {loading ? 'Archiving...' : 'Archive Guardian'}
            </button>

            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90vw', textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0, color: 'var(--color-secondary)' }}>Archive Guardian?</h2>
                        <p style={{ color: '#666', marginBottom: '24px' }}>
                            Are you sure you want to archive this guardian? They will no longer be able to log in at the kiosk.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                className="btn" 
                                style={{ background: '#eee', color: '#333', padding: '10px 20px' }}
                                onClick={() => setShowModal(false)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary" 
                                style={{ background: '#e63946', padding: '10px 20px', border: 'none' }}
                                onClick={handleArchive}
                                disabled={loading}
                            >
                                {loading ? 'Archiving...' : 'Yes, Archive'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
