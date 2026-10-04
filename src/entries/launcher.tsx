import { createRoot } from "react-dom/client";
import { Launcher } from "../ui/Launcher";
import "../styles.css";
createRoot(document.getElementById("root")!).render(<Launcher hrefOf={(p) => `./${p}/`} />);
