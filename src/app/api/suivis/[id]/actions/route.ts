import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { action } = body

        const newAction = await prisma.action.create({
            data: {
                traitementId: id,
                action: action.trim(),
                isComplete: false,
            }
        })

        return NextResponse.json(newAction)
    } catch (error) {
        console.error('Error creating action:', error)
        return NextResponse.json({ error: 'Failed to create action' }, { status: 500 })
    }
}
