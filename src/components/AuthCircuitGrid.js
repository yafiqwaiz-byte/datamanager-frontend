import React from 'react';
import { STATION_COORDS_BY_BA } from './StationCoords';
/**
 * AuthCircuitGrid — signature illustration for the auth split-screen panel.
 * A geometric grid of circuit lines with amber pulse-dots traveling along
 * select paths, evoking TNB's transmission/distribution network.
 */
export default function AuthCircuitGrid() {
  return (
    <svg
      className="auth-panel-grid"
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="acg-dots" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.06)" />
        </pattern>
      </defs>
      <rect width="600" height="800" fill="url(#acg-dots)" />

      {/* Static circuit lines */}
      <g stroke="rgba(255,255,255,0.10)" strokeWidth="1.5" fill="none">
        <path d="M0 120 H180 V220 H420 V340" />
        <path d="M0 420 H120 V520 H300 V600 H600" />
        <path d="M520 0 V160 H360 V280" />
        <path d="M600 240 H460 V360 H260 V480" />
        <path d="M0 680 H160 V760 H380" />
        <path d="M380 760 V800" />
        <path d="M260 480 V620 H460 V800" />
        <path d="M120 520 V760" />
        <path d="M420 340 V440 H600" />
      </g>

      {/* Circuit nodes */}
      <g fill="rgba(255,255,255,0.18)">
        <circle cx="180" cy="120" r="3.5" />
        <circle cx="180" cy="220" r="3.5" />
        <circle cx="420" cy="220" r="3.5" />
        <circle cx="120" cy="420" r="3.5" />
        <circle cx="120" cy="520" r="3.5" />
        <circle cx="300" cy="520" r="3.5" />
        <circle cx="300" cy="600" r="3.5" />
        <circle cx="520" cy="160" r="3.5" />
        <circle cx="360" cy="160" r="3.5" />
        <circle cx="360" cy="280" r="3.5" />
        <circle cx="460" cy="240" r="3.5" />
        <circle cx="460" cy="360" r="3.5" />
        <circle cx="260" cy="360" r="3.5" />
        <circle cx="260" cy="480" r="3.5" />
        <circle cx="160" cy="680" r="3.5" />
        <circle cx="160" cy="760" r="3.5" />
        <circle cx="420" cy="340" r="3.5" />
        <circle cx="420" cy="440" r="3.5" />
        <circle cx="260" cy="620" r="3.5" />
        <circle cx="460" cy="620" r="3.5" />
      </g>

      {/* Animated amber pulse dots traveling along key paths */}
      <g fill="#f59e0b">
        <circle r="3" className="auth-pulse-dot">
          <animateMotion
            dur="6s"
            repeatCount="indefinite"
            path="M0 120 H180 V220 H420 V340"
          />
          <animate attributeName="opacity" values="0;1;1;0" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle r="3" className="auth-pulse-dot">
          <animateMotion
            dur="8s"
            begin="1.5s"
            repeatCount="indefinite"
            path="M0 420 H120 V520 H300 V600 H600"
          />
          <animate attributeName="opacity" values="0;1;1;0" dur="8s" begin="1.5s" repeatCount="indefinite" />
        </circle>
        <circle r="3" className="auth-pulse-dot">
          <animateMotion
            dur="7s"
            begin="3s"
            repeatCount="indefinite"
            path="M520 0 V160 H360 V280"
          />
          <animate attributeName="opacity" values="0;1;1;0" dur="7s" begin="3s" repeatCount="indefinite" />
        </circle>
        <circle r="3" className="auth-pulse-dot">
          <animateMotion
            dur="9s"
            begin="0.5s"
            repeatCount="indefinite"
            path="M600 240 H460 V360 H260 V480"
          />
          <animate attributeName="opacity" values="0;1;1;0" dur="9s" begin="0.5s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}