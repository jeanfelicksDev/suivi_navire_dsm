import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.actionTemplate.delete({ where: { id } })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting action template:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}

const toTitleCase = (str: string) => {
    return str.toLowerCase().trim().replace(/\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { name, isReferentiel, nbreJours, periode, evenementId, joursOuvrable, joursCalendaire, isNotification } = body

        const updated = await prisma.actionTemplate.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: toTitleCase(name) }),
                ...(isReferentiel !== undefined && { isReferentiel }),
                ...(nbreJours !== undefined && { nbreJours }),
                ...(periode !== undefined && { periode }),
                ...(evenementId !== undefined && { evenementId }),
                ...(joursOuvrable !== undefined && { joursOuvrable }),
                ...(joursCalendaire !== undefined && { joursCalendaire }),
                ...(isNotification !== undefined && { isNotification }),
            }
        })
        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating action template:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
