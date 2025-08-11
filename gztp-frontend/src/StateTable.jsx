import { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, InputBase, Avatar, Divider, CircularProgress, IconButton, Collapse, } from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddGazette from './AddGazette';
import InitialTransactionPreview from './InitialTransactionPreview';

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.grey[900], 0.05),
    '&:hover': {
        backgroundColor: alpha(theme.palette.grey[900], 0.1),
    },
    marginLeft: theme.spacing(2),

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

const Data = {
    presidents: [
        {
            name: 'President A',
            imageUrl: '',
            created: '2022-01-01',
            gazettes: [],
        },
        {
            name: 'President B',
            imageUrl: '',
            created: '2024-01-01',
            gazettes: [],
        },
        {
            name: 'President C',
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

            // Only load if ministers not yet set or explicitly null to avoid infinite loops
            if (currentGazette.ministers !== null && currentGazette.ministers !== undefined) return;

            setLoading(true);
            try {
                const res = await axios.get(
                    `http://localhost:8000/mindep/state/${currentGazette.date}/${currentGazette.number}`
                );
                const backendMinisters = res.data.state?.ministers;

                const updatedData = JSON.parse(JSON.stringify(data));

                if (backendMinisters?.length > 0) {
                    updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = backendMinisters;
                } else {
                    // If no backend ministers for current gazette, fallback to previous gazette ministers
                    if (selectedGazetteIndex > 0) {
                        const prevMinisters = currentPresident.gazettes[selectedGazetteIndex - 1]?.ministers || [];
                        updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].ministers = prevMinisters;
                    } else {
                        // No previous gazette, so empty ministers
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
            try {
                const res = await axios.get('http://localhost:8000/mindep/state/gazettes');
                const gazettes = res.data;

                if (!gazettes || gazettes.length === 0) {
                    console.error("⚠️ No gazettes found.");
                    return;
                }

                const enrichedGazettes = gazettes.map((g) => ({
                    number: g.gazette_number,
                    date: g.date,
                    ministers: null,
                    transactions: null,
                    terminates: [],
                    moves: [],
                    adds: []
                }));

                const updated = JSON.parse(JSON.stringify(Data));

                updated.presidents[selectedPresidentIndex].gazettes = enrichedGazettes;

                setData(updated);

            } catch (err) {
                console.error("Failed to fetch gazettes:", err);
            }
        };

        fetchGazettes();
    }, []);

    const handleGazetteCommitted = (committedIndex) => {
        setGazetteWarnings((prev) => {
            const gazettes = data.presidents[selectedPresidentIndex]?.gazettes || [];
            const newWarnings = prev.slice();

            // Clear warning on committed gazette
            newWarnings[committedIndex] = false;

            // Mark all gazettes after committedIndex as needing redo
            for (let i = committedIndex + 1; i < gazettes.length; i++) {
                newWarnings[i] = true;
            }

            return newWarnings;
        });
    };


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
                                            top: 4,
                                            right: 4,
                                            color: '#d32f2f',
                                            fontSize: '18px',
                                            pointerEvents: 'none',
                                        }}
                                        title="This gazette must be redone because of earlier changes"
                                    >
                                        ⚠️
                                    </Box>
                                )}

                            </Box>
                        ))}

                        <AddGazette
                            onAdd={({ gazetteNumber, gazetteDate, gazetteType, transactions }) => {
                                const newGazette = {
                                    number: gazetteNumber,
                                    date: gazetteDate,
                                    type: gazetteType,
                                    ministers: null,
                                    transactions, // this will be used in preview
                                };
                                const updatedData = JSON.parse(JSON.stringify(data));
                                updatedData.presidents[selectedPresidentIndex].gazettes.push(newGazette);
                                const newGazetteIndex = updatedData.presidents[selectedPresidentIndex].gazettes.length - 1;

                                setData(updatedData);

                                // Add warning for the new gazette if any existing warnings are present
                                setGazetteWarnings((prevWarnings) => {
                                    const hasWarnings = prevWarnings.some((w) => w === true);
                                    return [...prevWarnings, hasWarnings]; // append true if any warning exists, else false
                                });

                                setSelectedGazetteIndex(newGazetteIndex); // auto-switch to new gazette
                            }}
                        />

                    </Box>

                    {/* Expand/Collapse Header */}
                    <Box
                        onClick={() => setExpanded((prev) => !prev)}
                        sx={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            userSelect: 'none',
                            mb: 1,
                            justifyContent: 'space-between',

                        }}
                    >
                        <Typography variant="h6"> Current State </Typography>
                        <IconButton
                            size="small"
                            aria-label={expanded ? 'Collapse section' : 'Expand section'}
                            sx={{
                                transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: '0.3s',
                            }}
                        >
                            {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                        </IconButton>
                    </Box>

                    {/* Collapsible Search + Table */}
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
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
  <Box display="flex" justifyContent="center" mt={4}>
    <CircularProgress />
  </Box>
) : !selectedGazette?.ministers ? (
  <Paper
    sx={{
      p: 4,
      mt: 4,
      borderRadius: 3,
      boxShadow: 3,
      textAlign: 'center',
      bgcolor: '#fff3cd', // light warning bg
      color: '#856404', // dark warning text
    }}
  >
    <Typography variant="h6" gutterBottom>⚠️ No ministers available for this gazette.</Typography>
    <Typography variant="body2">Please select another gazette or add ministers.</Typography>
  </Paper>
) : (
  <TableContainer
    component={Paper}
    sx={{
      borderRadius: 4,
      mt: 2,
      boxShadow: 4,
      maxHeight: 300,
      overflowY: 'auto',
      bgcolor: 'background.paper',
      border: '1px solid #ddd',
    }}
  >
    <Table stickyHeader aria-label="ministers table">
      <TableHead
        sx={{
          backgroundColor: '#1976d2',
        }}
      >
        <TableRow>
          <TableCell
            sx={{
              fontWeight: 'bold',
              color: 'black',
              fontSize: '1rem',
              py: 1.5,
              px: 2,
              borderBottom: 'none',
            }}
          >
            Minister
          </TableCell>
          <TableCell
            sx={{
              fontWeight: 'bold',
              color: 'black',
              fontSize: '1rem',
              py: 1.5,
              px: 2,
              borderBottom: 'none',
            }}
          >
            Departments
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredMinisters.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2} sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                No matching records found.
              </Typography>
            </TableCell>
          </TableRow>
        ) : (
          filteredMinisters.map((minister, idx) => (
            <TableRow
              hover
              key={idx}
              sx={{
                bgcolor: idx % 2 === 0 ? 'action.hover' : 'background.default',
              }}
            >
              <TableCell
                sx={{ py: 1.5, px: 2, minWidth: 150 }}
                dangerouslySetInnerHTML={{
                  __html: `${idx + 1}. ${highlightMatch(minister.name, searchQuery)}`,
                }}
              />
              <TableCell sx={{ py: 1.5, px: 2 }}>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    fontSize: '0.9rem',
                    color: '#444',
                    listStyleType: 'decimal',
                  }}
                >
                  {minister.departments.map((dept, dIdx) => (
                    <li
                      key={dIdx}
                      dangerouslySetInnerHTML={{ __html: highlightMatch(dept, searchQuery) }}
                      style={{ marginBottom: '0.25rem' }}
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

                    </Collapse>
                    <InitialTransactionPreview
                        selectedGazette={
                            Array.isArray(selectedGazette?.transactions)
                                ? selectedGazette.transactions
                                : Array.isArray(selectedGazette)
                                    ? selectedGazette
                                    : []
                        }
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
                        onAdd={({ gazetteNumber, gazetteDate, gazetteType, transactions }) => {
                            const newGazette = {
                                number: gazetteNumber,
                                date: gazetteDate,
                                type: gazetteType,
                                ministers: null,
                                transactions, // this will be used in preview
                            };
                            const updatedData = JSON.parse(JSON.stringify(data));
                            updatedData.presidents[selectedPresidentIndex].gazettes.push(newGazette);
                            const newGazetteIndex = updatedData.presidents[selectedPresidentIndex].gazettes.length - 1;

                            setData(updatedData);
                            setSelectedGazetteIndex(newGazetteIndex);
                            setRefreshFlag(prev => !prev); // auto-switch to new gazette
                        }}
                    />
                </Box>
            )}
        </Box>

    );
}
