/**
 * Bikram Sambat Calendar Utilities for Nepal Academic Year
 * Native implementation without external dependencies for deployment compatibility
 * 
 * Pulchowk Campus Academic Calendar:
 * - Odd semesters (1, 3, 5, 7, 9): Start on Baisakh 17 BS
 * - Even semesters (2, 4, 6, 8, 10): Start on Mangsir 15 BS
 */

// BS calendar data: days in each month for years 1978-2099 BS
// Format: [year, month1Days, month2Days, ..., month12Days]
const BS_CALENDAR_DATA: Record<number, number[]> = {
    2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
    2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
    2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
    2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
    2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
    2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
    2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
    2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
    2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
    2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
    2096: [30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2097: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
    2098: [31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31],
    2099: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
};

// Reference point: BS 2070/01/01 = AD 2013/04/14
const BS_REF_YEAR = 2070;
const AD_REF_DATE = new Date(2013, 3, 14); // April 14, 2013

export interface BSDate {
    year: number;
    month: number; // 1-12 (Baisakh=1, Mangsir=8)
    day: number;
}

/**
 * Get total days in a BS year
 */
function getBsYearDays(year: number): number {
    const months = BS_CALENDAR_DATA[year];
    if (!months) {
        // Fallback for years outside data range - use 2080 as template
        return BS_CALENDAR_DATA[2080].reduce((sum, days) => sum + days, 0);
    }
    return months.reduce((sum, days) => sum + days, 0);
}

/**
 * Get days in a specific BS month
 */
function getBsMonthDays(year: number, month: number): number {
    const months = BS_CALENDAR_DATA[year] || BS_CALENDAR_DATA[2080];
    return months[month - 1];
}

/**
 * Convert Bikram Sambat date to Gregorian (AD) date
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
    let totalDays = 0;

    // Days from reference year to target year
    for (let year = BS_REF_YEAR; year < bsYear; year++) {
        totalDays += getBsYearDays(year);
    }

    // Days in target year up to target month
    for (let month = 1; month < bsMonth; month++) {
        totalDays += getBsMonthDays(bsYear, month);
    }

    // Add remaining days
    totalDays += bsDay - 1;

    // Create result date from reference
    const result = new Date(AD_REF_DATE);
    result.setDate(result.getDate() + totalDays);
    return result;
}

/**
 * Convert Gregorian (AD) date to Bikram Sambat date
 */
export function adToBs(adDate: Date): BSDate {
    const diffTime = adDate.getTime() - AD_REF_DATE.getTime();
    let remainingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let bsYear = BS_REF_YEAR;
    let bsMonth = 1;
    let bsDay = 1;

    // Find year
    while (remainingDays > 0) {
        const yearDays = getBsYearDays(bsYear);
        if (remainingDays >= yearDays) {
            remainingDays -= yearDays;
            bsYear++;
        } else {
            break;
        }
    }

    // Find month
    while (remainingDays > 0 && bsMonth <= 12) {
        const monthDays = getBsMonthDays(bsYear, bsMonth);
        if (remainingDays >= monthDays) {
            remainingDays -= monthDays;
            bsMonth++;
        } else {
            break;
        }
    }

    bsDay = remainingDays + 1;

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
