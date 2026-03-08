"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle, XCircle } from "lucide-react";

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
            </header>

            <div className="bg-white rounded-[1.75rem] shadow-sm border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Profil</th>
                            <th className="px-6 py-4">Service</th>
                            <th className="px-6 py-4">Date création</th>
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
                                        <button
                                            onClick={() => toggleApproval(user.id, !user.isApproved)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded transition bg-white border shadow-sm ${user.isApproved ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                                        >
                                            {user.isApproved ? 'Révoquer' : 'Approuver'}
                                        </button>
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
