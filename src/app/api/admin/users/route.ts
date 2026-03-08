import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                profil: true,
                service: true,
                isApproved: true,
                createdAt: true,
                canCreateNavire: true,
                canCreateVoyage: true,
                canCreateArmateur: true,
                canCreateAction: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Admin Get Users Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
