/**
 * Bikram Sambat Calendar Utilities for Nepal Academic Year
 * Uses nepali-date-converter package for accurate BS-AD conversions
 * 
 * Pulchowk Campus Academic Calendar:
 * 
 * BATCH 2079 (COVID Exception):
 * - 1st semester started Baisakh 17, 2080 (delayed due to COVID)
 * - Odd semesters (1, 3, 5, 7): Start on Baisakh 17
 * - Even semesters (2, 4, 6, 8): Start on Mangsir 15
 * 
 * BATCH 2080 onwards (Normal):
 * - 1st semester starts Mangsir 15 of the batch year
 * - Odd semesters (1, 3, 5, 7): Start on Mangsir 15
 * - Even semesters (2, 4, 6, 8): Start on Baisakh 17
 */

import NepaliDateModule from 'nepali-date-converter';

// Handle both ESM default export and CJS module.exports
const NepaliDate = (NepaliDateModule as any).default || NepaliDateModule;

export interface BSDate {
    year: number;
    month: number; // 1-12 (Baisakh=1, Mangsir=8)
    day: number;
}

/**
 * Convert Bikram Sambat date to Gregorian (AD) date
 * Note: NepaliDate uses 0-indexed months (0-11), but our interface uses 1-indexed (1-12)
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
    // NepaliDate constructor takes (year, monthIndex, date) where monthIndex is 0-11
    const nepaliDate = new NepaliDate(bsYear, bsMonth - 1, bsDay);
    return nepaliDate.toJsDate();
}

/**
 * Convert Gregorian (AD) date to Bikram Sambat date
 */
export function adToBs(adDate: Date): BSDate {
    const nepaliDate = NepaliDate.fromAD(adDate);
    const bs = nepaliDate.getBS();
    // getBS returns month as 0-indexed, convert to 1-indexed
    return { year: bs.year, month: bs.month + 1, day: bs.date };
}

/**
 * Get the AD date for Baisakh 17 of a given BS year
 */
export function getBaisakh17(bsYear: number): Date {
    return bsToAd(bsYear, 1, 17); // Baisakh = month 1
}

/**
 * Get the AD date for Mangsir 15 of a given BS year
 */
export function getMangsir15(bsYear: number): Date {
    return bsToAd(bsYear, 8, 15); // Mangsir = month 8
}

/**
 * Check if a batch is affected by COVID (batch 2079)
 * These batches have different semester start dates
 */
function isCOVIDBatch(fullBatchYear: number): boolean {
    return fullBatchYear === 2079;
}

/**
 * Get semester start date for a specific semester of a batch
 * 
 * For COVID batch (2079):
 *   - Odd semesters start on Baisakh 17
 *   - Even semesters start on Mangsir 15
 *   - First semester started Baisakh 17, 2080
 * 
 * For normal batches (2080+):
 *   - Odd semesters start on Mangsir 15
 *   - Even semesters start on Baisakh 17
 *   - First semester starts Mangsir 15 of batch year
 */
function getSemesterStartDate(fullBatchYear: number, semesterNumber: number): Date {
    const isOddSemester = semesterNumber % 2 === 1;

    if (isCOVIDBatch(fullBatchYear)) {
        // COVID batch (2079): 1st sem started Baisakh 17, 2080
        // Odd sems: Baisakh 17, Even sems: Mangsir 15
        const semYear = 2080 + Math.floor((semesterNumber - 1) / 2);
        return isOddSemester ? getBaisakh17(semYear) : getMangsir15(semYear);
    } else {
        // Normal batches (2080+): 1st sem starts Mangsir 15 of batch year
        // Odd sems: Mangsir 15, Even sems: Baisakh 17
        if (isOddSemester) {
            // Sem 1: Mangsir 2080, Sem 3: Mangsir 2081, Sem 5: Mangsir 2082, etc.
            const semYear = fullBatchYear + Math.floor((semesterNumber - 1) / 2);
            return getMangsir15(semYear);
        } else {
            // Sem 2: Baisakh 2081, Sem 4: Baisakh 2082, Sem 6: Baisakh 2083, etc.
            const semYear = fullBatchYear + Math.floor(semesterNumber / 2);
            return getBaisakh17(semYear);
        }
    }
}

/**
 * Calculate current semester based on batch year and current date
 * 
 * @param batchYearBS - The BS batch year from email (e.g., 079 = batch 2079)
 * @param totalSemesters - Total semesters for the program (8 for most, 10 for architecture)
 * @param currentDate - The current date to calculate against
 * @returns Object with current semester and semester start date
 */
export function calculateCurrentSemester(
    batchYearBS: number,
    totalSemesters: number = 8,
    currentDate: Date = new Date()
): { semester: number; semesterStartDate: Date; isGraduated: boolean } {
    // Convert 2-digit year to 4-digit (e.g., 79 -> 2079)
    const fullBatchYear = batchYearBS < 100 ? 2000 + batchYearBS : batchYearBS;

    let semester = 1;
    let semesterStartDate = getSemesterStartDate(fullBatchYear, 1);
    let isGraduated = false;

    // Calculate which semester we're currently in
    for (let sem = 1; sem <= totalSemesters; sem++) {
        const semStart = getSemesterStartDate(fullBatchYear, sem);
        const semEnd = getSemesterStartDate(fullBatchYear, sem + 1);

        if (currentDate >= semStart && currentDate < semEnd) {
            semester = sem;
            semesterStartDate = semStart;
            break;
        } else if (currentDate >= semEnd) {
            semester = Math.min(sem + 1, totalSemesters);
            semesterStartDate = semEnd;

            // Check if graduated (past last semester)
            if (sem === totalSemesters && currentDate >= semEnd) {
                isGraduated = true;
            }
        }
    }

    return { semester, semesterStartDate, isGraduated };
}

/**
 * Get semester end date based on batch year and semester number
 * End date is when the next semester starts
 */
export function getSemesterEndDate(batchYearBS: number, semesterNumber: number): Date {
    // Convert 2-digit year to 4-digit
    const fullBatchYear = batchYearBS < 100 ? 2000 + batchYearBS : batchYearBS;

    // End date is when the next semester starts
    return getSemesterStartDate(fullBatchYear, semesterNumber + 1);
}

/**
 * Format a BS date for display
 */
export function formatBSDate(bsDate: BSDate): string {
    const months = [
        'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
        'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
        'Poush', 'Magh', 'Falgun', 'Chaitra'
    ];
    return `${months[bsDate.month - 1]} ${bsDate.day}, ${bsDate.year}`;
}
