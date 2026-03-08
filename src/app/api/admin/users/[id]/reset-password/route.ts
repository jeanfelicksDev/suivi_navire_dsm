import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
        }

        // 1. Générer un mot de passe temporaire (8 caractères aléatoires)
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedTempPassword = await hash(tempPassword, 12);

        // 2. Mettre à jour l'utilisateur
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedTempPassword,
                needsPasswordChange: true,
            },
        });

        return NextResponse.json({ tempPassword });
    } catch (error: any) {
        console.error("Admin Manual Reset Error:", error);
        return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
}
