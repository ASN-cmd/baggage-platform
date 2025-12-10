import { BrowserRouter, Routes, Route } from "react-router-dom";

import SidebarLayout from "./layout/SidebarLayout";
import ClientsPage from "./pages/ClientsPage";
import ProjectsPage from "./pages/ProjectsPage";
import CamerasPage from "./pages/CamerasPage";
import LiveCameraPage from "./pages/LiveCameraPage";


function App() {
  return (
    <BrowserRouter>
      <SidebarLayout>
        <Routes>
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/cameras" element={<CamerasPage />} />
          <Route path="/live" element={<LiveCameraPage />} />
        </Routes>
      </SidebarLayout>
    </BrowserRouter>
  );
}

export default App;
