import { useEffect, useId, useRef, useState } from "react";
import map from "@/assets/orbital/orbital-map.svg";

const paths = [
  { category: "build", rx: 232, ry: 69, rotation: -27, phase: 0, duration: 90 },
  { category: "apply", rx: 209, ry: 76, rotation: 26, phase: 0.47, duration: 110 },
  { category: "lead", rx: 151, ry: 58, rotation: -68, phase: 0.45, duration: 130 },
];

export function OrbitalArt({
  animated = false,
  category,
}: {
  animated?: boolean;
  category?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const elapsed = useRef(0);
  const id = useId();
  const [paused, setPaused] = useState(false);
  const routeClass = (name: string) =>
    "orbit-route" + (category && name !== category ? " is-muted" : "");

  useEffect(() => {
    if (!animated || !root.current) return;
    const art = root.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let frame: number | null = null;
    let lastTime: number | null = null;

    function draw() {
      for (const path of paths) {
        const rotation = (path.rotation * Math.PI) / 180;
        const angle = (path.phase + elapsed.current / (path.duration * 1000)) * Math.PI * 2;
        const x = path.rx * Math.cos(angle);
        const y = path.ry * Math.sin(angle);
        const cx = (283 + x * Math.cos(rotation) - y * Math.sin(rotation)).toFixed(3);
        const cy = (165 + x * Math.sin(rotation) + y * Math.cos(rotation)).toFixed(3);
        art.querySelectorAll(`[data-orbit-planet="${path.category}"]`).forEach((node) => {
          node.setAttribute("cx", cx);
          node.setAttribute("cy", cy);
        });
      }
    }
    function canMove() {
      const dialog = document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]');
      return !paused && !media.matches && inView && !document.hidden && !dialog;
    }
    function tick(time: number) {
      frame = null;
      if (!canMove()) {
        lastTime = null;
        return;
      }
      if (lastTime !== null) elapsed.current += Math.min(Math.max(time - lastTime, 0), 80);
      lastTime = time;
      draw();
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      if (canMove()) {
        if (frame === null) {
          lastTime = null;
          frame = requestAnimationFrame(tick);
        }
      } else {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        lastTime = null;
      }
    }
    const visibility = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    visibility.observe(art);
    const dialogs = new MutationObserver(sync);
    dialogs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "data-open"],
    });
    media.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    draw();
    sync();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      visibility.disconnect();
      dialogs.disconnect();
      media.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [animated, paused]);

  if (!animated)
    return (
      <figure className="orbital-art orbital-static">
        <img src={map} alt="" />
        <figcaption className="art-bottom">Build / Apply / Lead</figcaption>
      </figure>
    );
  return (
    <figure className="orbital-art" ref={root}>
      <div className="art-caption" aria-hidden="true">
        Atlas nowych możliwości
      </div>
      <svg
        className="orbit-map"
        viewBox="0 0 560 350"
        fill="none"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id={`world-${id}`}>
            <circle cx="283" cy="165" r="89" />
          </clipPath>
          <clipPath id={`front-${id}`}>
            <rect x="0" y="165" width="560" height="185" />
          </clipPath>
          <pattern id={`lines-${id}`} width="6" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 1h6" stroke="#b4a67c" strokeWidth=".6" />
          </pattern>
        </defs>
        <circle cx="283" cy="165" r="139" fill="#eddfbd" />
        <circle cx="283" cy="165" r="161" stroke="#cec5ab" strokeWidth=".8" strokeDasharray="2 7" />
        <path d="M27 165h507M283 7v317" stroke="#d2c9b3" strokeWidth=".7" />
        <g className={routeClass("build")} data-metro-route="build">
          <ellipse
            cx="283"
            cy="165"
            rx="232"
            ry="69"
            transform="rotate(-27 283 165)"
            stroke="var(--dr-category-build)"
            strokeWidth="13"
          />
        </g>
        <g className={routeClass("apply")} data-metro-route="apply">
          <ellipse
            cx="283"
            cy="165"
            rx="209"
            ry="76"
            transform="rotate(26 283 165)"
            stroke="var(--dr-category-apply)"
            strokeWidth="13"
          />
        </g>
        <g className={routeClass("lead")} data-metro-route="lead">
          <ellipse
            cx="283"
            cy="165"
            rx="151"
            ry="58"
            transform="rotate(-68 283 165)"
            stroke="var(--dr-category-lead)"
            strokeWidth="11"
          />
        </g>
        <g className={routeClass("build")} data-metro-route="build">
          <circle
            data-orbit-planet="build"
            cx="489.714"
            cy="59.674"
            r="16"
            fill="var(--dr-category-build)"
            stroke="#f5ebd1"
            strokeWidth="4"
          />
        </g>
        <g className={routeClass("apply")} data-metro-route="apply">
          <circle
            data-orbit-planet="apply"
            cx="94.390"
            cy="88.808"
            r="11"
            fill="var(--dr-category-apply)"
            stroke="#f5ebd1"
            strokeWidth="3"
          />
        </g>
        <g className={routeClass("lead")} data-metro-route="lead">
          <circle
            data-orbit-planet="lead"
            cx="245.839"
            cy="304.864"
            r="12"
            fill="var(--dr-category-lead)"
            stroke="#f5ebd1"
            strokeWidth="3"
          />
        </g>
        <circle cx="283" cy="165" r="89" fill="#dbc797" />
        <g clipPath={`url(#world-${id})`}>
          <ellipse cx="249" cy="140" rx="91" ry="104" fill="#f5ebd1" />
          <rect x="185" y="70" width="195" height="190" fill={`url(#lines-${id})`} opacity=".6" />
          <path d="M193 166h180" stroke="#b4a67c" strokeWidth="1" />
        </g>
        <g clipPath={`url(#front-${id})`}>
          <g className={routeClass("build")} data-metro-route="build">
            <ellipse
              cx="283"
              cy="165"
              rx="232"
              ry="69"
              transform="rotate(-27 283 165)"
              stroke="var(--dr-category-build)"
              strokeWidth="13"
            />
          </g>
          <g className={routeClass("apply")} data-metro-route="apply">
            <ellipse
              cx="283"
              cy="165"
              rx="209"
              ry="76"
              transform="rotate(26 283 165)"
              stroke="var(--dr-category-apply)"
              strokeWidth="13"
            />
          </g>
          <g className={routeClass("lead")} data-metro-route="lead">
            <ellipse
              cx="283"
              cy="165"
              rx="151"
              ry="58"
              transform="rotate(-68 283 165)"
              stroke="var(--dr-category-lead)"
              strokeWidth="11"
            />
          </g>
          <g className={routeClass("build")} data-metro-route="build">
            <circle
              data-orbit-planet="build"
              cx="489.714"
              cy="59.674"
              r="16"
              fill="var(--dr-category-build)"
              stroke="#f5ebd1"
              strokeWidth="4"
            />
          </g>
          <g className={routeClass("apply")} data-metro-route="apply">
            <circle
              data-orbit-planet="apply"
              cx="94.390"
              cy="88.808"
              r="11"
              fill="var(--dr-category-apply)"
              stroke="#f5ebd1"
              strokeWidth="3"
            />
          </g>
          <g className={routeClass("lead")} data-metro-route="lead">
            <circle
              data-orbit-planet="lead"
              cx="245.839"
              cy="304.864"
              r="12"
              fill="var(--dr-category-lead)"
              stroke="#f5ebd1"
              strokeWidth="3"
            />
          </g>
        </g>
        <g className={routeClass("build")} data-metro-route="build">
          <text x="528" y="24" fill="var(--dr-category-build)" textAnchor="end">
            01 / BUILD
          </text>
        </g>
        <g className={routeClass("apply")} data-metro-route="apply">
          <text x="27" y="41" fill="var(--dr-category-apply)">
            02 / APPLY
          </text>
        </g>
        <g className={routeClass("lead")} data-metro-route="lead">
          <text x="365" y="328" fill="var(--dr-category-lead)">
            03 / LEAD
          </text>
        </g>
        <g stroke="#393b31" strokeWidth="1.4">
          <path d="M499 167v16m-8-8h16M67 246v10m-5-5h10M376 29v10m-5-5h10" />
          <path d="m488 282 4-4 4 4-4 4Z" />
        </g>
        <circle cx="148" cy="308" r="2.5" fill="#393b31" />
        <circle cx="418" cy="261" r="2" fill="#393b31" />
      </svg>
      <figcaption className="art-bottom">
        <span aria-hidden="true">Build / Apply / Lead</span>
        <span className="motion-note">Tryb bez ruchu</span>
        <button
          type="button"
          className="orbit-motion"
          aria-label={paused ? "Wznów ruch planet" : "Wstrzymaj ruch planet"}
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          <span className="motion-symbol" aria-hidden="true">
            {paused ? "▷" : "Ⅱ"}
          </span>
          {paused ? "Wznów ruch" : "Wstrzymaj ruch"}
        </button>
      </figcaption>
    </figure>
  );
}
