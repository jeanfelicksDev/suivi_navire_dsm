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
}

export interface Action {
    id: string;
    action: string;
    isComplete: boolean;
    dateCloture?: string;
}

export interface NavireEnTraitement {
    id: string;
    navire: Navire;
    voyage: Voyage;
    actions: Action[];
    createdAt: string;
    isTermine?: boolean;
}
