"use client";

import { useState, useEffect } from "react";
import { Plus, X, Trash2, Check, CheckCircle, RefreshCcw, GripVertical, EyeOff, Eye, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { NavireEnTraitement, Action } from "@/lib/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Mock Data
const MOCK_NAVIRES: NavireEnTraitement[] = [];

// Mock Data for available selections
const MOCK_AVAILABLE_NAVIRES = [
  { id: "n1", nomNavire: "MSC ALINA", armateurCoque: "MSC" },
  { id: "n2", nomNavire: "CMA CGM MARCO POLO", armateurCoque: "CMA CGM" },
  { id: "n3", nomNavire: "GRIMALDI SEAWAYS", armateurCoque: "GRIMALDI" },
  { id: "n4", nomNavire: "MAERSK EINDHOVEN", armateurCoque: "MAERSK" },
];

const MOCK_AVAILABLE_VOYAGES = [
  { id: "v1", navireId: "n1", numVoyage: "MX402A", dateETA: "2026-06-15", dateETD: "2026-06-18" },
  { id: "v2", navireId: "n2", numVoyage: "CMA989T", dateETA: "2026-06-10", dateETD: "2026-06-12" },
  { id: "v3", navireId: "n2", numVoyage: "CMA990T", dateETA: "2026-07-20", dateETD: "2026-07-22" },
  { id: "v4", navireId: "n3", numVoyage: "GRI001X", dateETA: "2026-07-01", dateETD: "2026-07-05" },
  { id: "v5", navireId: "n4", numVoyage: "MAE112P", dateETA: "2026-08-10", dateETD: "2026-08-14" },
];

// Helper to format date YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateStr: string) => {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

// Vérifie si une date est un jour férié en Côte d'Ivoire
const isHolidayCI = (date: Date) => {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  // Fêtes fixes
  if (d === 1 && m === 1) return true; // Jour de l'An
  if (d === 1 && m === 5) return true; // Fête du Travail
  if (d === 7 && m === 8) return true; // Fête Nationale
  if (d === 15 && m === 8) return true; // Assomption
  if (d === 1 && m === 11) return true; // Toussaint
  if (d === 15 && m === 11) return true; // Journée nationale de la Paix
  if (d === 25 && m === 12) return true; // Noël

  // Fêtes mobiles chrétiennes (Pâques)
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d_div = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d_div - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const p = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthPaques = Math.floor((h + l - 7 * p + 114) / 31);
  const dayPaques = ((h + l - 7 * p + 114) % 31) + 1;
  const datePaques = new Date(y, monthPaques - 1, dayPaques);

  const lundiPaques = new Date(datePaques); lundiPaques.setDate(datePaques.getDate() + 1);
  if (d === lundiPaques.getDate() && m === lundiPaques.getMonth() + 1) return true;

  const ascension = new Date(datePaques); ascension.setDate(datePaques.getDate() + 39);
  if (d === ascension.getDate() && m === ascension.getMonth() + 1) return true;

  const pentecote = new Date(datePaques); pentecote.setDate(datePaques.getDate() + 50);
  if (d === pentecote.getDate() && m === pentecote.getMonth() + 1) return true;

  // Règles CI : le lendemain de certaines fêtes est férié si la fête tombe un dimanche
  const hier = new Date(date);
  hier.setDate(hier.getDate() - 1);
  if (hier.getDay() === 0) {
    const hd = hier.getDate();
    const hm = hier.getMonth() + 1;
    if (
      (hd === 1 && hm === 1) ||
      (hd === 1 && hm === 5) ||
      (hd === 7 && hm === 8) ||
      (hd === 15 && hm === 8) ||
      (hd === 1 && hm === 11) ||
      (hd === 15 && hm === 11) ||
      (hd === 25 && hm === 12)
    ) {
      return true;
    }
  }

  // Note: Tabaski, Korité, Maouloud dépendent du calendrier lunaire.
  return false;
};

// Calculate deadline for a given action
const calculateDeadline = (actionName: string, traitement: any, templates: any[]) => {
  const template = templates.find((t: any) => t.name === actionName);
  if (!template || template.nbreJours == null || !template.evenementId) return null;

  const refTemplate = templates.find((t: any) => t.id === template.evenementId);
  if (!refTemplate) return null;

  let baseDateStr = null;
  const refAction = traitement.actions.find((a: any) => a.action === refTemplate.name);

  if (refAction && refAction.isComplete && refAction.dateCloture) {
    baseDateStr = refAction.dateCloture;
  } else {
    const title = refTemplate.name.toUpperCase();
    if (title.includes('ETA') && traitement.voyage?.dateETA) {
      baseDateStr = traitement.voyage.dateETA;
    } else if (title.includes('ETD') && traitement.voyage?.dateETD) {
      baseDateStr = traitement.voyage.dateETD;
    }
  }

  if (!baseDateStr) return null;

  const baseDate = new Date(baseDateStr);
  if (isNaN(baseDate.getTime())) return null;

  const daysToAdd = template.periode === "Avant" ? -template.nbreJours : template.nbreJours;

  // La date de départ compte pour 1 jour, donc le nombre de "sauts" à faire est N-1
  const jumpDays = Math.abs(daysToAdd) > 0 ? Math.abs(daysToAdd) - 1 : 0;
  const direction = daysToAdd >= 0 ? 1 : -1;

  // L'utilisateur souhaite ignorer WE et Jours Fériés si joursOuvrable OU joursCalendaire est coché.
  if (template.joursOuvrable || template.joursCalendaire) {
    let currentDays = jumpDays;
    while (currentDays > 0) {
      baseDate.setDate(baseDate.getDate() + direction);
      const dayOfWeek = baseDate.getDay();

      // On ignore le week-end (Samedi:6, Dimanche:0) ET les jours fériés CI
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHolidayCI(baseDate)) {
        currentDays--;
      }
    }
  } else {
    baseDate.setDate(baseDate.getDate() + (direction * jumpDays));
  }

  return baseDate.toISOString().split('T')[0];
};

// --- Sortable Item Component ---
function SortableAction({
  action,
  traitementId,
  activeClotureInput,
  setActiveClotureInput,
  actionClotureDates,
  setActionClotureDates,
  handleCloseAction,
  handleReactivateAction,
  handleDeleteAction,
  toggleHideAction,
  deadline
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.3 : (action.isComplete ? 0.75 : 1),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-xl p-3 shadow-sm border transition-all flex flex-col justify-between w-full sm:w-56 ${action.isComplete
        ? 'bg-slate-100 border-slate-300 grayscale-[20%]'
        : 'bg-gradient-to-br from-blue-50 to-white border-blue-200 hover:shadow-md hover:-translate-y-0.5'
        }`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600 hover:bg-white/80 p-1 rounded transition-all shrink-0 -ml-1"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <span className={`font-bold text-xs ${action.isComplete ? 'text-slate-500 line-through decoration-slate-400' : 'text-blue-900'}`}>{action.action}</span>
        </div>
        {action.isComplete ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleHideAction(action.id)}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-full transition-all"
              title="Masquer cette action"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleReactivateAction(traitementId, action.id)}
              className="text-slate-400 hover:text-blue-600 p-1 hover:bg-white rounded-full transition-all"
              title="Réactiver l'action"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setActiveClotureInput(activeClotureInput === `${traitementId}-${action.id}` ? null : `${traitementId}-${action.id}`)}
              className="text-emerald-500 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded-full transition-colors"
              title="Clôturer l'action"
            >
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDeleteAction(traitementId, action.id)}
              className="text-orange-400 hover:text-orange-600 p-1 hover:bg-orange-50 rounded-full transition-colors"
              title="Supprimer l'action"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {deadline && !action.isComplete && (() => {
        const today = new Date().toISOString().split('T')[0];
        const isLate = deadline < today;
        const isToday = deadline === today;
        return (
          <div className="flex justify-end gap-1.5 items-center mb-1.5 px-0.5">
            <span className="text-[10px] text-slate-500 font-medium tracking-wide">Deadline :</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border ${isLate ? 'bg-red-50 text-red-700 border-red-200' : isToday ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {formatDate(deadline)}
            </span>
          </div>
        );
      })()}

      {action.isComplete ? (
        <div className="mt-1 pt-2 border-t border-slate-200">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-0.5">
            ✓ Terminée {action.dateCloture && `(${formatDate(action.dateCloture)})`}
          </span>
        </div>
      ) : activeClotureInput === `${traitementId}-${action.id}` ? (
        <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-blue-100 animate-fade-in">
          <span className="text-[10px] text-slate-500 font-bold">Date clôture :</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={actionClotureDates[`${traitementId}-${action.id}`] || ''}
              onChange={(e) => setActionClotureDates({ ...actionClotureDates, [`${traitementId}-${action.id}`]: e.target.value })}
              className="flex-1 p-1.5 border border-slate-300 rounded hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none text-[10px] text-slate-700 bg-white shadow-inner transition-colors"
            />
            <button
              onClick={() => handleCloseAction(traitementId, action.id)}
              className="p-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 shadow-sm transition-colors"
              title="Valider la clôture"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveClotureInput(null)}
              className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 shadow-sm transition-colors"
              title="Annuler"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [naviresEnTraitement, setNaviresEnTraitement] = useState<NavireEnTraitement[]>([]);
  const [hiddenActionIds, setHiddenActionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('hiddenActionIds');
      if (stored) {
        setHiddenActionIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.error('Failed to parse hiddenActionIds from storage', e);
    }
  }, []);

  const toggleHideAction = (actionId: string) => {
    setHiddenActionIds(prev => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);

      // Save directly to localStorage
      localStorage.setItem('hiddenActionIds', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  // DND Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, traitementId: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const traitement = naviresEnTraitement.find(t => t.id === traitementId);
      if (!traitement) return;

      const oldIndex = traitement.actions.findIndex(a => a.id === active.id);
      const newIndex = traitement.actions.findIndex(a => a.id === over.id);

      const newActions = arrayMove(traitement.actions, oldIndex, newIndex);

      // Update local state immediately
      setNaviresEnTraitement(prev => prev.map(t =>
        t.id === traitementId ? { ...t, actions: newActions } : t
      ));

      // Call API to save new order
      try {
        await fetch('/api/actions/reorder', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actions: newActions.map((a, i) => ({ id: a.id, position: i }))
          })
        });
      } catch (error) {
        console.error('Failed to save action order:', error);
      }
    }
  };
  const [actionTemplates, setActionTemplates] = useState<{ id: string, name: string }[]>([]);
  const [availableNavires, setAvailableNavires] = useState<{ id: string, nomNavire: string, armateurCoque: string, voyages: any[] }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'en_cours' | 'termines'>('en_cours');
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionSearchQuery, setActionSearchQuery] = useState("");
  const [selectedTraitementForAction, setSelectedTraitementForAction] = useState<NavireEnTraitement | null>(null);
  const [actionClotureDates, setActionClotureDates] = useState<Record<string, string>>({});
  const [activeClotureInput, setActiveClotureInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [selectedNavireId, setSelectedNavireId] = useState("");
  const [selectedVoyageId, setSelectedVoyageId] = useState("");
  const [nomNavire, setNomNavire] = useState("");
  const [armateur, setArmateur] = useState("");
  const [numVoyage, setNumVoyage] = useState("");
  const [dateETA, setDateETA] = useState("");
  const [dateETD, setDateETD] = useState("");

  const fetchSuivis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/suivis');
      const data = await res.json();
      if (Array.isArray(data)) {
        setNaviresEnTraitement(data);
      }
    } catch (error) {
      console.error('Failed to fetch suivis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/action-templates');
      const data = await res.json();
      if (Array.isArray(data)) {
        setActionTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchNavires = async () => {
    try {
      const res = await fetch('/api/navires');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAvailableNavires(data);
      }
    } catch (error) {
      console.error('Failed to fetch dynamic navires:', error);
    }
  };

  useEffect(() => {
    fetchSuivis();
    fetchTemplates();
    fetchNavires();

    const handleUpdate = () => {
      fetchNavires();
      fetchTemplates();
      fetchSuivis();
    };

    window.addEventListener('globalDataUpdate', handleUpdate);
    return () => window.removeEventListener('globalDataUpdate', handleUpdate);
  }, []);


  const handleSelectNavire = (id: string) => {
    setSelectedNavireId(id);
    setSelectedVoyageId(""); // Reset voyage on navire change
    setNumVoyage("");
    setDateETA("");
    setDateETD("");

    const navire = availableNavires.find(n => n.id === id);
    if (navire) {
      setNomNavire(navire.nomNavire);
      setArmateur(navire.armateurCoque);
    } else {
      setNomNavire("");
      setArmateur("");
    }
  };

  const handleSelectVoyage = (id: string) => {
    setSelectedVoyageId(id);
    const navire = availableNavires.find(n => n.id === selectedNavireId);
    const voyage = navire?.voyages?.find((v: any) => v.id === id);
    if (voyage) {
      setNumVoyage(voyage.numVoyage);
      setDateETA(voyage.dateETA);
      setDateETD(voyage.dateETD);
    } else {
      setNumVoyage("");
      setDateETA("");
      setDateETD("");
    }
  };

  const handleDeleteAction = async (traitementId: string, actionId: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette action ?")) {
      try {
        const res = await fetch(`/api/actions/${actionId}`, { method: 'DELETE' });
        if (res.ok) {
          setNaviresEnTraitement(prev => prev.map(t => {
            if (t.id === traitementId) {
              return { ...t, actions: t.actions.filter(a => a.id !== actionId) };
            }
            return t;
          }));
          window.dispatchEvent(new Event('globalDataUpdate'));
        } else {
          const data = await res.json();
          alert(`Erreur: ${data.error || 'Impossible de supprimer cette action'}`);
        }
      } catch (error) {
        console.error('Failed to delete action:', error);
        alert('Une erreur réseau est survenue');
      }
    }
  };

  const handleCloseAction = async (traitementId: string, actionId: string) => {
    const actionKey = `${traitementId}-${actionId}`;
    const actionDateCloture = actionClotureDates[actionKey];
    if (!actionDateCloture) {
      alert("Veuillez renseigner une date de clôture.");
      return;
    }

    try {
      const res = await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isComplete: true, dateCloture: actionDateCloture })
      });

      if (res.ok) {
        // Check if this action is "Attente Accostage" → update ETA on the voyage
        const traitement = naviresEnTraitement.find(t => t.id === traitementId);
        const closedAction = traitement?.actions.find(a => a.id === actionId);
        const isAccostage = closedAction?.action
          ?.toLowerCase()
          .includes('accostage');

        if (isAccostage && traitement?.voyage?.id) {
          await fetch(`/api/voyages/${traitement.voyage.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dateETA: actionDateCloture })
          });
        }

        const isDepart = closedAction?.action
          ?.toLowerCase()
          .includes('départ') || closedAction?.action?.toLowerCase().includes('depart');

        if (isDepart && traitement?.voyage?.id) {
          await fetch(`/api/voyages/${traitement.voyage.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dateETD: actionDateCloture })
          });
        }

        // Refresh all for consistency
        await fetchSuivis();
        setActiveClotureInput(null);
      }
    } catch (error) {
      console.error('Failed to close action:', error);
    }
  };

  const handleReactivateAction = async (traitementId: string, actionId: string) => {
    if (window.confirm("Réactiver cette action ?")) {
      try {
        const res = await fetch(`/api/actions/${actionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isComplete: false, dateCloture: null })
        });

        if (res.ok) {
          fetchSuivis();
        }
      } catch (error) {
        console.error('Failed to reactivate action:', error);
      }
    }
  };

  const handleToggleTermine = async (traitement: NavireEnTraitement) => {
    if (window.confirm("Voulez-vous vraiment changer le statut de ce navire ?")) {
      try {
        const res = await fetch(`/api/suivis/${traitement.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTermine: !traitement.isTermine })
        });

        if (res.ok) {
          fetchSuivis();
        }
      } catch (error) {
        console.error('Failed to toggle suivi completion:', error);
      }
    }
  };

  const handleDeleteSuivi = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce navire de la liste ?")) {
      try {
        const res = await fetch(`/api/suivis/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchSuivis();
          window.dispatchEvent(new Event('globalDataUpdate'));
        }
      } catch (error) {
        console.error('Failed to delete suivi:', error);
      }
    }
  };

  const openActionModal = (traitement: NavireEnTraitement) => {
    setSelectedTraitementForAction(traitement);
    setActionSearchQuery("");
    setIsActionModalOpen(true);
  };

  const handleAddActionToNavire = async (actionName: string) => {
    if (!selectedTraitementForAction) return;

    // Check if the action is already added
    if (selectedTraitementForAction.actions.some(a => a.action === actionName)) {
      return; // Already added
    }

    try {
      const res = await fetch(`/api/suivis/${selectedTraitementForAction.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionName })
      });

      if (res.ok) {
        fetchSuivis();
        window.dispatchEvent(new Event('globalDataUpdate'));
      }
    } catch (error) {
      console.error('Failed to add action:', error);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomNavire || !armateur || !numVoyage || !dateETA || !dateETD) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Vérifier si le combo navire + voyage existe déjà
    const alreadyExists = naviresEnTraitement.some(
      t => t.navire.nomNavire === nomNavire && t.voyage.numVoyage === numVoyage
    );

    if (alreadyExists) {
      alert(`Le navire ${nomNavire} avec le voyage ${numVoyage} est déjà présent dans le suivi.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/suivis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomNavire,
          armateurCoque: armateur,
          numVoyage,
          dateETA,
          dateETD
        })
      });

      if (res.ok) {
        await fetchSuivis();
        window.dispatchEvent(new Event('globalDataUpdate'));
        setIsModalOpen(false);

        // Reset Form
        setSelectedNavireId("");
        setSelectedVoyageId("");
        setNomNavire("");
        setArmateur("");
        setNumVoyage("");
        setDateETA("");
        setDateETD("");
      } else {
        const errorData = await res.json();
        alert(`Erreur lors de l'enregistrement : ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Failed to submit suivi:', error);
      alert("Une erreur réseau est survenue. Veuillez vérifier votre connexion et l'état du serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedNavires = naviresEnTraitement.filter(n => {
    const matchesTab = activeTab === 'en_cours' ? !n.isTermine : n.isTermine;
    if (!globalSearchQuery) return matchesTab;
    const searchLower = globalSearchQuery.toLowerCase();
    const navireName = n.navire?.nomNavire?.toLowerCase() || '';
    const armateur = n.navire?.armateurCoque?.toLowerCase() || '';
    const voyage = n.voyage?.numVoyage?.toLowerCase() || '';
    return matchesTab && (navireName.includes(searchLower) || armateur.includes(searchLower) || voyage.includes(searchLower));
  });

  return (
    <main className="min-h-screen text-slate-800 relative font-sans" style={{ background: 'linear-gradient(145deg, #f1f5f9 0%, #e8eef7 50%, #f1f5f9 100%)' }}>
      {/* Ambient background shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #bfdbfe 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 -left-20 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #a5f3fc 0%, transparent 70%)' }} />
        <div className="absolute -bottom-20 right-1/3 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #c7d2fe 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-8 pt-4 pb-8">
        {/* Sticky Header Zone */}
        <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 -mx-8 px-8 py-6 mb-8 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all">
          {/* Header */}
          <header className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, #2563eb, #0ea5e9)' }} />
                <h1 className="text-4xl font-extrabold tracking-tight" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 60%, #0ea5e9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Suivi des Navires
                </h1>
              </div>
              <p className="text-slate-500 text-sm font-medium ml-5">Direction des Services Maritimes — DSM</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2.5 text-white font-semibold text-sm rounded-2xl px-6 py-3 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.35)' }}
            >
              <Plus className="w-4.5 h-4.5" />
              Nouveau Navire
            </button>
          </header>

          {/* Controls Bar (Tabs & Search) */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl w-fit" style={{ background: 'rgba(226, 232, 240, 0.7)', backdropFilter: 'blur(10px)' }}>
              <button
                onClick={() => setActiveTab('en_cours')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'en_cours'
                  ? 'bg-white text-blue-700 shadow-sm shadow-blue-100/50'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                En cours
              </button>
              <button
                onClick={() => setActiveTab('termines')}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === 'termines'
                  ? 'bg-white text-emerald-700 shadow-sm shadow-emerald-100/50'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Terminés
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher un navire..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border-0 ring-1 ring-slate-200/60 bg-white/60 hover:bg-white focus:bg-white focus:ring-2 focus:ring-blue-500 shadow-sm transition-all text-sm font-medium placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* List of Navires */}
        <div className="space-y-4">
          {displayedNavires.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border-2 border-dashed border-slate-200 bg-white/50">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)' }}>
                <span className="text-3xl">⚓</span>
              </div>
              <p className="text-slate-500 font-medium">Aucun navire dans cette catégorie</p>
              <p className="text-slate-400 text-sm mt-1">Cliquez sur "Nouveau Navire" pour commencer</p>
            </div>
          ) : (
            displayedNavires.map((traitement) => (
              <div
                key={traitement.id}
                className={`bg-white rounded-[1.75rem] px-8 py-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${traitement.isTermine
                  ? 'border border-emerald-200/70 shadow-[0_2px_20px_rgba(16,185,129,0.08),0_8px_40px_rgba(0,0,0,0.04)]'
                  : 'border border-slate-200/80 shadow-[0_2px_20px_rgba(37,99,235,0.06),0_8px_40px_rgba(0,0,0,0.04)]'
                  }`}
              >
                {/* Accent bar left + Decorative background */}
                <div
                  className="absolute left-0 top-0 h-full w-1.5 rounded-l-[1.75rem]"
                  style={{
                    background: traitement.isTermine
                      ? 'linear-gradient(to bottom, #10b981, #34d399)'
                      : 'linear-gradient(to bottom, #2563eb, #0ea5e9)'
                  }}
                />
                <div
                  className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full -z-10"
                  style={{
                    background: traitement.isTermine
                      ? 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)'
                      : 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)'
                  }}
                />

                {/* Bouton de suppression global du suivi */}
                <button
                  onClick={() => handleDeleteSuivi(traitement.id)}
                  className="absolute top-3 right-3 w-9 h-9 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-50 hover:border-red-500 hover:scale-110 transition-all z-20 shadow-sm"
                  title="Supprimer ce navire du suivi"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex justify-between items-stretch">
                  <div className="flex-1">
                    {/* Card Header row */}
                    <div className="flex flex-wrap gap-12 mb-5 text-slate-900">
                      {(session?.user as any)?.role === 'ADMIN' && traitement.user && (
                        <div className="flex flex-col justify-center border-l-4 border-purple-500 pl-3 bg-purple-50/50 py-1 rounded-r">
                          <span className="text-sm font-bold text-purple-700">{traitement.user.email}</span>
                          <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold mt-0.5 whitespace-nowrap">Créateur ({traitement.user.service})</span>
                        </div>
                      )}

                      <div className="flex flex-col justify-center">
                        <span className="text-xl font-bold">{traitement.navire.nomNavire}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Navire</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl font-bold">{traitement.voyage.numVoyage}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">N° Voyage</span>
                      </div>
                      <div className="flex flex-col">
                        {(() => {
                          const accostageAction = traitement.actions.find(
                            a => a.action?.toLowerCase().includes('accostage') && a.isComplete
                          );
                          return (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xl font-bold">{formatDate(traitement.voyage.dateETA)}</span>
                                {accostageAction && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    ✓ Accosté
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Date ETA</span>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex flex-col">
                        {(() => {
                          const departAction = traitement.actions.find(
                            a => (a.action?.toLowerCase().includes('départ') || a.action?.toLowerCase().includes('depart')) && a.isComplete
                          );
                          return (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xl font-bold">{formatDate(traitement.voyage.dateETD)}</span>
                                {departAction && (
                                  <span className="text-[9px] bg-sky-100 text-sky-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                    ✓ Parti
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Date ETD</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="ml-2 pt-0">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, traitement.id)}
                      >
                        <SortableContext
                          items={traitement.actions.map(a => a.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {(() => {
                            const visibleActions = traitement.actions.filter(a => !hiddenActionIds.has(a.id));
                            const nbHidden = traitement.actions.filter(a => hiddenActionIds.has(a.id)).length;
                            return (
                              <>
                                <div className="flex flex-wrap gap-4">
                                  {visibleActions.length === 0 && nbHidden === 0 ? (
                                    <span className="text-slate-400 italic text-sm">Aucune action...</span>
                                  ) : (
                                    visibleActions.map(action => (
                                      <SortableAction
                                        key={action.id}
                                        action={action}
                                        traitementId={traitement.id}
                                        activeClotureInput={activeClotureInput}
                                        setActiveClotureInput={setActiveClotureInput}
                                        actionClotureDates={actionClotureDates}
                                        setActionClotureDates={setActionClotureDates}
                                        handleCloseAction={handleCloseAction}
                                        handleReactivateAction={handleReactivateAction}
                                        handleDeleteAction={handleDeleteAction}
                                        toggleHideAction={toggleHideAction}
                                        deadline={calculateDeadline(action.action, traitement, actionTemplates)}
                                      />
                                    ))
                                  )}
                                </div>
                                {nbHidden > 0 && (
                                  <button
                                    onClick={() => {
                                      const ids = traitement.actions
                                        .filter(a => hiddenActionIds.has(a.id))
                                        .map(a => a.id);
                                      setHiddenActionIds(prev => {
                                        const next = new Set(prev);
                                        ids.forEach(id => next.delete(id));
                                        localStorage.setItem('hiddenActionIds', JSON.stringify(Array.from(next)));
                                        return next;
                                      });
                                    }}
                                    className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    {nbHidden} action{nbHidden > 1 ? 's' : ''} masquée{nbHidden > 1 ? 's' : ''}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between ml-8 min-w-[200px] pr-10">
                    {/* Jauge de progression */}
                    {(() => {
                      const total = traitement.actions.length;
                      const done = traitement.actions.filter(a => a.isComplete).length;
                      const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                      return (
                        <div className="w-full pt-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Progression</span>
                            <span className="text-xs font-bold text-amber-600">{percent}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })()}

                    {!traitement.isTermine && (
                      <button
                        onClick={() => openActionModal(traitement)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-full text-xs hover:bg-blue-700 transition-all font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Action
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Ajouter Navire */}
      {
        isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in text-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-300">
              <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-xl font-bold text-black uppercase">
                  Ajouter Navire
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Infos Navire */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-black">
                  <div className="space-y-1">
                    <label className="text-sm font-bold">Sélectionner un Navire *</label>
                    <select
                      value={selectedNavireId}
                      onChange={e => handleSelectNavire(e.target.value)}
                      className="w-full p-2 border border-blue-400 rounded bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors"
                      required
                    >
                      <option value="">-- Choisir un navire --</option>
                      {availableNavires.map(n => (
                        <option key={n.id} value={n.id}>{n.nomNavire}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold">Sélectionner le N° Voyage *</label>
                    <select
                      value={selectedVoyageId}
                      onChange={e => handleSelectVoyage(e.target.value)}
                      className="w-full p-2 border border-blue-400 rounded bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-colors disabled:bg-slate-100 disabled:border-slate-300 disabled:cursor-not-allowed"
                      required
                      disabled={!selectedNavireId}
                    >
                      <option value="">-- Choisir un voyage --</option>
                      {availableNavires.find(n => n.id === selectedNavireId)?.voyages?.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.numVoyage}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2 mt-2 pt-3 border-t border-slate-100">
                    <h4 className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-1">Informations automatiques</h4>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm text-slate-500 font-bold">Armateur Coque</label>
                    <input
                      type="text"
                      value={armateur}
                      readOnly
                      className="w-full p-2 border border-transparent rounded bg-slate-100 text-slate-600 cursor-not-allowed focus:outline-none font-bold"
                      placeholder="Auto-rempli..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-500 font-bold">Date ETA</label>
                    <input
                      type="date"
                      value={dateETA}
                      readOnly
                      className="w-full p-2 border border-transparent rounded bg-slate-100 text-slate-600 cursor-not-allowed focus:outline-none font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-500 font-bold">Date ETD</label>
                    <input
                      type="date"
                      value={dateETD}
                      readOnly
                      className="w-full p-2 border border-transparent rounded bg-slate-100 text-slate-600 cursor-not-allowed focus:outline-none font-bold"
                    />
                  </div>
                </div>



                <div className="flex justify-end gap-3 pt-5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 border border-slate-300 text-black hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 border border-green-600 text-green-800 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-green-800 border-t-transparent rounded-full animate-spin"></div>
                        Enregistrement...
                      </>
                    ) : (
                      "Enregistrer Navire"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal Ajouter des Actions au Navire */}
      {
        isActionModalOpen && selectedTraitementForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in text-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-300">
              <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
                <h2 className="text-xl font-bold text-black uppercase">
                  Ajouter des Actions
                </h2>
                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 text-black space-y-5">
                {/* En-tête avec les informations du navire */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="block text-[10px] text-blue-600/80 mb-0.5">Navire</span>
                      <span className="font-bold text-base text-blue-900">{selectedTraitementForAction?.navire.nomNavire}</span>
                    </div>
                    <div className="w-px h-6 bg-blue-200"></div>
                    <div>
                      <span className="block text-[10px] text-blue-600/80 mb-0.5">N° Voyage</span>
                      <span className="font-bold text-base text-blue-900">{selectedTraitementForAction?.voyage.numVoyage}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-3">Sélectionnez les actions à ajouter :</h4>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Rechercher une action..."
                      value={actionSearchQuery}
                      onChange={(e) => setActionSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {actionTemplates.filter(a => a.name.toLowerCase().includes(actionSearchQuery.toLowerCase())).map(action => {
                      const isAlreadyAdded = naviresEnTraitement
                        .find(t => t.id === selectedTraitementForAction?.id)
                        ?.actions.some(a => a.action === action.name);

                      return (
                        <button
                          key={action.id}
                          disabled={isAlreadyAdded}
                          onClick={() => handleAddActionToNavire(action.name)}
                          className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex justify-between items-center ${isAlreadyAdded
                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-white border-slate-300 hover:border-blue-500 hover:shadow-sm text-slate-800'
                            }`}
                        >
                          <span>{action.name}</span>
                          {isAlreadyAdded ? (
                            <span className="text-xs font-bold px-2 py-1 bg-slate-200 rounded text-slate-500">Ajoutée</span>
                          ) : (
                            <Plus className="w-4 h-4 text-blue-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsActionModalOpen(false)}
                    className="px-6 py-2 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded font-bold transition"
                  >
                    Terminer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </main >
  );
}
