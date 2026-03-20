import { redirect } from 'next/navigation'

export default function ChildCheckinPage() {
    // Child checkin is now org-scoped via /kiosk/[slug]
    redirect('/')
}
