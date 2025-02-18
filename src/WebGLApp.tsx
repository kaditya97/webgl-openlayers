/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { OSM } from 'ol/source';
import { Tile as TileLayer } from 'ol/layer';
import WebGLVectorLayer from 'ol/layer/WebGLVector.js';
import { Vector as VectorSource } from 'ol/source';
import GeoJSON from 'ol/format/GeoJSON';
import { toStringXY } from 'ol/coordinate';
import { useGeographic } from 'ol/proj';

const WebGLApp = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [hoverInfo, setHoverInfo] = useState<{ properties: any; position: any } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorLayerRef = useRef<WebGLVectorLayer | null>(null);
  useGeographic();

  // WebGL styling for uploaded data
  const webglStyle = {
    'fill-color': 'rgba(150, 50, 150, 0.3)',
    'stroke-color': 'purple',
    'stroke-width': 2,
    'circle-radius': 6,
    'circle-fill-color': 'orange'
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map only once
    mapInstance.current = new Map({
      target: mapRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({ center: [0, 0], zoom: 2 })
    });

    // Hover interaction
    mapInstance.current.on('pointermove', (e) => {
      if (!overlayRef.current) return;

      const features = mapInstance.current!.getFeaturesAtPixel(e.pixel);
      if (features.length > 0) {
        const feature = features[0];
        setHoverInfo({
          properties: feature.getProperties(),
          position: e.coordinate
        });
        overlayRef.current.style.display = 'block';
        overlayRef.current.style.left = `${e.pixel[0] + 10}px`;
        overlayRef.current.style.top = `${e.pixel[1] + 10}px`;
      } else {
        setHoverInfo(null);
        overlayRef.current.style.display = 'none';
      }
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.setTarget(undefined);
      }
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !mapInstance.current) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geoJsonContent = e.target?.result as string;
        const format = new GeoJSON();
        const features = format.readFeatures(geoJsonContent, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:4326'
        });

        const source = new VectorSource({ features });

        // Remove previous layer if exists
        if (vectorLayerRef.current) {
          mapInstance.current!.removeLayer(vectorLayerRef.current);
        }

        // Create and add new vector layer
        const newVectorLayer = new WebGLVectorLayer({
          source,
          style: webglStyle
        });
        mapInstance.current!.addLayer(newVectorLayer);
        vectorLayerRef.current = newVectorLayer;

        // Zoom to layer extent
        const extent = source.getExtent();
        mapInstance.current!.getView().fit(extent, {
          padding: [100, 100, 100, 100],
          duration: 1000
        });

      } catch (error) {
        console.error('Error parsing GeoJSON:', error);
        alert('Invalid GeoJSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-4 right-4 z-10 bg-white p-4 rounded shadow-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload GeoJSON (WebGL)
        </label>
        <input
          type="file"
          accept=".geojson,application/json"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <div className="mt-4">
          <input type="checkbox" id="showInfo" className="mr-2" checked={showInfo} onChange={e => setShowInfo(e.target.checked || false)} />
          <label htmlFor="showInfo">Show Info</label>
        </div>
      </div>

      {showInfo && (
        <div
          ref={overlayRef}
          className="absolute z-20 bg-white p-3 rounded shadow-lg hidden"
        >
          {hoverInfo && (
            <div>
              <h3 className="font-bold mb-2">Feature Properties</h3>
              <ul className="text-sm">
                {Object.entries(hoverInfo.properties).map(([key, value]) => (
                  key !== 'geometry' && (
                    <li key={key}>
                      <strong>{key}:</strong> {value as React.ReactNode}
                    </li>
                  )
                ))}
              </ul>
              <div className="mt-2 text-xs text-gray-500">
                {toStringXY(hoverInfo.position, 2)}
              </div>
            </div>
          )}
        </div>
      )}

      <div ref={mapRef} className="h-full w-full"></div>
    </div>
  );
};

export default WebGLApp;