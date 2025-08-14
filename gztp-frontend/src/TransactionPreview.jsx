import { useState, useEffect } from 'react';
import { Box, Typography,Button} from '@mui/material';
import axios from 'axios';
import InitialPreview from './InitialPreview';

const TransactionPreview = ({
    transactions,
    moves,
    adds,
    terminates,
    selectedGazetteFormat,
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
        return transactions.reduce((acc, _, i) => {
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
    if (!gazette || !Array.isArray(transactions)) return null;

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
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].gazette_format = gazetteFormat;
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
        console.log(transactions)
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
            transactions: transactions || [],
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
            const infoResponse = await axios.get(`http://localhost:8000/info/${gazette.number}`);
            const info = infoResponse.data;
            console.log(info)
            const gazetteFormat = info.gazette_format;

            const updatedData = JSON.parse(JSON.stringify(data));
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].transactions = dataFromDb.transactions || [];
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].moves = dataFromDb.moves || [];
            updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].gazette_format = gazetteFormat


            setData(updatedData);
        } catch (error) {
            console.error('Error refetching gazette:', error);
            alert('❌ Failed to refetch gazette. Check the console for details.');
        }
    }


    const handleApproveCommit = async () => {
        setCommitting(true);

        const movedDepartmentsSet = new Set(moveList.map(({ dName, mName }) => `${dName}::${mName}`));

        const payloadMinisters = transactions
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
            newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].committed = true;
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

            {transactions.length > 0 && selectedGazetteFormat == 'initial' && (
                <InitialPreview
                    transactions={transactions}
                    expandedMinisters={expandedMinisters}
                    toggleMinister={toggleMinister}
                    handleMinisterNameChange={handleMinisterNameChange}
                    handleAddMinister={handleAddMinister}
                    handleDeleteMinister={handleDeleteMinister}
                    handleDeptNameChange={handleDeptNameChange}
                    handleAddDepartment={handleAddDepartment}
                    handleDeleteDepartment={handleDeleteDepartment}
                    handleAddPreviousMinistry={handleAddPreviousMinistry}
                    handleRemovePreviousMinistry={handleRemovePreviousMinistry}
                    handlePreviousMinistryChange={handlePreviousMinistryChange}
                    handleToggleMove={handleToggleMove}
                    isMoved={isMoved}
                    moveList={moveList}
                    handleRemoveMove={handleRemoveMove}
                    handleApproveCommit={handleApproveCommit}
                    committing={committing}
                />

            )}

            {selectedGazetteFormat == 'amendment' && (
                <Box>

                </Box>
            )}
        </Box>
    );

};

export default TransactionPreview;
