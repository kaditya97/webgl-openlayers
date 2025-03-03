/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { OSM } from 'ol/source';
import { Tile as TileLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import VectorImageLayer from 'ol/layer/VectorImage';
import GeoJSON from 'ol/format/GeoJSON';
import { toStringXY } from 'ol/coordinate';
import { useGeographic } from 'ol/proj';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';

const ImageApp = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ properties: any; position: any } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorLayersRef = useRef<VectorImageLayer[]>([]);
  const [layers, setLayers] = useState<{name: string, visible: boolean, id: number}[]>([]);
  const [nextLayerId, setNextLayerId] = useState(1);
  useGeographic();

  // Generate a random color for each layer
  const getRandomStyle = () => {
    const r = Math.floor(Math.random() * 200) + 55;
    const g = Math.floor(Math.random() * 200) + 55;
    const b = Math.floor(Math.random() * 200) + 55;
    
    return new Style({
      fill: new Fill({
        color: [r, g, b, 0.3]
      }),
      stroke: new Stroke({
        color: [r, g, b],
        width: 2
      }),
      image: new CircleStyle({
        radius: 6,
        fill: new Fill({
          color: [r, g, b]
        })
      })
    });
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
    const files = event.target.files;
    if (!files || !mapInstance.current) return;

    // Process each uploaded file
    Array.from(files).forEach((file) => {
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
          
          // Generate unique styling for this layer
          const layerStyle = getRandomStyle();
          
          // Create and add new vector image layer
          const newVectorLayer = new VectorImageLayer({
            source,
            style: layerStyle,
            imageRatio: 2  // Higher value means lower resolution but better performance
          });
          
          // Set custom properties for layer identification
          const layerId = nextLayerId;
          newVectorLayer.set('id', layerId);
          newVectorLayer.set('name', file.name);
          
          mapInstance.current!.addLayer(newVectorLayer);
          vectorLayersRef.current.push(newVectorLayer);
          
          // Update state with new layer info
          setLayers(prev => [...prev, {
            name: file.name,
            visible: true,
            id: layerId
          }]);
          
          setNextLayerId(layerId + 1);

          // Zoom to include the new layer extent
          const extent = source.getExtent();
          if (extent.some(value => isFinite(value))) {
            mapInstance.current!.getView().fit(extent, {
              padding: [100, 100, 100, 100],
              duration: 1000
            });
          }

        } catch (error) {
          console.error('Error parsing GeoJSON:', error);
          alert(`Invalid GeoJSON file (${file.name}). Please check the format.`);
        }
      };
      reader.readAsText(file);
    });
    
    // Reset the file input
    event.target.value = '';
  };

  const toggleLayerVisibility = (id: number) => {
    // Update the state
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
    
    // Find and update the actual layer visibility
    const layerToToggle = vectorLayersRef.current.find(layer => layer.get('id') === id);
    if (layerToToggle) {
      layerToToggle.setVisible(!layerToToggle.getVisible());
    }
  };

  const removeLayer = (id: number) => {
    // Remove from the map
    const layerToRemove = vectorLayersRef.current.find(layer => layer.get('id') === id);
    if (layerToRemove && mapInstance.current) {
      mapInstance.current.removeLayer(layerToRemove);
    }
    
    // Update references
    vectorLayersRef.current = vectorLayersRef.current.filter(layer => layer.get('id') !== id);
    
    // Update state
    setLayers(prev => prev.filter(layer => layer.id !== id));
  };

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 right-4 z-10 bg-white p-4 rounded shadow-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload GeoJSON Files (Image)
        </label>
        <input
          type="file"
          accept=".geojson,application/json"
          onChange={handleFileUpload}
          multiple // Allow multiple file selection
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <div className="mt-4">
          <input type="checkbox" id="showInfo" className="mr-2" checked={showInfo} onChange={e => setShowInfo(e.target.checked || false)} />
          <label htmlFor="showInfo">Show Info</label>
        </div>
        
        {/* Layer management UI */}
        {layers.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium text-sm mb-2">Layers</h3>
            <div className="max-h-60 overflow-y-auto">
              {layers.map(layer => (
                <div key={layer.id} className="flex items-center justify-between mb-2 text-sm">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={layer.visible} 
                      onChange={() => toggleLayerVisibility(layer.id)}
                      className="mr-2"
                    />
                    <span title={layer.name} className="truncate max-w-32">
                      {layer.name}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeLayer(layer.id)}
                    className="text-red-600 hover:text-red-800 ml-2 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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

export default ImageApp;