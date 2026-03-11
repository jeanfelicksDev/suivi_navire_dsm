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
        const { isTermine, userId } = body

        const existingTraitement = await prisma.traitement.findUnique({ where: { id } });
        if (!existingTraitement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

        if ((existingTraitement as any).userId && (existingTraitement as any).userId !== (session.user as any).id && (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: "Interdit. Seul le créateur peut modifier ce suivi." }, { status: 403 });
        }

        const dataToUpdate: any = {}
        if (isTermine !== undefined) dataToUpdate.isTermine = isTermine
        if (userId !== undefined) dataToUpdate.userId = userId

        const updatedSuivi = await prisma.traitement.update({
            where: { id },
            data: dataToUpdate,
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
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params

        const existingTraitement = await prisma.traitement.findUnique({ where: { id } });
        if (!existingTraitement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

        if ((existingTraitement as any).userId && (existingTraitement as any).userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Interdit. Seul le créateur peut supprimer ce suivi." }, { status: 403 });
        }

        await prisma.traitement.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting suivi:', error)
        return NextResponse.json({ error: 'Failed to delete suivi' }, { status: 500 })
    }
}
