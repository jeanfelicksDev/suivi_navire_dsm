import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function PATCH(request: Request) {
    try {
        const body = await request.json()
        const { actions } = body // Expected: [{ id: "...", position: 0 }, ...]

        if (!Array.isArray(actions)) {
            return NextResponse.json({ error: 'Actions array required' }, { status: 400 })
        }

        // Use a transaction to update all positions
        await prisma.$transaction(
            actions.map((action: { id: string, position: number }) =>
                prisma.action.update({
                    where: { id: action.id },
                    data: { position: action.position }
                })
            )
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error reordering actions:', error)
        return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
    }
}
