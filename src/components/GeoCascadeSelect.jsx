import React, { useEffect, useState } from "react";
import { Field, SelectInput } from "./FormField.jsx";
import { geoApi } from "../api/geo.api.js";

/**
 * Five dependent selects: province -> district -> sector -> cell -> village.
 * Picking a province loads its districts; picking a district loads its
 * sectors; and so on. Changing an upper level clears everything below it.
 * Controlled via `value` = { provinceId, districtId, sectorId, cellId, villageId }
 * (numbers, matching the backend's normalized geo FKs) and `onChange(nextValue)`.
 */
export default function GeoCascadeSelect({ value, onChange }) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [cells, setCells] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    geoApi
      .provinces()
      .then(setProvinces)
      .catch(() => setProvinces([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!value.provinceId) {
      setDistricts([]);
      return;
    }
    geoApi.districts(value.provinceId).then(setDistricts).catch(() => setDistricts([]));
  }, [value.provinceId]);

  useEffect(() => {
    if (!value.districtId) {
      setSectors([]);
      return;
    }
    geoApi.sectors(value.districtId).then(setSectors).catch(() => setSectors([]));
  }, [value.districtId]);

  useEffect(() => {
    if (!value.sectorId) {
      setCells([]);
      return;
    }
    geoApi.cells(value.sectorId).then(setCells).catch(() => setCells([]));
  }, [value.sectorId]);

  useEffect(() => {
    if (!value.cellId) {
      setVillages([]);
      return;
    }
    geoApi.villages(value.cellId).then(setVillages).catch(() => setVillages([]));
  }, [value.cellId]);

  function set(field, rawVal) {
    const order = ["provinceId", "districtId", "sectorId", "cellId", "villageId"];
    const idx = order.indexOf(field);
    const parsed = rawVal === "" ? "" : Number(rawVal);
    const next = { ...value, [field]: parsed };
    order.slice(idx + 1).forEach((f) => {
      next[f] = "";
    });
    onChange(next);
  }

  const noData = loaded && provinces.length === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field label="Province">
        <SelectInput value={value.provinceId || ""} onChange={(e) => set("provinceId", e.target.value)} disabled={noData}>
          <option value="">{noData ? "No location data imported yet" : "Select…"}</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="District">
        <SelectInput value={value.districtId || ""} onChange={(e) => set("districtId", e.target.value)} disabled={!value.provinceId}>
          <option value="">{value.provinceId ? "Select…" : "Select a province first"}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Sector">
        <SelectInput value={value.sectorId || ""} onChange={(e) => set("sectorId", e.target.value)} disabled={!value.districtId}>
          <option value="">{value.districtId ? "Select…" : "Select a district first"}</option>
          {sectors.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Cell">
        <SelectInput value={value.cellId || ""} onChange={(e) => set("cellId", e.target.value)} disabled={!value.sectorId}>
          <option value="">{value.sectorId ? "Select…" : "Select a sector first"}</option>
          {cells.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Village">
        <SelectInput value={value.villageId || ""} onChange={(e) => set("villageId", e.target.value)} disabled={!value.cellId}>
          <option value="">{value.cellId ? "Select…" : "Select a cell first"}</option>
          {villages.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </SelectInput>
      </Field>
    </div>
  );
}
