// Builders to create payloads for commit actions

export const buildOrgInitialPayload = (transactions, moves) => {
    const movedDepartmentsSet = new Set((moves || []).map(({ dName, mName }) => `${dName}::${mName}`));
    const payloadMinisters = (transactions || [])
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
    return payloadMinisters;
};

export const buildOrgAmendmentPayload = (adds, moves, terminates) => {
    const filteredAdds = (adds || []).filter(item => item.department?.trim() && item.to_ministry?.trim());
    const filteredMoves = (moves || []).filter(item => item.department?.trim() && item.from_ministry?.trim() && item.to_ministry?.trim());
    const filteredTerminates = (terminates || []).filter(item => item.department?.trim() && item.from_ministry?.trim());

    return {
        transactions: {
            adds: filteredAdds.map(item => ({
                type: 'ADD',
                department: item.department,
                to_ministry: item.to_ministry,
                position: Number(item.position) || 0,
            })),
            moves: filteredMoves.map(item => ({
                type: 'MOVE',
                department: item.department,
                from_ministry: item.from_ministry,
                to_ministry: item.to_ministry,
                position: Number(item.position) || 0,
            })),
            terminates: filteredTerminates.map(item => ({
                type: 'TERMINATE',
                department: item.department,
                from_ministry: item.from_ministry,
            })),
        },
    };
};

export const buildPersonPayload = (transactions) => {
    const filteredAdds = (transactions.adds || []).filter(
        (item) => item.new_person?.trim() && item.new_ministry?.trim() && item.new_position?.trim()
    );
    const filteredMoves = (transactions.moves || []).filter(
        (item) =>item.name?.trim() && item.from_ministry?.trim() && item.to_ministry?.trim() &&(item.from_position?.trim() && item.to_position?.trim())
    );

    const filteredTerminates = (transactions.terminates || []).filter(
        (item) => item.name?.trim() && item.ministry?.trim() && item.position?.trim()
    );

    const today = new Date().toISOString().split('T')[0];
    return {
        transactions: {
            adds: filteredAdds.map((item) => ({
                type: 'ADD',
                new_person: item.new_person,
                new_ministry: item.new_ministry,
                new_position: item.new_position,
                date: item.date || today,
            })),
            moves: filteredMoves.map((item) => ({
                type: 'MOVE',
                name: item.name,
                from_ministry: item.from_ministry,
                to_ministry: item.to_ministry,
                to_position: item.to_position,
                from_position: item.from_position,
                date: item.date || today,
            })),
            terminates: filteredTerminates.map((item) => ({
                type: 'TERMINATE',
                name: item.name,
                ministry: item.ministry,
                position: item.position,
                date: item.date || today,
            })),
        },
    };
};


