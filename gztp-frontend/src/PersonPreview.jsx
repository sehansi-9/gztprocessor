import { useState, useEffect } from "react";
import {Box,Paper,Typography,Button,Divider,TextField,Checkbox,FormControlLabel,IconButton,} from "@mui/material";
import { Add as AddIcon, Remove as RemoveIcon } from "@mui/icons-material";
import axios from 'axios';
import { buildPersonPayload } from './shared/validators';
import { commitPerson, saveTransactions } from "./shared/api";

export default function Person({ adds, moves, terminates, selectedGazetteIndex, selectedPresidentIndex, data, setData, setRefreshFlag, handleGazetteCommitted, handleSave }) {
    // initialize with props if passed, else fallback to sampleTransactions
    const [transactions, setTransactions] = useState({
        adds,
        moves,
        terminates,
    });
    const [committing, setCommitting] = useState(false);
    const [expandedSuggested, setExpandedSuggested] = useState({});

    // Centralized dispatcher to keep all mutations in one place
    const updatePerson = (action, payload) => {
        const updated = { ...transactions };

        switch (action) {
            case 'change_field': {
                const { section, idx, field, value } = payload;
                updated[section][idx][field] = value;
                break;
            }
            case 'add_entry': {
                const { section } = payload;
                if (section === 'adds') {
                    updated.adds = [...updated.adds, {
                        type: 'ADD',
                        new_person: '',
                        new_ministry: '',
                        new_position: '',
                        suggested_terminates: [],
                    }];
                } else if (section === 'moves') {
                    updated.moves = [...updated.moves, {
                        type: 'MOVE',
                        name: '',
                        from_ministry: '',
                        from_position: '',
                        to_ministry: '',
                        to_position: '',
                    }];
                } else if (section === 'terminates') {
                    updated.terminates = [...updated.terminates, {
                        type: 'TERMINATE',
                        name: '',
                        ministry: '',
                        position: '',
                    }];
                }
                break;
            }
            case 'remove_entry': {
                const { section, idx } = payload;
                if (section === 'terminates') {
                    const t = updated.terminates[idx];
                    updated.adds.forEach((add) => {
                        add.suggested_terminates.forEach((sug) => {
                            if (
                                sug.existing_person === t.name &&
                                sug.existing_ministry === t.ministry &&
                                sug.existing_position === t.position
                            ) {
                                sug.mark = false;
                            }
                        });
                    });
                }
                updated[section].splice(idx, 1);
                break;
            }
            case 'suggested_change': {
                const { addIdx, sugIdx, field, value } = payload;
                updated.adds[addIdx].suggested_terminates[sugIdx][field] = value;
                break;
            }
            case 'suggested_check_toggle': {
                const { addIdx, sugIdx } = payload;
                const sug = updated.adds[addIdx].suggested_terminates[sugIdx];
                sug.mark = !sug.mark;
                if (sug.mark) {
                    const exists = updated.terminates.some(
                        (t) => t.name === sug.existing_person && t.ministry === sug.existing_ministry && t.position === sug.existing_position
                    );
                    if (!exists) {
                        updated.terminates.push({
                            type: 'TERMINATE',
                            name: sug.existing_person,
                            ministry: sug.existing_ministry,
                            position: sug.existing_position,
                        });
                    }
                } else {
                    updated.terminates = updated.terminates.filter(
                        (t) => !(t.name === sug.existing_person && t.ministry === sug.existing_ministry && t.position === sug.existing_position)
                    );
                }
                break;
            }
            case 'dissolve_move': {
                const { idx } = payload;
                const move = updated.moves[idx];
                if (move.name && move.from_ministry && move.from_position && move.to_ministry && move.to_position) {
                    updated.adds.push({
                        type: 'ADD',
                        new_person: move.name,
                        new_ministry: move.to_ministry,
                        new_position: move.to_position,
                        suggested_terminates: [],
                        date: move.date || '',
                    });
                    updated.terminates.push({
                        type: 'TERMINATE',
                        name: move.name,
                        ministry: move.from_ministry,
                        position: move.from_position,
                        date: move.date || '',
                    });
                    updated.moves.splice(idx, 1);
                } else {
                    alert('All Move fields must be filled to dissolve.');
                }
                break;
            }
            default:
                break;
        }

        setTransactions(updated);
    };

    const handleChange = (section, idx, field, value) => updatePerson('change_field', { section, idx, field, value });

    useEffect(() => {
        setTransactions({ adds, moves, terminates });
    }, [adds, moves, terminates]);
    const handleSuggestedTerminateChange = (addIdx, sugIdx, field, value) => updatePerson('suggested_change', { addIdx, sugIdx, field, value });


    const handleSuggestedTerminateCheck = (addIdx, sugIdx) => updatePerson('suggested_check_toggle', { addIdx, sugIdx });

    const toggleSuggested = (addIdx) => {
        setExpandedSuggested((prev) => ({ ...prev, [addIdx]: !prev[addIdx] }));
    };

    const addEntry = (section) => updatePerson('add_entry', { section });

    const removeEntry = (section, idx) => updatePerson('remove_entry', { section, idx });

    const dissolveMove = (idx) => updatePerson('dissolve_move', { idx });

    function handleSave() {
        const updatedData = JSON.parse(JSON.stringify(data));
        const updatedGazette = {
            transactions: transactions || [],
            moves: updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || [],
            adds: updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].adds || [],
            terminates: updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].terminates || [],

        };
        const number = data.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].number
        saveTransactions(number, updatedGazette)
            .then(() => console.log("Saved successfully"))
            .catch(err => console.error("Save failed", err));
    }

    const handleApproveCommit = async () => {
        setCommitting(true);

        try {
            const payload = buildPersonPayload(transactions);
            const date = data.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].date;
            const number = data.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].number

            // Send to backend
            await commitPerson(date, number, payload)

            // Update frontend state
            const newData = JSON.parse(JSON.stringify(data));
            newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].persons = null; // reset
            newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].committed = true;
            setData(newData);
            setRefreshFlag((prev) => !prev);
            handleSave()
            handleGazetteCommitted(selectedGazetteIndex);


            alert("✅ Gazette committed successfully!");
        } catch (error) {
            console.error("Error committing amendment:", error);
            alert("❌ Failed to commit amendment. Please try again.");
        } finally {
            setCommitting(false);
        }
    };

    const renderMove = (move, idx) => (
        <Box
            key={idx}
            sx={{
                bgcolor: "#e3f2fd",
                borderRadius: 2,
                p: 2,
                mb: 2,
                borderLeft: "6px solid #1976d2",
                boxShadow: 1,
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => dissolveMove(idx)}
                >
                    BREAK
                </Button>
                <IconButton color="error" onClick={() => removeEntry("moves", idx)}>
                    <RemoveIcon />
                </IconButton>
            </Box>
            <Box mt={1}>
                <TextField
                    fullWidth
                    label="Name"
                    value={move.name}
                    onChange={(e) => handleChange("moves", idx, "name", e.target.value)}
                />
            </Box>
            <Box mt={1} sx={{ display: "flex", gap: 1 }}>
                <TextField
                    label="From Ministry"
                    value={move.from_ministry}
                    onChange={(e) =>
                        handleChange("moves", idx, "from_ministry", e.target.value)
                    }
                    sx={{ flex: 1 }}
                />
                <TextField
                    label="From Position"
                    value={move.from_position}
                    onChange={(e) =>
                        handleChange("moves", idx, "from_position", e.target.value)
                    }
                    sx={{ flex: 1 }}
                />
            </Box>
            <Box mt={1} sx={{ display: "flex", gap: 1 }}>
                <TextField
                    label="To Ministry"
                    value={move.to_ministry}
                    onChange={(e) =>
                        handleChange("moves", idx, "to_ministry", e.target.value)
                    }
                    sx={{ flex: 1 }}
                />
                <TextField
                    label="To Position"
                    value={move.to_position}
                    onChange={(e) =>
                        handleChange("moves", idx, "to_position", e.target.value)
                    }
                    sx={{ flex: 1 }}
                />
            </Box>
        </Box>
    );

    const renderAdd = (add, idx) => (
        <Box
            key={idx}
            sx={{
                bgcolor: "#f1f8e9",
                borderRadius: 2,
                p: 2,
                mb: 2,
                borderLeft: "6px solid #689f38",
                boxShadow: 1,
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <IconButton color="error" onClick={() => removeEntry("adds", idx)}>
                    <RemoveIcon />
                </IconButton>
            </Box>

            <Box mt={1} sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                    label="Name"
                    value={add.new_person}
                    onChange={(e) => handleChange("adds", idx, "new_person", e.target.value)}
                    sx={{ flex: 2, minWidth: 120 }}
                />
                <TextField
                    label="Ministry"
                    value={add.new_ministry}
                    onChange={(e) => handleChange("adds", idx, "new_ministry", e.target.value)}
                    sx={{ flex: 3, minWidth: 200 }}
                />
                <TextField
                    label="Position"
                    value={add.new_position}
                    onChange={(e) => handleChange("adds", idx, "new_position", e.target.value)}
                    sx={{ flex: 2, minWidth: 80 }}
                />
            </Box>

            {add.suggested_terminates?.length > 0 && (
                <Box mt={2}>
                    <Button size="small" onClick={() => toggleSuggested(idx)} sx={{ mb: 1 }}>
                        {expandedSuggested[idx] ? "Hide Suggested Terminates" : "Show Suggested Terminates"}
                    </Button>

                    {expandedSuggested[idx] && (
                        <Box>
                            {add.suggested_terminates.map((sug, sugIdx) => (
                                <Box
                                    key={sugIdx}
                                    sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1, flexWrap: "wrap" }}
                                >
                                    <TextField
                                        label="Person"
                                        value={sug.existing_person}
                                        onChange={(e) =>
                                            handleSuggestedTerminateChange(idx, sugIdx, "existing_person", e.target.value)
                                        }
                                        sx={{ flex: 2, minWidth: 120 }}
                                    />
                                    <TextField
                                        label="Ministry"
                                        value={sug.existing_ministry}
                                        onChange={(e) =>
                                            handleSuggestedTerminateChange(idx, sugIdx, "existing_ministry", e.target.value)
                                        }
                                        sx={{ flex: 3, minWidth: 200 }}
                                    />
                                    <TextField
                                        label="Position"
                                        value={sug.existing_position}
                                        onChange={(e) =>
                                            handleSuggestedTerminateChange(idx, sugIdx, "existing_position", e.target.value)
                                        }
                                        sx={{ flex: 2, minWidth: 80 }}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={sug.mark || false}
                                                onChange={() => handleSuggestedTerminateCheck(idx, sugIdx)}
                                            />
                                        }
                                        label="terminate"
                                    />
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );

    const renderTerminate = (term, idx) => (
        <Box
            key={idx}
            sx={{
                bgcolor: "#ffebee",
                borderRadius: 2,
                p: 2,
                mb: 2,
                borderLeft: "6px solid #d32f2f",
                boxShadow: 1,
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <IconButton color="error" onClick={() => removeEntry("terminates", idx)}>
                    <RemoveIcon />
                </IconButton>
            </Box>

            <Box mt={1} sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                    label="Name"
                    value={term.name}
                    onChange={(e) => handleChange("terminates", idx, "name", e.target.value)}
                    sx={{ flex: 2, minWidth: 120 }}
                />
                <TextField
                    label="Ministry"
                    value={term.ministry}
                    onChange={(e) => handleChange("terminates", idx, "ministry", e.target.value)}
                    sx={{ flex: 3, minWidth: 200 }}
                />
                <TextField
                    label="Position"
                    value={term.position}
                    onChange={(e) => handleChange("terminates", idx, "position", e.target.value)}
                    sx={{ flex: 2, minWidth: 80 }}
                />
            </Box>
        </Box>
    );


    return (
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Person Transactions
            </Typography>

            {/* Moves */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Moves
                    </Typography>
                    <IconButton color="success" onClick={() => addEntry("moves")}>
                        <AddIcon />
                    </IconButton>
                </Box>
                {transactions.moves.map(renderMove)}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Adds */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Adds
                    </Typography>
                    <IconButton color="success" onClick={() => addEntry("adds")}>
                        <AddIcon />
                    </IconButton>
                </Box>
                {transactions.adds.map(renderAdd)}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Terminates */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        Terminates
                    </Typography>
                    <IconButton color="success" onClick={() => addEntry("terminates")}>
                        <AddIcon />
                    </IconButton>
                </Box>
                {transactions.terminates.map(renderTerminate)}
            </Box>

            <Button
                variant="contained"
                color="success"
                sx={{ mt: 3 }}
                onClick={handleApproveCommit}
                disabled={committing}
            >
                {committing ? "Committing..." : "Approve & Commit Gazette"}
            </Button>
        </Paper>
    );
}
