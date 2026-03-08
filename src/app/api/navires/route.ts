import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const navires = await prisma.navire.findMany({
            include: {
                voyages: {
                    include: {
                        slotteurs: true
                    }
                }
            },
            orderBy: { nomNavire: 'asc' }
        })

        return NextResponse.json(navires)
    } catch (error) {
        console.error('Error fetching navires:', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

const toTitleCase = (str: string) => {
    return str.toLowerCase().trim().replace(/\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (!(session.user as any).canCreateNavire && (session.user as any).role !== 'ADMIN')) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }
        const body = await request.json()
        const { nomNavire: rawNomNavire, armateurCoque } = body
        // Normalize: Title Case
        const nomNavire = toTitleCase(rawNomNavire)

        // Check for duplicate
        const existing = await prisma.navire.findFirst({
            where: { nomNavire }
        })

        if (existing) {
            return NextResponse.json({ error: 'Ce navire existe déjà.' }, { status: 400 })
        }

        const navire = await prisma.navire.create({
            data: {
                nomNavire,
                armateurCoque: toTitleCase(armateurCoque)
            }
        })
        return NextResponse.json(navire)
    } catch (error) {
        console.error('Error creating navire:', error)
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }
}
