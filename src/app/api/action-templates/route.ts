import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const templates = await prisma.actionTemplate.findMany({
            orderBy: { name: 'asc' }
        })
        return NextResponse.json(templates)
    } catch (error) {
        console.error('Error fetching action templates:', error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

const toTitleCase = (str: string) => {
    return str.toLowerCase().trim().replace(/\s+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (!(session.user as any).canCreateAction && (session.user as any).role !== 'ADMIN')) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }
        const body = await request.json()
        const { name, isReferentiel, nbreJours, periode, evenementId, joursOuvrable, joursCalendaire, isNotification, type } = body
        const template = await prisma.actionTemplate.create({
            data: {
                name: toTitleCase(name),
                isReferentiel: isReferentiel ?? false,
                nbreJours: nbreJours ?? null,
                periode: periode ?? null,
                evenementId: evenementId ?? null,
                joursOuvrable: joursOuvrable ?? false,
                joursCalendaire: joursCalendaire ?? false,
                isNotification: isNotification ?? false,
                type: type ?? "Commune",
            }
        })

        return NextResponse.json(template)
    } catch (error: any) {
        console.error('Error creating action template:', error)
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Cette action existe déjà dans la liste.' }, { status: 400 })
        }
        return NextResponse.json({ error: error.message || 'Failed to create' }, { status: 500 })
    }
}
