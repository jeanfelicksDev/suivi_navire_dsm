"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock } from "lucide-react";

function ResetPasswordForm() {
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // If there is no token in URL
        if (!token) {
            setError("Token de réinitialisation manquant ou invalide.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Une erreur est survenue.");
            } else {
                setSuccess(data.message || "Mot de passe réinitialisé.");
                setTimeout(() => router.push("/login"), 3000);
            }
        } catch (err: any) {
            setError("Une erreur réseau s'est produite.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {error && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 font-medium">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 text-emerald-600 text-sm p-4 rounded-xl border border-emerald-100 font-medium">
                    {success} Vous allez être redirigé vers la connexion.
                </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="newPassword">Nouveau mot de passe</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                                id="newPassword"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pl-10 w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white sm:text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        disabled={loading || success !== null || !token}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? "Mise à jour..." : "Modifier le mot de passe"}
                    </button>
                </div>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">
                        Nouveau mot de passe
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Créez un nouveau mot de passe pour votre compte.
                    </p>
                </div>

                <Suspense fallback={<div className="text-center text-sm text-slate-500">Chargement...</div>}>
                    <ResetPasswordForm />
                </Suspense>

                <div className="mt-6 text-center text-sm text-slate-500">
                    <Link href="/login" className="font-bold text-blue-600 hover:underline">
                        Retour à la connexion
                    </Link>
                </div>
            </div>
        </div>
    );
}
