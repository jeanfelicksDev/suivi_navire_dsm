import ExcelJS from 'exceljs';
import path from 'path';
import prisma from './db';
import fs from 'fs';

const MONTH_NAMES_FR = [
    "JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN",
    "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"
];

/**
 * Updates the Excel file with voyage and action data.
 */
export async function updateExcelForVoyage(voyageId: string) {
    try {
        // 1. Fetch Voyage data with Navire and ALL its Traitments/Actions
        const voyage = await prisma.voyage.findUnique({
            where: { id: voyageId },
            include: {
                navire: true,
                traitements: {
                    include: {
                        actions: true
                    }
                }
            }
        });

        if (!voyage) {
            console.error(`Voyage ${voyageId} not found for Excel update.`);
            return;
        }

        // 2. Identify the correct sheet
        // dateETA format is expected to be YYYY-MM-DD or similar
        const etaDate = new Date(voyage.dateETA);
        if (isNaN(etaDate.getTime())) {
            console.error(`Invalid ETA date for voyage ${voyageId}: ${voyage.dateETA}`);
            return;
        }

        const monthName = MONTH_NAMES_FR[etaDate.getMonth()];
        const year = etaDate.getFullYear();
        const sheetName = `${monthName} ${year}`;

        // 3. Load Workbook
        const filePath = path.join(process.cwd(), 'MESURE_NAVIRES_2026.xlsx');


        if (!fs.existsSync(filePath)) {
            console.error(`Excel file not found at ${filePath}`);
            return;
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(filePath);

        let worksheet = workbook.getWorksheet(sheetName);
        if (!worksheet) {
            // If sheet doesn't exist, we might want to skip or create it.
            // Based on user request, it's expected to exist.
            console.warn(`Sheet ${sheetName} not found in Excel. Skipping.`);
            return;
        }

        // 4. Find the row for this voyage
        // Rows start at 7 based on actual file structure (Row 6 is subheader)
        let foundRowIndex = -1;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber < 7) return;
            const navireInExcel = row.getCell(1).value?.toString().trim(); // A
            const voyageInExcel = row.getCell(2).value?.toString().trim(); // B

            if (navireInExcel === voyage.navire.nomNavire.trim() &&
                voyageInExcel === voyage.numVoyage.trim()) {
                foundRowIndex = rowNumber;
            }
        });

        // 5. If not found, find first empty row after row 6
        if (foundRowIndex === -1) {
            let nextEmptyRow = 7;
            while (worksheet.getRow(nextEmptyRow).getCell(1).value) {
                nextEmptyRow++;
            }
            foundRowIndex = nextEmptyRow;
            // Pre-fill Navire and Voyage
            worksheet.getRow(foundRowIndex).getCell(1).value = voyage.navire.nomNavire;
            worksheet.getRow(foundRowIndex).getCell(2).value = voyage.numVoyage;
        }

        const row = worksheet.getRow(foundRowIndex);

        // 6. Fill Data
        // Mapping based on observations:
        // Col 1: NAVIRE
        // Col 2: VOYAGE
        // Col 3: ETA (C)
        // Col 4: TOP IMP (D)
        // Col 5: ZIP IMP (E)
        // Col 6: MANIFESTE IMP (F)
        // Col 7: ETD (G)
        // Col 8: TOP EXP (H)
        // Col 9: ZIP EXP (I)
        // Col 10: MANIFESTE EXP (J)
        // Col 11: TAUX REALISATION (K)

        row.getCell(3).value = voyage.dateETA; // C
        row.getCell(7).value = voyage.dateETD; // G

        const allActions = voyage.traitements.flatMap(t => t.actions);

        const getClosureDate = (keywords: string[]) => {
            const matches = allActions.filter(a =>
                a.isComplete &&
                a.dateCloture &&
                keywords.some(k => a.action.toLowerCase().includes(k.toLowerCase()))
            );
            if (matches.length === 0) return null;
            return matches.sort((a, b) => b.dateCloture!.localeCompare(a.dateCloture!))[0].dateCloture;
        };

        const tdiImp = getClosureDate(['Top Import', 'TDI Import']);
        if (tdiImp) row.getCell(4).value = tdiImp; // D

        const zipImp = getClosureDate(['Fichier Compressé Import', 'ZIP Import', 'fichier import compresse']);
        if (zipImp) row.getCell(5).value = zipImp; // E

        const manImp = getClosureDate(['Manifeste Import', 'Douane-PAA']);
        if (manImp) row.getCell(6).value = manImp; // F

        const tdiExp = getClosureDate(['Top Export', 'TDI Export']);
        if (tdiExp) row.getCell(8).value = tdiExp; // H

        const zipExp = getClosureDate(['Fichier Compressé Export', 'ZIP Export', 'fichier export compresse']);
        if (zipExp) row.getCell(9).value = zipExp; // I

        const manExp = getClosureDate(['Manifeste Export']);
        if (manExp) row.getCell(10).value = manExp; // J

        // 6.5 Calculate Taux de réalisation
        const requiredActionKeywords = [
            ['Top Import', 'TDI Import'],
            ['Fichier Compressé Import', 'ZIP Import'],
            ['Manifeste Import'],
            ['Top Export', 'TDI Export'],
            ['Fichier Compressé Export', 'ZIP Export'],
            ['Manifeste Export']
        ];

        let completedCount = 0;
        requiredActionKeywords.forEach(keywords => {
            if (getClosureDate(keywords)) completedCount++;
        });

        const totalActions = requiredActionKeywords.length;
        const rate = (completedCount / totalActions) * 100;
        row.getCell(11).value = `${rate.toFixed(0)}%`; // K

        // 7. Commit changes
        row.commit();

        try {
            await workbook.xlsx.writeFile(filePath);
            console.log(`Excel updated for voyage ${voyage.navire.nomNavire} / ${voyage.numVoyage} in sheet ${sheetName}`);
        } catch (writeError: any) {
            if (writeError.code === 'EBUSY') {
                const ext = path.extname(filePath);
                const base = path.basename(filePath, ext);
                const copyPath = path.join(path.dirname(filePath), `${base}_COPY${ext}`);

                console.warn(`Le fichier principal est verrouillé. Tentative d'écriture dans : ${copyPath}`);
                await workbook.xlsx.writeFile(copyPath);
                console.log(`Données sauvegardées avec succès dans : ${copyPath}`);
            } else {
                throw writeError;
            }
        }

    } catch (error: any) {
        if (error.code === 'EBUSY') {
            console.error('Erreur: Le fichier Excel est ouvert. Veuillez le fermer ou consulter la copie _COPY.');
        } else {
            console.error('Error updating Excel:', error);
        }
    }
}

