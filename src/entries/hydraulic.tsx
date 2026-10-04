import { createRoot } from "react-dom/client";
import { FluidApp } from "../fluid/FluidApp";
import "../styles.css";
createRoot(document.getElementById("root")!).render(<FluidApp domain="hyd" onHome={() => { location.href = "../"; }} />);
