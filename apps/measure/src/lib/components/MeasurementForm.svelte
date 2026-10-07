<script>
  export let measurement;

  function addPoint() {
    const next = (measurement.perimeter_points.length || 0) + 1;
    measurement.perimeter_points = [
      ...measurement.perimeter_points,
      { number: next, a_distance_ft: 0, b_distance_ft: 0, notes: '' },
    ];
  }

  function removePoint(idx) {
    measurement.perimeter_points = measurement.perimeter_points
      .filter((_, i) => i !== idx)
      .map((p, i) => ({ ...p, number: i + 1 }));
  }

  function addCrossDim() {
    measurement.cross_dimensions = [
      ...(measurement.cross_dimensions || []),
      { from_point: 1, to_point: 2, distance_ft: 0 },
    ];
  }

  function addObstacle() {
    measurement.obstacles = [
      ...(measurement.obstacles || []),
      { kind: 'handrail', front_point: null, back_point: null, description: '' },
    ];
  }
</script>

<div class="space-y-4">
  <!-- Shape + AB line -->
  <div class="grid grid-cols-2 gap-2">
    <div>
      <label class="label">Pool shape</label>
      <select class="field" bind:value={measurement.shape_type}>
        <option value="rectangular">Rectangular</option>
        <option value="kidney">Kidney</option>
        <option value="freeform">Freeform (with obstacles)</option>
      </select>
    </div>
    <div>
      <label class="label">A-B distance (ft)</label>
      <input class="field" type="number" step="0.25" min="10" max="100"
             bind:value={measurement.ab_distance_ft} />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-2">
    <div>
      <label class="label">A-B offset (ft)</label>
      <input class="field" type="number" step="0.5" min="0" max="20"
             bind:value={measurement.ab_offset_from_pool_ft} />
    </div>
    <div>
      <label class="label">Orientation</label>
      <select class="field" bind:value={measurement.ab_orientation}>
        <option value="A_left_B_right_facing_pool">A left, B right (standard)</option>
        <option value="A_right_B_left_facing_pool">A right, B left (mirrored)</option>
      </select>
    </div>
  </div>

  <div>
    <label class="label">A-B note</label>
    <input class="field" bind:value={measurement.ab_note} />
  </div>

  <!-- Depth -->
  <div class="grid grid-cols-2 gap-2">
    <div>
      <label class="label">Shallow (ft)</label>
      <input class="field" type="number" step="0.25" bind:value={measurement.shallow_depth_ft} />
    </div>
    <div>
      <label class="label">Deep (ft)</label>
      <input class="field" type="number" step="0.25" bind:value={measurement.deep_depth_ft} />
    </div>
  </div>

  <!-- Perimeter points -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-bold">Perimeter points ({measurement.perimeter_points.length})</h2>
      <button class="btn text-sm" on:click={addPoint}>+ Add point</button>
    </div>
    <div class="space-y-1 max-h-96 overflow-y-auto">
      {#each measurement.perimeter_points as pt, i (pt.number)}
        <div class="flex gap-1 items-center">
          <div class="w-8 text-center text-sm font-bold text-ink-100/70">{pt.number}</div>
          <input class="field flex-1" type="number" step="0.25" min="0"
                 bind:value={pt.a_distance_ft} placeholder="A" />
          <input class="field flex-1" type="number" step="0.25" min="0"
                 bind:value={pt.b_distance_ft} placeholder="B" />
          <button class="btn-danger text-sm px-2" on:click={() => removePoint(i)}>×</button>
        </div>
      {/each}
    </div>
  </div>

  <!-- Cross dimensions -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-bold">Cross dimensions</h2>
      <button class="btn text-sm" on:click={addCrossDim}>+ Add</button>
    </div>
    {#each measurement.cross_dimensions || [] as cd, i}
      <div class="flex gap-1 items-center mb-1">
        <input class="field w-16" type="number" min="1" bind:value={cd.from_point} placeholder="from" />
        <span class="text-ink-100/50">→</span>
        <input class="field w-16" type="number" min="1" bind:value={cd.to_point} placeholder="to" />
        <input class="field flex-1" type="number" step="0.25" min="0" bind:value={cd.distance_ft} placeholder="ft" />
        <button class="btn-danger text-sm px-2"
                on:click={() => measurement.cross_dimensions.splice(i, 1)}>×</button>
      </div>
    {/each}
  </div>

  <!-- Obstacles -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-bold">Obstacles</h2>
      <button class="btn text-sm" on:click={addObstacle}>+ Add</button>
    </div>
    {#each measurement.obstacles || [] as ob, i}
      <div class="card mb-2">
        <div class="grid grid-cols-3 gap-2">
          <select class="field" bind:value={ob.kind}>
            <option value="handrail">Handrail</option>
            <option value="grabrail">Grabrail</option>
            <option value="ladder">Ladder</option>
            <option value="slide_leg">Slide leg</option>
            <option value="rock">Rock</option>
            <option value="waterfall">Waterfall</option>
            <option value="raised_wall">Raised wall</option>
            <option value="spa_wall">Spa wall</option>
            <option value="fill_spout">Fill spout</option>
            <option value="dive_stand">Dive stand</option>
            <option value="planter">Planter</option>
          </select>
          <input class="field" type="number" min="1" bind:value={ob.front_point} placeholder="front pt#" />
          <input class="field" type="number" min="1" bind:value={ob.back_point} placeholder="back pt#" />
        </div>
        <input class="field mt-2" bind:value={ob.description} placeholder="description" />
        <button class="btn-danger text-sm mt-2"
                on:click={() => measurement.obstacles.splice(i, 1)}>Remove</button>
      </div>
    {/each}
  </div>

  <!-- Deck -->
  <div>
    <h2 class="text-lg font-bold mb-2">Deck</h2>
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="label">Min width (ft)</label>
        <input class="field" type="number" step="0.5" min="0" bind:value={measurement.deck.min_width_ft} />
      </div>
      <div>
        <label class="label">Deck type</label>
        <select class="field" bind:value={measurement.deck.deck_type}>
          <option value="concrete">Concrete</option>
          <option value="wood">Wood</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  </div>
</div>
