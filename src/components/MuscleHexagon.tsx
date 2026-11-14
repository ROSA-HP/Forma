import React from 'react';
import { Region } from '../types/index.ts';
import { REGION_ORDER, BAND_COLORS, readinessColor } from '../domain/constants.ts';
import { getMuscleBand, formatRegionName } from '../domain/calculations.ts';
import { useApp } from '../context/AppContext.tsx';
import type { Translations } from '../i18n/index.ts';

interface MuscleHexagonProps {
  values: Record<Region, number> | number[];
  /**
   * volume   – % of the weekly set target, drawn on a 0–150 scale with a dashed 100% target ring.
   * recovery – % recovered, 0–100 scale (a fully fresh athlete fills the chart).
   * coverage – planned emphasis of a collection, 0–100 relative to its most-trained region.
   */
  mode?: 'volume' | 'recovery' | 'coverage';
  compareValues?: Record<Region, number> | number[];
  size?: 'sm' | 'md';
  showLabels?: boolean;
  onSelectRegion?: (region: Region) => void;
  selectedRegion?: Region;
  className?: string;
}

export const MuscleHexagon: React.FC<MuscleHexagonProps> = ({
  values,
  mode = 'volume',
  compareValues,
  size = 'md',
  showLabels = true,
  onSelectRegion,
  selectedRegion,
  className = ''
}) => {
  const { t } = useApp();

  const getVal = (source: Record<Region, number> | number[] | undefined, index: number, region: Region): number => {
    if (!source) return 100;
    if (Array.isArray(source)) {
      return source[index] ?? 100;
    }
    return source[region] ?? 100;
  };

  const isSmall = size === 'sm';
  const width = isSmall ? 180 : 340;
  const height = isSmall ? 180 : 340;
  const cx = width / 2;
  const cy = height / 2;
  const maxR = isSmall ? 52 : 108; // radius of the outer ring

  // Volume can overshoot its target, so it leaves headroom; the other modes top out at 100
  const scaleMax = mode === 'volume' ? 150 : 100;
  const scaleMin = mode === 'volume' ? 10 : 6; // keeps a zero vertex visible near the centre
  const radiusFor = (val: number) => maxR * (Math.max(scaleMin, Math.min(scaleMax, val)) / scaleMax);

  const colorFor = (val: number): string => {
    if (mode === 'recovery') return readinessColor(val);
    if (mode === 'coverage') return val > 0 ? 'var(--accent-line)' : 'var(--muted)';
    return BAND_COLORS[getMuscleBand(val)];
  };
  const statusFor = (val: number): string => {
    if (mode !== 'volume') return '';
    return ` (${t[`band_${getMuscleBand(val)}` as keyof typeof t]})`;
  };

  // Compute 6 vertex positions
  const getCoordinates = (radius: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    };
  };

  const angles = [-90, -30, 30, 90, 150, 210]; // Clockwise: Top=Chest, Delts, Arms, Back, Legs, Core

  // Ring coordinates
  const makeHexagonPoints = (radius: number) => {
    return angles.map(a => {
      const { x, y } = getCoordinates(radius, a);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  // Inner guide ring(s) plus the outer boundary
  const innerRings = [50];
  const targetRing = mode === 'volume' ? makeHexagonPoints(maxR * (100 / scaleMax)) : null;
  const outerRing = makeHexagonPoints(maxR);

  // Current polygon points
  const currentVertices = REGION_ORDER.map((region, i) => {
    const val = getVal(values, i, region);
    return {
      region,
      val,
      color: colorFor(val),
      ...getCoordinates(radiusFor(val), angles[i])
    };
  });

  const currentPoints = currentVertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');

  // Compare polygon points (optional previous period)
  let comparePoints: string | null = null;
  if (compareValues) {
    comparePoints = REGION_ORDER.map((region, i) => {
      const val = getVal(compareValues, i, region);
      const { x, y } = getCoordinates(radiusFor(val), angles[i]);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  // Accessible summary
  const ariaDescription = REGION_ORDER.map((r, i) => {
    const v = getVal(values, i, r);
    return `${t[`region_${r}` as keyof typeof t] || formatRegionName(r)}: ${v}%${statusFor(v)}`;
  }).join(', ');

  // 3-letter codes for small size
  const shortLabels: Record<Region, string> = {
    chest: 'CHE',
    delts: 'DEL',
    arms: 'ARM',
    back: 'BAC',
    legs: 'LEG',
    core: 'COR'
  };

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`} dir="ltr">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-w-full overflow-visible"
        role="img"
        aria-label={t.radarChartAria.replace('{mode}', mode).replace('{description}', ariaDescription)}
      >
        {/* Concentric Hexagons */}
        {innerRings.map(pct => (
          <polygon
            key={pct}
            points={makeHexagonPoints(maxR * (pct / scaleMax))}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}
        {targetRing && (
          <polygon
            points={targetRing}
            fill="none"
            stroke="var(--accent-line)"
            strokeDasharray="3 3"
            strokeOpacity="0.75"
            strokeWidth="1"
          />
        )}
        <polygon
          points={outerRing}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
        />

        {/* 100% Target Label (volume only: the other modes end at 100) */}
        {!isSmall && targetRing && (
          <text
            x={cx + maxR * (100 / scaleMax) * Math.cos((-30 * Math.PI) / 180) + 4}
            y={cy + maxR * (100 / scaleMax) * Math.sin((-30 * Math.PI) / 180) - 2}
            fill="var(--accent-ink)"
            fontSize="8"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            {t.hexTarget}
          </text>
        )}

        {/* 6 Radial Axes */}
        {angles.map((a, i) => {
          const { x, y } = getCoordinates(maxR, a);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
            />
          );
        })}

        {/* Compare Polygon (Dashed gray outline) */}
        {comparePoints && (
          <polygon
            points={comparePoints}
            fill="none"
            stroke="var(--muted)"
            strokeDasharray="3 3"
            strokeWidth="1.2"
            opacity="0.6"
          />
        )}

        {/* Current Filled Polygon */}
        <polygon
          className="hex-poly"
          points={currentPoints}
          fill="var(--accent)"
          fillOpacity="var(--hex-fill-opacity)"
          stroke="var(--accent-line)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Vertex dots */}
        {currentVertices.map((v, i) => {
          const color = v.color;
          const isSelected = selectedRegion === v.region;
          return (
            <g 
              key={i} 
              className={onSelectRegion ? 'cursor-pointer' : ''}
              onClick={() => onSelectRegion?.(v.region)}
            >
              <circle
                className="hex-dot"
                style={{ animationDelay: `${180 + i * 60}ms` }}
                cx={v.x}
                cy={v.y}
                r={isSmall ? 3 : (isSelected ? 5.5 : 4)}
                fill={color}
                stroke="var(--surface)"
                strokeWidth={isSmall ? 1 : 1.5}
              />
              {isSelected && (
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={8}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  className="animate-ping ping-svg"
                />
              )}
            </g>
          );
        })}

        {/* Outer Region Labels */}
        {showLabels && currentVertices.map((v, i) => {
          const labelDist = maxR + (isSmall ? 14 : 26);
          const { x, y } = getCoordinates(labelDist, angles[i]);
          const color = mode === 'coverage' && v.val > 0 ? 'var(--text)' : v.color;

          let textAnchor: 'middle' | 'start' | 'end' = 'middle';
          if (angles[i] === -30 || angles[i] === 30) textAnchor = 'start';
          if (angles[i] === 150 || angles[i] === 210) textAnchor = 'end';

          const localizedName = t[`region_${v.region}` as keyof typeof t] || formatRegionName(v.region);
          const displayLabel = isSmall ? shortLabels[v.region] : localizedName;

          return (
            <text
              key={i}
              x={x}
              y={y + (angles[i] === 90 ? 8 : (angles[i] === -90 ? -4 : 4))}
              textAnchor={textAnchor}
              className={onSelectRegion ? 'cursor-pointer' : ''}
              onClick={() => onSelectRegion?.(v.region)}
              fill={selectedRegion === v.region ? 'var(--text)' : color}
              fontSize={isSmall ? '9' : '12'}
              fontWeight="700"
            >
              {displayLabel} {!isSmall && <tspan fill="var(--text)" fontWeight="400" className="tabular-nums">{v.val}%</tspan>}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

/**
 * Generates the analytical insight line from region values
 */
export function getHexagonInsightLine(values: Record<Region, number>, t: Translations): string {
  const localize = (r: Region) => t[`region_${r}` as keyof typeof t] || formatRegionName(r);
  const deficitRegions = REGION_ORDER.filter(r => (values[r] ?? 100) < 60).map(localize);
  const peakRegions = REGION_ORDER.filter(r => (values[r] ?? 100) > 120).map(localize);

  if (deficitRegions.length > 0 && peakRegions.length > 0) {
    return t.insightDeficitPeak.replace('{deficit}', deficitRegions.join(', ')).replace('{peak}', peakRegions.join(', '));
  }
  if (deficitRegions.length === REGION_ORDER.length) {
    return t.insightAllDeficit;
  }
  if (deficitRegions.length > 0) {
    return t.insightDeficit.replace('{deficit}', deficitRegions.join(', '));
  }
  if (peakRegions.length > 0) {
    return t.insightPeak.replace('{peak}', peakRegions.join(', '));
  }
  return t.insightOptimal;
}
