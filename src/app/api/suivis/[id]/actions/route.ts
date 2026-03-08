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
            where: { id }
        });


        if (!existingTraitement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

        if ((existingTraitement as any).userId !== (session.user as any).id) {
            return NextResponse.json({ error: "Interdit. Seul le créateur peut ajouter une action." }, { status: 403 });
        }

        const selectedArmateurs = (existingTraitement as any).selectedArmateurs || [];
        const normalizedActionName = actionName.trim();

        // Find the template using normalized name
        const template = await prisma.actionTemplate.findFirst({
            where: {
                name: {
                    equals: normalizedActionName,
                    mode: 'insensitive' // Be case-insensitive during search
                }
            }
        });

        const isIndividuelle = template?.type === "Individuelle";

        // If it's an individual action and we have tracked armateurs, duplicate it
        if (isIndividuelle && selectedArmateurs.length > 0) {
            const results = [];
            for (const armateurName of selectedArmateurs) {
                // Check if this action already exists for THIS armateur (to avoid duplicates from multiple clicks)
                const existingActionForArmateur = await prisma.action.findFirst({
                    where: {
                        traitementId: id,
                        action: normalizedActionName,
                        armateur: armateurName
                    }
                });

                if (!existingActionForArmateur) {
                    const newAction = await prisma.action.create({
                        data: {
                            traitementId: id,
                            action: normalizedActionName,
                            armateur: armateurName,
                            isComplete: false,
                        }
                    });
                    results.push(newAction);
                }
            }
            return NextResponse.json(results[0] || { status: "already_exists" });
        } else {
            // It's a "Commune" action (or no armateurs selected)
            // Check if it already exists as commune
            const existingCommuneAction = await prisma.action.findFirst({
                where: {
                    traitementId: id,
                    action: normalizedActionName,
                    armateur: null
                }
            });

            if (existingCommuneAction) {
                return NextResponse.json(existingCommuneAction);
            }

            const newAction = await prisma.action.create({
                data: {
                    traitementId: id,
                    action: normalizedActionName,
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
