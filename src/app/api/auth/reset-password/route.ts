import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: "Le token et le nouveau mot de passe sont requis." }, { status: 400 });
        }

        const resetToken = await prisma.resetToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!resetToken) {
            return NextResponse.json({ error: "Token invalide ou introuvable." }, { status: 400 });
        }

        if (resetToken.expiresAt < new Date()) {
            await prisma.resetToken.delete({ where: { id: resetToken.id } });
            return NextResponse.json({ error: "Ce lien a expiré." }, { status: 400 });
        }

        const hashedPassword = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: resetToken.userId },
            data: { password: hashedPassword },
        });

        await prisma.resetToken.deleteMany({
            where: { userId: resetToken.userId }, // Clean up all tokens for that user
        });

        return NextResponse.json({ message: "Votre mot de passe a été mis à jour avec succès." });

    } catch (error: any) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ error: "Une erreur est survenue lors de la réinitialisation." }, { status: 500 });
    }
}
