import React from 'react';
import {
  Box, Typography, Paper, Button, Divider, FormControlLabel, Checkbox,
} from '@mui/material';

const TransactionPreview = ({
  selectedGazette,
  data,
  selectedPresidentIndex,
  selectedGazetteIndex,
  setData,
}) => {
  const gazette = data?.presidents?.[selectedPresidentIndex]?.gazettes?.[selectedGazetteIndex];
  if (!gazette || !Array.isArray(selectedGazette)) return null;

  const terminateList = gazette.terminated || [];

  const makeKey = (ministerName, departmentName) => `${ministerName}||${departmentName}`;

  const isTerminated = (ministerName, departmentName) => {
    const key = makeKey(ministerName, departmentName);
    return terminateList.some(item => makeKey(item.mName, item.dName) === key);
  };

  const handleToggleTerminate = (ministerName, departmentName, previousMinistry) => {
    const key = makeKey(ministerName, departmentName);
    const updatedData = JSON.parse(JSON.stringify(data));
    const terminations = updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].terminated || [];

    const exists = terminations.some(item => makeKey(item.mName, item.dName) === key);
    const updatedTerminations = exists
      ? terminations.filter(item => makeKey(item.mName, item.dName) !== key)
      : [...terminations, { mName: ministerName, dName: departmentName, prevMinistry: previousMinistry }];

    updatedData.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex].terminated = updatedTerminations;
    setData(updatedData);
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
                <Typography variant="body2">{i+1} {dept.name}</Typography>

                {dept.previous_ministry && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isTerminated(min.name, dept.name)}
                        onChange={() =>
                          handleToggleTerminate(min.name, dept.name, dept.previous_ministry)
                        }
                      />
                    }
                    label={`Mark previous ministry (${dept.previous_ministry}) for termination`}
                    sx={{ ml: 2 }}
                  />
                )}
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />
          </Box>
        ))}

        {terminateList.length > 0 && (
          <Box mt={3} p={2} bgcolor="#f5f5f5" borderRadius={2}>
            <Typography variant="subtitle1" gutterBottom>🗑️ Departments Marked for Termination</Typography>
            {terminateList.map(({ dName, prevMinistry }, i) => (
              <Typography key={i} variant="body2">
                ❌ {dName} from {prevMinistry}
              </Typography>
            ))}
          </Box>
        )}

        <Button
          variant="contained"
          color="success"
          sx={{ mt: 3 }}
          onClick={() => {
            const updated = JSON.parse(JSON.stringify(data));
            const g = updated.presidents[selectedPresidentIndex].gazettes[selectedGazetteIndex];

            g.ministers = selectedGazette.map(min => ({
              name: min.name,
              departments: min.departments,
            }));

            g.terminated = terminateList.map(({ mName, dName, prevMinistry }) => ({
              minister: mName,
              department: dName,
              previous_ministry: prevMinistry,
              reason: 'Department moved',
            }));           
          }}
        >
          Approve & Commit Gazette
        </Button>
      </Paper>
    </Box>
  );
};

export default TransactionPreview;
