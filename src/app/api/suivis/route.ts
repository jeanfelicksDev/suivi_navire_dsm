import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const isAdmin = (session.user as any).role === "ADMIN";
        const canViewAllSuivis = (session.user as any).canViewAllSuivis === true;
        const userId = (session.user as any).id;

        const suivis = await prisma.traitement.findMany({
            where: (isAdmin || canViewAllSuivis) ? {} : { userId },
            include: {
                navire: true,
                voyage: {
                    include: {
                        slotteurs: true
                    }
                },
                user: { select: { email: true, service: true, profil: true } },
                actions: {
                    orderBy: {
                        position: 'asc'
                    }
                },
            },
            orderBy: {
                voyage: {
                    dateETA: 'asc'
                }
            },
        })
        return NextResponse.json(suivis)
    } catch (error) {
        console.error('Error fetching suivis:', error)
        return NextResponse.json({ error: 'Failed to fetch suivis' }, { status: 500 })
    }
}

const toTitleCase = (str: string) => {
    return str.toLowerCase().trim().replace(/\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { nomNavire: rawNomNavire, armateurCoque, numVoyage: rawNumVoyage, dateETA, dateETD } = body
        // Normalize: Title Case
        const nomNavire = toTitleCase(rawNomNavire)
        const numVoyage = toTitleCase(rawNumVoyage)

        // 1. Find or create Navire
        let navire = await prisma.navire.findFirst({
            where: { nomNavire }
        })

        if (!navire) {
            navire = await prisma.navire.create({
                data: {
                    nomNavire,
                    armateurCoque: toTitleCase(armateurCoque),
                }
            })
        }

        // 2. Find or create Voyage
        let voyage = await prisma.voyage.findFirst({
            where: {
                navireId: navire.id,
                numVoyage
            }
        })

        if (!voyage) {
            voyage = await prisma.voyage.create({
                data: {
                    navireId: navire.id,
                    numVoyage,
                    dateETA,
                    dateETD,
                }
            })
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const userId = (session.user as any).id;

        // 3. Check if an ACTIVE Traitement already exists for this Voyage
        const existingSuivi = await prisma.traitement.findFirst({
            where: {
                voyageId: voyage.id,
                isTermine: false,
                userId: userId // Prevent creating duplicate traitment for the same user
            }
        })

        if (existingSuivi) {
            return NextResponse.json({ error: 'Un suivi est déjà en cours pour ce voyage dans votre espace.' }, { status: 400 })
        }

        // 4. Create Traitement
        const suivi = await prisma.traitement.create({
            data: {
                navireId: navire.id,
                voyageId: voyage.id,
                userId,
                actions: {
                    create: []
                }
            },
            include: {
                navire: true,
                voyage: true,
                actions: true,
            }
        })

        return NextResponse.json(suivi)
    } catch (error: any) {
        console.error('Error creating suivi:', error.message || error)
        return NextResponse.json({ error: error.message || 'Failed to create suivi' }, { status: 500 })
    }
}
