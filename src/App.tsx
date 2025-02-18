import React, { useState } from "react";
import WebGLApp from './WebGLApp.tsx'
import VectorApp from './VectorApp.tsx'

const App = () => {
  const [dividerPosition, setDividerPosition] = useState(50); // 50% width for each

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = dividerPosition;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.min(90, Math.max(10, startWidth + (deltaX / window.innerWidth) * 100));

      setDividerPosition(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="relative h-screen flex">
      {/* Left Map */}
      <div className="h-full" style={{ width: `${dividerPosition}%` }}>
        <WebGLApp />
      </div>

      {/* Resizable Divider */}
      <div
        className="w-2 bg-gray-400 cursor-ew-resize hover:bg-gray-500 transition"
        onMouseDown={handleMouseDown}
      ></div>

      {/* Right Map */}
      <div className="h-full flex-1" style={{ width: `${100 - dividerPosition}%` }}>
        <VectorApp />
      </div>
    </div>
  );
};

export default App;
