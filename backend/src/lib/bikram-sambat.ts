/**
 * Bikram Sambat Calendar Utilities for Nepal Academic Year
 * Uses @sbmdkl/nepali-date-converter for accurate BS-AD conversions
 * 
 * Pulchowk Campus Academic Calendar:
 * - Odd semesters (1, 3, 5, 7, 9): Start on Baisakh 17 BS
 * - Even semesters (2, 4, 6, 8, 10): Start on Mangsir 15 BS
 */

// Use default import for ESM compatibility
import nepaliDateConverter from '@sbmdkl/nepali-date-converter';
const { adToBs: pkgAdToBs, bsToAd: pkgBsToAd } = nepaliDateConverter;

export interface BSDate {
    year: number;
    month: number; // 1-12 (Baisakh=1, Mangsir=8)
    day: number;
}

/**
 * Convert Bikram Sambat date to Gregorian (AD) date
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
    // Package expects YYYY-MM-DD format
    const bsDateStr = `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(bsDay).padStart(2, '0')}`;
    const adDateStr = pkgBsToAd(bsDateStr); // Returns "YYYY-MM-DD"

    const [year, month, day] = adDateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed in JS Date
}

/**
 * Convert Gregorian (AD) date to Bikram Sambat date
 */
export function adToBs(adDate: Date): BSDate {
    const year = adDate.getFullYear();
    const month = adDate.getMonth() + 1; // Convert from 0-indexed
    const day = adDate.getDate();

    // Package expects YYYY-MM-DD format
    const adDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const bsDateStr = pkgAdToBs(adDateStr); // Returns "YYYY-MM-DD"

    const [bsYear, bsMonth, bsDay] = bsDateStr.split('-').map(Number);
    return { year: bsYear, month: bsMonth, day: bsDay };
}

/**
 * Get the AD date for Baisakh 17 (odd semester start) of a given BS year
 */
export function getOddSemesterStartDate(bsYear: number): Date {
    return bsToAd(bsYear, 1, 17); // Baisakh = month 1
}

/**
 * Get the AD date for Mangsir 15 (even semester start) of a given BS year
 */
export function getEvenSemesterStartDate(bsYear: number): Date {
    return bsToAd(bsYear, 8, 15); // Mangsir = month 8
}

/**
 * Calculate current semester based on batch year and current date
 * 
 * @param batchYearBS - The BS batch year (e.g., 079 means 2079)
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
    let semesterStartDate = getOddSemesterStartDate(fullBatchYear);
    let isGraduated = false;

    // First semester starts on Baisakh 17 of batch year
    // Calculate which semester we're currently in
    for (let sem = 1; sem <= totalSemesters; sem++) {
        const isOddSemester = sem % 2 === 1;
        const semYear = fullBatchYear + Math.floor((sem - 1) / 2);

        let semStart: Date;
        let semEnd: Date;

        if (isOddSemester) {
            semStart = getOddSemesterStartDate(semYear);
            semEnd = getEvenSemesterStartDate(semYear);
        } else {
            semStart = getEvenSemesterStartDate(semYear);
            semEnd = getOddSemesterStartDate(semYear + 1);
        }

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
 */
export function getSemesterEndDate(batchYearBS: number, semesterNumber: number): Date {
    // Convert 2-digit year to 4-digit
    const fullBatchYear = batchYearBS < 100 ? 2000 + batchYearBS : batchYearBS;

    const isOddSemester = semesterNumber % 2 === 1;
    const semYear = fullBatchYear + Math.floor((semesterNumber - 1) / 2);

    if (isOddSemester) {
        // Odd semester ends when even semester starts (Mangsir 15 of same year)
        return getEvenSemesterStartDate(semYear);
    } else {
        // Even semester ends when next odd semester starts (Baisakh 17 of next year)
        return getOddSemesterStartDate(semYear + 1);
    }
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
