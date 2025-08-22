import { fetchMindepByFormat, fetchTransactions, saveTransactions, fetchPersonByDate } from './api';

// Shared, behavior-identical helpers used by components

// Org/Mindep toolbar helpers
export const refreshOrgGazette = async ({ selectedGazetteFormat, gazette, data, selectedPresidentIndex, selectedGazetteIndex, setData }) => {
    const response = await fetchMindepByFormat(selectedGazetteFormat, gazette.date, gazette.number);
    const updatedData = JSON.parse(JSON.stringify(data));
    const currentGazette = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];

    currentGazette.gazette_format = selectedGazetteFormat;
    if (selectedGazetteFormat === 'initial') {
        currentGazette.transactions = response.data;
        currentGazette.moves = [];
    } else if (selectedGazetteFormat === 'amendment') {
        const transactions = response.data.transactions || {};
        currentGazette.moves = transactions.moves || [];
        currentGazette.adds = transactions.adds || [];
        currentGazette.terminates = transactions.terminates || [];
    }

    setData(updatedData);
};

export const fetchOrgDraft = async ({ gazette, selectedGazetteFormat, data, selectedPresidentIndex, selectedGazetteIndex, setData }) => {
    const res = await fetchTransactions(gazette.number);
    let dataFromDb = res.data;
    if (typeof dataFromDb === 'string') {
        dataFromDb = JSON.parse(dataFromDb);
    }
    const updatedData = JSON.parse(JSON.stringify(data));
    const g = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];
    g.transactions = dataFromDb.transactions || [];
    g.moves = dataFromDb.moves || [];
    g.adds = dataFromDb.adds || [];
    g.terminates = dataFromDb.terminates || [];
    g.gazette_format = selectedGazetteFormat;
    setData(updatedData);
};

export const saveOrgDraft = async ({ gazette, data, selectedPresidentIndex, selectedGazetteIndex }) => {
    const updatedData = JSON.parse(JSON.stringify(data));
    const g = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];
    const payload = {
        transactions: Array.isArray(g.transactions) ? g.transactions : [],
        moves: g.moves || [],
        adds: g.adds || [],
        terminates: g.terminates || [],
    };
    await saveTransactions(gazette.number, payload);
};

// Person toolbar helpers
export const refreshPersonGazette = async ({ gazette, data, selectedPresidentIndex, selectedGazetteIndex, setData }) => {
    const res = await fetchPersonByDate(gazette.date, gazette.number);
    const updatedData = JSON.parse(JSON.stringify(data));
    const g = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];
    const transactions = res.data.transactions || {};
    g.moves = transactions.moves || [];
    g.adds = transactions.adds || [];
    g.terminates = transactions.terminates || [];
    setData(updatedData);
};

export const fetchPersonDraft = async ({ gazette, data, selectedPresidentIndex, selectedGazetteIndex, setData }) => {
    const res = await fetchTransactions(gazette.number);
    let dataFromDb = res.data;
    if (typeof dataFromDb === 'string') {
        dataFromDb = JSON.parse(dataFromDb);
    }
    const updatedData = JSON.parse(JSON.stringify(data));
    const g = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];
    g.moves = dataFromDb.moves || [];
    g.adds = dataFromDb.adds || [];
    g.terminates = dataFromDb.terminates || [];
    g.gazette_format = '-';
    setData(updatedData);
};

export const savePersonDraft = async ({ gazette, data, selectedPresidentIndex, selectedGazetteIndex }) => {
    const updatedData = JSON.parse(JSON.stringify(data));
    const g = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];
    const payload = {
        moves: g.moves || [],
        adds: g.adds || [],
        terminates: g.terminates || [],
    };
    await saveTransactions(gazette.number, payload);
};


