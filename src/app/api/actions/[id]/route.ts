import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { isComplete, dateCloture } = body

        const updatedAction = await prisma.action.update({
            where: { id },
            data: {
                isComplete,
                dateCloture: dateCloture || null,
            },
            include: {
                traitement: {
                    include: {
                        actions: true
                    }
                }
            }
        })

        // After updating the action, check if all actions are complete to possibly mark Traitement as terminé
        const allActions = updatedAction.traitement.actions
        const allDone = allActions.length > 0 && allActions.every((a: any) => a.isComplete)

        if (allDone && !updatedAction.traitement.isTermine) {
            await prisma.traitement.update({
                where: { id: updatedAction.traitementId },
                data: { isTermine: true }
            })
        } else if (!allDone && updatedAction.traitement.isTermine) {
            // If we reactivated an action, it might not be terminée anymore
            await prisma.traitement.update({
                where: { id: updatedAction.traitementId },
                data: { isTermine: false }
            })
        }

        return NextResponse.json(updatedAction)
    } catch (error) {
        console.error('Error updating action:', error)
        return NextResponse.json({ error: 'Failed to update action' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.action.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting action:', error)
        return NextResponse.json({ error: 'Failed to delete action' }, { status: 500 })
    }
}
