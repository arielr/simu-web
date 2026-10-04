import { createRoot } from "react-dom/client";
import { App as AppJs } from "../ui/App";
import "../styles.css";
const App = AppJs as unknown as (p: { onHome?: () => void }) => JSX.Element;
createRoot(document.getElementById("root")!).render(<App onHome={() => { location.href = "../"; }} />);
