// Hosting adapter for the Python screening engine. Parity is verified by
// scripts/check_engine_parity.py using all four corridors and boundary cases.
import corridors from './corridors.json' with { type: 'json' };
export { corridors };
const floatBits = new DataView(new ArrayBuffer(8));
const round = (value, digits = 0) => {
  // Python rounds the exact binary float to nearest decimal, ties to even.
  // Rounding value*scale first would erase the 4.675 -> 4.67 distinction.
  floatBits.setFloat64(0, Math.abs(value));
  const bits = floatBits.getBigUint64(0), exponent = Number((bits >> 52n) & 2047n);
  let numerator = (bits & ((1n << 52n) - 1n)) + (exponent ? 1n << 52n : 0n);
  const power = (exponent || 1) - 1023 - 52;
  numerator *= 10n ** BigInt(digits);
  const denominator = power < 0 ? 1n << BigInt(-power) : 1n;
  if (power >= 0) numerator <<= BigInt(power);
  let quotient = numerator / denominator;
  const twiceRemainder = (numerator % denominator) * 2n;
  if (twiceRemainder > denominator || (twiceRemainder === denominator && quotient % 2n)) quotient++;
  return Math.sign(value) * Number(quotient) / 10 ** digits;
};

function head(parameters, surge, inflow) {
  const kinetic = (inflow / ((parameters.inlet_discharge_coeff ?? .72) * (parameters.inlet_throat_area_m2 ?? 4800))) ** 2 / (2 * 9.80665);
  return kinetic * 15 + Math.max(0, (inflow / 100) ** .82) * .32 * Math.max(1, 1 + surge * .75);
}

function wse(parameters, coast, river, surge, inflow) {
  return Math.max(0, surge - coast * (parameters.surge_decay_coeff ?? .15))
    + head(parameters, surge, inflow) * Math.exp(-coast / (parameters.backwater_length_km ?? 34.5)) * Math.exp(-river / (parameters.floodplain_diffusion_km ?? 2.8));
}

export function hydro(cid, surge, inflow, hours) {
  const corridor = corridors[cid], parameters = corridor.hydrologic_params;
  const assets = corridor.assets.map(asset => {
    const level = wse(parameters, asset.dist_coast_km, asset.dist_river_km, surge, inflow);
    const depth = Math.max(0, round(level - asset.elevation_m, 3)), threshold = asset.trip_depth_m ?? .4;
    return { id: asset.id, name: asset.name, type: asset.type, category: asset.category,
      elevation_m: asset.elevation_m, wse_m: round(level, 3), water_depth_m: depth,
      is_breached: depth >= threshold, trip_depth_threshold_m: threshold,
      dist_coast_km: asset.dist_coast_km, dist_river_km: asset.dist_river_km, lat: asset.lat, lon: asset.lon };
  });
  const wet = assets.filter(a => a.water_depth_m > 0);
  return { corridor_id: cid, corridor_name: corridor.name, ocean_surge_m: surge,
    river_inflow_m3s: inflow, hours_to_landfall: hours,
    estuarine_damming_jump_m: round(head(parameters, surge, inflow), 3),
    inlet_throat_name: parameters.inlet_throat_name ?? 'Estuarine Inlet Throat', assets,
    flooded_asset_count: wet.length, breached_substations: assets.filter(a => a.is_breached && ['transmission', 'distribution'].includes(a.category)).map(a => a.id),
    total_assets: assets.length, flooded_fraction: round(wet.length / Math.max(1, assets.length), 3),
    mean_submerged_depth_m: round(wet.reduce((sum, a) => sum + a.water_depth_m, 0) / Math.max(1, wet.length), 3) };
}

export function grid(cid, hydroResult) {
  const corridor = corridors[cid], assets = corridor.assets;
  const depths = Object.fromEntries(hydroResult.assets.map(a => [a.id, a.water_depth_m]));
  const tripped = new Set(assets.filter(a => (depths[a.id] ?? 0) >= (a.trip_depth_m ?? .4)
    && ['substation', 'grid_source', 'fuel_terminal'].includes(a.type)).map(a => a.id));
  const energized = new Set(assets.filter(a => a.is_source && !tripped.has(a.id)).map(a => a.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const [source, target] of corridor.power_grid_edges) {
      if (energized.has(source) && !tripped.has(target) && !energized.has(target)) { energized.add(target); changed = true; }
    }
  }
  const hospitals = assets.filter(a => a.type === 'hospital').map(a => {
    const depth = depths[a.id] ?? 0, mains = energized.has(a.id), pad = a.dg_pad_elevation_m ?? a.elevation_m + .3;
    const flooded = depth > 0 && depth >= pad - a.elevation_m;
    return { id: a.id, name: a.name, elevation_m: a.elevation_m, water_depth_m: depth,
      grid_mains_powered: mains, on_generator: !mains && !flooded,
      hospital_status: mains ? 'GRID_MAINS_ENERGIZED' : flooded ? 'CATASTROPHIC_BLACKOUT_DG_SUBMERGED' : 'ON_GENERATOR_AUTONOMY_RUNNING',
      risk_level: mains ? 'NOMINAL' : flooded ? 'CRITICAL_FATAL' : 'HIGH_DG_RUNWAY',
      icu_patients: a.icu_beds ?? 0, diesel_reserve_liters: a.diesel_fuel_liters ?? 0,
      burn_rate_lph: a.burn_rate_lph ?? 112.5,
      runtime_hours_remaining: !mains && flooded ? 0 : round((a.diesel_fuel_liters ?? 0) / Math.max(1, a.burn_rate_lph ?? 112.5), 1),
      dg_pad_elevation_m: pad, is_dry_but_outaged: depth === 0 && !mains };
  });
  const dark = assets.filter(a => !energized.has(a.id) && !tripped.has(a.id) && (depths[a.id] ?? 0) < (a.trip_depth_m ?? .4))
    .map(a => ({ id: a.id, name: a.name, type: a.type, elevation_m: a.elevation_m, water_depth_m: depths[a.id] ?? 0,
      reason: 'Upstream transmission protection breaker tripped (ANSI 21/87). Zero grid power reaching node.' }));
  return { corridor_id: cid, corridor_name: corridor.name,
    total_substations: assets.filter(a => ['substation', 'grid_source'].includes(a.type)).length,
    tripped_substation_count: tripped.size, tripped_substations: [...tripped].sort(),
    dark_dry_nodes_count: dark.length, dark_dry_nodes: dark, hospitals,
    total_patients_on_dg_risk: hospitals.filter(h => h.on_generator).reduce((s, h) => s + h.icu_patients, 0),
    total_blacked_out_icu_patients: hospitals.filter(h => h.hospital_status === 'CATASTROPHIC_BLACKOUT_DG_SUBMERGED').reduce((s, h) => s + h.icu_patients, 0),
    edge_statuses: [...corridor.power_grid_edges].sort((a, b) => assets.findIndex(asset => asset.id === a[0]) - assets.findIndex(asset => asset.id === b[0])).map(([source, target]) => ({ source, target, is_energized: energized.has(source) && energized.has(target),
      status: energized.has(source) && energized.has(target) ? 'ENERGIZED' : 'DE_ENERGIZED_TRIPPED' })) };
}

export function logistics(cid, surge, inflow, hours) {
  const corridor = corridors[cid], parameters = corridor.hydrologic_params;
  const routes = corridor.logistics_corridors.map(route => {
    const coast = route.choke_dist_coast_km ?? 6, river = route.choke_dist_river_km ?? .5, elevation = route.choke_elevation_m ?? 1.8;
    const peak = wse(parameters, coast, river, surge, inflow), baseline = wse(parameters, coast, river, .3, 180);
    const cargo = route.cargo_type ?? 'DIESEL_FUEL', threshold = route.critical_clearance_depth_m ?? (cargo === 'LIQUID_MEDICAL_OXYGEN' ? .2 : .45);
    const transit = route.nominal_travel_time_min ?? 30;
    let tts = null;
    for (let i = 0; i <= 180; i++) {
      const elapsed = i * (hours / 180), progress = Math.min(1, elapsed / Math.max(.1, hours));
      const depth = Math.max(0, round(baseline + (peak - baseline) * progress ** 1.35 - elevation, 3));
      if (depth >= threshold) { tts = round(elapsed, 3); break; }
    }
    const current = Math.max(0, round(baseline - elevation, 3));
    let departure = null, minutes = null, status = 'CLEAR_PASSABLE', urgency = 'LOW', submerged = false;
    if (tts != null) {
      if (tts <= 0 || current >= threshold) { minutes = 0; departure = 0; submerged = true; status = 'IMPASSABLE_SUBMERGED'; urgency = 'CRITICAL_BLOCKED'; }
      else {
        minutes = round(tts * 60, 1); departure = Math.max(0, round(minutes - transit, 1));
        status = departure <= 0 ? 'CLOSING_INSUFFICIENT_TRANSIT_TIME' : departure <= 60 ? 'RAPIDLY_CLOSING_URGENT_DISPATCH' : 'OPEN_DEPARTURE_WINDOW_AVAILABLE';
        urgency = departure <= 0 ? 'CRITICAL_WINDOW_SHUT' : departure <= 60 ? 'HIGH_DISPATCH_NOW' : 'MODERATE';
      }
    }
    return { corridor_id: route.id, name: route.name, cargo_type: cargo, origin_id: route.origin_id, destination_id: route.destination_id,
      choke_point_name: route.choke_point_name ?? 'Critical Road Causeway', choke_elevation_m: elevation, critical_clearance_depth_m: threshold,
      current_water_depth_m: current, peak_water_depth_m: Math.max(0, round(peak - elevation, 3)), peak_wse_m: round(peak, 3),
      nominal_travel_time_min: transit, time_to_submersion_hours: tts == null ? null : round(tts, 2), time_to_submersion_min: minutes,
      departure_window_remaining_min: departure, is_currently_submerged: submerged, operational_status: status, urgency_level: urgency };
  }).sort((a, b) => (a.departure_window_remaining_min ?? Infinity) - (b.departure_window_remaining_min ?? Infinity));
  return { corridor_id: cid, corridor_name: corridor.name, hours_to_landfall: hours, routes, total_routes: routes.length,
    shortest_departure_window_min: routes.find(r => r.departure_window_remaining_min != null)?.departure_window_remaining_min ?? null };
}

export function incident(cid, hydroResult, gridResult, logisticsResult) {
  const directives = [];
  const add = (code, priority, action, target, details) => directives.push({ code, priority, action, target, details });
  for (const r of logisticsResult.routes) {
    const deadline = r.departure_window_remaining_min, target = `${r.cargo_type} Convoy -> ${r.destination_id}`;
    if (r.is_currently_submerged) add('DIR-LOGISTICS-REROUTE', 'P0_LIFE_CRITICAL', 'DEPLOY_AIR_DROP_OR_HOVERCRAFT', target, `${r.choke_point_name} is impassable in the scenario. Review an alternate delivery method and confirm resources with local authorities.`);
    else if (deadline != null && deadline <= 0) add('DIR-LOGISTICS-WINDOW-CLOSED', 'P0_LIFE_CRITICAL', 'FIND_ALTERNATE_ROUTE', target, `The safe departure window has closed at ${r.choke_point_name}; the road is not yet submerged.`);
    else if (deadline != null && deadline <= 60) add('DIR-LOGISTICS-IMMEDIATE-DISPATCH', 'P0_LIFE_CRITICAL', 'ESCORT_CONVOY_NOW', target, `Estimated departure window: ${deadline} min across ${r.choke_point_name}. Confirm route conditions and review escort needs before dispatch.`);
    else add('DIR-LOGISTICS-STAGE-CONVOY', 'P2_TACTICAL_STAGING', 'STAGE_STANDBY_CREW', `${r.cargo_type} Convoy`, deadline == null ? `No clearance breach predicted before landfall at ${r.choke_point_name}.` : `Departure window remaining: ${deadline} min across ${r.choke_point_name}.`);
  }
  for (const h of gridResult.hospitals) {
    if (h.hospital_status === 'CATASTROPHIC_BLACKOUT_DG_SUBMERGED') add('DIR-MED-BLACKOUT-TRIAGE', 'P0_LIFE_CRITICAL', 'DISPATCH_MOBILE_GENERATOR_BARGES', h.name, `The scenario indicates loss of grid supply and generator availability, affecting ${h.icu_patients} ICU beds. Clinical and emergency teams should assess supported power restoration or evacuation.`);
    else if (h.on_generator) add('DIR-MED-DEFEND-IN-PLACE', 'P1_LIFE_SUPPORT_SUSTAINMENT', 'SECURE_DIESEL_REFUELING', h.name, `Hospital backup generator has an estimated ${h.runtime_hours_remaining}h fuel reserve. Clinical and emergency teams should assess sustainment versus supported evacuation and confirm a safe replenishment route.`);
  }
  return { corridor_id: cid, corridor_name: corridors[cid].name,
    operational_period: 'Scenario screening horizon',
    threat_classification: gridResult.tripped_substation_count >= 3 || gridResult.total_blacked_out_icu_patients > 0 ? 'TIER-1 CATASTROPHIC COMPOUND GRID-HEALTHCARE COLLAPSE' : gridResult.tripped_substation_count >= 1 ? 'TIER-2 SEVERE ESTUARINE BACKWATER DAMMING & GRID TRIP' : 'TIER-3 LOCALIZED FLOOD MONITORING',
    doctrine_summary: 'Prioritize continuity of critical care. Confirm local conditions, safe access, backup power, and clinically supervised evacuation options before acting.',
    damming_jump_m: hydroResult.estuarine_damming_jump_m, tripped_substation_count: gridResult.tripped_substation_count,
    tripped_substations: gridResult.tripped_substations,
    critical_patients_at_risk: gridResult.total_patients_on_dg_risk + gridResult.total_blacked_out_icu_patients, tactical_directives: directives };
}

export function simulate(input) {
  const cid = input.corridor_id, runoff = input.include_rainfall_runoff ? input.rainfall_mm * 1e-3 * 120 * 1e6 * .45 / (24 * 3600) : 0;
  const inflow = input.river_inflow_m3s + runoff;
  const h = hydro(cid, input.ocean_surge_m, inflow, input.hours_to_landfall), g = grid(cid, h), l = logistics(cid, input.ocean_surge_m, inflow, input.hours_to_landfall);
  return { success: true, ...input, effective_inflow_m3s: round(inflow, 1), hydro: h, grid: g, logistics: l, apex: incident(cid, h, g, l),
    sensitivity: [['Lower stress', .8], ['Selected scenario', 1], ['Higher stress', 1.2]].map(([label, factor]) => {
      const hydroResult = hydro(cid, input.ocean_surge_m * factor, inflow * factor, input.hours_to_landfall), gridResult = grid(cid, hydroResult);
      return { label, factor, flooded_assets: hydroResult.flooded_asset_count, tripped_substations: gridResult.tripped_substation_count,
        patients_at_risk: gridResult.total_patients_on_dg_risk + gridResult.total_blacked_out_icu_patients };
    }),
    provenance: { mode: 'scenario_screening', infrastructure: 'Curated demonstration assets and assumed grid dependencies',
      hydrology: 'Simplified surge/backwater approximation; not field validated',
      rainfall_runoff: { enabled: input.include_rainfall_runoff, additional_inflow_m3s: round(runoff, 1), catchment_km2: 120, runoff_coefficient: .45, duration_hours: 24 }, satellite: 'not_configured' } };
}
