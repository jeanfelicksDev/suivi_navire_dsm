import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const { id } = await params;

        // Optionally, prevent admin from deleting themselves
        if ((session.user as any).id === id) {
            return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte admin" }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: id },
        });

        return NextResponse.json({ message: "Utilisateur supprimé avec succès" });
    } catch (error) {
        console.error("Admin Delete User Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
