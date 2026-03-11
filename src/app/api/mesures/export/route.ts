import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ExcelJS from 'exceljs';

const isHolidayCI = (date: Date) => {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  if (d === 1 && m === 1) return true; 
  if (d === 1 && m === 5) return true; 
  if (d === 7 && m === 8) return true; 
  if (d === 15 && m === 8) return true; 
  if (d === 1 && m === 11) return true; 
  if (d === 15 && m === 11) return true; 
  if (d === 25 && m === 12) return true; 

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

  return false;
};

const calculateDeadline = (actionName: string, traitement: any, templates: any[]) => {
  const template = templates.find((t: any) => t.name === actionName);
  if (!template || template.nbreJours == null || !template.evenementId) return null;

  let baseDateStr = null;

  if (template.evenementId === 'ETA' || template.evenementId === 'ETD') {
    if (template.evenementId === 'ETA' && traitement.voyage?.dateETA) {
      baseDateStr = traitement.voyage.dateETA;
    } else if (template.evenementId === 'ETD' && traitement.voyage?.dateETD) {
      baseDateStr = traitement.voyage.dateETD;
    }
  } else {
    const refTemplate = templates.find((t: any) => t.id === template.evenementId);
    if (!refTemplate) return null;

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
  }

  if (!baseDateStr) return null;

  const baseDate = new Date(baseDateStr);
  if (isNaN(baseDate.getTime())) return null;

  const daysToAdd = template.periode === "Avant" ? -template.nbreJours : template.nbreJours;

  const jumpDays = Math.abs(daysToAdd) > 0 ? Math.abs(daysToAdd) - 1 : 0;
  const direction = daysToAdd >= 0 ? 1 : -1;

  if (template.joursOuvrable || template.joursCalendaire) {
    let currentDays = jumpDays;
    while (currentDays > 0) {
      baseDate.setDate(baseDate.getDate() + direction);
      const dayOfWeek = baseDate.getDay();

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHolidayCI(baseDate)) {
        currentDays--;
      }
    }
  } else {
    baseDate.setDate(baseDate.getDate() + (direction * jumpDays));
  }

  return baseDate.toISOString().split('T')[0];
};

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return new Response("Non autorisé", { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');
        const armateur = searchParams.get('armateur') || "OOCL";

        if (!month || !year) {
            return new Response("Paramètres manquants", { status: 400 });
        }

        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

        let voyages = await prisma.voyage.findMany({
            where: {
                dateETA: { gte: startDate, lte: endDate }
            },
            include: {
                navire: true,
                slotteurs: true,
                traitements: { include: { actions: true } }
            },
            orderBy: { dateETA: 'asc' }
        });

        // Filter by armateur
        voyages = voyages.filter(v =>
            v.navire?.armateurCoque === armateur ||
            v.slotteurs?.some(s => s.nom === armateur)
        );

        const actionTemplates = await prisma.actionTemplate.findMany();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Mesure ${month}-${year}`);

        const getActionInfo = (v: any, keywords: string[]) => {
            const allTraitements = v.traitements;
            let bestMatch: { date: string, isOnTime: boolean } | null = null;
            
            for (const t of allTraitements) {
                const matches = t.actions.filter((a: any) =>
                    a.isComplete &&
                    a.dateCloture &&
                    (!a.armateur || a.armateur === armateur) &&
                    keywords.some(k => a.action.toLowerCase().includes(k.toLowerCase()))
                );
                
                if (matches.length > 0) {
                    const sorted = matches.sort((a: any, b: any) => b.dateCloture.localeCompare(a.dateCloture));
                    const action = sorted[0];
                    const dateCloture = action.dateCloture;
                    
                    const deadlineStr = calculateDeadline(action.action, { ...t, voyage: v }, actionTemplates);
                    let isOnTime = true;
                    if (deadlineStr && dateCloture > deadlineStr) {
                        isOnTime = false;
                    }
                    
                    if (!bestMatch || dateCloture > bestMatch.date) {
                        bestMatch = { date: dateCloture, isOnTime };
                    }
                }
            }
            return bestMatch;
        };

        const getActionDateStr = (v: any, keywords: string[]) => {
            const info = getActionInfo(v, keywords);
            if (!info) return "-";
            const [y, m, d] = info.date.split("-");
            return `${d}/${m}/${y}`;
        };

        const calculateRate = (v: any) => {
            const required = [
                ['Top Import', 'TDI Import'],
                ['Fichier Compressé Import', 'ZIP Import', 'fichier import compresse'],
                ['Manifeste Import', 'Douane-PAA'],
                ['Top Export', 'TDI Export'],
                ['Fichier Compressé Export', 'ZIP Export', 'fichier export compresse'],
                ['Manifeste Export']
            ];
            let completedOnTime = 0;
            required.forEach(kw => {
                const info = getActionInfo(v, kw);
                if (info && info.isOnTime) {
                    completedOnTime++;
                }
            });
            return `${((completedOnTime / 6) * 100).toFixed(0)}%`;
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
                getActionDateStr(v, ['Top Import', 'TDI Import']),
                getActionDateStr(v, ['Fichier Compressé Import', 'ZIP Import', 'fichier import compresse']),
                getActionDateStr(v, ['Manifeste Import', 'Douane-PAA']),
                `${etdArr[2]}/${etdArr[1]}/${etdArr[0]}`,
                getActionDateStr(v, ['Top Export', 'TDI Export']),
                getActionDateStr(v, ['Fichier Compressé Export', 'ZIP Export', 'fichier export compresse']),
                getActionDateStr(v, ['Manifeste Export']),
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
