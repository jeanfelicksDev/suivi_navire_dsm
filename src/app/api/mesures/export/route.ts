import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ExcelJS from 'exceljs';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new Response("Non autorisé", { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        if (!month || !year) {
            return new Response("Paramètres manquants", { status: 400 });
        }

        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

        const voyages = await prisma.voyage.findMany({
            where: {
                dateETA: { gte: startDate, lte: endDate }
            },
            include: {
                navire: true,
                traitements: { include: { actions: true } }
            },
            orderBy: { dateETA: 'asc' }
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Mesure ${month}-${year}`);

        // Helper for action dates
        const getActionDate = (v: any, keywords: string[]) => {
            const allActions = v.traitements.flatMap((t: any) => t.actions);
            const matches = allActions.filter((a: any) =>
                a.isComplete && a.dateCloture &&
                keywords.some(k => a.action.toLowerCase().includes(k.toLowerCase()))
            );
            if (matches.length === 0) return "-";
            const sorted = matches.sort((a: any, b: any) => b.dateCloture.localeCompare(a.dateCloture));
            const [y, m, d] = sorted[0].dateCloture.split("-");
            return `${d}/${m}/${y}`;
        };

        const calculateRate = (v: any) => {
            const required = [
                ['Top Import', 'TDI Import'],
                ['Fichier Compressé Import', 'ZIP Import'],
                ['Manifeste Import'],
                ['Top Export', 'TDI Export'],
                ['Fichier Compressé Export', 'ZIP Export'],
                ['Manifeste Export']
            ];
            let completed = 0;
            required.forEach(kw => { if (getActionDate(v, kw) !== "-") completed++; });
            return `${((completed / 6) * 100).toFixed(0)}%`;
        };

        // Title
        worksheet.mergeCells('A1:L1');
        const titleRow = worksheet.getRow(1);
        titleRow.getCell(1).value = `MESURE MENSUELLE - ${month}/${year}`;
        titleRow.getCell(1).font = { bold: true, size: 14 };
        titleRow.getCell(1).alignment = { horizontal: 'center' };

        // Headers
        worksheet.getRow(3).values = [
            'NAVIRE', 'VOYAGE', 'ETA', 'TDI IMP', 'ZIP IMP', 'MANIF. IMP',
            'ETD', 'TDI EXP', 'ZIP EXP', 'MANIF. EXP', 'REAL (%)', 'OBSERVATIONS'
        ];
        worksheet.getRow(3).font = { bold: true };
        worksheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

        // Data
        voyages.forEach((v, index) => {
            const rowNumber = index + 4;
            const etaArr = v.dateETA.split("-");
            const etdArr = v.dateETD.split("-");

            const rowValues = [
                v.navire.nomNavire,
                v.numVoyage,
                `${etaArr[2]}/${etaArr[1]}/${etaArr[0]}`,
                getActionDate(v, ['Top Import', 'TDI Import']),
                getActionDate(v, ['Fichier Compressé Import', 'ZIP Import']),
                getActionDate(v, ['Manifeste Import', 'Douane-PAA']),
                `${etdArr[2]}/${etdArr[1]}/${etdArr[0]}`,
                getActionDate(v, ['Top Export', 'TDI Export']),
                getActionDate(v, ['Fichier Compressé Export', 'ZIP Export']),
                getActionDate(v, ['Manifeste Export']),
                calculateRate(v),
                ''
            ];
            worksheet.getRow(rowNumber).values = rowValues;
        });

        // Column widths
        worksheet.columns = [
            { width: 20 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 },
            { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 10 }, { width: 30 }
        ];

        const buffer = await workbook.xlsx.writeBuffer();

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="Mesure_${month}_${year}.xlsx"`
            }
        });
    } catch (error) {
        console.error('Excel Export Error:', error);
        return new Response("Internal Server Error", { status: 500 });
    }
}
