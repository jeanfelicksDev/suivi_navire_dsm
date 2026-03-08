import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { actions } = body // Expected: [{ id: "...", position: 0 }, ...]

        if (!Array.isArray(actions) || actions.length === 0) {
            return NextResponse.json({ error: 'Actions array required' }, { status: 400 })
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        // Validate permission through the first action's treatment
        const firstActionId = actions[0].id;
        const firstAction = await prisma.action.findUnique({
            where: { id: firstActionId },
            include: { traitement: true }
        });

        if (!firstAction || (firstAction.traitement as any).userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Interdit. Seul le créateur peut réorganiser les actions." }, { status: 403 });
        }

        // Use a transaction to update all positions
        await prisma.$transaction(
            actions.map((action: { id: string, position: number }) =>
                prisma.action.update({
                    where: { id: action.id },
                    data: { position: action.position }
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error reordering actions:', error)
        return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
    }
}
