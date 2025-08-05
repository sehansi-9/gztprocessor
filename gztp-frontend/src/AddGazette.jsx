import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';

const AddGazette = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [gazetteNumber, setGazetteNumber] = useState('');
  const [gazetteDate, setGazetteDate] = useState('');

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setGazetteNumber('');
    setGazetteDate('');
    setOpen(false);
  };

  const handleSubmit = () => {
    if (gazetteNumber && gazetteDate) {
      onAdd({ number: gazetteNumber, date: gazetteDate });
      handleClose();
    }
  };

  return (
    <>
      <Button
        variant="contained"
        onClick={handleOpen}
        sx={{
          cursor: 'pointer',
          borderRadius: '12px',
          border: '2px solid #1976d2',
          backgroundColor: '#1976d2',
        }}
      >
        <strong>add</strong>
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add Gazette</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Gazette Number"
            fullWidth
            value={gazetteNumber}
            onChange={(e) => setGazetteNumber(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Gazette Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={gazetteDate}
            onChange={(e) => setGazetteDate(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddGazette;
