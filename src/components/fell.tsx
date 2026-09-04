/**
 * The fell, behind everything.
 *
 * Four receding ridgelines, a lake band catching the light, and mist lying
 * between the layers. Inline SVG — no image asset, no external request, and
 * nothing to wait for.
 *
 * **It is a tint in the paper, not a picture.** The whole thing sits at low
 * opacity under `multiply`, so it darkens the parchment unevenly the way damp
 * does rather than drawing a landscape you look at. If you can tell what it is
 * without being told, it is too strong — and it must not compete with text, so
 * the ridges are held under 0.2 opacity where type actually sits.
 *
 * **No layout shift, structurally.** The element is `fixed` and out of flow, so
 * it cannot move anything when it paints; and it is markup rather than a
 * fetched asset, so it arrives with the document. There is no moment where the
 * page exists and the background does not.
 *
 * Perspective is carried by three things at once, because any one of them alone
 * reads as flat shapes: each ridge further back is lighter, less saturated, and
 * has less vertical relief than the one in front of it.
 *
 * Greens are drawn from the palette by hand rather than by `var()`, because SVG
 * `fill` inside a `<defs>` gradient stop does not inherit custom properties
 * reliably across browsers and a half-resolved gradient is worse than a fixed
 * one. They are the leaf/moss family: #2b4029, #3f5d3a, #6d8659 desaturated
 * toward the parchment as they recede.
 */
export function Fell() {
  return (
    <div className="fell" aria-hidden="true">
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Light on water: brightest at the far shore, gone by the near edge. */}
          <linearGradient id="fell-lake" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8ea07d" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#7b8f6f" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#5f7358" stopOpacity="0.18" />
          </linearGradient>

          {/* Mist gathers in the trough between ridges and thins upward. */}
          <linearGradient id="fell-mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#efe6cd" stopOpacity="0" />
            <stop offset="70%" stopColor="#efe6cd" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#efe6cd" stopOpacity="0.82" />
          </linearGradient>

          <linearGradient id="fell-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3d7b6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#efe6cd" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="1440" height="520" fill="url(#fell-sky)" />

        {/* Furthest: palest, flattest, least saturated. */}
        <path
          fill="#9aa98c"
          fillOpacity="0.3"
          d="M0 372 L96 340 L214 356 L338 300 L470 338 L602 292 L742 330 L880 296
             L1016 334 L1150 306 L1288 340 L1440 312 L1440 900 L0 900 Z"
        />
        <rect x="0" y="330" width="1440" height="120" fill="url(#fell-mist)" />

        <path
          fill="#6d8659"
          fillOpacity="0.3"
          d="M0 468 L128 414 L268 452 L404 372 L548 434 L688 380 L836 442 L972 392
             L1118 448 L1262 400 L1440 452 L1440 900 L0 900 Z"
        />
        <rect x="0" y="430" width="1440" height="130" fill="url(#fell-mist)" />

        {/* The lake, caught between the middle and near ridges. */}
        <rect x="0" y="556" width="1440" height="86" fill="url(#fell-lake)" />
        <path
          fill="#efe6cd"
          fillOpacity="0.34"
          d="M212 588 h360 v3 h-360 Z M700 604 h250 v3 h-250 Z M1010 578 h280 v3 h-280 Z"
        />

        <path
          fill="#3f5d3a"
          fillOpacity="0.28"
          d="M0 642 L150 640 L360 646 L640 640 L900 648 L1180 642 L1440 646
             L1440 900 L0 900 Z"
        />

        {/* Nearest: darkest, most relief, most saturated — and still under a
            third opacity, because the content area scrolls over it. */}
        <path
          fill="#2b4029"
          fillOpacity="0.3"
          d="M0 760 L112 690 L232 742 L360 664 L500 736 L642 672 L790 748 L928 686
             L1074 752 L1220 694 L1360 748 L1440 716 L1440 900 L0 900 Z"
        />

        {/* Hedgerow scratches on the near slope. Field boundaries, not trees. */}
        <g stroke="#2b4029" strokeOpacity="0.16" strokeWidth="2" fill="none">
          <path d="M150 800 q40 -26 96 -14" />
          <path d="M470 826 q56 -30 120 -18" />
          <path d="M830 812 q48 -24 104 -12" />
          <path d="M1180 832 q44 -26 100 -16" />
        </g>
      </svg>
    </div>
  );
}
