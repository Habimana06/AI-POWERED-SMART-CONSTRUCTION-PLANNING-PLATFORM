import { useState } from 'react';

import { Trash2, ArrowLeftRight } from 'lucide-react';

import { getRoomsForFloor, formatDim, getWallLines } from '../utils/roomLayouts';



const FT_SCALE = 12;



/** Editable 2D floor plan — resize footprint, rooms; syncs with 3D preview */

export default function FloorPlanEditor({

  width, depth, floors, activeFloor, buildingType,

  floorRooms = {}, onFloorRoomsChange, onSelectRoom, onFootprintChange,

}) {

  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [swapTarget, setSwapTarget] = useState(null);



  const wFt = width * 3.28084;

  const dFt = depth * 3.28084;

  const ox = 50;

  const oy = 40;

  const svgW = wFt * FT_SCALE + 100;

  const svgH = dFt * FT_SCALE + 80;



  const rooms = getRoomsForFloor(width, depth, activeFloor, buildingType, floors, floorRooms);

  const wallLines = getWallLines(width, depth, activeFloor, buildingType, floors, floorRooms);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);



  const updateRooms = (next) => {

    onFloorRoomsChange?.({ ...floorRooms, [String(activeFloor)]: next });

  };



  const updateRoom = (id, patch) => {

    updateRooms(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  };



  const deleteRoom = (id) => {

    if (rooms.length <= 1) return;

    updateRooms(rooms.filter((r) => r.id !== id));

    setSelectedRoomId(null);

  };



  const swapRooms = (idA, idB) => {

    const a = rooms.find((r) => r.id === idA);

    const b = rooms.find((r) => r.id === idB);

    if (!a || !b) return;

    updateRooms(rooms.map((r) => {

      if (r.id === idA) return { ...r, x: b.x, y: b.y, w: b.w, h: b.h, label: b.label };

      if (r.id === idB) return { ...r, x: a.x, y: a.y, w: a.w, h: a.h, label: a.label };

      return r;

    }));

    setSwapTarget(null);

  };



  const handleRoomClick = (room) => {

    if (swapTarget && swapTarget !== room.id) {

      swapRooms(swapTarget, room.id);

      return;

    }

    setSelectedRoomId(room.id);

    onSelectRoom?.(room);

  };



  return (

    <div className="space-y-2">

      {onFootprintChange && (

        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-steel-100">

          <div>

            <label className="text-xs text-concrete">Building width: {width}m</label>

            <input

              type="range"

              min={4}

              max={24}

              value={width}

              onChange={(e) => onFootprintChange(Number(e.target.value), depth)}

              className="w-full accent-primary h-1"

            />

          </div>

          <div>

            <label className="text-xs text-concrete">Building depth: {depth}m</label>

            <input

              type="range"

              min={4}

              max={24}

              value={depth}

              onChange={(e) => onFootprintChange(width, Number(e.target.value))}

              className="w-full accent-primary h-1"

            />

          </div>

        </div>

      )}



      <div className="flex flex-wrap gap-2 items-center text-xs text-concrete">

        <span>Click room to edit · Sliders resize rooms · Swap moves two rooms</span>

        {selectedRoom && (

          <button type="button" className="btn-outline !py-0.5 !px-2 text-xs" onClick={() => setSwapTarget(swapTarget ? null : selectedRoomId)}>

            <ArrowLeftRight className="h-3 w-3 inline" /> {swapTarget ? 'Cancel swap' : 'Swap room'}

          </button>

        )}

      </div>



      <div className="flex gap-3 flex-col lg:flex-row">

        <div className="flex-1 bg-white rounded-xl border-2 border-steel-200 overflow-auto">

          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto" style={{ minHeight: 280 }}>

            <rect x={ox} y={oy} width={wFt * FT_SCALE} height={dFt * FT_SCALE} fill="#FAFAFA" stroke="#2C3E50" strokeWidth={3} />

            {wallLines.map((line, i) => (

              <line

                key={i}

                x1={ox + (line.x1 / wFt) * wFt * FT_SCALE}

                y1={oy + (line.y1 / dFt) * dFt * FT_SCALE}

                x2={ox + (line.x2 / wFt) * wFt * FT_SCALE}

                y2={oy + (line.y2 / dFt) * dFt * FT_SCALE}

                stroke="#1C2833"

                strokeWidth={4}

              />

            ))}

            {rooms.map((room) => {

              const rx = ox + (room.x / wFt) * wFt * FT_SCALE;

              const ry = oy + (room.y / dFt) * dFt * FT_SCALE;

              const rw = (room.w / wFt) * wFt * FT_SCALE;

              const rh = (room.h / dFt) * dFt * FT_SCALE;

              const sel = room.id === selectedRoomId;

              return (

                <g key={room.id} onClick={() => handleRoomClick(room)} style={{ cursor: 'pointer' }}>

                  <rect x={rx} y={ry} width={rw} height={rh} fill={sel ? '#FFF3E0' : '#FFFFFF'} stroke={sel ? '#E67E22' : '#BDC3C7'} strokeWidth={sel ? 2.5 : 0.5} />

                  <text x={rx + rw / 2} y={ry + rh / 2 - 4} textAnchor="middle" fontSize={9} fill="#2C3E50" fontWeight={700}>{room.label}</text>

                  <text x={rx + rw / 2} y={ry + rh / 2 + 8} textAnchor="middle" fontSize={7} fill="#7F8C8D">{formatDim(room.w)} × {formatDim(room.h)}</text>

                </g>

              );

            })}

          </svg>

        </div>



        {selectedRoom && (

          <div className="w-full lg:w-56 shrink-0 card space-y-3 !py-3">

            <h4 className="font-semibold text-sm text-steel">{selectedRoom.label}</h4>

            <div>

              <label className="text-xs text-concrete">Room name</label>

              <input className="input text-sm py-1.5" value={selectedRoom.label} onChange={(e) => updateRoom(selectedRoom.id, { label: e.target.value })} />

            </div>

            <div>

              <label className="text-xs text-concrete">Width: {formatDim(selectedRoom.w)}</label>

              <input type="range" min={wFt * 0.1} max={wFt * 0.85} step={0.5} value={selectedRoom.w} onChange={(e) => updateRoom(selectedRoom.id, { w: Number(e.target.value) })} className="w-full accent-primary" />

            </div>

            <div>

              <label className="text-xs text-concrete">Depth: {formatDim(selectedRoom.h)}</label>

              <input type="range" min={dFt * 0.1} max={dFt * 0.85} step={0.5} value={selectedRoom.h} onChange={(e) => updateRoom(selectedRoom.id, { h: Number(e.target.value) })} className="w-full accent-primary" />

            </div>

            <button type="button" onClick={() => deleteRoom(selectedRoom.id)} className="text-danger text-xs flex items-center gap-1">

              <Trash2 className="h-3.5 w-3.5" /> Delete room

            </button>

          </div>

        )}

      </div>

    </div>

  );

}

