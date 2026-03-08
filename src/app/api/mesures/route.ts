import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month'); // Expecting 1-12
        const year = searchParams.get('year'); // Expecting YYYY

        let whereClause = {};
        if (month && year) {
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

            whereClause = {
                dateETA: {
                    gte: startDate,
                    lte: endDate
                }
            };
        }

        const voyages = await prisma.voyage.findMany({
            where: whereClause,
            include: {
                navire: true,
                traitements: {
                    include: {
                        actions: true
                    }
                }
            },
            orderBy: {
                dateETA: 'asc'
            }
        });

        return NextResponse.json(voyages);
    } catch (error) {
        console.error('Error fetching mesures:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}
