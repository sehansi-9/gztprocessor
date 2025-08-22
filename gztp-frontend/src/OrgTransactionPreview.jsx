import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import InitialPreview from './OrgInitialPreview';
import AmendmentPreview from './OrgAmendmentPreview';
import { downloadCsv } from './shared/downloads';
import { refreshOrgGazette, fetchOrgDraft, saveOrgDraft } from './shared/transactions';
import { commitMindepInitial, commitMindepAmendment } from './shared/api';
import { buildOrgInitialPayload, buildOrgAmendmentPayload } from './shared/validators';
import { Toolbar } from './shared/ui';


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

    const makeKey = (ministerName, departmentName) => `${departmentName}::${ministerName}`;

    const isMoved = (ministerName, departmentName) => {
        const key = makeKey(ministerName, departmentName);
        return moves.some(item => makeKey(item.mName, item.dName) === key);
    };

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

    const handleRefresh = async () => {
        try {
            await refreshOrgGazette({ selectedGazetteFormat, gazette, data, selectedPresidentIndex, selectedGazetteIndex, setData });
        } catch (error) {
            console.error('Error refetching gazette:', error);
            alert('❌ Failed to refetch gazette. Check the console for details.');
        }
    };


    // Centralized initial transactions updater
    const updateInitial = (action, payload) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const g = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];

        switch (action) {
            case 'minister_name': {
                const { ministerIndex, value } = payload;
                g.transactions[ministerIndex].name = value;
                break;
            }
            case 'dept_name': {
                const { ministerIndex, deptIndex, value } = payload;
                g.transactions[ministerIndex].departments[deptIndex].name = value;
                break;
            }
            case 'previous_ministry': {
                const { ministerIndex, deptIndex, value } = payload;
                g.transactions[ministerIndex].departments[deptIndex].previous_ministry = value;
                break;
            }
            case 'add_previous_ministry_field': {
                const { ministerIndex, deptIndex } = payload;
                const dept = g.transactions[ministerIndex].departments[deptIndex];
                dept.show_previous_ministry = true;
                if (dept.previous_ministry === undefined || dept.previous_ministry === null) {
                    dept.previous_ministry = '';
                }
                break;
            }
            case 'remove_previous_ministry_field': {
                const { ministerIndex, deptIndex } = payload;
                const dept = g.transactions[ministerIndex].departments[deptIndex];
                dept.show_previous_ministry = false;
                dept.previous_ministry = '';
                // remove from move list if exists
                const ministerName = g.transactions[ministerIndex].name;
                const key = makeKey(ministerName, dept.name);
                g.moves = (g.moves || []).filter(item => makeKey(item.mName, item.dName) !== key);
                break;
            }
            case 'add_minister': {
                const { ministerIndex } = payload;
                const ministries = g.transactions;
                ministries.splice(ministerIndex + 1, 0, {
                    name: '',
                    departments: [{ name: '', previous_ministry: '', show_previous_ministry: false }],
                });
                break;
            }
            case 'delete_minister': {
                const { ministerIndex } = payload;
                const ministries = g.transactions;
                if (ministries.length <= 1) break;
                const ministryToRemove = ministries[ministerIndex];
                const moves = g.moves || [];
                const filteredMoves = moves.filter(move => {
                    for (const dept of ministryToRemove.departments) {
                        const keyToRemove = makeKey(ministryToRemove.name, dept.name);
                        if (makeKey(move.mName, move.dName) === keyToRemove) {
                            return false;
                        }
                    }
                    return true;
                });
                g.moves = filteredMoves;
                ministries.splice(ministerIndex, 1);
                break;
            }
            case 'add_department': {
                const { ministerIndex, deptIndex } = payload;
                const minister = g.transactions[ministerIndex];
                if (!minister.departments || !Array.isArray(minister.departments)) {
                    minister.departments = [];
                }
                const newDept = { name: '', previous_ministry: '', show_previous_ministry: false };
                if (deptIndex === -1) {
                    minister.departments.push(newDept);
                } else {
                    minister.departments.splice(deptIndex + 1, 0, newDept);
                }
                break;
            }
            case 'delete_department': {
                const { ministerIndex, deptIndex } = payload;
                const departments = g.transactions[ministerIndex].departments;
                const deptToDelete = departments[deptIndex];
                const ministerName = g.transactions[ministerIndex].name;
                const keyToDelete = makeKey(ministerName, deptToDelete.name);
                departments.splice(deptIndex, 1);
                g.moves = (g.moves || []).filter(item => makeKey(item.mName, item.dName) !== keyToDelete);
                break;
            }
            case 'toggle_move': {
                const { ministerName, departmentName, previousMinistry } = payload;
                if (!ministerName?.trim() || !departmentName?.trim()) break;
                const key = makeKey(ministerName, departmentName);
                const moves = g.moves || [];
                const exists = moves.some(item => makeKey(item.mName, item.dName) === key);
                g.moves = exists
                    ? moves.filter(item => makeKey(item.mName, item.dName) !== key)
                    : [...moves, { mName: ministerName, dName: departmentName, prevMinistry: previousMinistry }];
                break;
            }
            default:
                break;
        }

        setData(updatedData);
    };

    // Centralized dispatcher consumed directly by child

    function handleSave() {
        saveOrgDraft({ gazette, data, selectedPresidentIndex, selectedGazetteIndex })
            .then(() => console.log("Saved successfully"))
            .catch(err => console.error("Save failed", err));
    }

    async function handleFetch() {
        try {
            await fetchOrgDraft({ gazette, selectedGazetteFormat, data, selectedPresidentIndex, selectedGazetteIndex, setData });
        } catch (error) {
            console.error('Error refetching gazette:', error);
            alert('❌ Failed to refetch gazette. Check the console for details.');
        }
    }


    const handleApproveCommit = async () => {
        setCommitting(true);

        const payloadMinisters = buildOrgInitialPayload(transactions, moves);

        try {
            await commitMindepInitial(gazette.date, gazette.number, payloadMinisters);

            const newData = JSON.parse(JSON.stringify(data));
            newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = null;
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

    const handleChange = (listName, index, field, value) => {
        const updatedData = JSON.parse(JSON.stringify(data));

        const gazette = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];

        if (listName === "adds") {
            gazette.adds[index][field] = value;
        } else if (listName === "terminates") {
            gazette.terminates[index][field] = value;
        } else if (listName === "moves") {
            gazette.moves[index][field] = value;
        }

        setData(updatedData);
    };

    const handleAddSection = (listName) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const gazette = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];

        if (listName === "adds") {
            gazette.adds.push({ department: "", to_ministry: "", position: "" });
            console.log(gazette.adds)
        } else if (listName === "terminates") {
            gazette.terminates.push({ department: "", from_ministry: "" });
        } else if (listName === "moves") {
            gazette.moves.push({ department: "", from_ministry: "", to_ministry: "", position: "" });
        }

        setData(updatedData);
    };

    const handleDeleteSection = (listName, index) => {
        const updatedData = JSON.parse(JSON.stringify(data));
        const gazette = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];

        if (listName === "adds") {
            gazette.adds.splice(index, 1);
        } else if (listName === "terminates") {
            gazette.terminates.splice(index, 1);
        } else if (listName === "moves") {
            gazette.moves.splice(index, 1);
        }

        setData(updatedData);
    };

    const handleDownload = (gazetteNumber, dateStr, gazetteType, fileType) => {
        downloadCsv(gazetteNumber, dateStr, gazetteType, fileType);
    };


    return (
        <Box mt={4}>
            <Typography variant="h6" gutterBottom>
                Preview Transactions
            </Typography>
            <Toolbar
                onRefresh={handleRefresh}
                onFetch={handleFetch}
                onSave={handleSave}
                onDownload={handleDownload}
                gazette={gazette}
                scope="mindep"
            />


            {transactions.length > 0 && selectedGazetteFormat == 'initial' && (
                <InitialPreview
                    transactions={transactions}
                    expandedMinisters={expandedMinisters}
                    toggleMinister={toggleMinister}
                    onAction={updateInitial}
                    isMoved={isMoved}
                    moveList={moves}
                    handleApproveCommit={handleApproveCommit}
                    committing={committing}
                />

            )}

            {selectedGazetteFormat === 'amendment' &&
                (adds.length > 0 || terminates.length > 0 || moves.length > 0) && (
                    <AmendmentPreview
                        adds={adds}
                        terminates={terminates}
                        moves={moves}
                        handleChange={handleChange}
                        handleAddSection={handleAddSection}
                        handleDeleteSection={handleDeleteSection}
                        handleApproveCommit={async () => {
                            // Reuse the same finalization logic
                            setCommitting(true);
                            const payload = buildOrgAmendmentPayload(adds, moves, terminates);
                            try {
                                await commitMindepAmendment(gazette.date, gazette.number, payload);
                                const newData = JSON.parse(JSON.stringify(data));
                                newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = null;
                                newData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].committed = true;
                                setData(newData);
                                setRefreshFlag(prev => !prev);
                                alert('✅ Gazette committed successfully! The data will refresh from backend.');
                                handleSave();
                                if (onGazetteCommitted) onGazetteCommitted(selectedGazetteIndex);
                            } catch (error) {
                                console.error('Error committing amendment:', error);
                                alert('❌ Failed to commit amendment. Please try again.');
                            } finally {
                                setCommitting(false);
                            }
                        }}
                        committing={committing}
                    />
                )}

        </Box>
    );

};

export default TransactionPreview;
