"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [mustChange, setMustChange] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        if (mustChange) {
            if (newPassword !== confirmPassword) {
                setError("Les mots de passe ne correspondent pas.");
                setLoading(false);
                return;
            }
            if (newPassword.length < 6) {
                setError("Le nouveau mot de passe doit faire au moins 6 caractères.");
                setLoading(false);
                return;
            }

            try {
                const resChange = await fetch("/api/auth/change-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, tempPassword: password, newPassword }),
                });

                const data = await resChange.json();
                if (!resChange.ok) {
                    setError(data.error || "Erreur lors du changement de mot de passe.");
                    setLoading(false);
                    return;
                }

                setSuccess("Mot de passe mis à jour. Connexion en cours...");
                // Success! Now login with the new password
                const resLog = await signIn("credentials", {
                    email,
                    password: newPassword,
                    redirect: false,
                });

                if (resLog?.error) {
                    setError(resLog.error);
                    setLoading(false);
                } else {
                    router.push("/");
                    router.refresh();
                }
            } catch (err) {
                setError("Une erreur est survenue.");
                setLoading(false);
            }
            return;
        }

        try {
            const res = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                if (res.error === "PASSWORD_CHANGE_REQUIRED") {
                    setMustChange(true);
                    setError("Ceci est un mot de passe temporaire. Vous devez le changer avant de continuer.");
                } else {
                    setError(res.error);
                }
                setLoading(false);
            } else {
                router.push("/");
                router.refresh(); // Refresh to catch new session
            }
        } catch (err: any) {
            setError("Une erreur est survenue.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">
                        {mustChange ? "Changer le mot de passe" : "Connexion"}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                        {mustChange
                            ? "Veuillez définir votre mot de passe définitif."
                            : "Accédez à votre espace Suivi Navires"}
                    </p>
                </div>

                {error && (
                    <div className={`${mustChange && !error.includes('temporaire') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'} text-sm p-4 rounded-xl border border-amber-100 font-medium`}>
                        {error === "PASSWORD_CHANGE_REQUIRED" ? "Changement de mot de passe requis" : error}
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
                                    disabled={mustChange}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white sm:text-sm disabled:opacity-60"
                                    placeholder="votre.email@navire-dsm.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="password">
                                {mustChange ? "Mot de passe temporaire" : "Mot de passe"}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    disabled={mustChange}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white sm:text-sm disabled:opacity-60"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {mustChange && (
                            <div className="animate-fade-in space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="newPassword">Nouveau Mot de Passe</label>
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

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="confirmPassword">Confirmer Nouveau mot de passe</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10 w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white sm:text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {!mustChange && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <Link href="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline">
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-all disabled:opacity-70 disabled:cursor-not-allowed ${mustChange
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 focus:ring-emerald-500'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:ring-blue-500'
                                }`}
                        >
                            {loading ? "Chargement..." : mustChange ? "Confirmer le nouveau mot de passe" : "Se connecter"}
                        </button>
                    </div>

                    {mustChange && (
                        <button
                            type="button"
                            onClick={() => { setMustChange(false); setConfirmPassword(""); setNewPassword(""); setError(null); }}
                            className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            Annuler
                        </button>
                    )}
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Vous n'avez pas de compte ?{' '}
                    <Link href="/register" className="font-bold text-blue-600 hover:underline">
                        S'inscrire
                    </Link>
                </div>
            </div>
        </div>
    );
}
