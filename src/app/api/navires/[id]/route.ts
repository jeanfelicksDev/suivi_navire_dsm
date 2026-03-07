import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await prisma.navire.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting navire:', error)
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { nomNavire, armateurCoque } = body
        const updated = await prisma.navire.update({
            where: { id },
            data: {
                nomNavire: nomNavire ? nomNavire.trim() : undefined,
                armateurCoque: armateurCoque ? armateurCoque.trim() : undefined
            }
        })
        return NextResponse.json(updated)
    } catch (error) {
        console.error('Error updating navire:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}
