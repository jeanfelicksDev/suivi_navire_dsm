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
        const body = await req.json();

        const {
            canCreateNavire,
            canCreateVoyage,
            canCreateArmateur,
            canCreateAction,
            canViewAllSuivis,
            canManageMesures
        } = body;

        const user = await prisma.user.update({
            where: { id: id },
            data: {
                ...(canCreateNavire !== undefined && { canCreateNavire }),
                ...(canCreateVoyage !== undefined && { canCreateVoyage }),
                ...(canCreateArmateur !== undefined && { canCreateArmateur }),
                ...(canCreateAction !== undefined && { canCreateAction }),
                ...(canViewAllSuivis !== undefined && { canViewAllSuivis }),
                ...(canManageMesures !== undefined && { canManageMesures }),
            },
        });

        return NextResponse.json({ message: "Permissions mises à jour", user });
    } catch (error) {
        console.error("Admin Update Permissions Error:", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
