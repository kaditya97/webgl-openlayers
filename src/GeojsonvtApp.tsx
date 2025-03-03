/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { OSM } from 'ol/source';
import { Tile as TileLayer } from 'ol/layer';
import Projection from 'ol/proj/Projection.js';
import VectorTileSource from 'ol/source/VectorTile.js';
import VectorTileLayer from 'ol/layer/VectorTile.js';
import GeoJSON from 'ol/format/GeoJSON';
import { toStringXY } from 'ol/coordinate';
import { useGeographic } from 'ol/proj';
import geojsonvt from 'geojson-vt';
import {defaults as defaultInteractions} from 'ol/interaction/defaults.js';
import Modify from 'ol/interaction/Modify.js';
import Select from 'ol/interaction/Select.js';

const GeojsonvtApp = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<{ properties: any; position: any } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const vectorLayerRef = useRef<VectorTileLayer | null>(null);
  useGeographic();

  const replacer = function (_key: any, value: any) {
    if (!value || !value.geometry) {
      return value;
    }

    let type;
    const rawType = value.type;
    let geometry = value.geometry;
    if (rawType === 1) {
      type = 'MultiPoint';
      if (geometry.length == 1) {
        type = 'Point';
        geometry = geometry[0];
      }
    } else if (rawType === 2) {
      type = 'MultiLineString';
      if (geometry.length == 1) {
        type = 'LineString';
        geometry = geometry[0];
      }
    } else if (rawType === 3) {
      type = 'Polygon';
      if (geometry.length > 1) {
        type = 'MultiPolygon';
        geometry = [geometry];
      }
    }

    return {
      'type': 'Feature',
      'geometry': {
        'type': type,
        'coordinates': geometry,
      },
      'properties': value.tags,
    };
  };

  useEffect(() => {
    if (!mapRef.current) return;

    const select = new Select();
    
    const modify = new Modify({
      features: select.getFeatures(),
    });

    // Initialize map only once
    mapInstance.current = new Map({
      interactions: defaultInteractions().extend([select, modify]),
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
        const tileIndex = geojsonvt(JSON.parse(geoJsonContent), {
          extent: 4096,
          debug: 1,
        });
        const format = new GeoJSON({
          // Data returned from geojson-vt is in tile pixel units
          dataProjection: new Projection({
            code: 'TILE_PIXELS',
            units: 'tile-pixels',
            extent: [0, 0, 4096, 4096],
          }),
        });
        const vectorSource = new VectorTileSource({
          tileUrlFunction: function (tileCoord) {
            // Use the tile coordinate as a pseudo URL for caching purposes
            return JSON.stringify(tileCoord);
          },
          tileLoadFunction: function (tile: any, url) {
            const tileCoord = JSON.parse(url);
            const data = tileIndex.getTile(
              tileCoord[0],
              tileCoord[1],
              tileCoord[2],
            );
            const geojson = JSON.stringify(
              {
                type: 'FeatureCollection',
                features: data ? data.features : [],
              },
              replacer,
            );
            const features = format.readFeatures(geojson, {
              extent: vectorSource.getTileGrid()!.getTileCoordExtent(tileCoord),
              featureProjection: mapInstance.current!.getView().getProjection(),
            });
            tile.setFeatures(features);
          },
        });
        const newVectorLayer = new VectorTileLayer({
          source: vectorSource,
        });

        mapInstance.current!.addLayer(newVectorLayer);
        vectorLayerRef.current = newVectorLayer;
      } catch (error) {
        console.error('Error parsing GeoJSON:', error);
        alert('Invalid GeoJSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 right-4 z-10 bg-white p-4 rounded shadow-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload GeoJSON
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

export default GeojsonvtApp;