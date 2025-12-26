/**
 * Vietnamese Pronoun System - Age & Gender Validation
 * Ensures at least Gender OR Age exists for accurate pronoun logic
 */

/**
 * Validates that at least Gender OR Age exists
 * @param gender - Gender value (string or null)
 * @param age - Age value (number or null)
 * @param entityType - 'Character' or 'User' for error message
 * @returns Validation result with error message if invalid
 */
export function validateAgeOrGender(
    gender: string | null | undefined,
    age: number | null | undefined,
    entityType: 'Character' | 'User'
): { valid: boolean; error?: string } {
    // At least one must exist
    if (gender || (age !== null && age !== undefined)) {
        return { valid: true }
    }

    // Both missing - return error
    return {
        valid: false,
        error: `Vui lòng nhập ít nhất Giới tính HOẶC Tuổi để AI xưng hô chính xác cho ${entityType}`
    }
}

/**
 * Validates age is within acceptable range (18-99)
 * @param age - Age value to validate
 * @returns Validation result with error message if invalid
 */
export function validateAgeRange(
    age: number | null | undefined
): { valid: boolean; error?: string } {
    // Null/undefined is OK (nullable field)
    if (age === null || age === undefined) {
        return { valid: true }
    }

    // Check minimum age
    if (age < 18) {
        return {
            valid: false,
            error: 'Tuổi tối thiểu là 18'
        }
    }

    // Check maximum age
    if (age > 99) {
        return {
            valid: false,
            error: 'Tuổi tối đa là 99'
        }
    }

    return { valid: true }
}
