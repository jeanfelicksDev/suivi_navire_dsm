"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle, XCircle, ArrowLeft, Trash2, Key, Copy } from "lucide-react";
import Link from "next/link";

export default function AdminUsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated") {
            if ((session?.user as any).role !== "ADMIN") {
                router.push("/");
            } else {
                fetchUsers();
            }
        }
    }, [status, session]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleApproval = async (userId: string, isApproved: boolean) => {
        try {
            await fetch(`/api/admin/users/${userId}/approve`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isApproved }),
            });
            fetchUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const togglePermission = async (userId: string, permission: string, value: boolean) => {
        // Optimistic update
        setUsers(users.map(u => u.id === userId ? { ...u, [permission]: value } : u));
        try {
            await fetch(`/api/admin/users/${userId}/permissions`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [permission]: value }),
            });
        } catch (err) {
            console.error(err);
            fetchUsers(); // Revert on error
        }
    };

    const deleteUser = async (userId: string) => {
        if (!confirm("Voulez-vous vraiment supprimer cet utilisateur ? Cette action est irréversible et supprimera également tous ses dossiers de suivi.")) return;

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== userId));
            } else {
                const data = await res.json();
                alert(data.error || "Erreur lors de la suppression");
            }
        } catch (err) {
            console.error(err);
            alert("Erreur réseau");
        }
    };

    const manualResetPassword = async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
                method: "POST",
            });
            const data = await res.json();
            if (res.ok) {
                const tempPassword = data.tempPassword;
                await navigator.clipboard.writeText(tempPassword);
                alert("Le MOT DE PASSE TEMPORAIRE a été généré et COPIÉ :\n\n" + tempPassword + "\n\nTransmettez ce code manuellement à l'utilisateur. Il devra obligatoirement le changer à sa première connexion.");
            } else {
                alert(data.error || "Erreur lors de la génération du mot de passe");
            }
        } catch (err) {
            console.error(err);
            alert("Erreur réseau");
        }
    };

    if (loading || status === "loading") {
        return <div className="p-8">Chargement...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto px-8 pt-10 pb-8">
            <header className="flex justify-between items-start mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, #d946ef, #a855f7)' }} />
                        <h1 className="text-4xl font-extrabold tracking-tight" style={{ background: 'linear-gradient(135deg, #a21caf 0%, #c026d3 60%, #e879f9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Administration des Utilisateurs
                        </h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium ml-5">Gérez les accès et les comptes</p>
                </div>
                <Link href="/">
                    <button className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200 shadow-sm font-semibold text-sm rounded-xl px-5 py-2.5 transition-all hover:bg-slate-50 hover:text-slate-800">
                        <ArrowLeft className="w-4 h-4" />
                        Retour aux Navires
                    </button>
                </Link>
            </header>

            <div className="bg-white rounded-[1.75rem] shadow-sm border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Profil</th>
                            <th className="px-6 py-4">Service</th>
                            <th className="px-6 py-4">Date création</th>
                            <th className="px-6 py-4">Droits</th>
                            <th className="px-6 py-4 text-center">Accès (Approuvé)</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-800">{user.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${user.profil === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                        {user.profil}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{user.service}</td>
                                <td className="px-6 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    {user.profil === 'ADMIN' ? (
                                        <span className="text-xs font-bold text-slate-400">Tous les droits</span>
                                    ) : (
                                        <div className="flex flex-col gap-1.5">
                                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-purple-600 transition-colors">
                                                <input type="checkbox" checked={user.canCreateNavire} onChange={(e) => togglePermission(user.id, 'canCreateNavire', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded border-slate-300 pointer-events-auto" />
                                                Création Navire
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-purple-600 transition-colors">
                                                <input type="checkbox" checked={user.canCreateVoyage} onChange={(e) => togglePermission(user.id, 'canCreateVoyage', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded border-slate-300 pointer-events-auto" />
                                                Ajout de Voyage
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-purple-600 transition-colors">
                                                <input type="checkbox" checked={user.canCreateArmateur} onChange={(e) => togglePermission(user.id, 'canCreateArmateur', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded border-slate-300 pointer-events-auto" />
                                                Ajout d'Armateur
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-purple-600 transition-colors">
                                                <input type="checkbox" checked={user.canCreateAction} onChange={(e) => togglePermission(user.id, 'canCreateAction', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded border-slate-300 pointer-events-auto" />
                                                Création d'Action
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-purple-600 transition-colors">
                                                <input type="checkbox" checked={user.canManageMesures} onChange={(e) => togglePermission(user.id, 'canManageMesures', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded border-slate-300 pointer-events-auto" />
                                                Mesure Mensuelle
                                            </label>
                                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-purple-600 transition-colors">
                                                <input type="checkbox" checked={user.canViewAllSuivis} onChange={(e) => togglePermission(user.id, 'canViewAllSuivis', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 rounded border-slate-300 pointer-events-auto" />
                                                Vue d'ensemble
                                            </label>

                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {user.isApproved || user.profil === 'ADMIN' ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold">
                                            <CheckCircle className="w-3.5 h-3.5" /> Oui
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-bold">
                                            <XCircle className="w-3.5 h-3.5" /> Non
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {user.profil !== 'ADMIN' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => toggleApproval(user.id, !user.isApproved)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded transition bg-white border shadow-sm ${user.isApproved ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                                            >
                                                {user.isApproved ? 'Révoquer' : 'Approuver'}
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                title="Supprimer le compte"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => manualResetPassword(user.id)}
                                                className="p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                title="Générer lien réinitialisation"
                                            >
                                                <Key className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">Aucun utilisateur trouvé</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
