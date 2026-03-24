import { requireAdmin } from '@/lib/admin-auth'
import Link from 'next/link'

export default async function SchedulePage() {
    await requireAdmin()

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>Schedule Management</h1>
                <Link href="/admin" className="btn btn-secondary">Back to Dashboard</Link>
            </header>
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
                <h2 style={{ color: '#1D3557', marginBottom: '8px' }}>Coming Soon</h2>
                <p style={{ color: '#666' }}>Drag-and-drop scheduling is under development.</p>
            </div>
        </div>
    )
}
