import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { sendResetRequestToAdmin } from "@/lib/mailer";

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
            return NextResponse.json({ message: "La demande a été transmise à l'administrateur." });
        }

        // 1. Récupérer tous les administrateurs pour les notifier
        const admins = await prisma.user.findMany({
            where: { profil: "ADMIN" },
            select: { email: true },
        });

        const adminEmails = admins.map(a => a.email);

        // Si aucun admin trouvé, on envoie au moins à EMAIL_FROM si configuré
        if (adminEmails.length === 0 && process.env.EMAIL_FROM) {
            adminEmails.push(process.env.EMAIL_FROM);
        }

        if (adminEmails.length > 0) {
            try {
                await sendResetRequestToAdmin(adminEmails, user.email);
            } catch (mailError) {
                console.error("Erreur lors de l'envoi de l'email aux admins :", mailError);
            }
        }

        return NextResponse.json({ message: "La demande a été transmise à l'administrateur qui réinitialisera votre accès." });
    } catch (error: any) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
}
