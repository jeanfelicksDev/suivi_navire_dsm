import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { updateExcelForVoyage } from "@/lib/excel-service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.voyage.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting voyage:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { numVoyage: rawNumVoyage, dateETA, dateETD } = body
        // Normalize spaces: trim and replace multiple spaces with one
        const numVoyage = rawNumVoyage?.trim().replace(/\s+/g, ' ')

        if (numVoyage) {
            // Check for duplicates (Navire + Date ETA)
            const current = await prisma.voyage.findUnique({
                where: { id },
                select: { navireId: true, dateETA: true }
            })

            if (current) {
                const checkNavireId = current.navireId;
                const checkDateETA = dateETA !== undefined ? dateETA : current.dateETA;

                const existing = await prisma.voyage.findFirst({
                    where: {
                        navireId: checkNavireId,
                        dateETA: checkDateETA,
                        NOT: { id }
                    }
                })

                if (existing) {
                    return NextResponse.json({ error: 'Un voyage existe déjà pour ce navire à cette date ETA.' }, { status: 400 })
                }
            }
        }

        const updated = await prisma.voyage.update({
            where: { id },
            data: {
                ...(numVoyage !== undefined && { numVoyage }),
                ...(dateETA !== undefined && { dateETA }),
                ...(dateETD !== undefined && { dateETD }),
            }
        })

        // Trigger Excel update if an action is completed or updated
        updateExcelForVoyage(updated.id).catch(err => console.error('Excel update error:', err));

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating voyage:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
