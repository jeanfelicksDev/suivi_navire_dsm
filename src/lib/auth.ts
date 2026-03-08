import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { hash, compare } from "bcryptjs";
import prisma from "@/lib/db";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Mot de passe", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email et mot de passe requis");
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user) {
                    throw new Error("Aucun utilisateur trouvé avec cet email");
                }

                const isValidPassword = await compare(credentials.password, user.password);

                if (!isValidPassword) {
                    throw new Error("Mot de passe incorrect");
                }

                if (!user.isApproved && user.profil !== "ADMIN") {
                    throw new Error("Votre compte n'a pas encore été approuvé par un administrateur.");
                }

                if (user.needsPasswordChange) {
                    throw new Error("PASSWORD_CHANGE_REQUIRED");
                }

                return {
                    id: user.id,
                    email: user.email,
                    role: user.profil,
                    service: user.service,
                    canCreateNavire: user.canCreateNavire,
                    canCreateVoyage: user.canCreateVoyage,
                    canCreateArmateur: user.canCreateArmateur,
                    canCreateAction: user.canCreateAction,
                    canViewAllSuivis: user.canViewAllSuivis,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.service = (user as any).service;
                token.canCreateNavire = (user as any).canCreateNavire;
                token.canCreateVoyage = (user as any).canCreateVoyage;
                token.canCreateArmateur = (user as any).canCreateArmateur;
                token.canCreateAction = (user as any).canCreateAction;
                token.canViewAllSuivis = (user as any).canViewAllSuivis;
            }
            // Update permissions if a session update is triggered
            if (trigger === "update" && session) {
                token.canCreateNavire = session.canCreateNavire ?? token.canCreateNavire;
                token.canCreateVoyage = session.canCreateVoyage ?? token.canCreateVoyage;
                token.canCreateArmateur = session.canCreateArmateur ?? token.canCreateArmateur;
                token.canCreateAction = session.canCreateAction ?? token.canCreateAction;
                token.canViewAllSuivis = session.canViewAllSuivis ?? token.canViewAllSuivis;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role;
                (session.user as any).service = token.service;
                (session.user as any).canCreateNavire = token.canCreateNavire;
                (session.user as any).canCreateVoyage = token.canCreateVoyage;
                (session.user as any).canCreateArmateur = token.canCreateArmateur;
                (session.user as any).canCreateAction = token.canCreateAction;
                (session.user as any).canViewAllSuivis = token.canViewAllSuivis;
            }
            return session;
        }
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/login',
        error: '/login', // Error code passed in query string as ?error=
    },
    secret: process.env.NEXTAUTH_SECRET || "some-super-secret-default-key-for-dev",
};
