import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StateTable from "./StateTable";
import Person from "./Person";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StateTable />} />
        <Route path="/person" element={<Person/>}/>
      </Routes>
    </Router>
  );
}
