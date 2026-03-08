import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db";
import { sendResetPasswordEmail } from "@/lib/mailer";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "L'email est requis." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Return success even if user not found for security reasons
            return NextResponse.json({ message: "Si cet email est associé à un compte, un lien a été envoyé." });
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

        try {
            await sendResetPasswordEmail(user.email, token);
        } catch (mailError) {
            console.error("Erreur lors de l'envoi de l'email :", mailError);
        }

        return NextResponse.json({ message: "Si cet email est associé à un compte, un lien a été envoyé." });
    } catch (error: any) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
}
