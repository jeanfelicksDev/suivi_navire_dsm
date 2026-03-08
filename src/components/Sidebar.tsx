"use client";

import { useState, useEffect } from "react";
import { Ship, Route, ActivitySquare, X, Edit2, Trash2, Check, ChevronsUpDown, Briefcase, Search, LogOut, Users, User } from "lucide-react";
import { Combobox } from '@headlessui/react';
import { useSession, signOut } from "next-auth/react";
import Link from 'next/link';

// Helper to format date YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("-")) return dateStr;
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
};

// Helper to convert string to title case (First letter of each word in uppercase)
const toTitleCase = (str: string) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export function Sidebar() {
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    const notifyDataUpdate = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('globalDataUpdate'));
        }
    };

    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isNavireModalOpen, setIsNavireModalOpen] = useState(false);
    const [isVoyageModalOpen, setIsVoyageModalOpen] = useState(false);
    const [isArmateurModalOpen, setIsArmateurModalOpen] = useState(false);
    const [isSlotteurModalOpen, setIsSlotteurModalOpen] = useState(false);

    // State for managing global actions list
    const [actions, setActions] = useState<{ id: string, name: string, isReferentiel: boolean, nbreJours?: number | null, periode?: string | null, evenementId?: string | null, joursOuvrable: boolean, joursCalendaire: boolean, isNotification: boolean }[]>([]);
    const [newAction, setNewAction] = useState("");
    const [newActionIsReferentiel, setNewActionIsReferentiel] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [editIsReferentiel, setEditIsReferentiel] = useState(false);
    const [actionSearchQuery, setActionSearchQuery] = useState("");

    // Deadline sub-form state
    const [deadlineOpenForId, setDeadlineOpenForId] = useState<string | null>(null);
    const [dlNbreJours, setDlNbreJours] = useState<string>("");
    const [dlPeriode, setDlPeriode] = useState<"Avant" | "Après">("Avant");
    const [dlEvenementId, setDlEvenementId] = useState<string>("");
    const [dlJoursOuvrable, setDlJoursOuvrable] = useState(false);
    const [dlJoursCalendaire, setDlJoursCalendaire] = useState(false);
    const [dlIsNotification, setDlIsNotification] = useState(false);

    const fetchActions = async () => {
        try {
            const res = await fetch('/api/action-templates');
            if (!res.ok) throw new Error('Erreur lors de la récupération des actions');
            const data = await res.json();
            if (Array.isArray(data)) setActions(data);
        } catch (error: any) {
            console.error('Error fetching actions:', error);
            alert(error.message);
        }
    };

    // State and handlers for Navires
    const [armateurs, setArmateurs] = useState<string[]>([]);
    const [armateursData, setArmateursData] = useState<{ id: string, nom: string }[]>([]);
    const [navires, setNavires] = useState<{ id: string, nomNavire: string, armateurCoque: string }[]>([]);
    const [newNavireNom, setNewNavireNom] = useState("");
    const [newNavireArmateur, setNewNavireArmateur] = useState("");
    const [navireArmateurQuery, setNavireArmateurQuery] = useState("");

    const fetchArmateurs = async () => {
        try {
            const res = await fetch('/api/armateurs');
            const data = await res.json();
            if (Array.isArray(data)) {
                setArmateursData(data);
                // Also update the simple names list for Comboboxes
                const names = data.map(a => a.nom);
                setArmateurs(prev => Array.from(new Set([...prev, ...names])));
            }
        } catch (error) {
            console.error('Error fetching armateurs:', error);
        }
    };

    const fetchNavires = async () => {
        try {
            const res = await fetch('/api/navires');
            const data = await res.json();
            if (Array.isArray(data)) {
                setNavires(data);
                // Dynamically update armateurs list from navires for suggestions
                const navireArmateurs = data.map((n: any) => n.armateurCoque);
                setArmateurs(prev => Array.from(new Set([...prev, ...navireArmateurs])));
            }
        } catch (error) {
            console.error('Error fetching navires:', error);
        }
    };

    // State and handlers for Voyages
    const [voyages, setVoyages] = useState<{ id: string, navireId: string, numVoyage: string, dateETA: string, dateETD: string, navire?: any }[]>([]);
    const [newVoyageNavire, setNewVoyageNavire] = useState<{ id: string, nomNavire: string } | null>(null);
    const [newVoyageNavireQuery, setNewVoyageNavireQuery] = useState("");
    const [newVoyageNum, setNewVoyageNum] = useState("");
    const [newVoyageETA, setNewVoyageETA] = useState("");
    const [newVoyageETD, setNewVoyageETD] = useState("");

    const fetchVoyages = async () => {
        try {
            const res = await fetch('/api/voyages');
            const data = await res.json();
            if (Array.isArray(data)) setVoyages(data);
        } catch (error) {
            console.error('Error fetching voyages:', error);
        }
    };

    // State and handlers for Slotteurs
    const [slotteurs, setSlotteurs] = useState<{ id: string, nom: string, voyageId: string, voyage?: any }[]>([]);
    const [newSlotteurNom, setNewSlotteurNom] = useState("");
    const [newSlotteurVoyageId, setNewSlotteurVoyageId] = useState("");
    const [editingSlotteurId, setEditingSlotteurId] = useState<string | null>(null);
    const [editSlotteurNom, setEditSlotteurNom] = useState("");
    const [slotteurNomQuery, setSlotteurNomQuery] = useState("");

    const fetchSlotteurs = async () => {
        try {
            const res = await fetch('/api/slotteurs');
            const data = await res.json();
            if (Array.isArray(data)) setSlotteurs(data);
        } catch (error) {
            console.error('Error fetching slotteurs:', error);
        }
    };

    const handleAddSlotteur = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalNom = toTitleCase(newSlotteurNom || slotteurNomQuery);
        if (finalNom && newSlotteurVoyageId) {
            // Vérification doublon : même nom ET même voyage
            const alreadyExists = slotteurs.some(
                s => s.nom.toUpperCase() === finalNom && s.voyageId === newSlotteurVoyageId
            );
            if (alreadyExists) {
                alert(`Le slotteur "${finalNom}" est déjà associé à ce voyage.`);
                return;
            }

            // Vérification coque : impossible d'être slotteur pour son propre navire
            const selectedVoyage = voyages.find(v => v.id === newSlotteurVoyageId);
            const selectedNavire = navires.find(n => n.id === selectedVoyage?.navireId);
            if (selectedNavire && selectedNavire.armateurCoque.toUpperCase() === finalNom) {
                alert(`"${finalNom}" est l'armateur COQUE de ${selectedNavire.nomNavire} et ne peut pas être ajouté comme slotteur sur ce navire.`);
                return;
            }

            try {
                const res = await fetch('/api/slotteurs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom: finalNom, voyageId: newSlotteurVoyageId })
                });
                if (res.ok) {
                    setNewSlotteurNom("");
                    setSlotteurNomQuery("");
                    fetchSlotteurs();
                } else {
                    const d = await res.json();
                    alert(`Erreur: ${d.error || 'Impossible d\'ajouter ce slotteur'}`);
                }
            } catch (error) {
                console.error('Error adding slotteur:', error);
            }
        }
    };

    const handleDeleteSlotteur = async (id: string) => {
        if (confirm("Supprimer ce slotteur ?")) {
            try {
                await fetch(`/api/slotteurs/${id}`, { method: 'DELETE' });
                fetchSlotteurs();
            } catch (error) {
                console.error('Error deleting slotteur:', error);
            }
        }
    };

    const handleSaveEditSlotteur = async (id: string) => {
        if (editSlotteurNom.trim()) {
            try {
                const res = await fetch(`/api/slotteurs/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom: editSlotteurNom.trim() })
                });
                if (res.ok) {
                    setEditingSlotteurId(null);
                    fetchSlotteurs();
                }
            } catch (error) {
                console.error('Error editing slotteur:', error);
            }
        }
    };



    useEffect(() => {
        fetchActions();
        fetchNavires();
        fetchVoyages();
        fetchSlotteurs();
        fetchArmateurs();

        const handleUpdate = () => {
            fetchActions();
            fetchNavires();
            fetchVoyages();
            fetchSlotteurs();
            fetchArmateurs();
        };

        window.addEventListener('globalDataUpdate', handleUpdate);
        return () => window.removeEventListener('globalDataUpdate', handleUpdate);
    }, []);

    const handleAddAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newAction.trim()) {
            try {
                const res = await fetch('/api/action-templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newAction.trim(), isReferentiel: newActionIsReferentiel })
                });
                if (res.ok) {
                    setNewAction("");
                    setNewActionIsReferentiel(false);
                    fetchActions();
                    notifyDataUpdate();
                } else {
                    const data = await res.json();
                    alert(`Erreur: ${data.error}`);
                }
            } catch (error) {
                console.error('Error adding action:', error);
            }
        }
    };

    const openDeadlineForm = (action: typeof actions[0]) => {
        setDeadlineOpenForId(action.id);
        setDlNbreJours(action.nbreJours != null ? String(action.nbreJours) : "");
        setDlPeriode((action.periode as "Avant" | "Après") || "Avant");
        setDlEvenementId(action.evenementId || "");
        setDlJoursOuvrable(action.joursOuvrable || false);
        setDlJoursCalendaire(action.joursCalendaire || false);
        setDlIsNotification(action.isNotification || false);
    };

    const handleSaveDeadline = async () => {
        if (!deadlineOpenForId) return;
        try {
            const res = await fetch(`/api/action-templates/${deadlineOpenForId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nbreJours: dlNbreJours ? parseInt(dlNbreJours) : null,
                    periode: dlPeriode,
                    evenementId: dlEvenementId || null,
                    joursOuvrable: dlJoursOuvrable,
                    joursCalendaire: dlJoursCalendaire,
                    isNotification: dlIsNotification,
                })
            });
            if (res.ok) {
                setDeadlineOpenForId(null);
                fetchActions();
            } else {
                const d = await res.json();
                alert(`Erreur: ${d.error}`);
            }
        } catch (e: any) {
            alert('Erreur réseau: ' + e.message);
        }
    };

    // Natural-language deadline summary
    const deadlineSummary = (() => {
        const referentielAction = actions.find(a => a.id === dlEvenementId);
        if (!dlNbreJours || !referentielAction) return null;
        const typeJour = dlJoursOuvrable ? 'jours ouvrables' : dlJoursCalendaire ? 'jours calendaires' : 'jours';
        return `Deadline fixé ${dlNbreJours} ${typeJour} ${dlPeriode} ${referentielAction.name}.`;
    })();

    const handleDeleteAction = async (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette action ?")) {
            try {
                const res = await fetch(`/api/action-templates/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchActions();
                    notifyDataUpdate();
                } else {
                    const data = await res.json();
                    alert(`Erreur: ${data.error || 'Impossible de supprimer cette action'}`);
                }
            } catch (error: any) {
                console.error('Error deleting action:', error);
                alert('Une erreur réseau est survenue: ' + error.message);
            }
        }
    };

    const handleStartEdit = (id: string, currentName: string, isReferentiel: boolean) => {
        setEditingId(id);
        setEditValue(currentName);
        setEditIsReferentiel(isReferentiel || false);
    };

    const handleSaveEdit = async (id: string) => {
        if (editValue.trim()) {
            try {
                const res = await fetch(`/api/action-templates/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editValue.trim(), isReferentiel: editIsReferentiel })
                });
                if (res.ok) {
                    setEditingId(null);
                    fetchActions();
                    notifyDataUpdate();
                }
            } catch (error) {
                console.error('Error updating action:', error);
            }
        }
    };

    const [editingNavireId, setEditingNavireId] = useState<string | null>(null);
    const [editNavireNom, setEditNavireNom] = useState("");
    const [editNavireArmateur, setEditNavireArmateur] = useState("");
    const [editNavireArmateurQuery, setEditNavireArmateurQuery] = useState("");

    const filteredArmateurs = navireArmateurQuery === ''
        ? armateurs
        : armateurs.filter((armateur) =>
            armateur.toLowerCase().includes(navireArmateurQuery.toLowerCase())
        );

    const filteredEditArmateurs = editNavireArmateurQuery === ''
        ? armateurs
        : armateurs.filter((armateur) =>
            armateur.toLowerCase().includes(editNavireArmateurQuery.toLowerCase())
        );

    const handleSelectArmateur = (val: string | null) => {
        const value = (val || "").trim();
        if (value && !armateurs.includes(value)) {
            setArmateurs([...armateurs, value]);
        }
        setNewNavireArmateur(value);
    };

    const handleSelectEditArmateur = (val: string | null) => {
        const value = (val || "").trim();
        if (value && !armateurs.includes(value)) {
            setArmateurs([...armateurs, value]);
        }
        setEditNavireArmateur(value);
    };

    const handleAddNavire = async (e: React.FormEvent) => {
        e.preventDefault();
        const armateurCoqueToSubmit = (newNavireArmateur || navireArmateurQuery).trim();
        if (newNavireNom.trim() && armateurCoqueToSubmit) {
            try {
                const res = await fetch('/api/navires', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nomNavire: newNavireNom.trim(), armateurCoque: armateurCoqueToSubmit })
                });
                if (res.ok) {
                    setNewNavireNom("");
                    setNewNavireArmateur("");
                    setNavireArmateurQuery("");
                    fetchNavires();
                    notifyDataUpdate();
                } else {
                    const errorData = await res.json();
                    alert(`Erreur: ${errorData.error || 'Impossible d\'ajouter ce navire'}`);
                }
            } catch (error: any) {
                console.error('Error adding navire:', error);
                alert('Une erreur réseau est survenue');
            }
        }
    };

    const handleDeleteNavire = async (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce navire ?")) {
            try {
                const res = await fetch(`/api/navires/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchNavires();
                    fetchVoyages(); // Refresh voyages as they might be cascade deleted or updated
                    notifyDataUpdate();
                } else {
                    const data = await res.json();
                    alert(`Erreur: ${data.error || 'Impossible de supprimer ce navire. Vérifiez s\'il a des voyages ou des suivis associés.'}`);
                }
            } catch (error: any) {
                console.error('Error deleting navire:', error);
                alert('Une erreur réseau est survenue: ' + error.message);
            }
        }
    };

    const handleStartEditNavire = (id: string, nom: string, armateur: string) => {
        setEditingNavireId(id);
        setEditNavireNom(nom);
        setEditNavireArmateur(armateur);
        setEditNavireArmateurQuery(armateur);
    };

    const handleSaveEditNavire = async (id: string) => {
        const armateurCoqueToSubmit = (editNavireArmateur || editNavireArmateurQuery).trim();
        if (editNavireNom.trim() && armateurCoqueToSubmit) {
            try {
                const res = await fetch(`/api/navires/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nomNavire: editNavireNom.trim(), armateurCoque: armateurCoqueToSubmit })
                });
                if (res.ok) {
                    setEditingNavireId(null);
                    fetchNavires();
                    notifyDataUpdate();
                }
            } catch (error) {
                console.error('Error updating navire:', error);
            }
        }
    };

    // State and handlers for Armateurs - kept local in UI since it's shared with Navires armateurCoque
    const [newArmateurName, setNewArmateurName] = useState("");
    const [editingArmateurName, setEditingArmateurName] = useState<string | null>(null);
    const [editArmateurValue, setEditArmateurValue] = useState("");

    const handleAddArmateur = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = toTitleCase(newArmateurName);
        if (value) {
            try {
                const res = await fetch('/api/armateurs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom: value })
                });
                if (res.ok) {
                    setNewArmateurName("");
                    fetchArmateurs();
                } else {
                    const d = await res.json();
                    alert(`Erreur: ${d.error || 'Impossible d\'ajouter cet armateur'}`);
                }
            } catch (error) {
                console.error('Error adding armateur:', error);
            }
        }
    };

    const handleDeleteArmateur = async (id: string, name: string) => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer l'armateur "${name}" ?`)) {
            try {
                const res = await fetch(`/api/armateurs/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchArmateurs();
                } else {
                    const d = await res.json();
                    alert(`Erreur: ${d.error || 'Impossible de supprimer cet armateur'}`);
                }
            } catch (error) {
                console.error('Error deleting armateur:', error);
            }
        }
    };

    const handleStartEditArmateur = (id: string, name: string) => {
        setEditingArmateurName(id);
        setEditArmateurValue(name);
    };

    const handleSaveEditArmateur = async (id: string) => {
        const newValue = toTitleCase(editArmateurValue);
        if (newValue) {
            try {
                const res = await fetch(`/api/armateurs/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nom: newValue })
                });
                if (res.ok) {
                    setEditingArmateurName(null);
                    fetchArmateurs();
                } else {
                    const d = await res.json();
                    alert(`Erreur: ${d.error || 'Impossible de modifier cet armateur'}`);
                }
            } catch (error) {
                console.error('Error updating armateur:', error);
            }
        } else {
            setEditingArmateurName(null);
        }
    };

    const [editingVoyageId, setEditingVoyageId] = useState<string | null>(null);
    const [editVoyageNum, setEditVoyageNum] = useState("");
    const [editVoyageETA, setEditVoyageETA] = useState("");
    const [editVoyageETD, setEditVoyageETD] = useState("");

    const filteredNaviresForVoyage = newVoyageNavireQuery === ''
        ? navires
        : navires.filter((n) =>
            n.nomNavire.toLowerCase().includes(newVoyageNavireQuery.toLowerCase())
        );

    const handleAddVoyage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newVoyageNavire && newVoyageNum.trim() && newVoyageETA && newVoyageETD) {
            try {
                const res = await fetch('/api/voyages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        navireId: newVoyageNavire.id,
                        numVoyage: newVoyageNum.trim(),
                        dateETA: newVoyageETA,
                        dateETD: newVoyageETD
                    })
                });
                if (res.ok) {
                    setNewVoyageNavire(null);
                    setNewVoyageNavireQuery("");
                    setNewVoyageNum("");
                    setNewVoyageETA("");
                    setNewVoyageETD("");
                    fetchVoyages();
                    notifyDataUpdate();
                } else {
                    const errorData = await res.json();
                    alert(`Erreur: ${errorData.error || 'Impossible d\'ajouter ce voyage'}`);
                }
            } catch (error: any) {
                console.error('Error adding voyage:', error);
                alert('Une erreur réseau est survenue');
            }
        }
    };

    const handleDeleteVoyage = async (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce voyage ?")) {
            try {
                const res = await fetch(`/api/voyages/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    fetchVoyages();
                    notifyDataUpdate();
                } else {
                    const data = await res.json();
                    alert(`Erreur: ${data.error || 'Impossible de supprimer ce voyage. Vérifiez s\'il est associé à un suivi.'}`);
                }
            } catch (error: any) {
                console.error('Error deleting voyage:', error);
                alert('Une erreur réseau est survenue: ' + error.message);
            }
        }
    };

    const handleStartEditVoyage = (v: any) => {
        setEditingVoyageId(v.id);
        setEditVoyageNum(v.numVoyage);
        setEditVoyageETA(v.dateETA);
        setEditVoyageETD(v.dateETD);
    };

    const handleSaveEditVoyage = async (id: string) => {
        if (editVoyageNum.trim() && editVoyageETA && editVoyageETD) {
            try {
                const res = await fetch(`/api/voyages/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        numVoyage: editVoyageNum.trim(),
                        dateETA: editVoyageETA,
                        dateETD: editVoyageETD
                    })
                });
                if (res.ok) {
                    setEditingVoyageId(null);
                    fetchVoyages();
                    notifyDataUpdate();
                }
            } catch (error) {
                console.error('Error updating voyage:', error);
            }
        }
    };

    return (
        <>
            <aside className="w-72 bg-[#0a0f1c] text-slate-300 min-h-screen p-6 flex flex-col fixed left-0 top-0 border-r border-white/5 shadow-2xl overflow-y-auto z-40 font-sans">
                <div className="text-[1.1rem] font-bold tracking-[0.2em] border-b border-white/10 pb-6 mb-8 text-white mt-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                        <Ship className="w-5 h-5 text-white" />
                    </div>
                    NAVIRES
                </div>
                <nav className="flex flex-col gap-2 flex-1">
                    {((isAdmin) || (session?.user as any)?.canCreateNavire) && (
                        <button
                            onClick={() => setIsNavireModalOpen(true)}
                            className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-800/60 hover:text-white transition-all text-left w-full group"
                        >
                            <Ship className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <span className="font-bold text-[15px]">Création navire</span>
                        </button>
                    )}

                    {((isAdmin) || (session?.user as any)?.canCreateVoyage) && (
                        <button
                            onClick={() => setIsVoyageModalOpen(true)}
                            className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-800/60 hover:text-white transition-all text-left w-full group"
                        >
                            <Route className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                            <span className="font-bold text-[15px]">Ajouter un Voyage</span>
                        </button>
                    )}

                    {((isAdmin) || (session?.user as any)?.canCreateArmateur) && (
                        <button
                            onClick={() => setIsArmateurModalOpen(true)}
                            className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-800/60 hover:text-white transition-all text-left w-full group"
                        >
                            <Briefcase className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                            <span className="font-bold text-[15px]">Ajouter un Armateur</span>
                        </button>
                    )}

                    {((isAdmin) || (session?.user as any)?.canCreateAction) && (
                        <button
                            onClick={() => setIsActionModalOpen(true)}
                            className="flex items-center gap-4 p-3.5 mt-2 border-t border-white/5 pt-5 rounded-xl hover:bg-slate-800/60 hover:text-white transition-all text-left w-full group"
                        >
                            <ActivitySquare className="w-5 h-5 text-slate-500 group-hover:text-fuchsia-400 transition-colors" />
                            <span className="font-bold text-[15px]">Créer Action</span>
                        </button>
                    )}

                    {isAdmin && (
                        <Link href="/admin" className="block mt-4">
                            <button className="flex items-center gap-4 p-3.5 rounded-xl hover:bg-slate-800/60 hover:text-white transition-all text-left w-full group">
                                <Users className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
                                <span className="font-bold text-[15px]">Administration</span>
                            </button>
                        </Link>
                    )}

                </nav>

                <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                    {session?.user && (
                        <div className="bg-slate-800/50 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                    <User className="w-4 h-4 text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{session.user.email}</p>
                                    <p className="text-xs text-slate-400 capitalize">
                                        {(session.user as any).role} — {(session.user as any).service}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm font-semibold"
                            >
                                <LogOut className="w-4 h-4" />
                                Déconnexion
                            </button>
                        </div>
                    )}
                    <div className="text-xs text-slate-600 text-center font-medium">
                        © 2026 Admin Dashboard
                    </div>
                </div>
            </aside >

            {/* Modal de Gestion des Actions */}
            {
                isActionModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-sm">
                        <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]">

                            {/* Header du Modal */}
                            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h2 className="text-xl font-bold text-black flex items-center gap-3 uppercase">
                                    <ActivitySquare className="text-emerald-600 w-5 h-5" />
                                    Gestion des Actions
                                </h2>
                                <button
                                    onClick={() => setIsActionModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-black"
                                    title="Fermer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 flex flex-col text-black min-h-0">
                                {/* Formulaire d'ajout */}
                                <div className="shrink-0">
                                    <form onSubmit={handleAddAction} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm space-y-3">
                                        <h3 className="font-bold text-[15px]">Ajouter une nouvelle action globale</h3>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={newAction}
                                                onChange={e => setNewAction(toTitleCase(e.target.value))}
                                                className="flex-1 p-2 border border-slate-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                                placeholder="Nom de l'action... (ex: ACCORD SCANNER)"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newAction.trim()}
                                                className="px-5 py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Enregistrer
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newActionIsReferentiel}
                                                onChange={e => setNewActionIsReferentiel(e.target.checked)}
                                                className="w-4 h-4 accent-emerald-600"
                                            />
                                            <span className="font-medium text-slate-700">Référentiel</span>
                                            <span className="text-xs text-slate-400">(peut être utilisé comme événement deadline)</span>
                                        </label>
                                    </form>
                                </div>

                                {/* Champ de recherche pour les actions */}
                                <div className="relative mb-4">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher une action..."
                                        value={actionSearchQuery}
                                        onChange={(e) => setActionSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                                    />
                                </div>

                                {/* Tableau de la liste des actions */}
                                <div className="border border-slate-300 rounded-lg overflow-y-auto max-h-[350px] shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-100 border-b border-slate-300 text-[13px]">
                                                <th className="p-3 font-bold text-slate-700 border-r border-slate-300 w-14 text-center">ID</th>
                                                <th className="p-3 font-bold text-slate-700">Nom de l'action</th>
                                                <th className="p-3 font-bold text-slate-700 text-center w-28">Opérations</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {actions.filter(a => a.name.toLowerCase().includes(actionSearchQuery.toLowerCase())).length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="p-4 text-center text-slate-500 italic">
                                                        {actions.length === 0 ? "Aucune action enregistrée." : "Aucune action correspondante."}
                                                    </td>
                                                </tr>
                                            ) : (
                                                actions.filter(a => a.name.toLowerCase().includes(actionSearchQuery.toLowerCase())).map((action, index) => (
                                                    <tr key={action.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 border-r border-slate-200 text-slate-500 text-center">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-3">
                                                            {editingId === action.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={editValue}
                                                                        onChange={e => setEditValue(toTitleCase(e.target.value))}
                                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(action.id)}
                                                                        className="flex-1 p-2 border border-emerald-500 rounded focus:outline-none"
                                                                    />
                                                                    <label className="flex items-center gap-1.5 text-xs whitespace-nowrap bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={editIsReferentiel}
                                                                            onChange={e => setEditIsReferentiel(e.target.checked)}
                                                                            className="w-3.5 h-3.5 accent-emerald-600"
                                                                        />
                                                                        <span className="font-bold text-emerald-800">Réf.</span>
                                                                    </label>
                                                                    <button onClick={() => handleSaveEdit(action.id)} className="p-2 text-white bg-emerald-500 rounded hover:bg-emerald-600" title="Valider">
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-600 bg-slate-200 rounded hover:bg-slate-300" title="Annuler">
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-slate-800">{action.name}</span>
                                                                        {action.isReferentiel && (
                                                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Réf.</span>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => deadlineOpenForId === action.id ? setDeadlineOpenForId(null) : openDeadlineForm(action)}
                                                                        className={`text-[11px] font-bold hover:underline ${action.nbreJours ? 'text-emerald-600 hover:text-emerald-800' : 'text-blue-600 hover:text-blue-800'}`}
                                                                    >
                                                                        ⏰ Deadline{action.nbreJours ? ` (✓ configuré)` : ''}
                                                                    </button>

                                                                    {/* Deadline sub-form */}
                                                                    {deadlineOpenForId === action.id && (
                                                                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-xs">
                                                                            <p className="font-bold text-emerald-700 uppercase tracking-wide">Configuration Deadline</p>

                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div>
                                                                                    <label className="font-bold text-slate-600 block mb-1">Nbre Jours</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        min={0}
                                                                                        value={dlNbreJours}
                                                                                        onChange={e => setDlNbreJours(e.target.value)}
                                                                                        className="w-full p-1.5 border border-slate-300 rounded focus:outline-none focus:border-red-400"
                                                                                        placeholder="ex: 4"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="font-bold text-slate-600 block mb-1">Période</label>
                                                                                    <select
                                                                                        value={dlPeriode}
                                                                                        onChange={e => setDlPeriode(e.target.value as "Avant" | "Après")}
                                                                                        className="w-full p-1.5 border border-slate-300 rounded focus:outline-none focus:border-red-400 bg-white"
                                                                                    >
                                                                                        <option value="Avant">Avant</option>
                                                                                        <option value="Après">Après</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>

                                                                            <div>
                                                                                <label className="font-bold text-slate-600 block mb-1">Événement (action référentiel)</label>
                                                                                <select
                                                                                    value={dlEvenementId}
                                                                                    onChange={e => setDlEvenementId(e.target.value)}
                                                                                    className="w-full p-1.5 border border-slate-300 rounded focus:outline-none focus:border-red-400 bg-white"
                                                                                >
                                                                                    <option value="">-- Choisir un événement --</option>
                                                                                    {actions.filter(a => a.isReferentiel && a.id !== action.id).map(a => (
                                                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>

                                                                            <div className="flex flex-col gap-1.5">
                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                    <input type="checkbox" checked={dlJoursOuvrable} onChange={e => { setDlJoursOuvrable(e.target.checked); if (e.target.checked) setDlJoursCalendaire(false); }} className="accent-emerald-600" />
                                                                                    Jours ouvrables
                                                                                </label>
                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                    <input type="checkbox" checked={dlJoursCalendaire} onChange={e => { setDlJoursCalendaire(e.target.checked); if (e.target.checked) setDlJoursOuvrable(false); }} className="accent-emerald-600" />
                                                                                    Jours calendaires
                                                                                </label>
                                                                                <label className="flex items-center gap-2 cursor-pointer">
                                                                                    <input type="checkbox" checked={dlIsNotification} onChange={e => setDlIsNotification(e.target.checked)} className="accent-emerald-600" />
                                                                                    Notification (Armateur / Slotteur)
                                                                                </label>
                                                                            </div>

                                                                            {deadlineSummary && (
                                                                                <div className="p-2 bg-white border border-emerald-200 rounded text-emerald-700 font-medium italic">
                                                                                    {deadlineSummary}
                                                                                </div>
                                                                            )}

                                                                            <div className="flex gap-2 pt-1">
                                                                                <button onClick={handleSaveDeadline} className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700 transition-colors">Enregistrer</button>
                                                                                <button onClick={() => setDeadlineOpenForId(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors">Annuler</button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {editingId !== action.id && (
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <button
                                                                        onClick={() => handleStartEdit(action.id, action.name, action.isReferentiel)}
                                                                        className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                                                                        title="Modifier"
                                                                    >
                                                                        <Edit2 className="w-5 h-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteAction(action.id)}
                                                                        className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-50 rounded transition-colors"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right shrink-0">
                                <button
                                    onClick={() => setIsActionModalOpen(false)}
                                    className="px-6 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300 transition-colors"
                                >
                                    Fermer la fenêtre
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }



            {/* Modal de Gestion des Navires */}
            {
                isNavireModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-sm">
                        <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]">

                            {/* Header du Modal */}
                            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h2 className="text-xl font-bold text-black flex items-center gap-3 uppercase">
                                    <Ship className="text-blue-600 w-5 h-5" />
                                    Gestion des Navires
                                </h2>
                                <button
                                    onClick={() => setIsNavireModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-black"
                                    title="Fermer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 flex flex-col text-black min-h-0">
                                {/* Formulaire d'ajout navire */}
                                <div className="shrink-0">
                                    <form onSubmit={handleAddNavire} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                        <h3 className="font-bold mb-2 text-[15px]">Ajouter un nouveau navire</h3>
                                        <div className="flex flex-wrap md:flex-nowrap gap-3">
                                            <input
                                                type="text"
                                                value={newNavireNom}
                                                onChange={e => setNewNavireNom(toTitleCase(e.target.value))}
                                                className="flex-1 p-3 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none min-w-[200px] uppercase"
                                                placeholder="Nom du navire... (ex: MSC ALINA)"
                                            />
                                            <Combobox value={newNavireArmateur} onChange={handleSelectArmateur}>
                                                <div className="relative flex-1 min-w-[200px]">
                                                    <div className="relative w-full cursor-default rounded border border-slate-300 bg-white text-left focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                                                        <Combobox.Input
                                                            className="w-full bg-transparent py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:outline-none"
                                                            onChange={(event) => setNavireArmateurQuery(toTitleCase(event.target.value))}
                                                            displayValue={(person: string) => person || navireArmateurQuery}
                                                            placeholder="Armateur Coque... (ex: MSC)"
                                                        />
                                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                            <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                        </Combobox.Button>
                                                    </div>
                                                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                                        {navireArmateurQuery.length > 0 && !filteredArmateurs.includes(navireArmateurQuery) && (
                                                            <Combobox.Option
                                                                value={navireArmateurQuery}
                                                                className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`}
                                                            >
                                                                Créer "{navireArmateurQuery}"
                                                            </Combobox.Option>
                                                        )}
                                                        {filteredArmateurs.map((person) => (
                                                            <Combobox.Option
                                                                key={person}
                                                                className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`}
                                                                value={person}
                                                            >
                                                                {({ selected }) => (
                                                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                        {person}
                                                                    </span>
                                                                )}
                                                            </Combobox.Option>
                                                        ))}
                                                    </Combobox.Options>
                                                </div>
                                            </Combobox>

                                            <button
                                                type="submit"
                                                disabled={!newNavireNom.trim() || (!newNavireArmateur.trim() && !navireArmateurQuery.trim())}
                                                className="px-6 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Enregistrer
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Tableau de la liste des navires */}
                                <div className="border border-slate-300 rounded-lg overflow-y-auto max-h-[300px] shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-100 border-b border-slate-300">
                                                <th className="p-4 font-bold text-slate-700 border-r border-slate-300 w-16">ID</th>
                                                <th className="p-4 font-bold text-slate-700 w-1/3">Nom du Navire</th>
                                                <th className="p-4 font-bold text-slate-700 w-1/3">Armateur Coque</th>
                                                <th className="p-4 font-bold text-slate-700 text-center w-32">Opérations</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {navires.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                                                        Aucun navire enregistré pour le moment.
                                                    </td>
                                                </tr>
                                            ) : (
                                                navires.map((navire, index) => (
                                                    <tr key={navire.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 border-r border-slate-200 text-slate-500">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-4">
                                                            {editingNavireId === navire.id ? (
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={editNavireNom}
                                                                    onChange={e => setEditNavireNom(toTitleCase(e.target.value))}
                                                                    className="w-full p-2 border border-blue-500 rounded focus:outline-none"
                                                                    placeholder="Nom Navire"
                                                                />
                                                            ) : (
                                                                <span className="font-bold text-slate-800">{navire.nomNavire}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-slate-700 font-bold">
                                                            {editingNavireId === navire.id ? (
                                                                <>
                                                                    <Combobox value={editNavireArmateur} onChange={handleSelectEditArmateur}>
                                                                        <div className="relative w-full">
                                                                            <div className="relative w-full cursor-default rounded border border-blue-500 bg-white text-left">
                                                                                <Combobox.Input
                                                                                    className="w-full bg-transparent py-2 pl-2 pr-10 focus:outline-none"
                                                                                    onChange={(event) => setEditNavireArmateurQuery(toTitleCase(event.target.value))}
                                                                                    displayValue={(person: string) => person || editNavireArmateurQuery}
                                                                                    onKeyDown={e => e.key === 'Enter' && handleSaveEditNavire(navire.id)}
                                                                                />
                                                                                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                                                    <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                                                                </Combobox.Button>
                                                                            </div>
                                                                            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                                                                {editNavireArmateurQuery.length > 0 && !filteredEditArmateurs.includes(editNavireArmateurQuery) && (
                                                                                    <Combobox.Option
                                                                                        value={editNavireArmateurQuery}
                                                                                        className={({ active }) => `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`}
                                                                                    >
                                                                                        Créer "{editNavireArmateurQuery}"
                                                                                    </Combobox.Option>
                                                                                )}
                                                                                {filteredEditArmateurs.map((person) => (
                                                                                    <Combobox.Option
                                                                                        key={person}
                                                                                        className={({ active }) => `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`}
                                                                                        value={person}
                                                                                    >
                                                                                        {({ selected }) => (
                                                                                            <span className={`block truncate ${selected ? 'font-bold' : 'font-normal'}`}>
                                                                                                {person}
                                                                                            </span>
                                                                                        )}
                                                                                    </Combobox.Option>
                                                                                ))}
                                                                            </Combobox.Options>
                                                                        </div>
                                                                    </Combobox>
                                                                </>
                                                            ) : (
                                                                navire.armateurCoque
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {editingNavireId === navire.id ? (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => handleSaveEditNavire(navire.id)}
                                                                        className="p-2 text-white bg-emerald-500 rounded hover:bg-emerald-600"
                                                                        title="Valider"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingNavireId(null)}
                                                                        className="p-2 text-slate-600 bg-slate-200 rounded hover:bg-slate-300"
                                                                        title="Annuler"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center gap-3">
                                                                    <button
                                                                        onClick={() => handleStartEditNavire(navire.id, navire.nomNavire, navire.armateurCoque)}
                                                                        className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                                                                        title="Modifier"
                                                                    >
                                                                        <Edit2 className="w-5 h-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteNavire(navire.id)}
                                                                        className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-50 rounded transition-colors"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right shrink-0">
                                <button
                                    onClick={() => setIsNavireModalOpen(false)}
                                    className="px-6 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300 transition-colors"
                                >
                                    Fermer la fenêtre
                                </button>
                            </div>

                        </div>
                    </div>
                )
            }

            {/* Modal de Gestion des Voyages */}
            {
                isVoyageModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-sm">
                        <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]">

                            {/* Header du Modal */}
                            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h2 className="text-xl font-bold text-black flex items-center gap-3 uppercase">
                                    <Route className="text-blue-600 w-5 h-5" />
                                    Gestion des Voyages
                                </h2>
                                <button
                                    onClick={() => setIsVoyageModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-black"
                                    title="Fermer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 flex flex-col text-black min-h-0">
                                {/* Formulaire d'ajout voyage */}
                                <div className="shrink-0">
                                    <form onSubmit={handleAddVoyage} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                        <h3 className="font-bold mb-2 text-[15px]">Ajouter un nouveau voyage</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                                            <div className="lg:col-span-2">
                                                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Navire</label>
                                                <Combobox value={newVoyageNavire} onChange={setNewVoyageNavire}>
                                                    <div className="relative w-full">
                                                        <div className="relative w-full cursor-default rounded border border-slate-300 bg-white text-left focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                                                            <Combobox.Input
                                                                className="w-full bg-transparent py-3 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:outline-none"
                                                                onChange={(event) => setNewVoyageNavireQuery(event.target.value)}
                                                                displayValue={(navire: { id: string, nomNavire: string } | null) => navire?.nomNavire || ""}
                                                                placeholder="Rechercher un navire..."
                                                            />
                                                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                                <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                                            </Combobox.Button>
                                                        </div>
                                                        <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                                            {filteredNaviresForVoyage.length === 0 && newVoyageNavireQuery !== '' ? (
                                                                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                                                    Aucun navire trouvé.
                                                                </div>
                                                            ) : (
                                                                filteredNaviresForVoyage.map((navire) => (
                                                                    <Combobox.Option
                                                                        key={navire.id}
                                                                        className={({ active }) => `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`}
                                                                        value={{ id: navire.id, nomNavire: navire.nomNavire }}
                                                                    >
                                                                        {({ selected }) => (
                                                                            <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                                                {navire.nomNavire} <span className="text-xs opacity-70">({navire.armateurCoque})</span>
                                                                            </span>
                                                                        )}
                                                                    </Combobox.Option>
                                                                ))
                                                            )}
                                                        </Combobox.Options>
                                                    </div>
                                                </Combobox>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">N° Voyage</label>
                                                <input
                                                    type="text"
                                                    value={newVoyageNum}
                                                    onChange={e => setNewVoyageNum(toTitleCase(e.target.value))}
                                                    className="w-full p-3 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-bold"
                                                    placeholder="ex: 045R"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Date ETA</label>
                                                <input
                                                    type="date"
                                                    value={newVoyageETA}
                                                    onChange={e => setNewVoyageETA(e.target.value)}
                                                    className="w-full p-3 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Date ETD</label>
                                                <input
                                                    type="date"
                                                    value={newVoyageETD}
                                                    onChange={e => setNewVoyageETD(e.target.value)}
                                                    className="w-full p-3 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end gap-3">
                                            <button
                                                type="submit"
                                                disabled={!newVoyageNavire || !newVoyageNum.trim() || !newVoyageETA || !newVoyageETD}
                                                className="px-6 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Enregistrer
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Tableau de la liste des voyages */}
                                <div className="border border-slate-300 rounded-lg overflow-y-auto max-h-[350px] shadow-sm">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-100 border-b border-slate-300">
                                                <th className="p-4 font-bold text-slate-700 border-r border-slate-300 w-12">ID</th>
                                                <th className="p-4 font-bold text-slate-700 w-1/4">Navire</th>
                                                <th className="p-4 font-bold text-slate-700 w-40">Num Voyage</th>
                                                <th className="p-4 font-bold text-slate-700">Date ETA</th>
                                                <th className="p-4 font-bold text-slate-700">Date ETD</th>
                                                <th className="p-4 font-bold text-slate-700 text-center w-40">Opérations</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {voyages.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                                                        Aucun voyage enregistré pour le moment.
                                                    </td>
                                                </tr>
                                            ) : (
                                                voyages.map((voyage, index) => {
                                                    const navireLiaison = navires.find(n => n.id === voyage.navireId);
                                                    return (
                                                        <tr key={voyage.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                                            <td className="p-4 border-r border-slate-200 text-slate-500">
                                                                {index + 1}
                                                            </td>
                                                            <td className="p-4 font-medium text-slate-800">
                                                                {navireLiaison?.nomNavire || "Navire inconnu"}
                                                            </td>
                                                            <td className="p-4">
                                                                {editingVoyageId === voyage.id ? (
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={editVoyageNum}
                                                                        onChange={e => setEditVoyageNum(toTitleCase(e.target.value))}
                                                                        className="w-full p-1.5 border border-blue-500 rounded focus:outline-none"
                                                                        placeholder="N°"
                                                                    />
                                                                ) : (
                                                                    <span className="font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded">{voyage.numVoyage}</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                {editingVoyageId === voyage.id ? (
                                                                    <input
                                                                        type="date"
                                                                        value={editVoyageETA}
                                                                        onChange={e => setEditVoyageETA(e.target.value)}
                                                                        className="w-full p-2 border border-blue-500 rounded focus:outline-none"
                                                                    />
                                                                ) : (
                                                                    <span className="text-slate-800 font-bold">{formatDate(voyage.dateETA)}</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                {editingVoyageId === voyage.id ? (
                                                                    <input
                                                                        type="date"
                                                                        value={editVoyageETD}
                                                                        onChange={e => setEditVoyageETD(e.target.value)}
                                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEditVoyage(voyage.id)}
                                                                        className="w-full p-2 border border-blue-500 rounded focus:outline-none"
                                                                    />
                                                                ) : (
                                                                    <span className="text-slate-800 font-bold">{formatDate(voyage.dateETD)}</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4">
                                                                {editingVoyageId === voyage.id ? (
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            onClick={() => handleSaveEditVoyage(voyage.id)}
                                                                            className="p-2 text-white bg-emerald-500 rounded hover:bg-emerald-600"
                                                                            title="Valider"
                                                                        >
                                                                            <Check className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setEditingVoyageId(null)}
                                                                            className="p-2 text-slate-600 bg-slate-200 rounded hover:bg-slate-300"
                                                                            title="Annuler"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-center gap-3">
                                                                        <button
                                                                            onClick={() => {
                                                                                setIsSlotteurModalOpen(true);
                                                                                setNewSlotteurVoyageId(voyage.id);
                                                                            }}
                                                                            className={`relative px-2 py-1 rounded transition-colors flex items-center gap-1.5 font-bold text-[11px] border shadow-sm ${slotteurs.some(s => s.voyageId === voyage.id)
                                                                                ? 'text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-700'
                                                                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-100'
                                                                                }`}
                                                                            title="Gérer les slotteurs"
                                                                        >
                                                                            <Briefcase className="w-4 h-4" />
                                                                            SLOTTEURS
                                                                            {slotteurs.some(s => s.voyageId === voyage.id) && (
                                                                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-emerald-700 rounded-full text-[9px] font-black flex items-center justify-center border border-emerald-400 shadow-sm">
                                                                                    ✓
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleStartEditVoyage(voyage)}
                                                                            className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                                                                            title="Modifier"
                                                                        >
                                                                            <Edit2 className="w-5 h-5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteVoyage(voyage.id)}
                                                                            className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-50 rounded transition-colors"
                                                                            title="Supprimer"
                                                                        >
                                                                            <Trash2 className="w-5 h-5" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right shrink-0">
                                <button
                                    onClick={() => setIsVoyageModalOpen(false)}
                                    className="px-6 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300 transition-colors"
                                >
                                    Fermer la fenêtre
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Gestion des Armateurs */}
            {
                isArmateurModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]">
                            {/* Header du Modal */}
                            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h2 className="text-2xl font-bold text-black flex items-center gap-3 uppercase">
                                    <Briefcase className="text-blue-600 w-6 h-6" />
                                    Gestion des Armateurs
                                </h2>
                                <button
                                    onClick={() => setIsArmateurModalOpen(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-black"
                                    title="Fermer"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 flex flex-col text-black min-h-0">
                                {/* Formulaire d'ajout Armateur */}
                                <div className="shrink-0">
                                    <form onSubmit={handleAddArmateur} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                                        <h3 className="font-bold mb-2 text-[15px]">Ajouter un nouvel armateur</h3>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                value={newArmateurName}
                                                onChange={e => setNewArmateurName(toTitleCase(e.target.value))}
                                                className="flex-1 p-2 text-sm border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                placeholder="Nom de l'armateur... (ex: MSC)"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newArmateurName.trim()}
                                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Ajouter
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Liste des Armateurs */}
                                <div className="border border-slate-300 rounded-lg overflow-y-auto max-h-[250px] shadow-sm">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-100 border-b border-slate-300">
                                                <th className="p-3 font-bold text-slate-700 border-r border-slate-300 w-12 text-center">#</th>
                                                <th className="p-3 font-bold text-slate-700">Nom de l'armateur</th>
                                                <th className="p-3 font-bold text-slate-700 text-center w-28">Opérations</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {armateursData.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="p-6 text-center text-slate-500 italic">
                                                        Aucun armateur enregistré.
                                                    </td>
                                                </tr>
                                            ) : (
                                                armateursData.map((arm, index) => (
                                                    <tr key={arm.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                                        <td className="p-3 border-r border-slate-200 text-slate-500 text-center">
                                                            {index + 1}
                                                        </td>
                                                        <td className="p-3">
                                                            {editingArmateurName === arm.id ? (
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={editArmateurValue}
                                                                    onChange={e => setEditArmateurValue(toTitleCase(e.target.value))}
                                                                    onKeyDown={e => e.key === 'Enter' && handleSaveEditArmateur(arm.id)}
                                                                    className="w-full p-2 border border-blue-500 rounded focus:outline-none"
                                                                />
                                                            ) : (
                                                                <span className="font-medium text-slate-800">{arm.nom}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {editingArmateurName === arm.id ? (
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        onClick={() => handleSaveEditArmateur(arm.id)}
                                                                        className="p-2 text-white bg-emerald-500 rounded hover:bg-emerald-600"
                                                                        title="Valider"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingArmateurName(null)}
                                                                        className="p-2 text-slate-600 bg-slate-200 rounded hover:bg-slate-300"
                                                                        title="Annuler"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <button
                                                                        onClick={() => handleStartEditArmateur(arm.id, arm.nom)}
                                                                        className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors"
                                                                        title="Modifier"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteArmateur(arm.id, arm.nom)}
                                                                        className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-50 rounded transition-colors"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right shrink-0">
                                <button
                                    onClick={() => setIsArmateurModalOpen(false)}
                                    className="px-6 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300 transition-colors"
                                >
                                    Fermer la fenêtre
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Modal de Gestion des Slotteurs */}
            {
                isSlotteurModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-sm">
                        <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]">
                            {/* Header du Modal */}
                            <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h2 className="text-xl font-bold text-black flex items-center gap-3 uppercase">
                                    <Briefcase className="text-sky-600 w-5 h-5" />
                                    Gestion des Slotteurs
                                </h2>
                                <button onClick={() => setIsSlotteurModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-black">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 flex-1 flex flex-col text-black min-h-0 gap-4">
                                {/* Formulaire d'ajout */}
                                <form onSubmit={handleAddSlotteur} className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm shrink-0">
                                    <h3 className="font-bold mb-3 text-[15px]">Ajouter un nouveau slotteur</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 block mb-1 uppercase">Nom du slotteur</label>
                                            <Combobox value={newSlotteurNom} onChange={(val: string | null) => setNewSlotteurNom(val || "")}>
                                                <div className="relative w-full">
                                                    <div className="relative w-full cursor-default rounded border border-slate-300 bg-white text-left focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
                                                        <Combobox.Input
                                                            className="w-full bg-transparent py-2 pl-2 pr-10 text-sm leading-5 text-gray-900 focus:outline-none"
                                                            onChange={(event) => setSlotteurNomQuery(toTitleCase(event.target.value))}
                                                            displayValue={(val: string) => val || slotteurNomQuery}
                                                            placeholder="Chercher ou saisir..."
                                                        />
                                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                            <ChevronsUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                                        </Combobox.Button>
                                                    </div>
                                                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                                                        {slotteurNomQuery.length > 0 && !armateurs.includes(slotteurNomQuery) && (
                                                            <Combobox.Option
                                                                value={slotteurNomQuery}
                                                                className={({ active }) => `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-sky-600 text-white' : 'text-gray-900'}`}
                                                            >
                                                                Créer "{slotteurNomQuery}"
                                                            </Combobox.Option>
                                                        )}
                                                        {armateurs.filter(a => a.toLowerCase().includes(slotteurNomQuery.toLowerCase())).map((arm) => (
                                                            <Combobox.Option
                                                                key={arm}
                                                                className={({ active }) => `relative cursor-default select-none py-2 pl-4 pr-4 ${active ? 'bg-sky-600 text-white' : 'text-gray-900'}`}
                                                                value={arm}
                                                            >
                                                                {arm}
                                                            </Combobox.Option>
                                                        ))}
                                                    </Combobox.Options>
                                                </div>
                                            </Combobox>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-slate-600 block mb-1 uppercase">Voyage</label>
                                            <select
                                                value={newSlotteurVoyageId}
                                                onChange={e => setNewSlotteurVoyageId(e.target.value)}
                                                className="w-full p-2 border border-slate-300 rounded focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white font-bold"
                                            >
                                                <option value="">-- Choisir un voyage --</option>
                                                {voyages.map(v => {
                                                    const navireDuVoyage = navires.find(n => n.id === v.navireId);
                                                    return (
                                                        <option key={v.id} value={v.id}>
                                                            {v.navire?.nomNavire ?? navireDuVoyage?.nomNavire ?? '?'} ({navireDuVoyage?.armateurCoque ?? '?'}) — {v.numVoyage} · ETA {formatDate(v.dateETA)}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={(!newSlotteurNom.trim() && !slotteurNomQuery.trim()) || !newSlotteurVoyageId}
                                        className="mt-3 px-5 py-2 bg-sky-600 text-white rounded font-medium hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Enregistrer
                                    </button>
                                </form>

                                {/* Table slotteurs */}
                                <div className="border border-slate-300 rounded-lg overflow-y-auto max-h-[300px] shadow-sm">
                                    {newSlotteurVoyageId ? (
                                        (() => {
                                            const slotteursFiltres = slotteurs.filter(s => s.voyageId === newSlotteurVoyageId);
                                            const voyageCourant = voyages.find(v => v.id === newSlotteurVoyageId);
                                            const navireCourant = navires.find(n => n.id === voyageCourant?.navireId);
                                            return (
                                                <>
                                                    <div className="px-4 py-2 bg-sky-50 border-b border-sky-100 text-xs font-bold text-sky-700 uppercase tracking-wide">
                                                        Slotteurs de {navireCourant?.nomNavire ?? '?'} — {voyageCourant?.numVoyage ?? '?'}
                                                    </div>
                                                    <table className="w-full text-left border-collapse">
                                                        <thead className="sticky top-0 z-10">
                                                            <tr className="bg-slate-100 border-b border-slate-300 text-[13px]">
                                                                <th className="p-3 font-bold text-slate-700 border-r border-slate-300 w-12 text-center">ID</th>
                                                                <th className="p-3 font-bold text-slate-700">Nom Slotteur</th>
                                                                <th className="p-3 font-bold text-slate-700 text-center w-28">Opérations</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {slotteursFiltres.length === 0 ? (
                                                                <tr><td colSpan={3} className="p-4 text-center text-slate-500 italic">Aucun slotteur pour ce voyage.</td></tr>
                                                            ) : (
                                                                slotteursFiltres.map((s, idx) => (
                                                                    <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors font-bold">
                                                                        <td className="p-3 border-r border-slate-200 text-slate-500 text-center font-normal">{idx + 1}</td>
                                                                        <td className="p-3">
                                                                            {editingSlotteurId === s.id ? (
                                                                                <div className="flex items-center gap-2">
                                                                                    <input
                                                                                        autoFocus
                                                                                        type="text"
                                                                                        value={editSlotteurNom}
                                                                                        onChange={e => setEditSlotteurNom(toTitleCase(e.target.value))}
                                                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEditSlotteur(s.id)}
                                                                                        className="flex-1 p-1.5 border border-sky-500 rounded focus:outline-none"
                                                                                    />
                                                                                    <button onClick={() => handleSaveEditSlotteur(s.id)} className="p-1.5 text-white bg-sky-500 rounded hover:bg-sky-600"><Check className="w-4 h-4" /></button>
                                                                                    <button onClick={() => setEditingSlotteurId(null)} className="p-1.5 text-slate-600 bg-slate-200 rounded hover:bg-slate-300"><X className="w-4 h-4" /></button>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-slate-800 uppercase">{s.nom}</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="p-4">
                                                                            {editingSlotteurId !== s.id && (
                                                                                <div className="flex items-center justify-center gap-3">
                                                                                    <button onClick={() => { setEditingSlotteurId(s.id); setEditSlotteurNom(s.nom); }} className="text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition-colors" title="Modifier"><Edit2 className="w-5 h-5" /></button>
                                                                                    <button onClick={() => handleDeleteSlotteur(s.id)} className="text-orange-500 hover:text-orange-700 p-1 hover:bg-orange-50 rounded transition-colors" title="Supprimer"><Trash2 className="w-5 h-5" /></button>
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </>
                                            );
                                        })()
                                    ) : (
                                        <div className="p-6 text-center text-slate-400 italic text-sm">
                                            Sélectionnez un voyage pour voir les slotteurs associés.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-200 bg-slate-50 text-right shrink-0">
                                <button onClick={() => setIsSlotteurModalOpen(false)} className="px-6 py-2 bg-slate-200 text-slate-800 rounded font-medium hover:bg-slate-300 transition-colors">
                                    Fermer la fenêtre
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
