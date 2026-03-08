import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
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

        // Un token valide 1 heure
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 3600000);

        // Supprimer d'abord les anciens tokens pour ce user
        await prisma.resetToken.deleteMany({
            where: { userId: user.id },
        });

        await prisma.resetToken.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        const resetUrl = `${baseUrl}/reset-password?token=${token}`;

        return NextResponse.json({ url: resetUrl });
    } catch (error: any) {
        console.error("Admin Manual Reset Error:", error);
        return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
}
