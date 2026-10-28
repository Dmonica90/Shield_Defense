import type { ReactNode } from 'react';
import type { AreaId } from '../game/types';
import { useLanguage } from '../i18n/LanguageProvider';

/**
 * The illustrated room behind each area: flat line art in warm cream, orange and
 * navy, a desk with the monitor showing the app the situation happens in. Drawn
 * on a 1600×900 stage; `scene.ts` places the hotspots over the objects here, so
 * moving an object means moving its slot too. The few words drawn into the
 * scenes come from the script (`art` in the story files), so they follow the
 * language switch like everything else.
 */

const useArt = () => useLanguage().story.art;

const INK = {
  line: '#2a2c3d',
  wall: '#ece4d8',
  wallShade: '#ddd3c5',
  floor: '#e2d9cb',
  desk: '#d6ccbe',
  deskFront: '#c2b7a8',
  cream: '#f7f2ea',
  paper: '#fbf8f2',
  orange: '#f07a2b',
  orangeSoft: '#f5a46b',
  gray: '#9a948c',
  grayLight: '#c9c2b8',
  bar: '#d3cdc4',
  navy: '#2e3a59',
  bezel: '#363a4f',
  slack: '#4a1f4f',
  slackDark: '#3a173e',
  blue: '#3d79b0',
  red: '#d9473f',
  green: '#5f9e6e',
  leaf: '#4f6b5a',
  leafDark: '#3d5547',
  night: '#1f2740',
  nightGlow: '#2c3757',
};

const S = { stroke: INK.line, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const FONT = 'ui-sans-serif, system-ui, sans-serif';

/* ── The room ─────────────────────────────────────────────────────────── */

function Room({ night = false, windowX = 1010 }: { night?: boolean; windowX?: number }) {
  return (
    <g>
      <rect width="1600" height="900" fill={night ? '#cfc6ba' : INK.wall} />
      <path d="M0 0H250V720L0 780Z" fill={night ? '#bdb3a6' : INK.wallShade} {...S} />
      <rect x="250" y="-10" width="28" height="730" fill={INK.orange} {...S} />
      <path d="M278 120H420" {...S} strokeWidth={6} />
      <path d="M40 160L210 120V300L40 340Z" fill={INK.cream} {...S} />
      <path d="M40 200l170-40M40 250l170-40M40 300l170-40" {...S} strokeWidth={2} opacity={0.5} />
      <Window x={windowX} y={70} night={night} />
      <rect x="0" y="760" width="1600" height="140" fill={INK.floor} />
      <path d="M0 760H1600" {...S} />
    </g>
  );
}

function Window({ x, y, night }: { x: number; y: number; night: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width="400" height="330" fill={night ? INK.night : INK.paper} {...S} strokeWidth={6} />
      {night ? (
        <>
          <circle cx={x + 300} cy={y + 80} r="34" fill={INK.cream} />
          <circle cx={x + 316} cy={y + 70} r="30" fill={INK.night} />
          {[
            [60, 60],
            [150, 120],
            [220, 50],
            [90, 200],
          ].map(([dx, dy]) => (
            <circle key={`${dx}-${dy}`} cx={x + dx} cy={y + dy} r="3" fill={INK.cream} />
          ))}
          <path d={`M${x} ${y + 260}h60v-50h50v80h70v-120h60v90h80v-40h80v100H${x}Z`} fill={INK.nightGlow} />
        </>
      ) : (
        <path d={`M${x + 40} ${y + 300}l120-150M${x + 120} ${y + 300}l140-180`} stroke={INK.grayLight} strokeWidth={3} />
      )}
      <path d={`M${x + 200} ${y}V${y + 330}M${x} ${y + 120}H${x + 400}`} {...S} strokeWidth={6} />
      <rect x={x - 20} y={y + 330} width="440" height="22" fill={INK.cream} {...S} />
    </g>
  );
}

function Desk() {
  return (
    <g>
      <rect x="150" y="732" width="24" height="170" fill={INK.deskFront} {...S} />
      <rect x="1426" y="732" width="24" height="170" fill={INK.deskFront} {...S} />
      <rect x="90" y="700" width="1420" height="36" rx="6" fill={INK.desk} {...S} />
      <path d="M100 718H1500" stroke={INK.deskFront} strokeWidth={4} />
    </g>
  );
}

/* ── Props ────────────────────────────────────────────────────────────── */

/** A big all-in-one monitor; `children` draws on the screen, origin at its top-left. */
function Monitor({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: ReactNode }) {
  const cx = x + w / 2;
  const sw = w - 44;
  const sh = h - 110;
  return (
    <g>
      <path d={`M${cx - 50} ${y + h - 10}L${cx - 80} 700H${cx + 80}L${cx + 50} ${y + h - 10}Z`} fill={INK.gray} {...S} />
      <ellipse cx={cx} cy="704" rx="150" ry="10" fill={INK.grayLight} {...S} />
      <rect x={x} y={y} width={w} height={h} rx="26" fill={INK.bezel} {...S} />
      <path d={`M${x} ${y + h - 88}H${x + w}V${y + h - 26}a26 26 0 0 1 -26 26H${x + 26}a26 26 0 0 1 -26 -26Z`} fill={INK.grayLight} {...S} />
      <circle cx={cx} cy={y + h - 44} r="14" fill={INK.bezel} />
      <svg x={x + 22} y={y + 22} width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`} overflow="hidden">
        <rect width={sw} height={sh} fill={INK.paper} />
        {children}
      </svg>
      <rect x={x + 22} y={y + 22} width={sw} height={sh} fill="none" {...S} strokeWidth={3} />
    </g>
  );
}

/** A window title bar with the three traffic lights and a search field. */
function TitleBar({ w, label }: { w: number; label: string }) {
  return (
    <g>
      <rect width={w} height="30" fill={INK.slackDark} />
      <circle cx="16" cy="15" r="5" fill={INK.red} />
      <circle cx="32" cy="15" r="5" fill="#e9b949" />
      <circle cx="48" cy="15" r="5" fill={INK.green} />
      <rect x={w * 0.3} y="7" width={w * 0.4} height="16" rx="5" fill="#5c3a60" />
      <text x={w * 0.3 + 12} y="19" fontSize="10" fill="#e8dcea" fontFamily={FONT}>
        {label}
      </text>
    </g>
  );
}

/** Slack: dark sidebar, a channel (optionally with a pinned message), a few messages and the composer. */
function SlackPane({ w, h, alert = false, channel, pinned }: { w: number; h: number; alert?: boolean; channel?: string; pinned?: [string, string] }) {
  const side = Math.min(150, w * 0.36);
  const msgs = pinned ? [112, 182, 252] : [60, 130, 205, 275];
  return (
    <g>
      <rect width={w} height={h} fill={INK.paper} />
      <rect width={side} height={h} fill={INK.slack} />
      <rect x="10" y="12" width="26" height="26" rx="6" fill="#6b4a8a" stroke={INK.cream} strokeWidth={2} />
      <rect x="10" y="48" width="26" height="26" rx="6" fill="#3f7f8c" />
      <rect x="10" y="84" width="26" height="26" rx="6" fill="#7a5a52" />
      <rect x="48" y="16" width={side - 70} height="8" rx="4" fill={INK.cream} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          {i === 2 && <rect x="44" y={56 + i * 24} width={side - 44} height="20" fill={INK.blue} />}
          <rect x="54" y={62 + i * 24} width={side - 80 - ((i * 13) % 30)} height="7" rx="3.5" fill={i === 2 ? INK.cream : '#9d7fa3'} />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={`dm-${i}`}>
          <circle cx="56" cy={230 + i * 22} r="4" fill={i === 1 ? INK.orange : INK.green} />
          <rect x="66" y={227 + i * 22} width={side - 96 - i * 6} height="6" rx="3" fill="#9d7fa3" />
        </g>
      ))}
      {alert && <rect x={side - 30} y="221" width="20" height="14" rx="7" fill={INK.red} />}
      <rect x={side} width={w - side} height="36" fill={INK.paper} />
      <path d={`M${side} 36H${w}`} stroke={INK.bar} strokeWidth={2} />
      <text x={side + 14} y="24" fontSize="13" fontWeight="700" fill={INK.line} fontFamily={FONT}>
        #
      </text>
      {channel ? (
        <text x={side + 26} y="24" fontSize="12" fontWeight="700" fill={INK.line} fontFamily={FONT}>
          {channel}
        </text>
      ) : (
        <rect x={side + 28} y="15" width="80" height="8" rx="4" fill={INK.line} />
      )}
      {pinned && (
        <g>
          <rect x={side + 8} y="44" width={w - side - 16} height="54" rx="6" fill="#fdf1c7" stroke="#e9b949" strokeWidth={2} />
          <text x={side + 16} y="66" fontSize="10.5" fontWeight="700" fill={INK.line} fontFamily={FONT}>
            📌 {pinned[0]}
          </text>
          <text x={side + 16} y="86" fontSize="10.5" fill={INK.line} fontFamily={FONT}>
            {pinned[1]}
          </text>
        </g>
      )}
      {msgs.map((y, i) => (
        <g key={y}>
          <rect x={side + 14} y={y} width="26" height="26" rx="5" fill={INK.grayLight} {...S} strokeWidth={2} />
          <rect x={side + 50} y={y + 2} width="70" height="7" rx="3.5" fill={INK.line} />
          <rect x={side + 50} y={y + 16} width={w - side - 90 - (i % 2) * 60} height="7" rx="3.5" fill={i === 1 ? INK.blue : INK.bar} />
          <rect x={side + 50} y={y + 30} width={(w - side) * 0.4} height="7" rx="3.5" fill={i === 1 ? INK.blue : INK.bar} />
        </g>
      ))}
      <rect x={side + 50} y={msgs[msgs.length - 1] + 46} width="34" height="18" rx="9" fill="#dbe8f5" stroke={INK.blue} strokeWidth={1.5} />
      <rect x={side + 12} y={h - 56} width={w - side - 24} height="44" rx="6" fill="#fff" stroke={INK.gray} strokeWidth={2} />
      <path d={`M${w - 30} ${h - 40}l12 6-12 6Z`} fill={INK.gray} />
    </g>
  );
}

/** A spreadsheet open with its "Share" menu out: the personal apps sit right next to the corporate one. */
function SheetPane({ w, h, file }: { w: number; h: number; file: string }) {
  const art = useArt();
  const cols = [0, 70, 150, 220];
  return (
    <g>
      <rect width={w} height={h} fill="#fff" />
      <rect width={w} height="34" fill={INK.green} />
      <rect x="10" y="8" width="18" height="18" rx="3" fill="#fff" />
      <path d="M14 12l10 10M24 12l-10 10" stroke={INK.green} strokeWidth={2.5} />
      <text x="36" y="22" fontSize="12" fontWeight="700" fill="#fff" fontFamily={FONT}>
        {file}
      </text>
      <rect x={w - 82} y="7" width="72" height="20" rx="10" fill="#fff" />
      <text x={w - 70} y="21" fontSize="10.5" fontWeight="700" fill={INK.green} fontFamily={FONT}>
        {art.share}
      </text>
      {art.columns.map((c, i) => (
        <text key={c} x={8 + cols[i]} y="54" fontSize="10" fontWeight="700" fill={INK.gray} fontFamily={FONT}>
          {c}
        </text>
      ))}
      {Array.from({ length: 11 }, (_, r) => (
        <g key={r}>
          <path d={`M0 ${62 + r * 26}H${w}`} stroke="#e6e2db" strokeWidth={1} />
          {cols.map((x, c) => (
            <rect key={c} x={8 + x} y={70 + r * 26} width={c === 2 ? 46 : 54 - ((r * 7 + c * 11) % 18)} height="7" rx="3.5" fill={c === 2 ? INK.navy : INK.bar} opacity={c === 2 ? 0.6 : 1} />
          ))}
        </g>
      ))}
      <g transform={`translate(${w - 170} 36)`}>
        <rect width="160" height="118" rx="8" fill="#fff" {...S} strokeWidth={2.5} />
        {[
          ['WhatsApp', '#25d366'],
          ['Dropbox', INK.blue],
          [art.corporateDrive, INK.navy],
        ].map(([label, color], i) => (
          <g key={label}>
            {i === 0 && <rect x="4" y={8} width="152" height="30" rx="5" fill="#e3f6ea" />}
            <circle cx="22" cy={23 + i * 34} r="9" fill={color} />
            <text x="40" y={27 + i * 34} fontSize="12" fill={INK.line} fontFamily={FONT}>
              {label}
            </text>
          </g>
        ))}
      </g>
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[-55, -25, 0, 25, 55].map((a, i) => (
        <ellipse
          key={a}
          cx="0"
          cy="-90"
          rx="16"
          ry="50"
          transform={`rotate(${a} 0 -40)`}
          fill={i % 2 ? INK.leafDark : INK.navy}
          {...S}
          strokeWidth={3}
        />
      ))}
      <path d="M-38 -48H38L28 0H-28Z" fill={INK.orange} {...S} />
      <path d="M-42 -48H42V-36H-42Z" fill={INK.orangeSoft} {...S} />
    </g>
  );
}

function Mug({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M38 -54c26 0 26 34 0 34" fill="none" {...S} strokeWidth={9} stroke={INK.line} />
      <path d="M38 -54c26 0 26 34 0 34" fill="none" stroke={INK.orange} strokeWidth={4} />
      <path d="M-32 -70H38V-6a8 8 0 0 1 -8 8H-24a8 8 0 0 1 -8 -8Z" fill={INK.orange} {...S} />
      <ellipse cx="3" cy="-70" rx="35" ry="7" fill="#6b4630" {...S} strokeWidth={3} />
    </g>
  );
}

function PenCup({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-6 -70l-16 -60M8 -70l14 -66M0 -70v-56" {...S} strokeWidth={8} stroke={INK.navy} />
      <path d="M-30 -74H30L26 0H-26Z" fill={INK.orange} {...S} />
    </g>
  );
}

function Shelf({ x, y }: { x: number; y: number }) {
  const books = [INK.navy, INK.orange, INK.cream, INK.blue, INK.orange, INK.gray, INK.navy];
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="260" height="200" fill={INK.cream} {...S} />
      <path d="M0 100H260M130 0V200" {...S} />
      {books.map((c, i) => (
        <rect key={i} x={12 + i * 15} y={i % 3 === 0 ? 30 : 22} width="13" height={i % 3 === 0 ? 70 : 78} fill={c} {...S} strokeWidth={2.5} />
      ))}
      <path d="M180 100l20-34 28 12 6 22Z" fill={INK.grayLight} {...S} strokeWidth={3} />
      <rect x="150" y="160" width="90" height="30" fill={INK.orange} {...S} strokeWidth={3} />
      <rect x="20" y="168" width="90" height="22" fill={INK.navy} {...S} strokeWidth={3} />
    </g>
  );
}

function Notebook({ x, y, r = -8, title }: { x: number; y: number; r?: number; title?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x="-90" y="-60" width="190" height="78" rx="4" fill="#b5a996" {...S} />
      <rect x="-96" y="-66" width="190" height="78" rx="4" fill={INK.paper} {...S} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle key={i} cx={-80 + i * 26} cy="-66" r="6" fill="none" {...S} strokeWidth={3} />
      ))}
      {title ? (
        <text x="-80" y="-34" fontSize="18" fontWeight="700" fill={INK.red} fontFamily={FONT}>
          {title}
        </text>
      ) : (
        <path d="M-80 -38c10-8 20 8 30 0s20 8 30 0M-80 -14c14-8 26 8 40 0s20 6 30 0" fill="none" {...S} strokeWidth={3} />
      )}
    </g>
  );
}

/** A big phone on a stand with a WhatsApp chat open: one incoming message. */
function WhatsAppPhone({ x, y, from, message }: { x: number; y: number; from: string; message: string[] }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-50 0L-30 -40H30L50 0Z" fill={INK.gray} {...S} />
      <rect x="-80" y="-300" width="160" height="290" rx="22" fill={INK.line} {...S} />
      <rect x="-70" y="-288" width="140" height="266" rx="14" fill="#efe7dd" />
      <path d="M-70 -274a14 14 0 0 1 14 -14H56a14 14 0 0 1 14 14V-246H-70Z" fill="#075e54" />
      <circle cx="-52" cy="-262" r="9" fill={INK.grayLight} />
      <text x="-38" y="-258" fontSize="9.5" fontWeight="700" fill="#fff" fontFamily={FONT}>
        {from}
      </text>
      <rect x="-62" y="-230" width="118" height={28 + message.length * 15} rx="8" fill="#fff" {...S} strokeWidth={1.5} />
      {message.map((line, i) => (
        <text key={line} x="-54" y={-212 + i * 15} fontSize="10.5" fill={INK.line} fontFamily={FONT}>
          {line}
        </text>
      ))}
      <text x="30" y={-208 + message.length * 15} fontSize="8" fill={INK.gray} fontFamily={FONT}>
        22:41
      </text>
      <rect x="-62" y="-60" width="104" height="26" rx="13" fill="#fff" />
      <circle cx="56" cy="-47" r="13" fill="#25d366" />
    </g>
  );
}

/** A flip calendar on the desk with the next meeting on it. */
function DeskCalendar({ x, y, title, when }: { x: number; y: number; title: string; when: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-70 0L-56 -110H56L70 0Z" fill={INK.paper} {...S} />
      <rect x="-56" y="-110" width="112" height="30" fill={INK.orange} {...S} />
      <circle cx="-30" cy="-110" r="6" fill={INK.line} />
      <circle cx="30" cy="-110" r="6" fill={INK.line} />
      <text x="-40" y="-56" fontSize="15" fontWeight="700" fill={INK.line} fontFamily={FONT}>
        {title}
      </text>
      <text x="-24" y="-24" fontSize="24" fontWeight="700" fill={INK.red} fontFamily={FONT}>
        {when}
      </text>
    </g>
  );
}

/** An open laptop seen from the front-left; `sticker` marks it as personal. */
function Laptop({ x, y, sticker = false, children }: { x: number; y: number; sticker?: boolean; children?: ReactNode }) {
  const art = useArt();
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-130 0H130L150 16H-150Z" fill={INK.grayLight} {...S} />
      <rect x="-118" y="-160" width="236" height="160" rx="10" fill={INK.bezel} {...S} />
      <svg x="-106" y="-148" width="212" height="136" viewBox="0 0 212 136" overflow="hidden">
        <rect width="212" height="136" fill={INK.paper} />
        {children}
      </svg>
      {sticker && (
        <g transform="translate(78 -10) rotate(-12)">
          <rect x="-40" y="-14" width="80" height="22" rx="11" fill={INK.orange} {...S} strokeWidth={2.5} />
          <text x="-30" y="2" fontSize="12" fontWeight="700" fill={INK.paper} fontFamily={FONT}>
            {art.personal}
          </text>
        </g>
      )}
    </g>
  );
}

function Headset({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-40 0a40 44 0 0 1 80 0" fill="none" {...S} strokeWidth={10} />
      <path d="M-40 0a40 44 0 0 1 80 0" fill="none" stroke={INK.navy} strokeWidth={5} />
      <rect x="-54" y="-8" width="24" height="40" rx="10" fill={INK.orange} {...S} />
      <rect x="30" y="-8" width="24" height="40" rx="10" fill={INK.orange} {...S} />
      <path d="M-42 30c0 30 20 40 50 36" fill="none" {...S} strokeWidth={4} />
      <circle cx="10" cy="66" r="7" fill={INK.line} />
    </g>
  );
}

function DeskPhone({ x, y, ringing = false }: { x: number; y: number; ringing?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-90 0L-74 -70H74L90 0Z" fill={INK.navy} {...S} />
      <rect x="-50" y="-60" width="58" height="26" rx="4" fill="#9fc0d6" {...S} strokeWidth={2.5} />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={20 + c * 16} y={-62 + r * 16} width="12" height="10" rx="2" fill={INK.grayLight} />),
      )}
      <path d="M-86 -78c0-22 172-22 172 0v8H-86Z" fill={INK.bezel} {...S} />
      {ringing && (
        <g fill="none" stroke={INK.orange} strokeWidth={5} strokeLinecap="round">
          <path d="M-110 -110c-14 14-14 34 0 48" />
          <path d="M-128 -126c-24 24-24 64 0 88" />
          <path d="M110 -110c14 14 14 34 0 48" />
          <path d="M128 -126c24 24 24 64 0 88" />
        </g>
      )}
    </g>
  );
}

function Folder({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(6)`}>
      <path d="M-90 -70H-30l12 12H90V0H-90Z" fill={INK.orangeSoft} {...S} />
      <rect x="-80" y="-80" width="160" height="62" fill={INK.paper} {...S} strokeWidth={3} />
      <path d="M-66 -62h80M-66 -48h110" stroke={INK.bar} strokeWidth={5} strokeLinecap="round" />
      <path d="M-90 -50H90V0H-90Z" fill={INK.orange} {...S} />
      <text x="-74" y="-18" fontSize="16" fontWeight="700" fill={INK.paper} fontFamily={FONT}>
        {label}
      </text>
    </g>
  );
}

function StickyNotes({ x, y }: { x: number; y: number }) {
  const notes = [
    [0, 0, INK.orangeSoft, -6],
    [70, 14, '#f3d36b', 5],
    [24, 76, '#f3d36b', 3],
  ] as const;
  return (
    <g transform={`translate(${x} ${y})`}>
      {notes.map(([dx, dy, c, r], i) => (
        <g key={i} transform={`translate(${dx} ${dy}) rotate(${r})`}>
          <rect width="60" height="60" fill={c} {...S} strokeWidth={3} />
          <path d="M10 22h40M10 36h28" stroke={INK.line} strokeWidth={3} strokeLinecap="round" opacity={0.6} />
        </g>
      ))}
    </g>
  );
}

/* ── Screens ──────────────────────────────────────────────────────────── */

/** Support console: a customer chat on the left, the customer record on the right. */
function SupportScreen({ w, h }: { w: number; h: number }) {
  const art = useArt();
  const split = w * 0.55;
  return (
    <g>
      <TitleBar w={w} label={art.supportApp} />
      <rect y="30" width={split} height={h - 30} fill={INK.paper} />
      {[
        [20, 60, 0.6, false],
        [split - 20, 120, 0.5, true],
        [20, 180, 0.7, false],
        [20, 240, 0.45, false],
      ].map(([bx, by, f, mine], i) => {
        const bw = split * (f as number);
        const left = mine ? (bx as number) - bw : (bx as number);
        return (
          <g key={i}>
            <rect x={left} y={by as number} width={bw} height="44" rx="14" fill={mine ? '#dbe8f5' : i === 2 ? '#fbe1df' : '#eeeae3'} {...S} strokeWidth={2} />
            <rect x={left + 14} y={(by as number) + 12} width={bw - 40} height="7" rx="3.5" fill={i === 2 ? INK.red : INK.gray} />
            <rect x={left + 14} y={(by as number) + 25} width={bw * 0.5} height="7" rx="3.5" fill={INK.bar} />
          </g>
        );
      })}
      <text x="22" y="174" fontSize="11" fontWeight="700" fill={INK.red} fontFamily={FONT}>
        {art.urgent}
      </text>
      <rect x="14" y={h - 50} width={split - 28} height="38" rx="6" fill="#fff" stroke={INK.gray} strokeWidth={2} />
      <rect x={split} y="30" width={w - split} height={h - 30} fill="#f1ede6" />
      <path d={`M${split} 30V${h}`} stroke={INK.bar} strokeWidth={2} />
      <circle cx={split + 44} cy="80" r="24" fill={INK.grayLight} {...S} strokeWidth={2} />
      <rect x={split + 80} y="66" width="90" height="9" rx="4.5" fill={INK.line} />
      <rect x={split + 80} y="84" width="40" height="14" rx="7" fill={INK.orange} />
      <text x={split + 86} y="95" fontSize="9" fontWeight="700" fill="#fff" fontFamily={FONT}>
        VIP
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x={split + 20} y={130 + i * 34} width="60" height="7" rx="3.5" fill={INK.gray} />
          <rect x={split + 96} y={130 + i * 34} width={w - split - 120 - ((i * 17) % 40)} height="7" rx="3.5" fill={i === 3 ? INK.red : INK.bar} />
        </g>
      ))}
    </g>
  );
}

/** Finance dashboard: a balance chart and a pending transfer awaiting signatures. */
function FinanceScreen({ w, h }: { w: number; h: number }) {
  const art = useArt();
  const split = w * 0.56;
  return (
    <g>
      <TitleBar w={w} label={art.financeApp} />
      <rect x="16" y="46" width={split - 26} height={h * 0.48} rx="8" fill="#fff" {...S} strokeWidth={2} />
      <path
        d={`M34 ${46 + h * 0.4}l50-40 46 22 56-70 52 34 60-50`}
        fill="none"
        stroke={INK.green}
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={36 + i * 54} y={h * 0.86 - (30 + ((i * 37) % 60))} width="30" height={30 + ((i * 37) % 60)} fill={i === 4 ? INK.orange : INK.navy} opacity={i === 4 ? 1 : 0.75} />
      ))}
      <path d={`M16 ${h * 0.86}H${split - 10}`} stroke={INK.bar} strokeWidth={2} />
      <rect x={split + 6} y="46" width={w - split - 22} height={h - 62} rx="8" fill="#fff" {...S} strokeWidth={2} />
      <text x={split + 22} y="76" fontSize="11" fill={INK.gray} fontFamily={FONT}>
        {art.pendingTransfer}
      </text>
      <text x={split + 22} y="112" fontSize="28" fontWeight="700" fill={INK.line} fontFamily={FONT}>
        $500,000
      </text>
      {[
        [art.signature1, true],
        [art.signature2, false],
      ].map(([t, ok], i) => (
        <g key={t as string}>
          <rect x={split + 22} y={136 + i * 40} width={w - split - 54} height="30" rx="6" fill={ok ? '#e3f1e6' : '#fbe1df'} />
          <text x={split + 34} y={156 + i * 40} fontSize="11" fill={INK.line} fontFamily={FONT}>
            {t as string}
          </text>
          <text x={w - 60} y={156 + i * 40} fontSize="13" fontWeight="700" fill={ok ? INK.green : INK.red} fontFamily={FONT}>
            {ok ? '✓' : '—'}
          </text>
        </g>
      ))}
      <rect x={split + 22} y={h - 64} width={w - split - 54} height="30" rx="15" fill={INK.blue} opacity={0.4} />
    </g>
  );
}

/** Slack at night: the manager's DM waiting in the sidebar and the bots posting in #monitoring. */
function OpsSlackScreen({ w, h }: { w: number; h: number }) {
  const art = useArt();
  const side = 220;
  const mono = 'ui-monospace, monospace';
  return (
    <g>
      <TitleBar w={w} label={art.nightSearch} />
      <g transform="translate(0 30)">
        <rect width={side} height={h - 30} fill={INK.slack} />
        <rect x="14" y="16" width="120" height="10" rx="5" fill={INK.cream} />
        <circle cx="20" cy="40" r="4" fill={INK.green} />
        <rect x="30" y="36" width="70" height="7" rx="3.5" fill="#9d7fa3" />
        <text x="14" y="82" fontSize="13" fill="#d9c8dc" fontFamily={FONT}>
          {art.channels}
        </text>
        {['general', 'monitoring', 'infosec'].map((c, i) => (
          <g key={c}>
            {i === 1 && <rect x="0" y={94 + i * 26} width={side} height="24" fill="#6b3f70" />}
            <text x="20" y={111 + i * 26} fontSize="13" fill={i === 1 ? '#fff' : '#d9c8dc'} fontWeight={i === 1 ? 700 : 400} fontFamily={FONT}>
              # {c}
            </text>
          </g>
        ))}
        <text x="14" y="200" fontSize="13" fill="#d9c8dc" fontFamily={FONT}>
          {art.directMessages}
        </text>
        <rect x="0" y="212" width={side} height="28" fill={INK.blue} />
        <circle cx="24" cy="226" r="5" fill={INK.green} />
        <text x="38" y="231" fontSize="14" fontWeight="700" fill="#fff" fontFamily={FONT}>
          Manager
        </text>
        <rect x={side - 40} y="217" width="26" height="18" rx="9" fill={INK.red} />
        <text x={side - 31} y="230" fontSize="11" fontWeight="700" fill="#fff" fontFamily={FONT}>
          1
        </text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <circle cx="24" cy={258 + i * 26} r="5" fill={i === 2 ? INK.orange : INK.green} />
            <rect x="38" y={254 + i * 26} width={110 - i * 14} height="8" rx="4" fill="#9d7fa3" />
          </g>
        ))}
      </g>
      <g transform={`translate(${side} 30)`}>
        <rect width={w - side} height={h - 30} fill={INK.paper} />
        <text x="20" y="28" fontSize="16" fontWeight="700" fill={INK.line} fontFamily={FONT}>
          # monitoring
        </text>
        <path d={`M0 44H${w - side}`} stroke={INK.bar} strokeWidth={2} />
        <rect x="20" y="62" width="34" height="34" rx="6" fill={INK.red} {...S} strokeWidth={2} />
        <text x="66" y="74" fontSize="13" fontWeight="700" fill={INK.line} fontFamily={FONT}>
          AlertBot
        </text>
        <rect x="66" y="84" width="420" height="52" rx="6" fill="#fbe1df" />
        <rect x="66" y="84" width="6" height="52" fill={INK.red} />
        <text x="84" y="115" fontSize="13" fill={INK.red} fontWeight="700" fontFamily={FONT}>
          {art.anomaly}
        </text>
        <rect x="20" y="160" width="34" height="34" rx="6" fill={INK.grayLight} {...S} strokeWidth={2} />
        <rect x="66" y="166" width="90" height="9" rx="4.5" fill={INK.line} />
        <rect x="66" y="184" width="300" height="9" rx="4.5" fill={INK.bar} />
        <rect x="66" y="206" width="400" height="66" rx="6" fill={INK.night} />
        <text x="80" y="232" fontSize="13" fill="#3ddc97" fontFamily={mono}>
          $ ./system-update-v3.sh
        </text>
        <text x="80" y="256" fontSize="13" fill="#e9b949" fontFamily={mono}>
          {art.runningAsRoot}
        </text>
        <rect x="20" y="296" width="34" height="34" rx="6" fill={INK.grayLight} {...S} strokeWidth={2} />
        <rect x="66" y="302" width="70" height="9" rx="4.5" fill={INK.line} />
        <rect x="66" y="320" width="240" height="9" rx="4.5" fill={INK.bar} />
        <rect x="16" y={h - 30 - 66} width={w - side - 32} height="52" rx="8" fill="#fff" stroke={INK.gray} strokeWidth={2} />
        <path d={`M34 ${h - 30 - 36}c10-10 20 8 30 0s20 8 30 0 20 8 30 0`} fill="none" stroke={INK.gray} strokeWidth={2.5} strokeLinecap="round" />
      </g>
      <g transform={`translate(${w - 330} ${h - 300})`}>
        <rect width="300" height="90" rx="12" fill="#fff" {...S} strokeWidth={3} />
        <text x="62" y="28" fontSize="13" fontWeight="700" fill={INK.line} fontFamily={FONT}>
          Slack · InfoSec
        </text>
        <circle cx="32" cy="52" r="18" fill={INK.grayLight} {...S} strokeWidth={2.5} />
        <rect x="62" y="42" width="180" height="8" rx="4" fill={INK.bar} />
        <rect x="62" y="60" width="140" height="8" rx="4" fill={INK.bar} />
        <text x="256" y="68" fontSize="26" fontWeight="700" fill={INK.orange} fontFamily={FONT}>
          ?
        </text>
      </g>
      <g transform={`translate(${w - 330} ${h - 170})`}>
        <rect width="300" height="100" rx="12" fill="#fbe1df" {...S} strokeWidth={3} />
        <circle cx="50" cy="50" r="32" fill="#fff" stroke={INK.red} strokeWidth={4} />
        <path d="M50 30l20 34H30Z" fill={INK.red} />
        <rect x="48" y="40" width="4" height="13" rx="2" fill="#fff" />
        <circle cx="50" cy="58" r="2.5" fill="#fff" />
        <text x="100" y="62" fontSize="30" fontWeight="700" fill={INK.red} fontFamily={FONT}>
          {art.alert}
        </text>
      </g>
    </g>
  );
}

/* ── Scenes ───────────────────────────────────────────────────────────── */

const MAIN = { x: 420, y: 90, w: 760, h: 520 } as const;
const MAIN_SCREEN = { w: MAIN.w - 44, h: MAIN.h - 110 };

function DesarrolloArt() {
  const art = useArt();
  return (
    <>
      <Room />
      <Plant x={150} y={760} s={1.5} />
      <Shelf x={1240} y={470} />
      <Plant x={1460} y={470} s={0.9} />
      <Desk />
      <Monitor {...MAIN}>
        <TitleBar w={MAIN_SCREEN.w} label={art.search} />
        <g transform="translate(0 30)">
          <SlackPane w={MAIN_SCREEN.w * 0.48} h={MAIN_SCREEN.h - 30} alert channel={art.securityChannel} pinned={[art.pinnedTitle, art.pinnedBody]} />
        </g>
        <g transform={`translate(${MAIN_SCREEN.w * 0.48} 30)`}>
          <rect width="4" height={MAIN_SCREEN.h} fill={INK.bar} />
          <g transform="translate(4 0)">
            <SheetPane w={MAIN_SCREEN.w * 0.52 - 4} h={MAIN_SCREEN.h - 30} file={art.reportFile} />
          </g>
        </g>
      </Monitor>
      <WhatsAppPhone x={300} y={700} from={art.seniorDev} message={art.whatsapp} />
      <DeskCalendar x={1130} y={700} title={art.meeting} when="1 h" />
      <Notebook x={1350} y={712} r={-10} title={art.protocol} />
      <Mug x={1470} y={700} />
    </>
  );
}

function FinanzasArt() {
  const art = useArt();
  return (
    <>
      <Room />
      <Plant x={150} y={760} s={1.4} />
      <Shelf x={1240} y={470} />
      <Desk />
      <Monitor {...MAIN}>
        <FinanceScreen {...MAIN_SCREEN} />
      </Monitor>
      <Laptop x={250} y={700} sticker>
        <rect width="212" height="136" fill="#eef1f6" />
        <rect x="16" y="16" width="180" height="40" rx="6" fill="#fbe1df" />
        <text x="26" y="41" fontSize="12" fontWeight="700" fill={INK.red} fontFamily={FONT}>
          {art.noMdm}
        </text>
        <rect x="16" y="68" width="120" height="10" rx="5" fill={INK.bar} />
        <rect x="16" y="88" width="160" height="10" rx="5" fill={INK.bar} />
      </Laptop>
      <Folder x={1330} y={710} label={art.signatures} />
      <Mug x={1120} y={700} />
    </>
  );
}

export const ART: Record<AreaId, ReactNode> = {
  atencion: (
    <>
      <Room />
      <StickyNotes x={70} y={420} />
      <Shelf x={1240} y={470} />
      <Desk />
      <Monitor {...MAIN}>
        <SupportScreen {...MAIN_SCREEN} />
      </Monitor>
      <Headset x={380} y={250} />
      <DeskPhone x={260} y={700} ringing />
      <PenCup x={1240} y={700} />
      <Notebook x={1050} y={710} r={-6} />
      <Mug x={1400} y={700} />
    </>
  ),
  desarrollo: <DesarrolloArt />,
  finanzas: <FinanzasArt />,
  operaciones: (
    <>
      <Room night windowX={1240} />
      <Desk />
      <Monitor x={170} y={40} w={1040} h={640}>
        <OpsSlackScreen w={996} h={530} />
      </Monitor>
      <Mug x={1320} y={700} />
      <Notebook x={1440} y={712} r={-8} />
    </>
  ),
};
