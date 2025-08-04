import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    InputBase,
    Avatar,
    Divider,
    CircularProgress,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.grey[900], 0.05),
    '&:hover': {
        backgroundColor: alpha(theme.palette.grey[900], 0.1),
    },
    marginLeft: theme.spacing(2),
    width: '100%',
    maxWidth: 400,
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    width: '100%',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1.2, 1, 1.2, 0),
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
    },
}));

const dummyData = {
    presidents: [
        {
            name: 'President A',
            imageUrl: '',
            created: '2022-01-01',
            gazettes: [
                { number: '2289-43', date: '2022-07-22', ministers: null },
                { number: '2297-78', date: '2022-09-16', ministers: null },
                { number: '2300-24', date: '2022-09-16', ministers: null },
            ],
        },
        {
            name: 'President B',
            imageUrl: '',
            created: '2024-01-01',
            gazettes: [],
        },
    ],
};

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #ffe58f;">$1</mark>');
}

export default function StateTable() {
    const [data, setData] = useState(dummyData);
    const [selectedPresidentIndex, setSelectedPresidentIndex] = useState(0);
    const [selectedGazetteIndex, setSelectedGazetteIndex] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

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
            if (!selectedGazette || selectedGazette.ministers) return;
            setLoading(true);
            try {
                const res = await axios.get(`http://localhost:8000/mindep/state/${selectedGazette.date}/${selectedGazette.number}`);
                const updatedData = { ...data };
                updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = res.data.state.ministers;
                setData(updatedData);
            } catch (err) {
                console.error("Failed to fetch gazette state:", err);
            } finally {
                setLoading(false);
            }
        };

        loadState();
    }, [selectedGazetteIndex, selectedPresidentIndex]);

    return (
        <Box p={4} sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">Org State</Typography>
            <Divider sx={{ my: 3 }} />

            {/* Presidents */}
            {presidents.length === 0 ? (
                <Typography variant="body1" color="text.secondary">⚠️ No presidents available.</Typography>
            ) : (
                <Box display="flex" gap={14} mb={4}>
                    {presidents.map((pres, idx) => (
                        <Box
                            key={idx}
                            onClick={() => {
                                setSelectedPresidentIndex(idx);
                                setSelectedGazetteIndex(0);
                            }}
                            sx={{
                                textAlign: 'center',
                                cursor: 'pointer',
                                transform: idx === selectedPresidentIndex ? 'scale(1.5)' : 'scale(1)',
                                transition: 'transform 0.3s',
                            }}
                        >
                            <Avatar src={pres.imageUrl} sx={{ width: 36, height: 36, mb: 1, ml: 2.5, boxShadow: idx === selectedPresidentIndex ? 4 : 1 }} />
                            <Typography variant="body1" fontWeight="medium">{pres.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{pres.created?.split('-')[0] || 'N/A'}</Typography>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Gazette Tabs */}
            {hasGazettes ? (
                <>
                    <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                        {selectedPresident.gazettes.map((gazette, gIdx) => (
                            <Paper
                                elevation={gIdx === selectedGazetteIndex ? 6 : 1}
                                key={gIdx}
                                onClick={() => setSelectedGazetteIndex(gIdx)}
                                sx={{
                                    px: 2,
                                    py: 1,
                                    cursor: 'pointer',
                                    borderRadius: '12px',
                                    border: gIdx === selectedGazetteIndex ? '2px solid #1976d2' : '1px solid #ddd',
                                    backgroundColor: gIdx === selectedGazetteIndex ? '#15191dff' : 'white',
                                }}
                            >
                                <Typography variant="body2" fontWeight="medium">{gazette.number}</Typography>
                                <Typography variant="caption" color="text.secondary">{gazette.date}</Typography>
                            </Paper>
                        ))}
                    </Box>

                    {/* Search */}
                    <Search sx={{ mb: 2 }}>
                        <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
                        <StyledInputBase
                            placeholder="Search ministers or departments"
                            inputProps={{ 'aria-label': 'search' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </Search>

                    {/* Table */}
                    {loading ? (
                        <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
                    ) : !selectedGazette?.ministers ? (
                        <Paper sx={{ p: 4, mt: 4, borderRadius: 3, boxShadow: 3 }}>
                            <Typography variant="body1" color="error">⚠️ No ministers available for this gazette.</Typography>
                        </Paper>
                    ) : (
                        <TableContainer
                            component={Paper}
                            sx={{
                                borderRadius: 3,
                                mt: 2,
                                boxShadow: 3,
                                maxHeight: 200,
                                overflowY: 'auto',
                            }}
                        >
                            <Table stickyHeader>
                                <TableHead
                                    sx={{
                                        backgroundColor: '#f5f5f5',
                                    }}
                                >
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Minister</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>Departments</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredMinisters.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2}>
                                                <Typography variant="body2" color="text.secondary">
                                                    No matching records found.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : (

                                        filteredMinisters.map((minister, idx) => (
                                            <TableRow hover key={idx}>
                                                <TableCell
                                                    dangerouslySetInnerHTML={{
                                                        __html: `${idx + 1}. ${highlightMatch(minister.name, searchQuery)}`,
                                                    }}
                                                />
                                                <TableCell>
                                                    <ol style={{ margin: 0, paddingLeft: '1rem' }}>
                                                        {minister.departments.map((dept, dIdx) => (
                                                            <li
                                                                key={dIdx}
                                                                dangerouslySetInnerHTML={{ __html: highlightMatch(dept, searchQuery) }}
                                                            />
                                                        ))}
                                                    </ol>
                                                </TableCell>
                                            </TableRow>
                                        ))


                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                    )}
                </>
            ) : (
                <Typography variant="body1" color="text.secondary">
                    No gazettes available for <strong>{selectedPresident.name}</strong>.
                </Typography>
            )}
        </Box>
    );
}
