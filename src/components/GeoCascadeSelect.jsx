import React, { useEffect, useState } from "react";
import { Field, SelectInput } from "./FormField.jsx";
import { geoApi } from "../api/geo.api.js";

/**
 * Five dependent selects: province -> district -> sector -> cell -> village.
 * Picking a province loads its districts; picking a district loads its
 * sectors; and so on. Changing an upper level clears everything below it.
 * Controlled via `value` = { province, district, sector, cell, village } and
 * `onChange(nextValue)`.
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
    if (!value.province) {
      setDistricts([]);
      return;
    }
    geoApi.districts(value.province).then(setDistricts).catch(() => setDistricts([]));
  }, [value.province]);

  useEffect(() => {
    if (!value.district) {
      setSectors([]);
      return;
    }
    geoApi.sectors(value.district, value.province).then(setSectors).catch(() => setSectors([]));
  }, [value.district, value.province]);

  useEffect(() => {
    if (!value.sector) {
      setCells([]);
      return;
    }
    geoApi.cells(value.sector, value.district).then(setCells).catch(() => setCells([]));
  }, [value.sector, value.district]);

  useEffect(() => {
    if (!value.cell) {
      setVillages([]);
      return;
    }
    geoApi.villages(value.cell, value.sector).then(setVillages).catch(() => setVillages([]));
  }, [value.cell, value.sector]);

  function set(field, val) {
    const order = ["province", "district", "sector", "cell", "village"];
    const idx = order.indexOf(field);
    const next = { ...value, [field]: val };
    order.slice(idx + 1).forEach((f) => {
      next[f] = "";
    });
    onChange(next);
  }

  const noData = loaded && provinces.length === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Field label="Province">
        <SelectInput value={value.province || ""} onChange={(e) => set("province", e.target.value)} disabled={noData}>
          <option value="">{noData ? "No location data imported yet" : "Select…"}</option>
          {provinces.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="District">
        <SelectInput value={value.district || ""} onChange={(e) => set("district", e.target.value)} disabled={!value.province}>
          <option value="">{value.province ? "Select…" : "Select a province first"}</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Sector">
        <SelectInput value={value.sector || ""} onChange={(e) => set("sector", e.target.value)} disabled={!value.district}>
          <option value="">{value.district ? "Select…" : "Select a district first"}</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Cell">
        <SelectInput value={value.cell || ""} onChange={(e) => set("cell", e.target.value)} disabled={!value.sector}>
          <option value="">{value.sector ? "Select…" : "Select a sector first"}</option>
          {cells.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Village">
        <SelectInput value={value.village || ""} onChange={(e) => set("village", e.target.value)} disabled={!value.cell}>
          <option value="">{value.cell ? "Select…" : "Select a cell first"}</option>
          {villages.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </SelectInput>
      </Field>
    </div>
  );
}
