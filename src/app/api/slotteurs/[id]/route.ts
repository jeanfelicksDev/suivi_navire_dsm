import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await request.json();
        const { nom } = body;
        const slotteur = await prisma.slotteur.update({
            where: { id },
            data: { nom: nom.trim().toUpperCase() }
        });
        return NextResponse.json(slotteur);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update slotteur' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.slotteur.delete({
            where: { id }
        });
        return NextResponse.json({ message: 'Deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete slotteur' }, { status: 500 });
    }
}
