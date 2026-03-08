// API for Armateurs
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const armateurs = await prisma.armateur.findMany({
            orderBy: { nom: 'asc' }
        });
        return NextResponse.json(armateurs);
    } catch (error: any) {
        console.error('Error fetching armateurs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (!(session.user as any).canCreateArmateur && (session.user as any).role !== 'ADMIN')) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }
        const { nom } = await req.json();
        if (!nom) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });

        const armateur = await prisma.armateur.create({
            data: { nom: nom.toUpperCase().trim() }
        });
        return NextResponse.json(armateur);
    } catch (error: any) {
        console.error('Error creating armateur:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
