import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || (session.user as any).role !== "ADMIN") {
            return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
        }

        const { id } = await params;
        const { isApproved } = await req.json();

        const user = await prisma.user.update({
            where: { id: id },
            data: { isApproved },
        });

        return NextResponse.json({ message: "Statut mis à jour", user });
    } catch (error) {
        console.error("Admin Approve User Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
