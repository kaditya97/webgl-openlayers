import { useState } from "react";
import WebGLApp from './WebGLApp.tsx';
import VectorApp from './VectorApp.tsx';
import ImageApp from "./ImageApp.tsx";
import TopoApp from "./TopoApp.tsx";
import SimplifyApp from "./SimplifyApp.tsx";
import GeojsonvtApp from "./GeojsonvtApp.tsx";

const appConfig = [
  { id: "WebGLApp", name: "WebGL", component: WebGLApp },
  { id: "VectorApp", name: "Vector", component: VectorApp },
  { id: "ImageApp", name: "Image", component: ImageApp },
  { id: "TopoApp", name: "Topo", component: TopoApp },
  { id: "SimplifyApp", name: "Simplify", component: SimplifyApp },
  { id: "GeojsonvtApp", name: "Geojsonvt", component: GeojsonvtApp },
];

const App = () => {
  const [selectedApp, setSelectedApp] = useState("WebGLApp");

  // Get the selected component
  const SelectedComponent = appConfig.find(app => app.id === selectedApp)?.component || TopoApp;

  return (
    <div className="relative h-screen flex flex-col">
      {/* Navigation Buttons - Takes only required height */}
      <nav className="flex p-4 bg-gray-200 gap-4">
        {appConfig.map((app) => (
          <button
            key={app.id}
            onClick={() => setSelectedApp(app.id)}
            className={`px-4 py-2 rounded-lg transition duration-300 cursor-pointer ${
              selectedApp === app.id ? "bg-blue-700 text-white" : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {app.name}
          </button>
        ))}
      </nav>

      {/* Main Content - Takes remaining height */}
      <main className="flex-grow">
        <SelectedComponent />
      </main>
    </div>
  );
};

export default App;
