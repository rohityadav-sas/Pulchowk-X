/**
 * Bikram Sambat Calendar Utilities for Nepal Academic Year
 * 
 * Pulchowk Campus Academic Calendar:
 * - Odd semesters (1, 3, 5, 7, 9): Start on Baisakh 17 BS
 * - Even semesters (2, 4, 6, 8, 10): Start on Mangsir 15 BS
 */

// Nepali months days for each year (2076-2090 BS)
// Each array has 12 elements representing days in each month
const BS_CALENDAR_DATA: Record<number, number[]> = {
    2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2077: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2078: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2079: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2080: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
    2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2083: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
    2084: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2085: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2086: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
    2087: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
    2088: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
    2089: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
    2090: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
};

// Reference point: 2076/01/01 BS = 2019/04/14 AD
const BS_REFERENCE = { year: 2076, month: 1, day: 1 };
const AD_REFERENCE = new Date(2019, 3, 14); // Month is 0-indexed

export interface BSDate {
    year: number;
    month: number; // 1-12 (Baisakh=1, Mangsir=8)
    day: number;
}

/**
 * Convert Bikram Sambat date to Gregorian (AD) date
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
    let totalDays = 0;

    // Days from reference year to target year
    for (let year = BS_REFERENCE.year; year < bsYear; year++) {
        const monthDays = BS_CALENDAR_DATA[year] || BS_CALENDAR_DATA[2080]; // Fallback
        totalDays += monthDays.reduce((sum, days) => sum + days, 0);
    }

    // Days in target year up to target month
    const targetYearMonths = BS_CALENDAR_DATA[bsYear] || BS_CALENDAR_DATA[2080];
    for (let month = 1; month < bsMonth; month++) {
        totalDays += targetYearMonths[month - 1];
    }

    // Add remaining days
    totalDays += bsDay - 1;

    // Create result date from reference
    const result = new Date(AD_REFERENCE);
    result.setDate(result.getDate() + totalDays);
    return result;
}

/**
 * Convert Gregorian (AD) date to Bikram Sambat date
 */
export function adToBs(adDate: Date): BSDate {
    const diffTime = adDate.getTime() - AD_REFERENCE.getTime();
    let remainingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let bsYear = BS_REFERENCE.year;
    let bsMonth = 1;
    let bsDay = 1;

    // Find year
    while (remainingDays > 0) {
        const yearMonths = BS_CALENDAR_DATA[bsYear] || BS_CALENDAR_DATA[2080];
        const yearDays = yearMonths.reduce((sum, days) => sum + days, 0);

        if (remainingDays >= yearDays) {
            remainingDays -= yearDays;
            bsYear++;
        } else {
            break;
        }
    }

    // Find month
    const monthDays = BS_CALENDAR_DATA[bsYear] || BS_CALENDAR_DATA[2080];
    while (remainingDays > 0 && bsMonth <= 12) {
        if (remainingDays >= monthDays[bsMonth - 1]) {
            remainingDays -= monthDays[bsMonth - 1];
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

    const currentBS = adToBs(currentDate);
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
 * Get semester end date based on start date
 */
export function getSemesterEndDate(semesterStartDate: Date, semesterNumber: number): Date {
    const startBS = adToBs(semesterStartDate);
    const isOddSemester = semesterNumber % 2 === 1;

    if (isOddSemester) {
        // Odd semester ends on Mangsir 14 of same year
        return getEvenSemesterStartDate(startBS.year);
    } else {
        // Even semester ends on Baisakh 16 of next year
        return getOddSemesterStartDate(startBS.year + 1);
    }
}
