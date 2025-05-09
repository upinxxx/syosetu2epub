import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Me from "./pages/Me";
import JobStatus from "./pages/JobStatus";
import Orders from "./pages/Orders";
import HowToUse from "./pages/HowToUse";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/me" element={<Me />} />
        <Route path="/jobs/:jobId" element={<JobStatus />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/how-to-use" element={<HowToUse />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
