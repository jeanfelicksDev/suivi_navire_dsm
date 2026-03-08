import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { id } = await params
        const body = await request.json()
        const { action: actionName } = body

        const existingTraitement = await prisma.traitement.findUnique({
            where: { id },
            include: { selectedArmateurs: true } as any // Handle potential types sync delay
        });

        if (!existingTraitement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

        if ((existingTraitement as any).userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Interdit. Seul le créateur peut ajouter une action." }, { status: 403 });
        }

        const selectedArmateurs = (existingTraitement as any).selectedArmateurs || [];

        // Distribute action to all armateurs if any are tracking this suivi
        if (selectedArmateurs.length > 0) {
            const results = [];
            for (const armateurName of selectedArmateurs) {
                const newAction = await prisma.action.create({
                    data: {
                        traitementId: id,
                        action: actionName.trim(),
                        armateur: armateurName, // Assign to armateur zone
                        isComplete: false,
                    }
                });
                results.push(newAction);
            }
            // Return one result as confirmation
            return NextResponse.json(results[0]);
        } else {
            // No armateurs selected (fallback/older data), create a single common action
            const newAction = await prisma.action.create({
                data: {
                    traitementId: id,
                    action: actionName.trim(),
                    armateur: null,
                    isComplete: false,
                }
            });
            return NextResponse.json(newAction);
        }


    } catch (error) {
        console.error('Error creating action:', error)
        return NextResponse.json({ error: 'Failed to create action' }, { status: 500 })
    }
}
