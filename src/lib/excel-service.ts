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
        // Rows start at 6 based on previous peek (Row 5 is header)
        let foundRowIndex = -1;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber < 6) return;
            const navireInExcel = row.getCell(2).value?.toString().trim();
            const voyageInExcel = row.getCell(3).value?.toString().trim();

            if (navireInExcel === voyage.navire.nomNavire.trim() &&
                voyageInExcel === voyage.numVoyage.trim()) {
                foundRowIndex = rowNumber;
            }
        });

        // 5. If not found, find first empty row after row 5
        if (foundRowIndex === -1) {
            let nextEmptyRow = 6;
            while (worksheet.getRow(nextEmptyRow).getCell(2).value) {
                nextEmptyRow++;
            }
            foundRowIndex = nextEmptyRow;
            // Pre-fill Navire and Voyage
            worksheet.getRow(foundRowIndex).getCell(2).value = voyage.navire.nomNavire;
            worksheet.getRow(foundRowIndex).getCell(3).value = voyage.numVoyage;
        }

        const row = worksheet.getRow(foundRowIndex);

        // 6. Fill Data
        // Col 4: ETA
        row.getCell(4).value = voyage.dateETA;
        // Col 8: ETD
        row.getCell(8).value = voyage.dateETD;

        // Collect actions from all Traitments (aggregating if multiple people track it, 
        // taking the latest closure date for each action category)
        const allActions = voyage.traitements.flatMap(t => t.actions);

        const getClosureDate = (keywords: string[]) => {
            const matches = allActions.filter(a =>
                a.isComplete &&
                a.dateCloture &&
                keywords.some(k => a.action.toLowerCase().includes(k.toLowerCase()))
            );
            if (matches.length === 0) return null;
            // Return the latest closure date if multiple matches
            return matches.sort((a, b) => b.dateCloture!.localeCompare(a.dateCloture!))[0].dateCloture;
        };

        // Mapping based on observations:
        // Col 5: TDI Import
        const tdiImp = getClosureDate(['Top Import', 'TDI Import']);
        if (tdiImp) row.getCell(5).value = tdiImp;

        // Col 6: ZIP Import
        const zipImp = getClosureDate(['Fichier Compressé Import', 'ZIP Import', 'fichier import compresse']);
        if (zipImp) row.getCell(6).value = zipImp;

        // Col 7: Manifeste Import
        const manImp = getClosureDate(['Manifeste Import', 'Douane-PAA']);
        if (manImp) row.getCell(7).value = manImp;

        // Col 9: TDI Export
        const tdiExp = getClosureDate(['Top Export', 'TDI Export']);
        if (tdiExp) row.getCell(9).value = tdiExp;

        // Col 10: ZIP Export
        const zipExp = getClosureDate(['Fichier Compressé Export', 'ZIP Export', 'fichier export compresse']);
        if (zipExp) row.getCell(10).value = zipExp;

        // Col 11: Manifeste Export
        const manExp = getClosureDate(['Manifeste Export']);
        if (manExp) row.getCell(11).value = manExp;

        // 6.5 Calculate Taux de réalisation
        // Based on the set of required actions (Import/Export TDI, ZIP, Manifeste)
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
        row.getCell(12).value = `${rate.toFixed(0)}%`;

        // 7. Commit changes
        row.commit();
        await workbook.xlsx.writeFile(filePath);
        console.log(`Excel updated for voyage ${voyage.navire.nomNavire} / ${voyage.numVoyage} in sheet ${sheetName}`);

    } catch (error) {
        console.error('Error updating Excel:', error);
    }
}
