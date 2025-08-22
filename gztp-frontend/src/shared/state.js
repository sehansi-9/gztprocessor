import { fetchMindepCommitted, fetchMindepDrafts, fetchPersonCommitted, fetchPersonDrafts, fetchMindepState, fetchPersonState, setWarning } from './api';

// Fetch committed and draft gazettes and merge metadata consistently for both scopes
export const fetchGazettesMeta = async (scope, startDate, endDate) => {
    const [committedRes, draftsRes] = scope === 'mindep'
        ? [await fetchMindepCommitted(startDate, endDate), await fetchMindepDrafts(startDate, endDate)]
        : [await fetchPersonCommitted(startDate, endDate), await fetchPersonDrafts(startDate, endDate)];

    const committed = committedRes.data || [];
    const drafts = draftsRes.data || [];

    const enrichedCommitted = committed.map(g => ({
        number: g.gazette_number,
        date: g.date,
        committed: true,
        ministers: null,
        persons: null,
        transactions: null,
        terminates: [],
        moves: [],
        adds: [],
        warning: false,
        gazette_format: null,
    }));

    const enrichedDrafts = drafts.map(g => ({
        number: g.gazette_number,
        date: g.date,
        committed: false,
        ministers: null,
        persons: null,
        transactions: null,
        terminates: [],
        moves: [],
        adds: [],
        warning: Boolean(Number(g.warning)),
        gazette_format: g.gazette_format,
    }));

    // Attach draft warning/format to committed if present
    enrichedCommitted.forEach(c => {
        const match = enrichedDrafts.find(d => d.number === c.number);
        if (match) {
            c.warning = match.warning;
            c.gazette_format = match.gazette_format;
        }
    });

    // Exclude drafts that are already committed
    const committedNumbers = new Set(enrichedCommitted.map(g => g.number));
    const filteredDrafts = enrichedDrafts.filter(g => !committedNumbers.has(g.number));

    const allGazettes = [...enrichedCommitted, ...filteredDrafts]
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    return {
        gazettes: allGazettes,
        warnings: allGazettes.map(g => g.warning || false),
    };
};

// Load current state for a given scope
export const loadScopeState = async (scope, date, number) => {
    if (scope === 'mindep') {
        const res = await fetchMindepState(date, number);
        return res.data.state?.ministers || [];
    } else {
        const res = await fetchPersonState(date, number);
        return res.data.state?.persons || [];
    }
};

// Centralize warning updates after committing a gazette and persist them
export const handleGazetteCommittedShared = (data, selectedPresidentIndex, committedIndex) => {
    const gazettes = data.presidents[selectedPresidentIndex]?.gazettes || [];
    const newWarnings = (gazettes || []).map((g, idx) => {
        if (idx === committedIndex) return false;
        if (idx > committedIndex) return true;
        return Boolean(g.warning);
    });

    const committedGazette = gazettes[committedIndex];
    if (committedGazette) {
        setWarning(committedGazette.number, false).catch(() => {});
    }
    for (let i = committedIndex + 1; i < gazettes.length; i++) {
        setWarning(gazettes[i].number, true).catch(() => {});
    }

    return newWarnings;
};

// Set current gazette state to latest from previous gazette for a given field
export const deriveLatestUpdatedState = (data, selectedPresidentIndex, selectedGazetteIndex, fieldName) => {
    const updatedData = JSON.parse(JSON.stringify(data));
    const currentPresident = updatedData.presidents[selectedPresidentIndex];
    const prevValue = currentPresident.gazettes[selectedGazetteIndex - 1]?.[fieldName] || [];
    updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex][fieldName] = prevValue;
    return updatedData;
};


