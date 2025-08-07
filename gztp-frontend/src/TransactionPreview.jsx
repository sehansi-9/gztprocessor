import React, { useState } from 'react';
import {
    Box, Typography, Paper, Button, Divider, FormControlLabel, Checkbox,
} from '@mui/material';
import axios from 'axios';

const TransactionPreview = ({
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

            // Clear ministers so that StateTable's useEffect triggers a refresh
            const newData = JSON.parse(JSON.stringify(data));
            newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = null;
            setData(newData);

            // Toggle refresh flag to trigger StateTable data reload
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
                        <Typography variant="body1" fontWeight="bold">{min.name}</Typography>

                        {min.departments.map((dept, i) => (
                            <Box key={i} ml={2}>
                                <Typography variant="body2">{i + 1} {dept.name}</Typography>

                                {dept.previous_ministry && (
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={isMoved(min.name, dept.name)}
                                                onChange={() =>
                                                    handleToggleMove(min.name, dept.name, dept.previous_ministry)
                                                }
                                                disabled={committing} // disable toggles while committing
                                            />
                                        }
                                        label={`Previously at ${dept.previous_ministry}`}
                                        sx={{ ml: 2 }}
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

export default TransactionPreview;
