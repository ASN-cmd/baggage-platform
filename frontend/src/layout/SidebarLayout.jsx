import { Link } from "react-router-dom";
import "./sidebar.css";

export default function SidebarLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      {/* Sidebar */}
      <div className="sidebar">
        <h2>Baggage AI</h2>
        <Link to="/clients">Clients</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/cameras">Cameras</Link>
        <Link to="/live">Live Stream</Link>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px" }}>
        {children}
      </div>
    </div>
  );
}
