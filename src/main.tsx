import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./lib/supabase";

// Hydrate auth session BEFORE React renders
// This eliminates loading states on page refresh (Ctrl+R)
// Wrapped in async IIFE to support ES2020 target
(async () => {
    const { data: { session } } = await supabase.auth.getSession();

    createRoot(document.getElementById("root")!).render(
        <App initialSession={session} />
    );
})();
