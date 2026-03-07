import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { isTermine } = body

        const updatedSuivi = await prisma.traitement.update({
            where: { id },
            data: { isTermine },
            include: {
                navire: true,
                voyage: true,
                actions: true,
            }
        })

        return NextResponse.json(updatedSuivi)
    } catch (error) {
        console.error('Error updating suivi:', error)
        return NextResponse.json({ error: 'Failed to update suivi' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.traitement.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting suivi:', error)
        return NextResponse.json({ error: 'Failed to delete suivi' }, { status: 500 })
    }
}
