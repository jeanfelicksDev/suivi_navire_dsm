import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const voyages = await prisma.voyage.findMany({
            include: { navire: true },
            orderBy: { numVoyage: 'asc' }
        })
        return NextResponse.json(voyages)
    } catch (error) {
        console.error('Error fetching voyages:', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

const toTitleCase = (str: string) => {
    return str.toLowerCase().trim().replace(/\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { navireId, numVoyage: rawNumVoyage, dateETA, dateETD } = body
        // Normalize: Title Case
        const numVoyage = toTitleCase(rawNumVoyage)

        // Check for duplicates (Navire + Date ETA)
        const existing = await prisma.voyage.findFirst({
            where: {
                navireId,
                dateETA
            }
        })

        if (existing) {
            return NextResponse.json({ error: 'Un voyage existe déjà pour ce navire à cette date ETA.' }, { status: 400 })
        }

        const voyage = await prisma.voyage.create({
            data: {
                navireId,
                numVoyage,
                dateETA,
                dateETD
            }
        })
        return NextResponse.json(voyage)
    } catch (error) {
        console.error('Error creating voyage:', error)
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
    }
}
