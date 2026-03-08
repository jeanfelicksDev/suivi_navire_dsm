import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params
        const body = await request.json()
        const { isComplete, dateCloture } = body

        const existingAction = await prisma.action.findUnique({ where: { id }, include: { traitement: true } });
        if (!existingAction) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

        if ((existingAction.traitement as any).userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Interdit. Seul le créateur peut modifier cette action." }, { status: 403 });
        }

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
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params

        const existingAction = await prisma.action.findUnique({ where: { id }, include: { traitement: true } });
        if (!existingAction) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

        if ((existingAction.traitement as any).userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Interdit. Seul le créateur peut supprimer cette action." }, { status: 403 });
        }

        await prisma.action.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting action:', error)
        return NextResponse.json({ error: 'Failed to delete action' }, { status: 500 })
    }
}
