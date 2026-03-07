import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const slotteurs = await prisma.slotteur.findMany({
            include: {
                voyage: {
                    include: {
                        navire: true
                    }
                }
            }
        });
        return NextResponse.json(slotteurs);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch slotteurs' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nom, voyageId } = body;

        if (!nom || !voyageId) {
            return NextResponse.json({ error: 'Missing name or voyageId' }, { status: 400 });
        }

        const slotteur = await prisma.slotteur.create({
            data: {
                nom: nom.trim().toUpperCase(),
                voyageId
            },
            include: {
                voyage: true
            }
        });
        return NextResponse.json(slotteur);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create slotteur' }, { status: 500 });
    }
}
