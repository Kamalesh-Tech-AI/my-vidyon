import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./lib/supabase";

// Hydrate auth session BEFORE React renders
// This eliminates loading states on page refresh (Ctrl+R)
const { data: { session } } = await supabase.auth.getSession();

createRoot(document.getElementById("root")!).render(
    <App initialSession={session} />
);
