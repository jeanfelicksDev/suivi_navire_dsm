import { NextResponse } from "next/server";
import { hash, compare } from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { email, tempPassword, newPassword } = await req.json();

        if (!email || !tempPassword || !newPassword) {
            return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
        }

        if (!user.needsPasswordChange) {
            return NextResponse.json({ error: "Ce compte n'a pas besoin de changement de mot de passe." }, { status: 400 });
        }

        const isValidTemp = await compare(tempPassword, user.password);
        if (!isValidTemp) {
            return NextResponse.json({ error: "Mot de passe temporaire incorrect." }, { status: 401 });
        }

        const hashedNewPassword = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedNewPassword,
                needsPasswordChange: false,
            },
        });

        return NextResponse.json({ message: "Mot de passe mis à jour avec succès. Vous pouvez maintenant vous connecter." });
    } catch (error: any) {
        console.error("Change Password Error:", error);
        return NextResponse.json({ error: "Une erreur est survenue." }, { status: 500 });
    }
}
