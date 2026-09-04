import React from "react";
import { createRoot } from "react-dom/client";
import MemoryCalendar from "./memory-calendar.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MemoryCalendar />
  </React.StrictMode>
);
