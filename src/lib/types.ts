export interface Navire {
    id: string;
    nomNavire: string;
    armateurCoque: string;
}

export interface Voyage {
    id: string;
    navireId: string;
    numVoyage: string;
    dateETA: string;
    dateETD: string;
    slotteurs?: { id: string, nom: string }[];
}

export interface Action {
    id: string;
    action: string;
    isComplete: boolean;
    dateCloture?: string;
    armateur?: string | null;
    position?: number;
    numSydam?: string | null;
}


export interface NavireEnTraitement {
    id: string;
    userId?: string | null;
    navire: Navire;
    voyage: Voyage;
    actions: Action[];
    selectedArmateurs?: string[] | null;
    typeNavire?: string | null;
    user?: { email: string, service: string, profil: string } | null;
    createdAt: string;
    isTermine?: boolean;
}

