import { Box, Collapse, InputBase, IconButton, Typography, Paper, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, } from "@mui/material";
import { styled, alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const SearchRoot = styled('div')(({ theme }) => ({
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

const StyledInput = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    width: '100%',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1.2, 1, 1.2, 0),
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
    },
}));

export const SearchBar = ({ value, onChange, placeholder }) => (
    <SearchRoot sx={{ mb: 2 }}>
        <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
        <StyledInput
            placeholder={placeholder}
            inputProps={{ 'aria-label': 'search' }}
            value={value}
            onChange={onChange}
        />
    </SearchRoot>
);

export const CollapsibleSection = ({
    expanded,
    setExpanded,
    title,
    type, // "ministers" | "persons"
    searchQuery,
    loading,
    selectedGazette,
    filteredMinisters = [],
    filteredPersons = [],
    gazetteWarnings = [],
    selectedGazetteIndex,
    getLatestUpdatedState,
    highlightMatch,
    SearchBar,
}) => {
    const isMinisters = type === "ministers";
    const filteredData = isMinisters ? filteredMinisters : filteredPersons;
    const gazetteData = isMinisters
        ? selectedGazette?.ministers
        : selectedGazette?.persons;

    return (
        <>
            <Box
                onClick={() => setExpanded((prev) => !prev)}
                sx={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    userSelect: "none",
                    mb: 1,
                    justifyContent: "space-between",
                }}
            >
                {title}
                <IconButton
                    size="small"
                    aria-label={expanded ? "Collapse section" : "Expand section"}
                    sx={{
                        transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "0.3s",
                    }}
                >
                    {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
                </IconButton>
            </Box>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                {/* search */}
                <SearchBar
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                        isMinisters
                            ? "Search ministers or departments"
                            : "Search persons or portfolios"
                    }
                />

                {/* Table */}
                {loading ? (
                    <Box display="flex" justifyContent="center" mt={4}>
                        <CircularProgress />
                    </Box>
                ) : !gazetteData ? (
                    <Paper
                        sx={{
                            p: 4,
                            mt: 4,
                            borderRadius: 3,
                            boxShadow: 3,
                            textAlign: "center",
                            bgcolor: "#fff3cd",
                            color: "#856404",
                        }}
                    >
                        <Typography variant="h6" gutterBottom>
                            ⚠️ No {isMinisters ? "ministers" : "persons"} available for this
                            gazette.
                        </Typography>
                        <Typography variant="body2">
                            Please select another gazette or add{" "}
                            {isMinisters ? "ministers" : "persons"}.
                        </Typography>
                    </Paper>
                ) : (
                    <TableContainer
                        component={Paper}
                        sx={{
                            borderRadius: 4,
                            mt: 2,
                            boxShadow: 4,
                            maxHeight: 300,
                            overflowY: "auto",
                            bgcolor: "background.paper",
                            border: "1px solid #ddd",
                        }}
                    >
                        <Table stickyHeader aria-label={`${type} table`}>
                            <TableHead sx={{ backgroundColor: "#1976d2" }}>
                                <TableRow>
                                    <TableCell
                                        sx={{
                                            fontWeight: "bold",
                                            color: "black",
                                            fontSize: "1rem",
                                            py: 1.5,
                                            px: 2,
                                            borderBottom: "none",
                                        }}
                                    >
                                        {isMinisters ? "Minister" : "Person"}
                                    </TableCell>

                                    <TableCell
                                        sx={{
                                            fontWeight: "bold",
                                            color: "black",
                                            fontSize: "1rem",
                                            py: 1.5,
                                            px: 2,
                                            borderBottom: "none",
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                width: "100%",
                                            }}
                                        >
                                            {isMinisters ? "Departments" : "Portfolios"}
                                            {gazetteWarnings[selectedGazetteIndex] && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => getLatestUpdatedState()}
                                                >
                                                    Get latest updated state
                                                </Button>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {filteredData.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={2}
                                            sx={{ textAlign: "center", py: 3 }}
                                        >
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                fontStyle="italic"
                                            >
                                                No matching records found.
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : isMinisters ? (
                                    filteredData.map((minister, idx) => (
                                        <TableRow
                                            hover
                                            key={idx}
                                            sx={{
                                                bgcolor:
                                                    idx % 2 === 0
                                                        ? "action.hover"
                                                        : "background.default",
                                            }}
                                        >
                                            <TableCell
                                                sx={{ py: 1.5, px: 2, minWidth: 150 }}
                                                dangerouslySetInnerHTML={{
                                                    __html: `${idx + 1}. ${highlightMatch(
                                                        minister.name,
                                                        searchQuery
                                                    )}`,
                                                }}
                                            />
                                            <TableCell sx={{ py: 1.5, px: 2 }}>
                                                <ol
                                                    style={{
                                                        margin: 0,
                                                        paddingLeft: "1.25rem",
                                                        fontSize: "0.9rem",
                                                        color: "#444",
                                                        listStyleType: "decimal",
                                                    }}
                                                >
                                                    {minister.departments.map((dept, dIdx) => (
                                                        <li
                                                            key={dIdx}
                                                            dangerouslySetInnerHTML={{
                                                                __html: highlightMatch(dept, searchQuery),
                                                            }}
                                                            style={{ marginBottom: "0.25rem" }}
                                                        />
                                                    ))}
                                                </ol>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    filteredData.map((person, idx) => (
                                        <TableRow
                                            hover
                                            key={idx}
                                            sx={{
                                                bgcolor:
                                                    idx % 2 === 0
                                                        ? "action.hover"
                                                        : "background.default",
                                            }}
                                        >
                                            <TableCell
                                                sx={{ py: 1.5, px: 2, minWidth: 150 }}
                                                dangerouslySetInnerHTML={{
                                                    __html: highlightMatch(person.person_name, searchQuery),
                                                }}
                                            />
                                            <TableCell sx={{ py: 1.5, px: 2 }}>
                                                <ul
                                                    style={{
                                                        margin: 0,
                                                        paddingLeft: 0,
                                                        fontSize: "0.9rem",
                                                        color: "#444",
                                                        listStyleType: "none",
                                                    }}
                                                >
                                                    {person.portfolios.map((pf, dIdx) => (
                                                        <li
                                                            key={dIdx}
                                                            dangerouslySetInnerHTML={{
                                                                __html: highlightMatch(
                                                                    `${pf.position} - ${pf.name}`,
                                                                    searchQuery
                                                                ),
                                                            }}
                                                            style={{ marginBottom: "0.25rem" }}
                                                        />
                                                    ))}
                                                </ul>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Collapse>
        </>
    );
};

export const Toolbar = ({
    onRefresh,
    onFetch,
    onSave,
    onDownload,
    gazette,
    scope, // "mindep" or "person"
}) => {
    if (!gazette) return null;

    return (
        <Box display="flex" justifyContent="space-between" mb={3} mt={2}>
            {/* Left group: Refresh, Fetch, Save */}
            <Box display="flex" gap={1}>
                <Button onClick={onRefresh} variant="outlined" color="primary">
                    🔄 Refresh
                </Button>
                <Button onClick={onFetch} variant="outlined" color="primary">
                    🔄 Fetch from last saved
                </Button>
                <Button onClick={onSave} variant="outlined" color="primary">
                    Save
                </Button>
            </Box>

            {/* Right group: Download CSVs */}
            <Box display="flex" gap={1}>
                <Button
                    onClick={() =>
                        onDownload(gazette.number, gazette.date, scope, "add")
                    }
                >
                    ADD CSV
                </Button>
                <Button
                    onClick={() =>
                        onDownload(gazette.number, gazette.date, scope, "move")
                    }
                >
                    MOVE CSV
                </Button>
                <Button
                    onClick={() =>
                        onDownload(gazette.number, gazette.date, scope, "terminate")
                    }
                >
                    TERMINATE CSV
                </Button>
            </Box>
        </Box>
    );
};


