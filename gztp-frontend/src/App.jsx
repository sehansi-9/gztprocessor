import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import OrgState from "./OrgState";
import PersonState from "./PersonState";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OrgState />} />
        <Route path="/person" element={<PersonState/>}/>
      </Routes>
    </Router>
  );
}
