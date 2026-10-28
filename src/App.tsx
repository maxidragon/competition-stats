import { Routes, Route, HashRouter } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CompetitionLayout from "./pages/competition/CompetitionLayout";
import SolvesView from "./pages/competition/SolvesView";
import SumOfRanksView from "./pages/competition/SumOfRanksView";
import KinchView from "./pages/competition/KinchView";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/competition/:competitionId" element={<CompetitionLayout />}>
          <Route index element={<SolvesView />} />
          <Route path="sor" element={<SumOfRanksView />} />
          <Route path="kinch" element={<KinchView />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
