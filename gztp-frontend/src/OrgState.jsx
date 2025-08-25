import { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Avatar, Divider } from '@mui/material';
import AddGazette from './AddGazette';
import TransactionPreview from './OrgTransactionPreview';
import ErrorIcon from '@mui/icons-material/Error';
import { fetchGazettesMeta, loadScopeState, handleGazetteCommittedShared, deriveLatestUpdatedState, handleFetchPrevious } from './shared/state';
import { SearchBar, CollapsibleSection } from './shared/ui';

const Data = {
    presidents: [
        {
            name: 'Mahinda Rajapaksa',
            imageUrl: 'https://pbs.twimg.com/profile_images/541867053351583744/rcxem8NU_400x400.jpeg',
            created: '2005-11-19',
            endDate: '2015-01-09',
            gazettes: [],
        },
        {
            name: 'Maithripala Sirisena',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTK63FcG01JQFYLMOW3Fiz7aAt53swCyNpekQ&s',
            created: '2015-01-09',
            endDate: '2019-11-18',
            gazettes: [],
        },
        {
            name: 'Gotabaya Rajapaksa',
            imageUrl: 'https://etimg.etb2bimg.com/photo/90283189.cms',
            created: '2019-11-18',
            endDate: '2022-07-14',
            gazettes: [],
        },
        {
            name: 'Ranil Wickremesinghe',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxqJKbd0DrTJUz80nbZGkkh1DVieN2p4wZAA&s',
            created: '2022-07-21',
            endDate: '2024-09-30',
            gazettes: [],
        },
        {
            name: 'Anura Kumara Dissanayake',
            imageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdOoGPxjbGmDh3erxJupQRQRIDT7IwIBNwbw&s',
            created: '2024-10-01',
            endDate: null,
            gazettes: [],
        },
    ]

};

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #ffe58f;">$1</mark>');
}

export default function StateTable() {
    const [data, setData] = useState(Data);
    const [selectedPresidentIndex, setSelectedPresidentIndex] = useState(0);
    const [selectedGazetteIndex, setSelectedGazetteIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [refreshFlag, setRefreshFlag] = useState(false);
    const [gazetteWarnings, setGazetteWarnings] = useState(() => {
        // Initially, no warnings
        return data.presidents[selectedPresidentIndex]?.gazettes?.map(() => false) || [];
    });

    const presidents = data.presidents || [];
    const selectedPresident = presidents[selectedPresidentIndex];
    const hasGazettes = selectedPresident?.gazettes?.length > 0;
    const selectedGazette = hasGazettes ? selectedPresident.gazettes[selectedGazetteIndex] : null;

    const filteredMinisters = selectedGazette?.ministers?.filter((minister) => {
        const query = searchQuery.toLowerCase();
        return (
            minister.name.toLowerCase().includes(query) ||
            minister.departments.some((d) => d.toLowerCase().includes(query))
        );
    }) || [];

   useEffect(() => {
    const loadState = async () => {
        const currentPresident = data.presidents[selectedPresidentIndex];
        const currentGazette = currentPresident?.gazettes?.[selectedGazetteIndex];
        if (!currentGazette) return;

        if (currentGazette.ministers !== null && currentGazette.ministers !== undefined) return;

        setLoading(true);
        try {
            const backendMinisters = await loadScopeState('mindep', currentGazette.date, currentGazette.number);
            const updatedData = JSON.parse(JSON.stringify(data));

            if (backendMinisters?.length > 0) {
                updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = backendMinisters;
            } else {
                if (selectedGazetteIndex > 0) {
                    // previous gazette of the same president
                    const prevMinisters = currentPresident.gazettes[selectedGazetteIndex - 1]?.ministers || [];
                    updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = prevMinisters;
                } else if (selectedPresidentIndex > 0) {
                    // first gazette of this president, assign last ministers from previous president
                    const prevPresident = data.presidents[selectedPresidentIndex - 1];
                    const lastGazette = prevPresident.gazettes?.[prevPresident.gazettes.length - 1];
                    const prevMinisters = lastGazette?.ministers || [];
                    updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = prevMinisters;
                } else {
                    // no previous president, no previous gazette
                    updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = [];
                }
            }

            setData(updatedData);
        } catch (err) {
            console.warn("Failed to fetch state:", err);
        } finally {
            setLoading(false);
        }
    };

    loadState();
}, [data, selectedPresidentIndex, selectedGazetteIndex, refreshFlag]);


    useEffect(() => {
        const fetchGazettes = async () => {
            if (!selectedPresident) return;
            if (selectedPresident.gazettes && selectedPresident.gazettes.length > 0) return;

            const startDate = selectedPresident.created;
            const endDate = selectedPresident.endDate || new Date().toISOString().split("T")[0]; // today if still in office

            try {
                const { gazettes, warnings } = await fetchGazettesMeta('mindep', startDate, endDate);

                setData(prev => {
                    const updated = JSON.parse(JSON.stringify(prev));
                    updated.presidents[selectedPresidentIndex].gazettes = gazettes;
                    return updated;
                });

                setGazetteWarnings(warnings);
            } catch (err) {
                console.error("Failed to fetch gazettes:", err);
            }
        };

        fetchGazettes();
    }, [selectedPresidentIndex]);


    const handleGazetteCommitted = (committedIndex) => {
        setGazetteWarnings(() => handleGazetteCommittedShared(data, selectedPresidentIndex, committedIndex));
    };

    const getLatestUpdatedState = () => {
        const updated = deriveLatestUpdatedState(data, selectedPresidentIndex, selectedGazetteIndex, 'ministers');
        setData(updated);
    }

    return (
        <Box p={4} sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">Org State</Typography>
            <Divider sx={{ my: 3 }} />

            {/* Presidents */}
            {presidents.length === 0 ? (
                <>
                    <Typography variant="body1" color="text.secondary">⚠️ No presidents available.</Typography>
                    <Button> Add President </Button>
                </>
            ) : (
                <Box sx={{ maxWidth: '100%', overflow: 'hidden', mb: 4 }}>
                    {/* SCROLLER: only X scrolls, with comfy side padding */}
                    <Box
                        sx={{
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            px: 1,
                            py: 1,
                            scrollbarWidth: 'none', // Firefox
                            '&::-webkit-scrollbar': {
                                display: 'none', // Chrome, Safari
                            },
                        }}
                    >
                        {/* TRACK: actual content row */}
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'flex-start',
                                width: 'max-content',
                                position: 'relative',
                                // soft spacers at both ends so names aren’t cut at edges
                                '&::before, &::after': {
                                    content: '""',
                                    display: 'block',
                                    
                                },
                            }}
                        >
                            {presidents.map((pres, idx) => (
                                <Box
                                    key={idx}
                                    onClick={() => {
                                        setSelectedPresidentIndex(idx);
                                        setSelectedGazetteIndex(0);
                                    }}
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        textAlign: "center",
                                        cursor: "pointer",
                                        transform: idx === selectedPresidentIndex ? "scale(1.5)" : "scale(1)",
                                        transformOrigin: "center top",
                                        transition: "transform 0.3s",
                                        minWidth: 80,
                                        overflowY: 'hidden',
                                        paddingBottom: 4,
                                    }}
                                >
                                    <Avatar
                                        src={pres.imageUrl}
                                        sx={{
                                            width: 36,
                                            height: 36,
                                            mb: 1,
                                            boxShadow: idx === selectedPresidentIndex ? 4 : 1,
                                        }}
                                    />
                                    <Typography variant="body2" fontWeight="medium" noWrap>
                                        {pres.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {pres.created ? `${pres.created.split('-')[0]} - ${pres.endDate?.split('-')[0] || 'Present'}` : 'N/A'}

                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Box>

            )}


            {/* Gazette Tabs */}
            {hasGazettes ? (
                <>
                    <Box
                        sx={{
                            display: 'flex',
                            overflowX: 'auto',
                            whiteSpace: 'nowrap',
                            mb: 3,
                            gap: 2,
                            paddingBottom: 1,
                        }}
                    >
                        {selectedPresident.gazettes.map((gazette, gIdx) => (
                            <Box
                                key={gIdx}
                                sx={{ display: 'inline-block', mr: 2, position: 'relative' }}

                            >
                                <Paper
                                    elevation={gIdx === selectedGazetteIndex ? 6 : 1}
                                    onClick={() => setSelectedGazetteIndex(gIdx)}
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        cursor: 'pointer',
                                        borderRadius: '12px',
                                        border: gIdx === selectedGazetteIndex ? '2px solid #1976d2' : '1px solid #ddd',
                                        backgroundColor: gIdx === selectedGazetteIndex ? '#e0e8f0ff' : 'white',
                                        display: 'inline-block',
                                        backgroundColor: gazette.committed ? '#cce8baff' : '#e7c6c6ff'
                                    }}
                                >
                                    <Typography variant="body2" fontWeight="medium">
                                        {gazette.number}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {gazette.date}
                                    </Typography>
                                </Paper>

                                {/* Warning icon for gazettes with warnings */}
                                {gazetteWarnings[gIdx] && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 1,   // lifted higher
                                            right: -3, // pushed outwards
                                            backgroundColor: 'white', // white circle background
                                            borderRadius: '50%',
                                            width: 12,
                                            height: 12,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            pointerEvents: 'none',
                                        }}
                                        title="This gazette must be redone because of earlier changes"
                                    >
                                        <ErrorIcon sx={{ fontSize: 17, color: '#d32f2f' }} />
                                    </Box>

                                )}

                            </Box>
                        ))}

                        <AddGazette
                            onAdd={({ gazetteNumber, gazetteDate, gazetteType, transactions, adds, moves, terminates }) => {
                                const newGazette = {
                                    number: gazetteNumber,
                                    date: gazetteDate,
                                    gazette_format: gazetteType,
                                    ministers: null,
                                    // If initial, use transactions; if amendment, use the trio
                                    transactions: gazetteType === 'initial' ? transactions : undefined,
                                    adds: gazetteType === 'amendment' ? adds || [] : [],
                                    moves: gazetteType === 'amendment' ? moves || [] : [],
                                    terminates: gazetteType === 'amendment' ? terminates || [] : [],
                                };

                                const updatedData = JSON.parse(JSON.stringify(data));
                                updatedData.presidents[selectedPresidentIndex].gazettes.push(newGazette);
                                const newGazetteIndex = updatedData.presidents[selectedPresidentIndex].gazettes.length - 1;

                                setData(updatedData);

                                setGazetteWarnings((prevWarnings) => {
                                    const hasWarnings = prevWarnings.some((w) => w === true);
                                    return [...prevWarnings, hasWarnings]; // append true if any warning exists, else false
                                });

                                setSelectedGazetteIndex(newGazetteIndex); // auto-switch to new gazette
                            }}
                        />
                    </Box>

                    <CollapsibleSection
                        expanded={expanded}
                        setExpanded={setExpanded}
                        title={<Typography variant="h6">Current State</Typography>}
                        type="ministers"
                        searchQuery={searchQuery}
                        loading={loading}
                        selectedGazette={selectedGazette}
                        filteredMinisters={filteredMinisters}
                        gazetteWarnings={gazetteWarnings}
                        selectedGazetteIndex={selectedGazetteIndex}
                        getLatestUpdatedState={getLatestUpdatedState}
                        highlightMatch={highlightMatch}
                        SearchBar={SearchBar}
                         onFetchPrevious={() => handleFetchPrevious("ministers", selectedPresidentIndex, data, selectedGazetteIndex, setData)}
                    />

                    <TransactionPreview
                        transactions={
                            Array.isArray(selectedGazette?.transactions)
                                ? selectedGazette.transactions
                                : Array.isArray(selectedGazette)
                                    ? selectedGazette
                                    : []
                        }
                        moves={
                            Array.isArray(selectedGazette?.moves)
                                ? selectedGazette.moves
                                : Array.isArray(selectedGazette?.transactions?.moves)
                                    ? selectedGazette.transactions.moves
                                    : []
                        }

                        adds={
                            Array.isArray(selectedGazette?.adds)
                                ? selectedGazette.adds
                                : Array.isArray(selectedGazette?.transactions?.adds)
                                    ? selectedGazette.transactions.adds
                                    : []
                        }
                        terminates={
                            Array.isArray(selectedGazette?.terminates)
                                ? selectedGazette.terminates
                                : Array.isArray(selectedGazette?.transactions?.terminates)
                                    ? selectedGazette.transactions.terminates
                                    : []
                        }
                        selectedGazetteFormat={selectedGazette.gazette_format}
                        data={data}
                        selectedPresidentIndex={selectedPresidentIndex}
                        selectedGazetteIndex={selectedGazetteIndex}
                        setData={setData}
                        setRefreshFlag={setRefreshFlag}
                        onGazetteCommitted={handleGazetteCommitted}
                    />

                </>
            ) : (
                <Box
                    sx={{
                        display: 'flex',
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        mb: 3,
                        gap: 2,
                        paddingBottom: 1,
                    }}
                >
                    <Typography
                        sx={{
                            px: 2,
                            py: 1,
                            cursor: 'pointer',
                            borderRadius: '12px',
                            height: '40px',
                            display: 'inline-block',

                        }}
                        variant="body1" color="text.secondary">
                        No gazettes available for <strong>{selectedPresident.name}</strong>.
                    </Typography>
                    <AddGazette
                        onAdd={({ gazetteNumber, gazetteDate, gazetteType, transactions, adds, moves, terminates }) => {
                            const newGazette = {
                                number: gazetteNumber,
                                date: gazetteDate,
                                gazette_format: gazetteType,
                                ministers: null,
                                // If initial, use transactions; if amendment, use the trio
                                transactions: gazetteType === 'initial' ? transactions : undefined,
                                adds: gazetteType === 'amendment' ? adds || [] : [],
                                moves: gazetteType === 'amendment' ? moves || [] : [],
                                terminates: gazetteType === 'amendment' ? terminates || [] : [],
                            };

                            const updatedData = JSON.parse(JSON.stringify(data));
                            updatedData.presidents[selectedPresidentIndex].gazettes.push(newGazette);
                            const newGazetteIndex = updatedData.presidents[selectedPresidentIndex].gazettes.length - 1;

                            setData(updatedData);

                            setGazetteWarnings((prevWarnings) => {
                                const hasWarnings = prevWarnings.some((w) => w === true);
                                return [...prevWarnings, hasWarnings]; // append true if any warning exists, else false
                            });

                            setSelectedGazetteIndex(newGazetteIndex); // auto-switch to new gazette
                        }}
                    />
                </Box>
            )}
        </Box>

    );
}
