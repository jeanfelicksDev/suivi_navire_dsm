import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(req: Request) {
    try {
        const { email, password, profil, service } = await req.json();

        if (!email || !password || !profil || !service) {
            return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 400 });
        }

        const hashedPassword = await hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                profil,
                service,
                isApproved: false, // Must be approved by an Admin
            },
        });

        return NextResponse.json({
            message: "Compte créé avec succès. En attente d'approbation.",
            user: { id: user.id, email: user.email },
        }, { status: 201 });
    } catch (error: any) {
        console.error("Register Error:", error);
        return NextResponse.json({ error: "Une erreur est survenue lors de l'inscription." }, { status: 500 });
    }
}
