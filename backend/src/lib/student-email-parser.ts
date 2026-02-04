/**
 * Parser for Pulchowk Campus student email format
 * 
 * Email format: (3-digit batch year)(dept code)(3-digit roll number).(first name)@pcampus.edu.np
 * Example: 079bct070.rohit@pcampus.edu.np
 * - 079 = Batch year 2079 BS
 * - bct = Bachelor of Computer Engineering
 * - 070 = Roll number
 * - rohit = First name
 */

// Department codes mapped to faculty slugs and semester counts
// Slugs must match exactly with syllabus.json faculty slugs
export const DEPARTMENT_MAP: Record<string, { slug: string; name: string; semestersCount: number }> = {
    // 4-year programs (8 semesters)
    'bct': { slug: 'computer-engineering-bct', name: 'Computer Engineering', semestersCount: 8 },
    'bce': { slug: 'civil-engineering-bce', name: 'Civil Engineering', semestersCount: 8 },
    'bel': { slug: 'electrical-engineering-bel', name: 'Electrical Engineering', semestersCount: 8 },
    'bex': { slug: 'electronics-and-communication-engineering-bex', name: 'Electronics and Communication Engineering', semestersCount: 8 },
    'bei': { slug: 'electronics-and-information-bei-new', name: 'Electronics and Information Engineering', semestersCount: 8 },
    'bme': { slug: 'mechanical-engineering-bme', name: 'Mechanical Engineering', semestersCount: 8 },
    'bae': { slug: 'aerospace-engineering', name: 'Aerospace Engineering', semestersCount: 8 },
    'bag': { slug: 'agriculture-engineering-bag', name: 'Agricultural Engineering', semestersCount: 8 },
    'bas': { slug: 'automobile-engineering', name: 'Automobile Engineering', semestersCount: 8 },
    'bge': { slug: 'geomatics-engineering', name: 'Geomatics Engineering', semestersCount: 8 },
    'bie': { slug: 'industrial-engineering-bie', name: 'Industrial Engineering', semestersCount: 8 },

    // 5-year programs (10 semesters)
    'barch': { slug: 'architecture-engineering-barch', name: 'Architecture', semestersCount: 10 },
};

export interface ParsedStudentEmail {
    isValid: boolean;
    batchYear?: number;      // 2-digit BS year (e.g., 79)
    fullBatchYear?: number;  // 4-digit BS year (e.g., 2079)
    departmentCode?: string; // e.g., 'bct'
    rollNumber?: number;     // e.g., 70
    firstName?: string;      // e.g., 'rohit'
    facultySlug?: string;    // e.g., 'computer-engineering'
    facultyName?: string;    // e.g., 'Computer Engineering'
    semestersCount?: number; // 8 or 10
}

/**
 * Parse a Pulchowk Campus student email and extract information
 */
export function parseStudentEmail(email: string): ParsedStudentEmail {
    // Validate domain
    if (!email.endsWith('@pcampus.edu.np')) {
        return { isValid: false };
    }

    // Get the local part before @
    const localPart = email.split('@')[0];

    // Pattern: 3-digit year + dept code (2-5 chars) + 3-digit roll + . + name
    // Example: 079bct070.rohit
    const regex = /^(\d{3})([a-z]{2,5})(\d{3})\.([a-z]+)$/i;
    const match = localPart.match(regex);

    if (!match) {
        return { isValid: false };
    }

    const [, yearStr, deptCode, rollStr, firstName] = match;
    const batchYear = parseInt(yearStr, 10);
    const rollNumber = parseInt(rollStr, 10);
    const deptLower = deptCode.toLowerCase();

    // Look up department
    const dept = DEPARTMENT_MAP[deptLower];
    if (!dept) {
        return { isValid: false };
    }

    return {
        isValid: true,
        batchYear,
        fullBatchYear: 2000 + batchYear,
        departmentCode: deptLower,
        rollNumber,
        firstName: firstName.toLowerCase(),
        facultySlug: dept.slug,
        facultyName: dept.name,
        semestersCount: dept.semestersCount,
    };
}

/**
 * Check if an email belongs to a valid Pulchowk Campus student
 */
export function isValidStudentEmail(email: string): boolean {
    return parseStudentEmail(email).isValid;
}

/**
 * Determine user role based on email
 * - Valid student email format → 'student'
 * - Any other @pcampus.edu.np email → 'guest'
 */
export function determineUserRole(email: string): 'student' | 'guest' {
    if (isValidStudentEmail(email)) {
        return 'student';
    }
    return 'guest';
}
