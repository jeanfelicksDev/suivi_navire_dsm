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

        // Find the template to check if it's a "Commune" or "Individuelle" action
        const template = await prisma.actionTemplate.findFirst({
            where: { name: actionName.trim() }
        });

        const isIndividuelle = template?.type === "Individuelle";

        // If it's an individual action and we have tracked armateurs, duplicate it
        if (isIndividuelle && selectedArmateurs.length > 0) {
            const results = [];
            for (const armateurName of selectedArmateurs) {
                const newAction = await prisma.action.create({
                    data: {
                        traitementId: id,
                        action: actionName.trim(),
                        armateur: armateurName, // Specific armateur zone
                        isComplete: false,
                    }
                });
                results.push(newAction);
            }
            return NextResponse.json(results[0]);
        } else {
            // It's a "Commune" action (or no armateurs selected), add it once to the general zone
            const newAction = await prisma.action.create({
                data: {
                    traitementId: id,
                    action: actionName.trim(),
                    armateur: null, // General "Actions Communes" zone
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
