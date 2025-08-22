import axios from 'axios';

// Draft transactions (common)
export const fetchTransactions = (number) => {
    return axios.get(`http://localhost:8000/transactions/${number}`);
};

export const saveTransactions = (number, payload) => {
    return axios.post(
        `http://localhost:8000/transactions/${number}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
    );
};

export const setWarning = (number, warning) => {
    return axios.post(
        `http://localhost:8000/transactions/${number}/warning`,
        { warning }
    );
};

// Org/Mindep
export const fetchMindepByFormat = (format, date, number) => {
    return axios.get(`http://localhost:8000/mindep/${format}/${date}/${number}`);
};

export const fetchMindepState = (date, number) => {
    return axios.get(`http://localhost:8000/mindep/state/${date}/${number}`);
};

export const fetchMindepCommitted = (startDate, endDate) => {
    return axios.get(`http://localhost:8000/mindep/state/gazettes/${startDate}/${endDate}`);
};

export const fetchMindepDrafts = (startDate, endDate) => {
    return axios.get(`http://localhost:8000/info/mindep/${startDate}/${endDate}`);
};

export const commitMindepInitial = (date, number, payload) => {
    return axios.post(`http://localhost:8000/mindep/initial/${date}/${number}`, payload);
};

export const commitMindepAmendment = (date, number, payload) => {
    return axios.post(`http://localhost:8000/mindep/amendment/${date}/${number}`, payload);
};

// Person
export const fetchPersonByDate = (date, number) => {
    return axios.get(`http://localhost:8000/person/${date}/${number}`);
};

export const fetchPersonState = (date, number) => {
    return axios.get(`http://localhost:8000/person/state/${date}/${number}`);
};

export const fetchPersonCommitted = (startDate, endDate) => {
    return axios.get(`http://localhost:8000/person/state/gazettes/${startDate}/${endDate}`);
};

export const fetchPersonDrafts = (startDate, endDate) => {
    return axios.get(`http://localhost:8000/info/person/${startDate}/${endDate}`);
};

export const commitPerson = (date, number, payload) => {
    return axios.post(`http://localhost:8000/person/${date}/${number}`, payload);
};


