'use client'

import { useState } from 'react'
import { adjustPtoBalance, updatePtoRate } from '@/app/actions/pto'

type Props = {
    userId: string
    currentBalance: number
    currentRate: number
}

export default function PtoManagement({ userId, currentBalance, currentRate }: Props) {
    const [isAdjusting, setIsAdjusting] = useState(false)
    const [adjustError, setAdjustError] = useState('')
    const [rateError, setRateError] = useState('')

    const handleAdjust = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault()
        setAdjustError('')
        const formData = new FormData(e.currentTarget)
        formData.append('userId', userId)
        const res = await adjustPtoBalance(formData)
        if (res.error) {
            setAdjustError(res.error)
        } else {
            setIsAdjusting(false)
        }
    }

    const handleRateUpdate = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault()
        setRateError('')
        const formData = new FormData(e.currentTarget)
        formData.append('userId', userId)
        const res = await updatePtoRate(formData)
        if (res.error) {
            setRateError(res.error)
        } else {
            alert('PTO Rate updated successfully')
        }
    }

    return (
        <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h2>PTO Management</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '20px' }}>
                
                {/* Balance Section */}
                <div>
                    <h3 style={{ fontSize: '1rem', color: '#666', marginBottom: '10px' }}>Current Balance</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            {currentBalance.toFixed(2)} <span style={{ fontSize: '1rem', color: '#666' }}>hrs</span>
                        </div>
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => setIsAdjusting(!isAdjusting)}
                        >
                            {isAdjusting ? 'Cancel' : 'Adjust Balance'}
                        </button>
                    </div>

                    {isAdjusting && (
                        <form onSubmit={handleAdjust} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Manual Adjustment</h4>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.8em' }}>Amount (Use +/-)</label>
                                    <input name="amount" type="number" step="0.25" className="input" placeholder="e.g. 8 or -4" required style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.8em' }}>Reason / Note</label>
                                <input name="reason" type="text" className="input" placeholder="e.g. Annual Rollover, Bonus" style={{ width: '100%' }} required />
                            </div>
                            {adjustError && <p style={{ color: 'red', fontSize: '0.8rem', margin: '5px 0' }}>{adjustError}</p>}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Apply Adjustment</button>
                        </form>
                    )}
                </div>

                {/* Accrual Rate Section */}
                <div>
                    <h3 style={{ fontSize: '1rem', color: '#666', marginBottom: '10px' }}>Accrual Rate</h3>
                    <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '20px' }}>
                        Hours earned per 1 hour worked. Default is 0.
                        <br/>
                        <small>E.g., 0.05 rate = 2 hours PTO per 40 hours worked.</small>
                    </p>
                    <form onSubmit={handleRateUpdate} style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8em' }}>Rate (Hours)</label>
                            <input 
                                name="rate" 
                                type="number" 
                                step="0.001" 
                                defaultValue={currentRate} 
                                className="input" 
                                required 
                                style={{ width: '100%' }} 
                            />
                        </div>
                        <button type="submit" className="btn btn-secondary" style={{ padding: '10px 20px' }}>Update Rate</button>
                    </form>
                    {rateError && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '10px' }}>{rateError}</p>}
                </div>
            </div>
        </div>
    )
}
