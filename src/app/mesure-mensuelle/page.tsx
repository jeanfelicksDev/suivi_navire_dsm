"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, Download, RefreshCw, Ship, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Action {
    id: string;
    action: string;
    isComplete: boolean;
    dateCloture?: string;
    armateur?: string | null;
}

interface Traitement {
    id: string;
    isTermine: boolean;
    actions: Action[];
}

interface Voyage {
    id: string;
    numVoyage: string;
    dateETA: string;
    dateETD: string;
    navire: {
        nomNavire: string;
        armateurCoque: string;
    };
    slotteurs?: { id: string; nom: string }[];
    traitements: Traitement[];
}

const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}/${y}`;
};

export default function MesureMensuellePage() {
    const today = new Date();
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [year, setYear] = useState(today.getFullYear());
    const [voyages, setVoyages] = useState<Voyage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedArmateur, setSelectedArmateur] = useState<string>("OOCL");

    const fetchMesures = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/mesures?month=${month}&year=${year}`);
            if (!res.ok) throw new Error("Erreur de récupération des données");
            const data = await res.json();
            setVoyages(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        fetchMesures();
    }, [fetchMesures]);

    // Build unique armateur list from loaded voyages
    const armateurs = useMemo(() => {
        const set = new Set<string>();
        // OOCL comme sélection par défaut
        set.add("OOCL");
        voyages.forEach(v => {
            if (v.navire?.armateurCoque) set.add(v.navire.armateurCoque);
            v.slotteurs?.forEach(s => set.add(s.nom));
        });
        return Array.from(set).sort();
    }, [voyages]);

    // Filter voyages by selected armateur
    const filteredVoyages = useMemo(() => {
        return voyages.filter(v =>
            v.navire?.armateurCoque === selectedArmateur ||
            v.slotteurs?.some(s => s.nom === selectedArmateur)
        );
    }, [voyages, selectedArmateur]);

    const getActionDate = (v: Voyage, keywords: string[]) => {
        const allActions = v.traitements.flatMap(t => t.actions);
        const matches = allActions.filter(a =>
            a.isComplete &&
            a.dateCloture &&
            (!a.armateur || a.armateur === selectedArmateur) &&
            keywords.some(k => a.action.toLowerCase().includes(k.toLowerCase()))
        );
        if (matches.length === 0) return "-";
        const sorted = matches.sort((a, b) => b.dateCloture!.localeCompare(a.dateCloture!));
        return formatDate(sorted[0].dateCloture!);
    };

    const calculateRate = (v: Voyage) => {
        const required = [
            ['Top Import', 'TDI Import'],
            ['Fichier Compressé Import', 'ZIP Import', 'fichier import compresse'],
            ['Manifeste Import', 'Douane-PAA'],
            ['Top Export', 'TDI Export'],
            ['Fichier Compressé Export', 'ZIP Export', 'fichier export compresse'],
            ['Manifeste Export']
        ];

        let completed = 0;
        required.forEach(keywords => {
            const date = getActionDate(v, keywords);
            if (date !== "-") completed++;
        });

        const rate = (completed / required.length) * 100;
        return `${rate.toFixed(0)}%`;
    };

    return (
        <div className="p-8 font-sans">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <Link href="/">
                        <button className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200 shadow-sm font-semibold text-sm rounded-xl px-4 py-2 mb-3 transition-all hover:bg-slate-50 hover:text-slate-800">
                            <ArrowLeft className="w-4 h-4" />
                            Retour aux Navires
                        </button>
                    </Link>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        Mésure Mensuelle
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Tableau de performance des transmissions navires</p>
                </div>

                <div className="flex gap-3 items-center bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                    {/* Armateur filter */}
                    <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Armateur</span>
                        <select
                            value={selectedArmateur}
                            onChange={(e) => setSelectedArmateur(e.target.value)}
                            className="bg-transparent font-bold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[180px]"
                        >
                            {armateurs.map(arm => (
                                <option key={arm} value={arm}>{arm}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month filter */}
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="bg-transparent font-bold text-slate-700 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        {MONTHS_FR.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>

                    {/* Year filter */}
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="bg-transparent font-bold text-slate-700 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <button
                        onClick={fetchMesures}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
                    >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 mb-6">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* Active filter badge */}
            <div className="mb-4 flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Synthèse pour l'armateur :</span>
                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                    {selectedArmateur}
                </span>
                <span className="text-xs text-slate-400">({filteredVoyages.length} voyage{filteredVoyages.length > 1 ? 's' : ''})</span>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        {/* Main Headers Grouping */}
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-200">
                            <th colSpan={2} className="px-6 py-4 text-center border-r border-slate-200">Identification</th>
                            <th colSpan={4} className="px-6 py-4 text-center border-r border-slate-200 bg-amber-50/50 text-amber-800">Section IMPORT</th>
                            <th colSpan={4} className="px-6 py-4 text-center border-r border-slate-200 bg-blue-50/50 text-blue-800">Section EXPORT</th>
                            <th colSpan={2} className="px-6 py-4 text-center">Synthèse</th>
                        </tr>
                        <tr className="bg-white text-slate-700 font-black border-b-2 border-slate-100">
                            <th className="px-6 py-4 border-r border-slate-100">Navire</th>
                            <th className="px-6 py-4 border-r border-slate-100">Voyage</th>

                            <th className="px-4 py-4 bg-amber-100/30 text-amber-800 border-r border-slate-100 min-w-[120px]">ETA</th>
                            <th className="px-4 py-4 bg-amber-100/30 text-amber-800 border-r border-slate-100 min-w-[120px]">TDI IMP</th>
                            <th className="px-4 py-4 bg-amber-100/30 text-amber-800 border-r border-slate-100 min-w-[120px]">ZIP IMP</th>
                            <th className="px-4 py-4 bg-amber-100/30 text-amber-800 border-r border-slate-200 min-w-[120px]">MANIF. IMP</th>

                            <th className="px-4 py-4 bg-blue-100/30 text-blue-800 border-r border-slate-100 min-w-[120px]">ETD</th>
                            <th className="px-4 py-4 bg-blue-100/30 text-blue-800 border-r border-slate-100 min-w-[120px]">TDI EXP</th>
                            <th className="px-4 py-4 bg-blue-100/30 text-blue-800 border-r border-slate-100 min-w-[120px]">ZIP EXP</th>
                            <th className="px-4 py-4 bg-blue-100/30 text-blue-800 border-r border-slate-200 min-w-[120px]">MANIF. EXP</th>

                            <th className="px-6 py-4 border-r border-slate-100 text-center">Réal. (%)</th>
                            <th className="px-6 py-4">Observations</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading && Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="animate-pulse">
                                <td colSpan={12} className="px-6 py-4 h-16 bg-slate-50/50"></td>
                            </tr>
                        ))}

                        {!loading && filteredVoyages.length === 0 && (
                            <tr>
                                <td colSpan={12} className="px-6 py-12 text-center">
                                    <Ship className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-400 font-medium">
                                        Aucun mouvement pour l'armateur "{selectedArmateur}" en {MONTHS_FR[month - 1]} {year}
                                    </p>
                                </td>
                            </tr>
                        )}

                        {!loading && filteredVoyages.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4 font-bold text-slate-900 border-r border-slate-50">
                                    <div>{v.navire.nomNavire}</div>
                                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">{v.navire.armateurCoque}</div>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-blue-600 border-r border-slate-50">{v.numVoyage}</td>

                                <td className="px-4 py-4 text-slate-600 font-medium border-r border-slate-50 bg-amber-50/10">{formatDate(v.dateETA)}</td>
                                <td className="px-4 py-4 text-slate-700 font-bold border-r border-slate-50 bg-amber-50/10">
                                    {getActionDate(v, ['Top Import', 'TDI Import'])}
                                </td>
                                <td className="px-4 py-4 text-slate-700 font-bold border-r border-slate-50 bg-amber-50/10">
                                    {getActionDate(v, ['Fichier Compressé Import', 'ZIP Import', 'fichier import compresse'])}
                                </td>
                                <td className="px-4 py-4 text-slate-700 font-bold border-r border-slate-200 bg-amber-50/10">
                                    {getActionDate(v, ['Manifeste Import', 'Douane-PAA'])}
                                </td>

                                <td className="px-4 py-4 text-slate-600 font-medium border-r border-slate-50 bg-blue-50/10">{formatDate(v.dateETD)}</td>
                                <td className="px-4 py-4 text-slate-700 font-bold border-r border-slate-50 bg-blue-50/10">
                                    {getActionDate(v, ['Top Export', 'TDI Export'])}
                                </td>
                                <td className="px-4 py-4 text-slate-700 font-bold border-r border-slate-50 bg-blue-50/10">
                                    {getActionDate(v, ['Fichier Compressé Export', 'ZIP Export', 'fichier export compresse'])}
                                </td>
                                <td className="px-4 py-4 text-slate-700 font-bold border-r border-slate-200 bg-blue-50/10">
                                    {getActionDate(v, ['Manifeste Export'])}
                                </td>

                                <td className="px-6 py-4 border-r border-slate-50 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${calculateRate(v) === '100%' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {calculateRate(v)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400 italic text-xs">
                                    {v.traitements.length === 0 ? "Fiche non créée" : ""}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex justify-between items-center bg-slate-100/50 p-4 rounded-2xl border border-slate-200 group">
                <p className="text-slate-500 text-xs font-semibold px-4">
                    Les données sont automatiquement synchronisées avec le fichier Excel principal.
                </p>
                <div className="flex gap-2">
                    <button
                        className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm"
                        onClick={() => {
                            window.location.href = `/api/mesures/export?month=${month}&year=${year}`;
                        }}
                    >
                        <Download className="w-4 h-4" />
                        Exporter Excel
                    </button>
                    <button
                        className="bg-white text-slate-700 font-bold py-2 px-4 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 text-sm"
                        onClick={() => window.print()}
                    >
                        <Calendar className="w-4 h-4" />
                        Imprimer
                    </button>

                    <button
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2 text-sm"
                        onClick={() => fetchMesures()}
                    >
                        <RefreshCw className="w-4 h-4" />
                        Rafraîchir
                    </button>
                </div>
            </div>
        </div>
    );
}