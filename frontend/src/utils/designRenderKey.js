/** Stable key — when design changes in editor, saved AI render is invalidated. */
export function getDesignRenderKey(specs = {}, savedAt) {
  return JSON.stringify({
    savedAt: savedAt || specs.savedAt || null,
    floors: specs.floors,
    width: specs.width,
    depth: specs.depth,
    materials: specs.materials,
    floorRooms: specs.floorRooms,
    doorStyle: specs.doorStyle,
    windowStyle: specs.windowStyle,
  });
}

export function getSavedExteriorRender(specs = {}, savedAt) {
  const render = specs?.aiRenders?.exterior;
  if (!render?.url || !render?.designKey) return null;
  if (render.designKey !== getDesignRenderKey(specs, savedAt)) return null;
  return render;
}
