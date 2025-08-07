import React, { useState } from 'react';
import {
    Box, Typography, Paper, Button, Divider, FormControlLabel, Checkbox, TextField,
} from '@mui/material';
import axios from 'axios';

const InitialTransactionPreview = ({
    selectedGazette,
    data,
    selectedPresidentIndex,
    selectedGazetteIndex,
    setData,
    setRefreshFlag
}) => {
    const [committing, setCommitting] = useState(false);

    const gazette = data?.presidents?.[selectedPresidentIndex]?.gazettes?.[selectedGazetteIndex];
    if (!gazette || !Array.isArray(selectedGazette)) return null;

    const moveList = gazette.moves || [];

    const makeKey = (ministerName, departmentName) => `${departmentName}::${ministerName}`;

    const isMoved = (ministerName, departmentName) => {
        const key = makeKey(ministerName, departmentName);
        return moveList.some(item => makeKey(item.mName, item.dName) === key);
    };

    // Handle minister name change
    const handleMinisterNameChange = (index, newName) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions[index].name = newName;
        setData(updatedData);
    };

    // Handle department name change
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

    const handleToggleMove = (ministerName, departmentName, previousMinistry) => {
        const key = makeKey(ministerName, departmentName);
        const updatedData = JSON.parse(JSON.stringify(data));
        const moves = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves || [];

        const exists = moves.some(item => makeKey(item.mName, item.dName) === key);
        const updatedMoves = exists
            ? moves.filter(item => makeKey(item.mName, item.dName) !== key)
            : [...moves, { mName: ministerName, dName: departmentName, prevMinistry: previousMinistry }];

        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = updatedMoves;
        setData(updatedData);
    };

    const handleApproveCommit = async () => {
        setCommitting(true);

        const movedDepartmentsSet = new Set(moveList.map(({ dName, mName }) => `${dName}::${mName}`));

        const payloadMinisters = selectedGazette.map(minister => ({
            name: minister.name,
            departments: minister.departments.map(dept => {
                const key = `${dept.name}::${minister.name}`;
                if (movedDepartmentsSet.has(key)) {
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
        } catch (error) {
            console.error('Error committing gazette:', error);
            alert('❌ Failed to commit gazette. Please try again.');
        } finally {
            setCommitting(false);
        }
    };

    return (
        <Box mt={4}>
            <Typography variant="h6" gutterBottom>Preview Transactions</Typography>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
                {selectedGazette.map((min, idx) => (
                    <Box key={idx} mb={3}>
                        <TextField
                            label={`Minister ${idx + 1}`}
                            variant="standard"
                            value={min.name}
                            onChange={(e) => handleMinisterNameChange(idx, e.target.value)}
                            disabled={committing}
                            fullWidth
                            sx={{ mb: 2 }}
                        />

                        {min.departments.map((dept, i) => (
                            <Box key={i} ml={2} mb={1}>
                                <TextField
                                    label={`Department ${i + 1}`}
                                    variant="standard"
                                    value={dept.name}
                                    onChange={(e) => handleDeptNameChange(idx, i, e.target.value)}
                                    disabled={committing}
                                    fullWidth
                                />

                                {dept.previous_ministry && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={isMoved(min.name, dept.name)}
                                                onChange={() =>
                                                    handleToggleMove(min.name, dept.name, dept.previous_ministry)
                                                }
                                                disabled={committing}
                                            />
                                        }
                                        label={
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <span>Mark as a move from</span>
                                                <TextField
                                                    variant="standard"
                                                    value={dept.previous_ministry}
                                                    onChange={(e) => handlePreviousMinistryChange(idx, i, e.target.value)}
                                                    disabled={committing}
                                                    size="small"
                                                    sx={{ width: '180px' }}
                                                />
                                            </span>
                                        }
                                    />

                                )}
                            </Box>
                        ))}

                        <Divider sx={{ my: 2 }} />
                    </Box>
                ))}

                {moveList.length > 0 && (
                    <Box mt={3} p={2} bgcolor="#f5f5f5" borderRadius={2}>
                        <Typography variant="subtitle1" gutterBottom>🔄 Departments Marked as Moves</Typography>
                        {moveList.map(({ dName, prevMinistry, mName }, i) => (
                            <Typography key={i} variant="body2">
                                ❌ {dName} from {prevMinistry} to {mName}
                            </Typography>
                        ))}
                    </Box>
                )}

                <Button
                    variant="contained"
                    color="success"
                    sx={{ mt: 3 }}
                    onClick={handleApproveCommit}
                    disabled={committing}
                >
                    {committing ? 'Committing...' : 'Approve & Commit Gazette'}
                </Button>
            </Paper>
        </Box>
    );
};

export default InitialTransactionPreview;
