import { useMemo, useState } from "react";
import Shell from "./ui/Shell";
import Home from "./pages/Home";
import Sources from "./pages/Sources";
import Live from "./pages/Live";
import Storage from "./pages/Storage";

type RouteKey = "home" | "sources" | "live" | "storage";

export default function App() {
  const [route, setRoute] = useState<RouteKey>("home");

  const view = useMemo(() => {
    if (route === "sources") return <Sources />;
    if (route === "live") return <Live />;
    if (route === "storage") return <Storage />;
    return <Home />;
  }, [route]);

  return (
    <Shell route={route} onRoute={setRoute}>
      {view}
    </Shell>
  );
}
