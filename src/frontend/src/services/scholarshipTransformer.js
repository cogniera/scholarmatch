/**
 * scholarshipTransformer.js — Maps backend (Supabase) scholarship data
 * to the shape the frontend components expect.
 *
 * Backend (Supabase snake_case) → Frontend (camelCase with computed fields)
 *
 * This runs on:
 *   1. Raw scholarship list from GET /scholarships
 *   2. Matched scholarships from GET /scholarships/match
 */

/**
 * Default placeholder images for scholarships missing logo/banner.
 */
const DEFAULT_LOGO = 'https://ui-avatars.com/api/?background=6366f1&color=fff&size=80&font-size=0.4&bold=true';
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=800&h=450&fit=crop&auto=format';

/**
 * Parse the amount field into a number.
 * Handles strings like "$25,000", "up to $15,000", "Varies", 0, etc.
 */
function parseAmount(amount) {
    if (typeof amount === 'number') return amount;
    if (!amount || typeof amount !== 'string') return 0;
    const digits = amount.replace(/[^0-9]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

/**
 * Extract tags from eligibility text and academic level.
 */
function buildTags(scholarship) {
    const tags = [];

    // Academic level → tags
    const level = scholarship.academic_level || '';
    if (level) {
        level.split(',').forEach(l => {
            const t = l.trim();
            if (t && !tags.includes(t)) tags.push(t);
        });
    }

    // Program → tag
    const program = scholarship.program || '';
    if (program && program !== 'All') {
        tags.push(program);
    }

    // Location → tag
    if (scholarship.location) {
        tags.push(scholarship.location);
    }

    // Financial need → tag
    if (scholarship.financial_need_required) {
        tags.push('Financial Need');
    }

    return tags.slice(0, 5); // Cap at 5 tags
}

/**
 * Transform a single raw Supabase scholarship record into the
 * shape that ScholarshipCard, ScholarshipModal, and DashboardHome expect.
 *
 * @param {object} raw - Raw scholarship from Supabase
 * @param {object} [matchData] - Optional match data from /scholarships/match
 * @returns {object} Frontend-shaped scholarship
 */
export function transformScholarship(raw, matchData = null) {
    const name = raw.title || raw.name || 'Untitled Scholarship';
    const organization = raw.provider || raw.organization || 'Unknown';

    // Scale match_score from the 0-7 engine score to a 0-100 percentage
    const rawScore = matchData?.match_score ?? 0;
    const maxPossibleScore = 7; // 2 + 2 + 1 + 1 + 1 from matching.py
    const matchScore = matchData
        ? Math.round((rawScore / maxPossibleScore) * 100)
        : Math.round(Math.random() * 30 + 50); // Fallback: random 50-80 for unmatched browsing

    // Build AI analysis from match data
    const aiAnalysis = matchData
        ? {
            whyYouQualify: matchData.match_reasons || [],
            requirementsMet: matchData.match_reasons || [],
            requirementsMissing: [],
            improvementTip: matchData.ai_explanation || 'Complete your profile to improve matching accuracy.',
        }
        : {
            whyYouQualify: ['Profile analysis pending'],
            requirementsMet: [],
            requirementsMissing: [],
            improvementTip: 'Sign in and complete your profile for personalized matching.',
        };

    return {
        // Identity
        id: raw.id || `sch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        organization,

        // Financial
        amount: parseAmount(raw.amount),
        currency: 'CAD',

        // Dates
        deadline: raw.deadline || 'Not specified',

        // Images — prefer camelCase if already present, fallback to snake_case, then defaults
        logoUrl: raw.logoUrl || raw.logo_url || `${DEFAULT_LOGO}&name=${encodeURIComponent(organization.slice(0, 2))}`,
        bannerUrl: raw.bannerUrl || raw.image_url || DEFAULT_BANNER,

        // Matching
        matchScore,
        tags: raw.tags || buildTags(raw),

        // Eligibility
        eligibility: {
            minGpa: raw.gpa_requirement || 0,
            programs: raw.program ? [raw.program] : null,
            year: null,
            location: raw.location || null,
        },

        // AI
        aiAnalysis,

        // Links
        applicationUrl: raw.link || raw.application_url || '#',

        // Documents (not available from scraper yet)
        requiredDocuments: raw.requiredDocuments || ['Transcript', 'Resume'],
    };
}

/**
 * Transform a list of raw Supabase scholarships (from GET /scholarships).
 */
export function transformScholarshipList(rawList) {
    return rawList.map(raw => transformScholarship(raw));
}

/**
 * Transform the response from GET /scholarships/match.
 * The backend returns: { total, matches: [{ scholarship, match_score, match_reasons, ai_explanation }] }
 */
export function transformMatchedScholarships(matchResponse) {
    if (!matchResponse?.matches) return [];
    return matchResponse.matches.map(m =>
        transformScholarship(m.scholarship, m)
    );
}
