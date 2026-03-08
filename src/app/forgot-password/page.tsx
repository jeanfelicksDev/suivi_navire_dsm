"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Une erreur est survenue.");
            } else {
                setSuccess(data.message || "Un lien de réinitialisation a été envoyé.");
            }
        } catch (err: any) {
            setError("Une erreur est survenue lors de l'envoi de l'email.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">
                        Mot de passe oublié
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        Saisissez votre email pour recevoir un lien de réinitialisation.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 font-medium">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 text-emerald-600 text-sm p-4 rounded-xl border border-emerald-100 font-medium">
                        {success}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="email">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white sm:text-sm"
                                    placeholder="votre.email@navire-dsm.com"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || success !== null}
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? "Envoi en cours..." : "Recevoir le lien"}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    <Link href="/login" className="font-bold text-blue-600 hover:underline">
                        Retour à la connexion
                    </Link>
                </div>
            </div>
        </div>
    );
}
