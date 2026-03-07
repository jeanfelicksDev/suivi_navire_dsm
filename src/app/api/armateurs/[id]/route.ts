import { NextResponse } from 'next/server';
// Force refresh
import prisma from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { nom } = await req.json();
        if (!nom) return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });

        const armateur = await prisma.armateur.update({
            where: { id },
            data: { nom: nom.toUpperCase().trim() }
        });
        return NextResponse.json(armateur);
    } catch (error: any) {
        console.error('Error updating armateur:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.armateur.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting armateur:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
