import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button, Divider, FormControlLabel, Checkbox, TextField, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import axios from 'axios';

const InitialTransactionPreview = ({
    selectedGazette,
    data,
    selectedPresidentIndex,
    selectedGazetteIndex,
    setData,
    setRefreshFlag,
    onGazetteCommitted,
}) => {
    const [committing, setCommitting] = useState(false);

    // Track which ministers are expanded (show departments)
    const [expandedMinisters, setExpandedMinisters] = useState(() => {
        return selectedGazette.reduce((acc, _, i) => {
            acc[i] = false; // default all expanded, change if you want all collapsed initially
            return acc;
        }, {});
    });

    const toggleMinister = (index) => {
        setExpandedMinisters(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const gazette = data?.presidents?.[selectedPresidentIndex]?.gazettes?.[selectedGazetteIndex];
    if (!gazette || !Array.isArray(selectedGazette)) return null;

    // Automatically show previous ministry inputs for departments
    // that have a previous_ministry from backend but show_previous_ministry is falsey
    useEffect(() => {
        if (!gazette || !gazette.transactions) return;

        const updatedData = JSON.parse(JSON.stringify(data));
        let changed = false;

        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions.forEach(minister => {
            minister.departments.forEach(dept => {
                if (dept.previous_ministry && dept.previous_ministry.trim() && !dept.show_previous_ministry) {
                    dept.show_previous_ministry = true;
                    changed = true;
                }
            });
        });

        if (changed) {
            setData(updatedData);
        }
    }, [data, selectedPresidentIndex, selectedGazetteIndex, gazette, setData]);

    const moveList = gazette.moves || [];

    const makeKey = (ministerName, departmentName) => `${departmentName}::${ministerName}`;

    const isMoved = (ministerName, departmentName) => {
        const key = makeKey(ministerName, departmentName);
        return moveList.some(item => makeKey(item.mName, item.dName) === key);
    };

    const handleRefresh = async () => {
        try {
            const infoResponse = await axios.get(`http://localhost:8000/info/${gazette.number}`);
            const info = infoResponse.data;

            const gazetteType = info.gazette_type;
            const gazetteFormat = info.gazette_format;

            const endpoint = `http://localhost:8000/${gazetteType}/${gazetteFormat}/${gazette.date}/${gazette.number}`;
            const response = await axios.get(endpoint);

            const updatedData = JSON.parse(JSON.stringify(data));
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions = response.data;
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = [];

            setData(updatedData);
        } catch (error) {
            console.error('Error refetching gazette:', error);
            alert('❌ Failed to refetch gazette. Check the console for details.');
        }
    };

    const handleMinisterNameChange = (index, newName) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions[index].name = newName;
        setData(updatedData);
    };

    const handleDeptNameChange = (ministerIndex, deptIndex, newName) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions[ministerIndex].departments[deptIndex].name = newName;
        setData(updatedData);
    };

    const handlePreviousMinistryChange = (ministerIndex, deptIndex, newPrevMinistry) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions[ministerIndex].departments[deptIndex].previous_ministry = newPrevMinistry;
        setData(updatedData);
    };

    const handleAddPreviousMinistry = (ministerIndex, deptIndex) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const dept = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex]
            .transactions[ministerIndex].departments[deptIndex];

        dept.show_previous_ministry = true;
        if (dept.previous_ministry === undefined || dept.previous_ministry === null) {
            dept.previous_ministry = '';
        }

        setData(updatedData);
    };

    const handleRemovePreviousMinistry = (ministerIndex, deptIndex) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const dept = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex]
            .transactions[ministerIndex].departments[deptIndex];

        // Hide the previous ministry UI and clear the field
        dept.show_previous_ministry = false;
        dept.previous_ministry = '';

        // Remove from moveList if marked
        const ministerName = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex]
            .transactions[ministerIndex].name;
        const key = makeKey(ministerName, dept.name);

        const updatedMoves = (updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || []).filter(
            (item) => makeKey(item.mName, item.dName) !== key
        );

        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = updatedMoves;

        setData(updatedData);
    };

    // Add Minister
    const handleAddMinister = (ministerIndex) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const ministries = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions;

        ministries.splice(ministerIndex + 1, 0, {
            name: '',
            departments: [
                {
                    name: '',
                    previous_ministry: '',
                    show_previous_ministry: false,
                }
            ],
        });

        setData(updatedData);
    };

    // Delete Minister (remove ministry + related moves)
    const handleDeleteMinister = (ministerIndex) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const ministries = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions;
        if (ministries.length <= 1) return;  // Prevent deleting last ministry if you want

        // Get ministry to remove
        const ministryToRemove = ministries[ministerIndex];

        // Remove related moves for all its departments
        const moves = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || [];

        const filteredMoves = moves.filter(move => {
            // Exclude any move related to this ministry's departments
            for (const dept of ministryToRemove.departments) {
                const keyToRemove = makeKey(ministryToRemove.name, dept.name);
                if (makeKey(move.mName, move.dName) === keyToRemove) {
                    return false; // filter out
                }
            }
            return true; // keep this move
        });

        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = filteredMoves;

        // Remove the ministry
        ministries.splice(ministerIndex, 1);

        setData(updatedData);
    };

    const handleToggleMove = (ministerName, departmentName, previousMinistry) => {
        if (!ministerName?.trim() || !departmentName?.trim()) {
            // If minister or department name is empty, don't add to move list
            return;
        }
        const key = makeKey(ministerName, departmentName);
        const updatedData = JSON.parse(JSON.stringify(data));
        const moves = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || [];

        const exists = moves.some(item => makeKey(item.mName, item.dName) === key);
        const updatedMoves = exists
            ? moves.filter(item => makeKey(item.mName, item.dName) !== key)
            : [...moves, { mName: ministerName, dName: departmentName, prevMinistry: previousMinistry }];

        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = updatedMoves;
        setData(updatedData);
        console.log(selectedGazette)
    };

    const handleAddDepartment = (ministerIndex, deptIndex) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const ministries = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions;
        const minister = ministries[ministerIndex];

        if (!minister.departments || !Array.isArray(minister.departments)) {
            minister.departments = [];
        }

        // If deptIndex is -1 (no departments yet), just push a new one at start
        if (deptIndex === -1) {
            minister.departments.push({
                name: '',
                previous_ministry: '',
                show_previous_ministry: false,
            });
        } else {
            minister.departments.splice(deptIndex + 1, 0, {
                name: '',
                previous_ministry: '',
                show_previous_ministry: false,
            });
        }

        setData(updatedData);
    };


    const handleDeleteDepartment = (ministerIndex, deptIndex) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const departments = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions[ministerIndex].departments;

        // Get the name of the department to be deleted
        const deptToDelete = departments[deptIndex];
        const ministerName = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions[ministerIndex].name;
        const keyToDelete = makeKey(ministerName, deptToDelete.name);

        // Remove department from list
        departments.splice(deptIndex, 1);

        // Remove from moveList if exists
        const updatedMoves = (updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || []).filter(
            (item) => makeKey(item.mName, item.dName) !== keyToDelete
        );
        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = updatedMoves;

        setData(updatedData);
    };

    const handleRemoveMove = (mName, dName) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const moves = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || [];

        // Filter out the move to remove
        const filteredMoves = moves.filter(
            (item) => !(item.mName === mName && item.dName === dName)
        );

        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = filteredMoves;
        setData(updatedData);

    };

    function handleSave() {
        const updatedData = JSON.parse(JSON.stringify(data));
        const updatedGazette = {
            transactions: selectedGazette || [],
            moves: updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || [],
        };

        axios.post(
            `http://localhost:8000/transactions/${gazette.number}`,
            updatedGazette,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )
            .then(() => console.log("Saved successfully"))
            .catch(err => console.error("Save failed", err));
    }

    async function handleFetch() {
        try {
            const endpoint = `http://localhost:8000/transactions/${gazette.number}`;
            const response = await axios.get(endpoint);

            let dataFromDb = response.data;
            // In case backend returns string, parse it
            if (typeof dataFromDb === "string") {
                dataFromDb = JSON.parse(dataFromDb);
            }

            const updatedData = JSON.parse(JSON.stringify(data));
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions = dataFromDb.transactions || [];
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = dataFromDb.moves || [];

            setData(updatedData);
        } catch (error) {
            console.error('Error refetching gazette:', error);
            alert('❌ Failed to refetch gazette. Check the console for details.');
        }
    }


    const handleApproveCommit = async () => {
        setCommitting(true);

        const movedDepartmentsSet = new Set(moveList.map(({ dName, mName }) => `${dName}::${mName}`));

        const payloadMinisters = selectedGazette
            .filter(minister => minister.name && minister.name.trim() !== '')
            .map(minister => ({
                name: minister.name,
                departments: minister.departments.map(dept => {
                    const key = `${dept.name}::${minister.name}`;
                    if (movedDepartmentsSet.has(key) && dept.previous_ministry?.trim()) {
                        return {
                            name: dept.name,
                            previous_ministry: dept.previous_ministry,
                        };
                    } else {
                        return { name: dept.name };
                    }
                }),
            }));

        try {
            await axios.post(
                `http://localhost:8000/mindep/initial/${gazette.date}/${gazette.number}`,
                payloadMinisters
            );

            const newData = JSON.parse(JSON.stringify(data));
            newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = null;
            setData(newData);

            setRefreshFlag(prev => !prev);

            alert('✅ Gazette committed successfully! The data will refresh from backend.');
            handleSave()
            if (onGazetteCommitted) {
                onGazetteCommitted(selectedGazetteIndex);
            }

        } catch (error) {
            console.error('Error committing gazette:', error);
            alert('❌ Failed to commit gazette. Please try again.');
        } finally {
            setCommitting(false);
        }
    };

    return (
        <Box mt={4}>
            <Typography variant="h6" gutterBottom>
                Preview Transactions
            </Typography>
            <Button
                onClick={handleRefresh}
                variant="outlined"
                color="primary"
                sx={{ mb: 3 }}
            >
                🔄 Refresh
            </Button>
            <Button
                onClick={handleFetch}
                variant="outlined"
                color="primary"
                sx={{ mb: 3 }}
            >
                🔄 Refetch from last saved
            </Button>
            <Button
                onClick={handleSave}
                variant="outlined"
                color="primary"
                sx={{ mb: 3 }}
            >
                Save
            </Button>
            {selectedGazette.length > 0 && (
                <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 3 }}>
                    <Box sx={{ display: "flex", flexDirection: "row", gap: 5 }}>
                        <Box sx={{ flex: 1 }}>
                            {selectedGazette.map((min, idx) => (
                                <Box
                                    key={idx}
                                    mb={4}
                                    sx={{
                                        bgcolor: "#e3f2fd",
                                        borderRadius: 2,
                                        p: 3,
                                        boxShadow: 2,
                                        borderLeft: "6px solid #1976d2",
                                    }}
                                >
                                    {/* Minister header with toggle */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                            mb: 2,
                                            cursor: "pointer",
                                            userSelect: "none",
                                        }}
                                        onClick={() => toggleMinister(idx)}
                                    >
                                        {expandedMinisters[idx] ? (
                                            <KeyboardArrowDownIcon color="primary" />
                                        ) : (
                                            <KeyboardArrowRightIcon color="primary" />
                                        )}
                                        <TextField
                                            label={`Minister ${idx + 1}`}
                                            variant="standard"
                                            value={min.name}
                                            onChange={(e) => handleMinisterNameChange(idx, e.target.value)}
                                            disabled={committing}
                                            fullWidth
                                            sx={{
                                                ml: 1,
                                                fontWeight: "bold",
                                                "& .MuiInputBase-input": { fontWeight: 600 },
                                            }}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddMinister(idx);
                                            }}
                                            disabled={committing}
                                            sx={{ border: "1px dashed #1976d2", color: "#1976d2" }}
                                            aria-label="Add Minister"
                                        >
                                            <AddIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteMinister(idx);
                                            }}
                                            disabled={committing || selectedGazette.length <= 1}
                                            sx={{ border: "1px dashed #d32f2f", color: "#d32f2f" }}
                                            aria-label="Remove Minister"
                                        >
                                            <RemoveIcon fontSize="small" />
                                        </IconButton>
                                    </Box>

                                    {/* Departments, collapsible */}
                                    {expandedMinisters[idx] && (
                                        <>
                                            {(min.departments && min.departments.length > 0) ? (
                                                min.departments.map((dept, i) => (
                                                    <Box
                                                        key={i}
                                                        ml={3}
                                                        mb={2}
                                                        position="relative"
                                                        sx={{
                                                            bgcolor: "#f0f4c3",
                                                            borderRadius: 2,
                                                            p: 2,
                                                            boxShadow: 1,
                                                            borderLeft: "4px solid #afb42b",
                                                        }}
                                                    >
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <TextField
                                                                label={`Department ${i + 1}`}
                                                                variant="standard"
                                                                value={dept.name}
                                                                onChange={(e) =>
                                                                    handleDeptNameChange(idx, i, e.target.value)
                                                                }
                                                                disabled={committing}
                                                                fullWidth
                                                            />
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleAddDepartment(idx, i)}
                                                                disabled={committing}
                                                                sx={{ border: "1px dashed #afb42b", color: "#afb42b" }}
                                                                aria-label="Add Department"
                                                            >
                                                                <AddIcon fontSize="small" />
                                                            </IconButton>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleDeleteDepartment(idx, i)}
                                                                disabled={committing}
                                                                sx={{ border: "1px dashed #d32f2f", color: "#d32f2f" }}
                                                                aria-label="Remove Department"
                                                            >
                                                                <RemoveIcon fontSize="small" />
                                                            </IconButton>
                                                        </Box>

                                                        {dept.show_previous_ministry ? (
                                                            <Box
                                                                display="flex"
                                                                alignItems="center"
                                                                gap={2}
                                                                mt={1}
                                                                sx={{ flexWrap: "wrap" }}
                                                            >
                                                                <FormControlLabel
                                                                    control={
                                                                        <Checkbox
                                                                            checked={isMoved(min.name, dept.name)}
                                                                            onChange={() =>
                                                                                handleToggleMove(
                                                                                    min.name,
                                                                                    dept.name,
                                                                                    dept.previous_ministry
                                                                                )
                                                                            }
                                                                            disabled={
                                                                                committing ||
                                                                                !(dept.previous_ministry &&
                                                                                    dept.previous_ministry.trim())
                                                                            }
                                                                        />
                                                                    }
                                                                    label={
                                                                        <Box
                                                                            sx={{
                                                                                display: "flex",
                                                                                alignItems: "center",
                                                                                gap: 1,
                                                                                flexWrap: "wrap",
                                                                            }}
                                                                        >
                                                                            <Typography
                                                                                variant="body2"
                                                                                sx={{ minWidth: 160, fontWeight: 500 }}
                                                                            >
                                                                                Mark as a move from previous
                                                                            </Typography>
                                                                            <TextField
                                                                                variant="standard"
                                                                                value={dept.previous_ministry}
                                                                                onChange={(e) =>
                                                                                    handlePreviousMinistryChange(idx, i, e.target.value)
                                                                                }
                                                                                disabled={committing}
                                                                                size="small"
                                                                                sx={{ width: "180px" }}
                                                                            />
                                                                        </Box>
                                                                    }
                                                                />
                                                                <Button
                                                                    onClick={() => handleRemovePreviousMinistry(idx, i)}
                                                                    size="small"
                                                                    color="error"
                                                                    disabled={committing}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </Box>
                                                        ) : (
                                                            <Button
                                                                onClick={() => handleAddPreviousMinistry(idx, i)}
                                                                size="small"
                                                                sx={{ mt: 1 }}
                                                                disabled={committing}
                                                            >
                                                                ➕ Add Previous Ministry
                                                            </Button>
                                                        )}
                                                    </Box>
                                                ))
                                            ) : (
                                                // No departments yet - show message and Add Department button
                                                <Box
                                                    ml={3}
                                                    mb={2}
                                                    sx={{
                                                        bgcolor: "#f0f4c3",
                                                        borderRadius: 2,
                                                        p: 2,
                                                        boxShadow: 1,
                                                        borderLeft: "4px solid #afb42b",
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        fontStyle: "italic",
                                                        color: "rgba(0,0,0,0.6)",
                                                    }}
                                                >
                                                    <Typography>No departments added yet.</Typography>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handleAddDepartment(idx, -1)}
                                                        disabled={committing}
                                                        sx={{ borderColor: "#afb42b", color: "#afb42b" }}
                                                        aria-label="Add Department"
                                                    >
                                                        ➕ Add Department
                                                    </Button>
                                                </Box>
                                            )}
                                        </>
                                    )}
                                </Box>
                            ))}


                            <Button
                                variant="contained"
                                color="success"
                                sx={{ mt: 3 }}
                                onClick={handleApproveCommit}
                                disabled={committing}
                            >
                                {committing ? "Committing..." : "Approve & Commit Gazette"}
                            </Button>

                        </Box>

                        {moveList.length > 0 && (
                            <Box
                                sx={{
                                    flex: 1,
                                    bgcolor: "#fafafa",
                                    border: "1px solid #ddd",
                                    p: 3,
                                    borderRadius: 3,
                                    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                                    height: "fit-content",
                                    maxHeight: 300,
                                    overflowY: "auto",
                                }}
                            >
                                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                    <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                                        Departments Marked as Moves
                                    </Typography>
                                </Box>

                                {moveList.map(({ dName, prevMinistry, mName }, i) => (
                                    <Box
                                        key={i}
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            backgroundColor: "#e8f0fe",
                                            borderRadius: 2,
                                            p: 1.2,
                                            mb: 1,
                                            boxShadow: "inset 0 0 5px rgba(25, 118, 210, 0.2)",
                                            transition: "background-color 0.2s",
                                            "&:hover": {
                                                backgroundColor: "#d0dffe",
                                            },
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            “{dName}” moved from <strong>{prevMinistry}</strong> to <strong>{mName}</strong>
                                        </Typography>
                                        <IconButton
                                            size="medium"
                                            color="error"
                                            onClick={() => handleRemoveMove(mName, dName)}
                                            aria-label={`Remove move ${dName} from ${mName}`}
                                            sx={{ ml: 1 }}
                                            title="Remove this move"
                                        >
                                            <RemoveIcon fontSize="medium" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        )}


                    </Box>
                </Paper>
            )}
        </Box>
    );

};

export default InitialTransactionPreview;
