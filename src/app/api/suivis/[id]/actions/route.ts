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
        const { action: actionName, targets } = body

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

        // Determine which armateurs to apply to
        let armateursToApply: (string | null)[] = [];

        if (targets && targets.includes("TOUS")) {
            if (template?.type === "Commune") {
                armateursToApply = [null];
            } else if (selectedArmateurs.length > 0) {
                armateursToApply = selectedArmateurs;
            } else {
                armateursToApply = [null];
            }
        } else if (targets && targets.length > 0) {
            armateursToApply = targets;
        } else {
            // Fallback
            const isIndividuelle = template?.type === "Individuelle";
            if (isIndividuelle && selectedArmateurs.length > 0) {
                armateursToApply = selectedArmateurs;
            } else {
                armateursToApply = [null];
            }
        }

        const results = [];
        for (const armateurName of armateursToApply) {
            const existingAction = await prisma.action.findFirst({
                where: {
                    traitementId: id,
                    action: normalizedActionName,
                    armateur: armateurName
                }
            });

            if (!existingAction) {
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

        return NextResponse.json(results.length > 0 ? results[0] : { status: "already_exists" });




    } catch (error) {
        console.error('Error creating action:', error)
        return NextResponse.json({ error: 'Failed to create action' }, { status: 500 })
    }
}
