// Structured background/gradient editor for the admin card-edit form (issue #20).
//
// Functional: Replaces the free-text "paste raw CSS" textarea with three modes --
// Solid (a validated hex text field), Gradient (angle + N color stops, add/remove,
// not capped at 3), and Advanced (the original raw-CSS textarea, unchanged) -- while
// keeping the storage contract identical: `item.background` stays a plain CSS
// `background` value string, still parseable by the existing, unchanged
// `normalizeBg` (lib/shared.js).
//
// Strategic / GDS component-fit note (see PR body for the full writeup): the vendored
// @sovereignsquad/gds-core v6.0.0 has no dedicated color-picker/color-input/color-swatch
// -selection component (confirmed by enumerating its full export surface and by
// checking GdsSchemaForm's GdsSchemaFieldType union, which has no 'color' field type),
// and does not re-export or wrap Mantine's ColorInput/ColorPicker anywhere (GDS's
// compiled bundles import only a specific, curated allowlist of Mantine primitives --
// Button, Modal, Group, Text, Center, Paper, UnstyledButton, AppShell, Box, Burger,
// ScrollArea, NativeSelect, Stack, Transition, Divider, Container -- never Mantine's
// color components). This is a genuine, narrow gap in GDS: a true visual
// color-picking widget. It is NOT a gap in "structured form primitives" generally --
// GDS's FormField (labeled/validated field wrapper), GdsSegmentedControl (mode
// switch), GdsSlider / NumberStepper (angle + stop position), InlineAlert
// (blocked-mode-switch messaging), and ChoiceChip (already adopted in this repo for
// clickable pill-style actions, issue #18/#19) are all genuine, well-fitting GDS
// primitives for everything *except* the color-selection affordance itself.
//
// Given that gap, colors (both the solid value and each gradient stop) are entered as
// a GDS FormField-wrapped, pattern-validated plain text field rather than a picker
// widget -- which is also the *correct* shape for this data even independent of the
// GDS gap: normalizeBg / DEFAULT_BG's own gradient stops are `rgba(...)` values, not
// hex, so a hex-only picker (GDS-native or a native `<input type="color">`) could not
// represent the app's own default background in the first place. A validated text
// field naturally covers the full CSS color grammar (#hex, rgb(), rgba(), hsl(),
// hsla(), named colors) that this app's stored values actually use.
//
// No non-GDS picker library, and no direct @mantine/core import, is introduced here.

import { useLayoutEffect, useState } from 'react';
import {
  ChoiceChip,
  FormField,
  GdsSegmentedControl,
  GdsSlider,
  InlineAlert,
  NumberStepper,
} from '@sovereignsquad/gds-core';
import { DEFAULT_BG, normalizeBg } from '../../lib/shared.js';

// WHAT: A clean solid-color value: a bare `#hex` (3/4/6/8 digit) string, no prefix.
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

// WHAT: Split a CSS function's argument list on top-level commas only, so a stop
// color like `rgba(42, 123, 155, 1)` isn't shredded by its own internal commas.
// WHY: `linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, ...)` needs `rgba(42, 123,
// 155, 1) 0%` treated as a single segment, not three.
function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

// WHAT: Loose validity check for a single CSS color value used as a gradient stop or
// solid value candidate -- hex, rgb()/rgba()/hsl()/hsla(), or a bare CSS color
// keyword (e.g. `red`, `transparent`).
function isValidCssColor(input) {
  const v = String(input || '').trim();
  if (!v) return false;
  return (
    HEX_RE.test(v) ||
    /^(rgb|rgba|hsl|hsla)\([^()]*\)$/i.test(v) ||
    /^[a-zA-Z]+$/.test(v)
  );
}

// WHAT: Parse a single-line `linear-gradient(<angle>deg, <color> <position>%, ...)`
// string into { angle, stops }. Returns null for anything not "clean" -- no explicit
// `Ndeg` angle, a stop without an explicit `%` position, or an invalid stop color --
// so callers can fall back to Advanced mode rather than corrupting an unusual value.
// WHY (edge case, issue #20): must not misclassify a valid-but-unusual gradient
// (multi-layer background shorthand, keyword-direction gradients like `to right`,
// etc.) as cleanly structured-editable.
function parseGradient(css) {
  const v = String(css || '').trim();
  const m = v.match(/^linear-gradient\(\s*([\s\S]+)\)\s*$/i);
  if (!m) return null;
  const parts = splitTopLevel(m[1]);
  if (parts.length < 3) return null; // need an angle + at least 2 stops
  const angleMatch = parts[0].trim().match(/^(-?\d+(?:\.\d+)?)deg$/i);
  if (!angleMatch) return null;
  const angle = parseFloat(angleMatch[1]);
  const stops = [];
  for (const raw of parts.slice(1)) {
    const stopMatch = raw.trim().match(/^(.+?)\s+(-?\d+(?:\.\d+)?)%$/);
    if (!stopMatch) return null;
    const color = stopMatch[1].trim();
    const position = parseFloat(stopMatch[2]);
    if (!isValidCssColor(color)) return null;
    stops.push({ color, position });
  }
  if (stops.length < 2) return null;
  return { angle, stops };
}

// WHAT: Serialize { angle, stops } back to a `linear-gradient(...)` CSS string.
// Deliberately lenient (no validation) -- it must always produce *some* string so the
// operator's in-progress typing (including a momentarily-invalid stop color) is
// reflected live; validity gating happens separately (see `onValidityChange`).
function serializeGradient(angle, stops) {
  const stopsStr = stops.map(s => `${s.color} ${s.position}%`).join(', ');
  return `linear-gradient(${angle}deg, ${stopsStr})`;
}

// WHAT: Best-effort conversion of an already-valid CSS color to a `#hex` string, for
// the "gradient -> solid mode" default (UX Goal: default to the gradient's first stop
// color rather than silently resetting to DEFAULT_BG). Returns null if it can't.
function cssColorToHex(input) {
  const v = String(input || '').trim();
  if (HEX_RE.test(v)) return v;
  const m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i);
  if (!m) return null;
  const toHex = n => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`.toUpperCase();
}

// WHAT: Classify a stored `background` CSS string into the mode that should open when
// editing an existing card. Falls back to 'advanced' for anything not cleanly a solid
// hex or a clean single-line linear-gradient, per the issue's edge-case guidance.
export function detectMode(cssValue) {
  const v = String(cssValue || '').trim();
  if (HEX_RE.test(v)) return 'solid';
  if (parseGradient(v)) return 'gradient';
  return 'advanced';
}

const ANGLE_MARKS = [
  { value: 0, label: '0°' },
  { value: 90, label: '90°' },
  { value: 180, label: '180°' },
  { value: 270, label: '270°' },
];

/**
 * @param {{ item: Record<string, any>, onChange: (next: Record<string, any>) => void, onValidityChange: (valid: boolean) => void }} props
 */
export default function BackgroundEditor({ item, onChange, onValidityChange }) {
  const value = item.background || DEFAULT_BG;

  // Fresh state per edit session: BackgroundEditor only renders while `editing` is
  // true (see Card below), so it unmounts/remounts each time editing starts -- these
  // initializers naturally re-run `detectMode`/`parseGradient` against the current
  // saved value each time, matching the issue's conceptual `detectMode(value)` init.
  const [uiMode, setUiMode] = useState(() => detectMode(value));
  const [initialGradient] = useState(() => parseGradient(value) || parseGradient(DEFAULT_BG));
  const [angle, setAngle] = useState(initialGradient.angle);
  const [stops, setStops] = useState(initialGradient.stops);
  const [solidHex, setSolidHex] = useState(() => (HEX_RE.test(value.trim()) ? value.trim() : '#2A7B9B'));

  const draft = item._bgInput ?? ('background: ' + value);

  function pushBackground(newBg) {
    onChange({ ...item, background: newBg });
  }
  function pushDraft(newDraft) {
    onChange({ ...item, _bgInput: newDraft, background: normalizeBg(newDraft) });
  }
  function updateGradient(nextAngle, nextStops) {
    setAngle(nextAngle);
    setStops(nextStops);
    pushBackground(serializeGradient(nextAngle, nextStops));
  }

  // Edge case (issue #20): an Advanced-mode value detectMode can't classify must not
  // be silently discarded on a mode switch -- block Solid/Gradient instead.
  const isBlocked = uiMode === 'advanced' && detectMode(value) === 'advanced';

  const solidValid = HEX_RE.test(String(value || '').trim());
  const stopsValid = stops.length >= 2 && stops.every(s => isValidCssColor(s.color));

  // useLayoutEffect (not useEffect) so the parent's Save-button gating reflects this
  // mode's real validity before the browser paints -- no frame where a stale
  // validity value from a previous edit session could leave Save wrongly enabled.
  useLayoutEffect(() => {
    if (uiMode === 'solid') onValidityChange(solidValid);
    else if (uiMode === 'gradient') onValidityChange(stopsValid);
    else onValidityChange(true); // Advanced mode: unchanged behavior, no added gate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiMode, solidValid, stopsValid]);

  function switchMode(next) {
    if (next === uiMode) return;
    if (isBlocked) return; // defense in depth; the control also disables these options

    if (next === 'solid') {
      let hex = solidHex;
      if (uiMode === 'gradient') {
        hex = cssColorToHex(stops[0]?.color) || solidHex;
      } else if (uiMode === 'advanced') {
        const v = value.trim();
        hex = HEX_RE.test(v) ? v : solidHex;
      }
      setSolidHex(hex);
      pushBackground(hex);
    } else if (next === 'gradient') {
      let a = angle;
      let s = stops;
      if (uiMode === 'solid') {
        a = 90;
        s = [{ color: solidHex, position: 0 }, { color: solidHex, position: 100 }];
      } else if (uiMode === 'advanced') {
        const parsed = parseGradient(value);
        if (parsed) {
          a = parsed.angle;
          s = parsed.stops;
        }
      }
      setAngle(a);
      setStops(s);
      pushBackground(serializeGradient(a, s));
    } else if (next === 'advanced') {
      pushDraft('background: ' + value);
    }
    setUiMode(next);
  }

  function resetToDefaultGradient() {
    const p = parseGradient(DEFAULT_BG);
    setAngle(p.angle);
    setStops(p.stops);
    pushBackground(DEFAULT_BG);
    setUiMode('gradient');
  }

  return (
    <div className="bg-editor">
      {/* Decorative: its information (the resulting color/gradient) is already
          conveyed by the structured field values below, per Accessibility Requirements. */}
      <div aria-hidden="true" className="bg-editor-preview" style={{ background: value }} />

      <GdsSegmentedControl
        ariaLabel="Background mode"
        value={uiMode}
        onChange={switchMode}
        options={[
          { value: 'solid', label: 'Solid', disabled: isBlocked },
          { value: 'gradient', label: 'Gradient', disabled: isBlocked },
          { value: 'advanced', label: 'Advanced' },
        ]}
      />

      {isBlocked && (
        <InlineAlert
          severity="warning"
          title="This background can't be edited as Solid or Gradient"
          message="It doesn't match a plain hex color or a single linear-gradient(...) value, so Solid and Gradient mode are unavailable for it here. Keep editing the raw CSS below, or reset to the default gradient to start fresh in a structured mode."
          action={<ChoiceChip label="Reset to default gradient" onClick={resetToDefaultGradient} />}
        />
      )}

      {uiMode === 'solid' && (
        <FormField
          label="Color (hex)"
          error={!solidValid ? 'Enter a valid hex color, e.g. #2A7B9B or #2A7B9BAA.' : undefined}
        >
          <input
            type="text"
            value={value}
            onChange={e => { setSolidHex(e.target.value); pushBackground(e.target.value); }}
            placeholder="#2A7B9B"
          />
        </FormField>
      )}

      {uiMode === 'gradient' && (
        <div className="bg-editor-gradient">
          <GdsSlider
            label="Angle"
            value={angle}
            onChange={a => updateGradient(a, stops)}
            min={0}
            max={360}
            step={1}
            marks={ANGLE_MARKS}
          />
          {stops.map((stop, i) => {
            const stopValid = isValidCssColor(stop.color);
            return (
              <div key={i} className="bg-editor-stop">
                <span
                  aria-hidden="true"
                  className="bg-editor-stop-swatch"
                  style={{ background: stopValid ? stop.color : 'transparent' }}
                />
                <FormField
                  label={`Stop ${i + 1} color`}
                  error={!stopValid ? 'Enter a valid CSS color (hex, rgb(), or rgba()).' : undefined}
                >
                  <input
                    type="text"
                    value={stop.color}
                    onChange={e => {
                      const next = stops.map((s, idx) => (idx === i ? { ...s, color: e.target.value } : s));
                      updateGradient(angle, next);
                    }}
                  />
                </FormField>
                <FormField label={`Stop ${i + 1} position (%)`}>
                  <NumberStepper
                    ariaLabel={`Stop ${i + 1} position percent`}
                    value={stop.position}
                    min={0}
                    max={100}
                    step={1}
                    onChange={pos => {
                      const next = stops.map((s, idx) => (idx === i ? { ...s, position: pos } : s));
                      updateGradient(angle, next);
                    }}
                  />
                </FormField>
                <ChoiceChip
                  label="Remove"
                  onClick={() => {
                    if (stops.length <= 2) return;
                    updateGradient(angle, stops.filter((_, idx) => idx !== i));
                  }}
                />
              </div>
            );
          })}
          <ChoiceChip
            label="+ Add stop"
            onClick={() => {
              const last = stops[stops.length - 1];
              const nextPos = Math.min(100, (last?.position ?? 0) + 10);
              updateGradient(angle, [...stops, { color: last?.color || '#2A7B9B', position: nextPos }]);
            }}
          />
        </div>
      )}

      {uiMode === 'advanced' && (
        <FormField label="Background (paste your 2 lines)">
          <textarea
            placeholder={"background: #2A7B9B;\nbackground: linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%);"}
            value={draft}
            onChange={e => pushDraft(e.target.value)}
            rows={4}
          />
        </FormField>
      )}
    </div>
  );
}
