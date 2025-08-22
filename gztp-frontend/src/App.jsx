import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import StateTable from "./StateTable";
import PersonState from "./PersonState";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StateTable />} />
        <Route path="/person" element={<PersonState/>}/>
      </Routes>
    </Router>
  );
}
