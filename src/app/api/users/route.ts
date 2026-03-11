import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const users = await prisma.user.findMany({
            where: {
                isApproved: true
            },
            select: {
                id: true,
                email: true,
                profil: true,
                service: true,
            },
            orderBy: { email: "asc" },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Get Users Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
