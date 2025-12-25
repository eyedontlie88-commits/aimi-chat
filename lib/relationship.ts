import { PrismaClient } from '@prisma/client'

// ============================================
// Constants
// ============================================

// Stage thresholds (based on 0-5000 affection points) - HARDCORE MODE
export const STAGE_THRESHOLDS = {
    STRANGER: { min: -9, max: 10 },      // -9 to 10 (BROKEN is <= -10)
    ACQUAINTANCE: { min: 11, max: 100 },
    CRUSH: { min: 101, max: 1000 },       // Renamed from FRIEND
    DATING: { min: 1001, max: 3000 },
    COMMITTED: { min: 3001, max: 5000 },
} as const

const STAGE_ORDER = ['STRANGER', 'ACQUAINTANCE', 'CRUSH', 'DATING', 'COMMITTED'] as const
type StageType = typeof STAGE_ORDER[number]

// Hysteresis margins
const HYSTERESIS_UP = 2
const HYSTERESIS_DOWN = 5

// Cooldown between stage changes (message count)
const STAGE_COOLDOWN = 10

// ============================================
// Emotional Momentum System Constants
// ============================================

// Trust-Debt Constants
const DEBT_ACCRUAL_RATE = 1.5      // Debt grows 1.5× faster than affection drops
const DEBT_REPAY_RATE = 0.6        // Repaying debt is slow (60% of positive impact)
const PROMOTION_DEBT_THRESHOLD = 5.0  // Max debt allowed for promotion

// Stage-dependent recovery multipliers (balanced for micro-progression)
const STAGE_RECOVERY_MULTIPLIERS: Record<string, number> = {
    STRANGER: 0.6,      // Slower at early stages
    ACQUAINTANCE: 0.8,
    CRUSH: 1.0,         // Normal speed
    DATING: 1.2,
    COMMITTED: 1.5,     // Faster at committed stage
    UNDEFINED: 0.8,
}

// Emotional Inertia
const INERTIA = 0.7  // 70% of previous momentum retained
const PROMOTION_MOMENTUM_MIN = 0.2  // Minimum positive momentum for promotion

// Anti-Apology-Spam
const APOLOGY_KEYWORDS = [
    'xin lỗi', 'sorry', 'tha lỗi', 'tha thứ', 'bỏ qua',
    'anh sai', 'em sai', 'lỗi của', 'hối hận', 'ân hận',
    'forgive', 'apologize', 'my bad', 'i was wrong'
]
const APOLOGY_SPAM_THRESHOLD = 3
const APOLOGY_SPAM_PENALTY = 0.3  // 30% effectiveness when spamming

// ============================================
// Intimacy Level (visual indicator)
// ============================================

export const INTIMACY_LEVELS = {
    STRANGER: 0,
    ACQUAINTANCE: 1,
    FRIEND: 2,
    LOVER: 3,
    SOULMATE: 4
}

export function calcIntimacyLevel(points: number): number {
    // Handle negative points (BROKEN state)
    if (points < 0) return 0
    // Updated for 5000-point scale
    if (points >= 3001) return 4  // COMMITTED
    if (points >= 1001) return 3  // DATING
    if (points >= 101) return 2  // CRUSH/FRIEND
    if (points >= 11) return 1   // ACQUAINTANCE
    return 0  // STRANGER
}

export const INTIMACY_LABELS = ['Người lạ', 'Người quen', 'Bạn bè', 'Người yêu', 'Tri kỷ']
export const INTIMACY_EMOJIS = ['🙂', '👋', '🤝', '💖', '💍']

// ============================================
// Helper Functions
// ============================================

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
}

function getStageIndex(stage: string): number {
    const idx = STAGE_ORDER.indexOf(stage as StageType)
    return idx >= 0 ? idx : 0
}

function getStageForPoints(points: number): StageType {
    if (points >= STAGE_THRESHOLDS.COMMITTED.min) return 'COMMITTED'
    if (points >= STAGE_THRESHOLDS.DATING.min) return 'DATING'
    if (points >= STAGE_THRESHOLDS.CRUSH.min) return 'CRUSH'
    if (points >= STAGE_THRESHOLDS.ACQUAINTANCE.min) return 'ACQUAINTANCE'
    return 'STRANGER'
}

function containsApology(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    return APOLOGY_KEYWORDS.some(keyword => lowerMessage.includes(keyword))
}

function simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
}

// ============================================
// Main Update Function
// ============================================

interface UpdateRelationshipResult {
    affectionPoints: number
    intimacyLevel: number
    stage: string
    messageCount: number
    lastActiveAt: Date
    stageChanged?: boolean
    previousStage?: string
    // AI Breakup feature
    isBroken?: boolean
    // Debug info
    trustDebt?: number
    emotionalMomentum?: number
}

/**
 * Update relationship stats with emotional momentum system
 * 
 * @param prisma Prisma client to use (from auth context)
 * @param characterId Target character
 * @param impactScore Impact score from -2 to +2 (from LLM)
 * @param userMessage User's message text (for apology detection)
 */
export async function updateRelationshipStats(
    prisma: PrismaClient,
    characterId: string,
    impactScore: number,
    userMessage: string = ''
): Promise<UpdateRelationshipResult> {
    const config = await prisma.relationshipConfig.findUnique({
        where: { characterId }
    })

    if (!config) {
        throw new Error(`RelationshipConfig not found for character: ${characterId}`)
    }

    const now = new Date()
    const previousStage = config.stage
    const previousAffection = config.affectionPoints

    // Current state
    let trustDebt = config.trustDebt || 0
    let emotionalMomentum = config.emotionalMomentum || 0
    let apologyCount = config.apologyCount || 0
    const prevMomentumSign = emotionalMomentum >= 0 ? 1 : -1

    // ============================================
    // Step 0: Time-Gap Decay (Option A)
    // ============================================
    const lastActiveAt = config.lastActiveAt || now
    const hoursSinceLastActive = (now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastActive >= 24) {
        // Reset apology spam detection after 24h gap
        const prevApologyCount = apologyCount
        apologyCount = 0

        // Apply momentum decay based on gap duration
        const prevMomentum = emotionalMomentum
        if (hoursSinceLastActive >= 72) {
            emotionalMomentum *= 0.7  // 72h+ gap: 70% retained
        } else {
            emotionalMomentum *= 0.9  // 24h+ gap: 90% retained
        }

        // Clamp to prevent sign flip (never cross 0)
        if (prevMomentumSign < 0 && emotionalMomentum > 0) {
            emotionalMomentum = 0
        } else if (prevMomentumSign > 0 && emotionalMomentum < 0) {
            emotionalMomentum = 0
        }

        console.log(
            `[Relationship] ⏰ Time gap detected: ${hoursSinceLastActive.toFixed(1)}h | ` +
            `apology: ${prevApologyCount}→0 | ` +
            `momentum: ${prevMomentum.toFixed(2)}→${emotionalMomentum.toFixed(2)}`
        )
    }

    // ============================================
    // Step 1: Anti-Apology-Spam Detection
    // ============================================
    const isApology = containsApology(userMessage)
    let effectiveImpact = impactScore

    if (isApology) {
        apologyCount++
        if (apologyCount >= APOLOGY_SPAM_THRESHOLD && impactScore > 0) {
            effectiveImpact = impactScore * APOLOGY_SPAM_PENALTY
            console.log(`[Relationship] 🚫 Apology spam detected (count=${apologyCount}), impact ${impactScore} → ${effectiveImpact.toFixed(2)}`)
        }
    } else {
        // Decay apology count if not apologizing
        apologyCount = Math.max(0, apologyCount - 1)
    }

    // ============================================
    // Step 2: Emotional Momentum (Continuous Inertia)
    // ============================================
    const normalizedImpact = effectiveImpact / 2.0  // Range -1 to +1
    const newMomentum = (emotionalMomentum * INERTIA) + (normalizedImpact * (1 - INERTIA))
    emotionalMomentum = clamp(newMomentum, -1, 1)  // Safety clamp

    // Apply momentum dampening on recovery from negative
    if (emotionalMomentum < 0 && effectiveImpact > 0) {
        // Recovering from negative momentum - dampen positive impact
        const dampeningFactor = 1 + emotionalMomentum  // Range 0 to 1 when momentum is -1 to 0
        effectiveImpact = effectiveImpact * Math.max(0.3, dampeningFactor)
        console.log(`[Relationship] 🔻 Momentum dampening (momentum=${emotionalMomentum.toFixed(2)}), impact reduced to ${effectiveImpact.toFixed(2)}`)
    }

    // ============================================
    // Step 3: Stage-Dependent Scaling
    // ============================================
    const stageMultiplier = STAGE_RECOVERY_MULTIPLIERS[config.stage] || 0.5
    let scaledImpact: number

    if (effectiveImpact > 0) {
        // Positive impact: apply stage-dependent recovery (NO base multiplier for micro-progression)
        scaledImpact = effectiveImpact * stageMultiplier
    } else {
        // Negative impact: full speed decay (NO base multiplier)
        scaledImpact = effectiveImpact * 1.0
    }

    // ============================================
    // Step 4: Trust-Debt Update
    // ============================================
    if (effectiveImpact < 0) {
        // Negative impact accrues debt faster
        trustDebt += Math.abs(scaledImpact) * DEBT_ACCRUAL_RATE
        console.log(`[Relationship] 📈 Trust debt increased: +${(Math.abs(scaledImpact) * DEBT_ACCRUAL_RATE).toFixed(2)} → ${trustDebt.toFixed(2)}`)
    } else if (effectiveImpact > 0 && trustDebt > 0) {
        // Positive impact repays debt slowly
        const repayment = scaledImpact * DEBT_REPAY_RATE
        trustDebt = Math.max(0, trustDebt - repayment)
        console.log(`[Relationship] 📉 Trust debt repaid: -${repayment.toFixed(2)} → ${trustDebt.toFixed(2)}`)
    }

    // ============================================
    // Step 5: Apply Affection Change
    // ============================================
    // 💔 AI BREAKUP: Allow negative affection down to -10, max 5000
    const newAffectionPoints = clamp(previousAffection + scaledImpact, -100, 5000)
    const newIntimacyLevel = calcIntimacyLevel(newAffectionPoints)
    const newMessageCount = config.messageCount + 1

    // 💔 BROKEN STATE DETECTION
    const isBroken = newAffectionPoints <= -10

    // ============================================
    // Step 6: Stage Progression with Momentum Gates
    // ============================================
    let newStage = config.stage
    let stageChanged = false

    // 💔 BROKEN overrides all stage logic
    if (isBroken) {
        newStage = 'BROKEN'
        stageChanged = previousStage !== 'BROKEN'
        console.log('[Relationship] 💔 BROKEN! Affection hit -10. Game Over.')
    }

    if (config.stage !== 'UNDEFINED' && !isBroken) {
        const currentStageIdx = getStageIndex(config.stage)
        const naturalStage = getStageForPoints(newAffectionPoints)
        const naturalStageIdx = getStageIndex(naturalStage)

        const messagesSinceStageChange = newMessageCount - (config.lastStageChangeAt || 0)
        const cooldownPassed = messagesSinceStageChange >= STAGE_COOLDOWN

        if (cooldownPassed) {
            // === PROMOTION (going up) ===
            if (naturalStageIdx > currentStageIdx) {
                const targetStage = STAGE_ORDER[currentStageIdx + 1]
                const targetThreshold = STAGE_THRESHOLDS[targetStage].min

                // Check ALL promotion requirements
                const meetsAffection = newAffectionPoints >= targetThreshold + HYSTERESIS_UP
                const meetsTrustDebt = trustDebt < PROMOTION_DEBT_THRESHOLD
                const meetsMomentum = emotionalMomentum > PROMOTION_MOMENTUM_MIN

                if (meetsAffection && meetsTrustDebt && meetsMomentum) {
                    newStage = targetStage
                    stageChanged = true
                    console.log(`[Relationship] ⭐ PROMOTED to ${newStage}!`)
                } else {
                    console.log(`[Relationship] ⏳ Promotion blocked: affection=${meetsAffection}, debt=${meetsTrustDebt} (${trustDebt.toFixed(1)}), momentum=${meetsMomentum} (${emotionalMomentum.toFixed(2)})`)
                }
            }
            // === DEMOTION (going down) ===
            else if (naturalStageIdx < currentStageIdx && currentStageIdx > 0) {
                const currentStageName = STAGE_ORDER[currentStageIdx]
                const currentThreshold = STAGE_THRESHOLDS[currentStageName].min

                if (newAffectionPoints <= currentThreshold - HYSTERESIS_DOWN) {
                    newStage = STAGE_ORDER[currentStageIdx - 1]
                    stageChanged = true
                    console.log(`[Relationship] 💔 DEMOTED to ${newStage}`)
                }
            }
        }
    }

    // ============================================
    // Logging
    // ============================================
    console.log(
        `[Relationship] ` +
        `stage=${previousStage}→${newStage} ` +
        `affection=${previousAffection}→${Math.round(newAffectionPoints)} (${scaledImpact >= 0 ? '+' : ''}${scaledImpact.toFixed(1)}) ` +
        `debt=${trustDebt.toFixed(1)} ` +
        `momentum=${emotionalMomentum.toFixed(2)} ` +
        `apology=${apologyCount}` +
        (stageChanged ? ' ⭐ STAGE CHANGED!' : '')
    )

    // ============================================
    // Persist to Database
    // ============================================
    await prisma.relationshipConfig.update({
        where: { characterId },
        data: {
            affectionPoints: Math.round(newAffectionPoints),
            intimacyLevel: newIntimacyLevel,
            stage: newStage,
            lastActiveAt: now,
            messageCount: newMessageCount,
            trustDebt,
            emotionalMomentum,
            apologyCount,
            lastMessageHash: simpleHash(userMessage),
            ...(stageChanged && { lastStageChangeAt: newMessageCount }),
        }
    })

    return {
        affectionPoints: Math.round(newAffectionPoints),
        intimacyLevel: newIntimacyLevel,
        stage: newStage,
        messageCount: newMessageCount,
        lastActiveAt: now,
        stageChanged,
        previousStage: stageChanged ? previousStage : undefined,
        isBroken, // 💔 AI Breakup flag
        trustDebt,
        emotionalMomentum,
    }
}
