import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent, ReactNode } from 'react';

/* ============================================================================
 * TIPOS
 * ========================================================================== */

type SportId = 'futbol' | 'atletismo' | 'baloncesto';
type LayerId = 'bone' | 'muscle';
type MuscleId = 'rectus-femoris' | 'biceps-femoris' | 'gastrocnemius';
type BoneId = 'femur' | 'tibia' | 'fibula' | 'patella' | 'calcaneus';

type MovementId =
  | 'golpeo'
  | 'esprint'
  | 'cambio-direccion'
  | 'salida'
  | 'velocidad-maxima'
  | 'impulso-salto'
  | 'salto-vertical'
  | 'frenada'
  | 'defensa-lateral';

/** 1 = apoyo, 2 = importante, 3 = clave */
type Intensity = 1 | 2 | 3;

interface LayerSetting {
  readonly visible: boolean;
  /** Porcentaje 10–100 */
  readonly opacity: number;
}
type LayersState = Record<LayerId, LayerSetting>;

interface SportOption {
  readonly id: SportId;
  readonly label: string;
}

interface MovementInfo {
  readonly id: MovementId;
  readonly label: string;
  readonly description: string;
}

interface MovementRole {
  readonly intensity: Intensity;
  readonly role: string;
}

interface QuizQuestion {
  readonly id: string;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

interface Muscle {
  readonly id: MuscleId;
  readonly name: string;
  readonly shortName: string;
  readonly latinName: string;
  readonly aliases: readonly string[];
  readonly region: string;
  readonly origin: string;
  readonly insertion: string;
  readonly innervation: string;
  readonly primaryAction: string;
  readonly secondaryActions: readonly string[];
  readonly sportApplications: Record<SportId, string>;
  readonly movements: Record<MovementId, MovementRole>;
  readonly quiz: readonly QuizQuestion[];
}

interface Bone {
  readonly id: BoneId;
  readonly name: string;
  readonly latinName: string;
  readonly aliases: readonly string[];
}

type SearchResult =
  | { readonly kind: 'muscle'; readonly id: MuscleId; readonly label: string; readonly sublabel: string }
  | { readonly kind: 'bone'; readonly id: BoneId; readonly label: string; readonly sublabel: string };

interface CameraState {
  readonly zoom: number;
  readonly resetToken: number;
}

/* ============================================================================
 * DATOS DE EJEMPLO
 * ========================================================================== */

const APP_VERSION = 'v0.5.0';

const SPORTS: readonly SportOption[] = [
  { id: 'futbol', label: 'Fútbol' },
  { id: 'atletismo', label: 'Atletismo' },
  { id: 'baloncesto', label: 'Baloncesto' },
];

const SPORT_MOVEMENTS: Record<SportId, readonly MovementInfo[]> = {
  futbol: [
    { id: 'golpeo', label: 'Golpeo de balón', description: 'Armado, impacto y frenado de la pierna al chutar o pasar.' },
    { id: 'esprint', label: 'Esprint', description: 'Aceleración y carrera a máxima velocidad con ciclos de zancada.' },
    { id: 'cambio-direccion', label: 'Cambio de dirección', description: 'Frenada, apoyo y reimpulso para girar o regatear.' },
  ],
  atletismo: [
    { id: 'salida', label: 'Salida y aceleración', description: 'Primeras zancadas desde el taco o desde parado.' },
    { id: 'velocidad-maxima', label: 'Velocidad máxima', description: 'Carrera lanzada con alta frecuencia y fase aérea.' },
    { id: 'impulso-salto', label: 'Impulso y salto', description: 'Fase final de apoyo y despegue en saltos y zancadas largas.' },
  ],
  baloncesto: [
    { id: 'salto-vertical', label: 'Salto vertical', description: 'Despegue explosivo para mate, tapón o rebote.' },
    { id: 'frenada', label: 'Frenada y aterrizaje', description: 'Frenada brusca y amortiguación de la caída.' },
    { id: 'defensa-lateral', label: 'Desplazamiento defensivo', description: 'Desplazamientos laterales en semiflexión frente al atacante.' },
  ],
};

const INTENSITY_LABEL: Record<Intensity, string> = { 1: 'Apoyo', 2: 'Importante', 3: 'Clave' };

const mv = (intensity: Intensity, role: string): MovementRole => ({ intensity, role });

const BONES: readonly Bone[] = [
  { id: 'femur', name: 'Fémur', latinName: 'Os femoris', aliases: ['hueso del muslo', 'muslo'] },
  { id: 'tibia', name: 'Tibia', latinName: 'Tibia', aliases: ['espinilla', 'hueso de la pierna'] },
  { id: 'fibula', name: 'Peroné', latinName: 'Fibula', aliases: ['fíbula', 'perone'] },
  { id: 'patella', name: 'Rótula', latinName: 'Patella', aliases: ['patela'] },
  { id: 'calcaneus', name: 'Calcáneo', latinName: 'Calcaneus', aliases: ['talón', 'hueso del talón'] },
];

const rectusFemoris: Muscle = {
  id: 'rectus-femoris',
  name: 'Recto Anterior del Cuádriceps',
  shortName: 'Recto anterior',
  latinName: 'Musculus rectus femoris',
  aliases: ['recto femoral', 'cuádriceps', 'cuadriceps', 'muslo anterior'],
  region: 'Muslo · compartimento anterior',
  origin:
    'Espina ilíaca anteroinferior (cabeza directa) y surco supraacetabular, por encima del acetábulo (cabeza refleja).',
  insertion:
    'Base de la rótula a través del tendón del cuádriceps; continúa hasta la tuberosidad tibial por el ligamento rotuliano.',
  innervation: 'Nervio femoral (L2–L4).',
  primaryAction: 'Extensión de la rodilla.',
  secondaryActions: ['Flexión de la cadera (único cabezal del cuádriceps biarticular).'],
  sportApplications: {
    futbol:
      'Golpeo de balón: flexiona la cadera en la fase de aceleración de la pierna y extiende la rodilla con rapidez en el impacto. También es clave en pases largos y disparos a puerta.',
    atletismo:
      'Sprint: lleva el muslo hacia delante en la fase de recuperación (flexión de cadera) y estabiliza la rodilla en el apoyo. Es determinante en la frecuencia de zancada.',
    baloncesto:
      'Salto y aterrizaje: extiende la rodilla en el despegue y frena la flexión de rodilla (trabajo excéntrico) al caer, protegiendo el tendón rotuliano.',
  },
  movements: {
    golpeo: mv(3, 'Flexiona la cadera y extiende la rodilla a gran velocidad en el impacto.'),
    esprint: mv(2, 'Flexión de cadera en la recuperación de la pierna.'),
    'cambio-direccion': mv(2, 'Frena la flexión de rodilla (excéntrico) al plantar el pie.'),
    salida: mv(3, 'Empuje de rodilla y flexión rápida de cadera en las primeras zancadas.'),
    'velocidad-maxima': mv(2, 'Recupera el muslo hacia delante con alta frecuencia.'),
    'impulso-salto': mv(3, 'Extensión potente de rodilla en el despegue.'),
    'salto-vertical': mv(3, 'Extensión explosiva de rodilla en el despegue.'),
    frenada: mv(3, 'Trabajo excéntrico que amortigua la flexión de rodilla al caer.'),
    'defensa-lateral': mv(2, 'Mantiene la rodilla semiflexionada en la posición defensiva.'),
  },
  quiz: [
    {
      id: 'rf-1',
      prompt: '¿Qué distingue al recto anterior del resto del cuádriceps?',
      options: [
        'Es el único que cruza dos articulaciones (cadera y rodilla)',
        'Es el único que se inserta en el peroné',
        'Es el único inervado por el nervio ciático',
        'Es el único que no se inserta en la rótula',
      ],
      correctIndex: 0,
      explanation:
        'Los vastos solo cruzan la rodilla; el recto anterior nace en la pelvis, por lo que también flexiona la cadera.',
    },
    {
      id: 'rf-2',
      prompt: '¿Cuál es su origen en la pelvis?',
      options: ['Tuberosidad isquiática', 'Espina ilíaca anteroinferior', 'Cresta ilíaca', 'Rama del pubis'],
      correctIndex: 1,
      explanation: 'La cabeza directa nace en la espina ilíaca anteroinferior; la refleja, en el surco supraacetabular.',
    },
    {
      id: 'rf-3',
      prompt: '¿Qué dos acciones aporta principalmente en el golpeo de balón?',
      options: [
        'Flexión de cadera y extensión de rodilla',
        'Extensión de cadera y flexión de rodilla',
        'Abducción de cadera y flexión plantar',
        'Rotación interna de cadera y eversión',
      ],
      correctIndex: 0,
      explanation: 'Acerca el muslo hacia delante y extiende la rodilla para transmitir velocidad al pie.',
    },
  ],
};

const bicepsFemoris: Muscle = {
  id: 'biceps-femoris',
  name: 'Bíceps Femoral',
  shortName: 'Bíceps femoral',
  latinName: 'Musculus biceps femoris',
  aliases: ['isquiotibial', 'isquiotibiales', 'hamstrings', 'femoral', 'muslo posterior'],
  region: 'Muslo · compartimento posterior (isquiotibiales)',
  origin:
    'Cabeza larga: tuberosidad isquiática. Cabeza corta: labio lateral de la línea áspera y parte proximal de la línea supracondílea lateral del fémur.',
  insertion: 'Cabeza del peroné, con fibras hacia el cóndilo lateral de la tibia.',
  innervation:
    'Nervio ciático: porción tibial para la cabeza larga y porción peronea común para la cabeza corta.',
  primaryAction: 'Flexión de la rodilla.',
  secondaryActions: [
    'Extensión de la cadera (cabeza larga).',
    'Rotación lateral de la pierna con la rodilla flexionada.',
  ],
  sportApplications: {
    futbol:
      'Frena (trabajo excéntrico) la extensión de rodilla tras el golpeo y en las desaceleraciones. Es una de las lesiones musculares más frecuentes en sprints y arrancadas.',
    atletismo:
      'Fase final del balanceo en el sprint: desacelera la pierna antes del contacto y ayuda a "tirar" del suelo hacia atrás. Zona típica de sobrecarga a máxima velocidad.',
    baloncesto:
      'Cambios de dirección y frenadas: controla la rodilla y contribuye a la extensión de cadera en la salida explosiva y el salto.',
  },
  movements: {
    golpeo: mv(2, 'Frena la extensión de rodilla tras el impacto (trabajo excéntrico).'),
    esprint: mv(3, 'Desacelera la pierna al final del balanceo y tira del suelo hacia atrás.'),
    'cambio-direccion': mv(3, 'Controla la rodilla y estabiliza el cuerpo en la frenada.'),
    salida: mv(2, 'Extiende la cadera para empujar el cuerpo hacia delante.'),
    'velocidad-maxima': mv(3, 'Máxima exigencia excéntrica; zona típica de lesión.'),
    'impulso-salto': mv(2, 'Aporta extensión de cadera durante el impulso.'),
    'salto-vertical': mv(2, 'Colabora con la extensión de cadera en el despegue.'),
    frenada: mv(2, 'Estabiliza la rodilla y evita la hiperextensión al caer.'),
    'defensa-lateral': mv(2, 'Controla la rodilla en los cambios de apoyo laterales.'),
  },
  quiz: [
    {
      id: 'bf-1',
      prompt: '¿Dónde se inserta principalmente el bíceps femoral?',
      options: ['Tuberosidad tibial', 'Cabeza del peroné', 'Calcáneo', 'Rótula'],
      correctIndex: 1,
      explanation: 'Su tendón distal se fija en la cabeza del peroné, junto al ligamento colateral lateral.',
    },
    {
      id: 'bf-2',
      prompt: '¿Qué acción realiza su cabeza larga en la cadera?',
      options: ['Flexión', 'Extensión', 'Aducción', 'Rotación interna'],
      correctIndex: 1,
      explanation: 'Al nacer en la tuberosidad isquiática, la cabeza larga es extensora de la cadera.',
    },
    {
      id: 'bf-3',
      prompt: '¿Por qué es especialmente vulnerable en el sprint?',
      options: [
        'Por su intenso trabajo excéntrico de frenado al final del balanceo',
        'Porque carece de inervación motora',
        'Porque no cruza la rodilla',
        'Porque solo trabaja en isométrico durante el salto',
      ],
      correctIndex: 0,
      explanation: 'Absorbe y frena la pierna a gran velocidad, un contexto de alta tensión con elongación.',
    },
  ],
};

const gastrocnemius: Muscle = {
  id: 'gastrocnemius',
  name: 'Gastrocnemio (Gemelos)',
  shortName: 'Gastrocnemio',
  latinName: 'Musculus gastrocnemius',
  aliases: ['gemelos', 'gemelo', 'pantorrilla', 'tríceps sural', 'triceps sural'],
  region: 'Pierna · compartimento posterior superficial',
  origin:
    'Cabeza medial: cóndilo femoral medial. Cabeza lateral: cóndilo femoral lateral (cara posterior del fémur).',
  insertion: 'Cara posterior del calcáneo mediante el tendón de Aquiles (junto con el sóleo).',
  innervation: 'Nervio tibial (S1–S2).',
  primaryAction: 'Flexión plantar del tobillo.',
  secondaryActions: ['Flexión de la rodilla (acción accesoria, al cruzar la articulación).'],
  sportApplications: {
    futbol:
      'Aceleración y arrancadas: aporta el impulso final del pie contra el suelo. También interviene en la estabilidad del tobillo al conducir y regatear.',
    atletismo:
      'Fase de impulso (push-off): genera fuerza de propulsión y almacena energía elástica en el tendón de Aquiles, mejorando la economía de carrera.',
    baloncesto:
      'Salto vertical y desplazamientos laterales: la flexión plantar potente determina la altura del salto y la velocidad de reacción defensiva.',
  },
  movements: {
    golpeo: mv(1, 'Estabiliza el tobillo de la pierna de apoyo.'),
    esprint: mv(3, 'Flexión plantar potente en el despegue de cada zancada.'),
    'cambio-direccion': mv(2, 'Propulsión y estabilidad del tobillo en el apoyo.'),
    salida: mv(3, 'Empuje final del pie contra el taco y el suelo.'),
    'velocidad-maxima': mv(3, 'Almacena y devuelve energía elástica en el tendón de Aquiles.'),
    'impulso-salto': mv(3, 'Flexión plantar que determina la altura del salto.'),
    'salto-vertical': mv(3, 'Última fase del despegue: flexión plantar explosiva.'),
    frenada: mv(2, 'Amortigua el aterrizaje con trabajo excéntrico.'),
    'defensa-lateral': mv(2, 'Impulsa los desplazamientos laterales rápidos.'),
  },
  quiz: [
    {
      id: 'gc-1',
      prompt: '¿A través de qué tendón se inserta en el calcáneo?',
      options: ['Tendón rotuliano', 'Tendón de Aquiles', 'Banda iliotibial', 'Tendón poplíteo'],
      correctIndex: 1,
      explanation: 'El tendón calcáneo (de Aquiles) integra las fibras del gastrocnemio y del sóleo.',
    },
    {
      id: 'gc-2',
      prompt: '¿Qué articulaciones cruza el gastrocnemio?',
      options: ['Rodilla y tobillo', 'Cadera y rodilla', 'Solo la subastragalina', 'Cadera y tobillo'],
      correctIndex: 0,
      explanation: 'Nace sobre los cóndilos femorales y baja hasta el calcáneo: es biarticular.',
    },
    {
      id: 'gc-3',
      prompt: '¿Cuál es su acción principal durante el impulso al correr?',
      options: ['Flexión plantar del tobillo', 'Dorsiflexión del tobillo', 'Eversión del pie', 'Extensión de la rodilla'],
      correctIndex: 0,
      explanation: 'Empuja el antepié contra el suelo, generando la propulsión de la zancada.',
    },
  ],
};

const MUSCLES: readonly Muscle[] = [rectusFemoris, bicepsFemoris, gastrocnemius];

const MUSCLES_BY_ID: Record<MuscleId, Muscle> = {
  'rectus-femoris': rectusFemoris,
  'biceps-femoris': bicepsFemoris,
  gastrocnemius,
};

const DEFAULT_MUSCLE_ID: MuscleId = 'rectus-femoris';

const DEFAULT_LAYERS: LayersState = {
  bone: { visible: true, opacity: 100 },
  muscle: { visible: true, opacity: 100 },
};

/* ============================================================================
 * BÚSQUEDA
 * ========================================================================== */

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const toWords = (value: string): string[] =>
  normalize(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

interface IndexEntry {
  readonly result: SearchResult;
  readonly words: readonly string[];
}

const muscleEntries: IndexEntry[] = MUSCLES.map(
  (m): IndexEntry => ({
    result: { kind: 'muscle', id: m.id, label: m.name, sublabel: m.latinName },
    words: toWords([m.name, m.shortName, m.latinName, ...m.aliases].join(' ')),
  }),
);

const boneEntries: IndexEntry[] = BONES.map(
  (b): IndexEntry => ({
    result: { kind: 'bone', id: b.id, label: b.name, sublabel: b.latinName },
    words: toWords([b.name, b.latinName, ...b.aliases].join(' ')),
  }),
);

const SEARCH_INDEX: readonly IndexEntry[] = [...muscleEntries, ...boneEntries];

function searchStructures(query: string, limit = 8): SearchResult[] {
  const tokens = toWords(query);
  if (tokens.length === 0) return [];
  return SEARCH_INDEX.filter((entry) =>
    tokens.every((token) => entry.words.some((word) => word.startsWith(token))),
  )
    .slice(0, limit)
    .map((entry) => entry.result);
}

/* ============================================================================
 * CAPAS
 * ========================================================================== */

const showLayer = (prev: LayersState, layer: LayerId): LayersState =>
  prev[layer].visible ? prev : { ...prev, [layer]: { ...prev[layer], visible: true } };

/* ============================================================================
 * HOOK: FPS
 * ========================================================================== */

function useFps(enabled = true, sampleMs = 500): number {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let frames = 0;
    let last = performance.now();
    let raf = 0;

    const loop = (now: number): void => {
      frames += 1;
      const elapsed = now - last;
      if (elapsed >= sampleMs) {
        setFps(Math.round((frames * 1000) / elapsed));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = (): void => {
      frames = 0;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = (): void => {
      cancelAnimationFrame(raf);
      if (!document.hidden) start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, sampleMs]);

  return fps;
}

/* ============================================================================
 * ESQUEMA SVG
 * ========================================================================== */

interface MuscleShape {
  readonly d: string;
  readonly text: string;
  readonly labelX: number;
  readonly labelY: number;
  readonly anchor: 'start' | 'end';
}

const MUSCLE_SHAPES: Record<MuscleId, MuscleShape> = {
  'rectus-femoris': {
    d: 'M110 52 C134 92 136 160 122 204 L112 206 C116 160 114 102 106 52 Z',
    text: 'Recto anterior',
    labelX: 140,
    labelY: 118,
    anchor: 'start',
  },
  'biceps-femoris': {
    d: 'M92 52 C68 100 66 172 84 208 L96 208 C94 160 90 104 98 52 Z',
    text: 'Bíceps femoral',
    labelX: 62,
    labelY: 120,
    anchor: 'end',
  },
  gastrocnemius: {
    d: 'M97 230 C68 250 70 305 90 342 L100 342 C103 300 102 262 100 230 Z',
    text: 'Gastrocnemio',
    labelX: 60,
    labelY: 290,
    anchor: 'end',
  },
};

const MUSCLE_ORDER: readonly MuscleId[] = ['rectus-femoris', 'biceps-femoris', 'gastrocnemius'];

type BonePart =
  | { readonly kind: 'path'; readonly boneId: BoneId; readonly d: string }
  | { readonly kind: 'circle'; readonly boneId: BoneId; readonly cx: number; readonly cy: number; readonly r: number };

const BONE_PARTS: readonly BonePart[] = [
  { kind: 'path', boneId: 'femur', d: 'M92 40 C90 100 92 160 96 208 L116 208 C118 160 112 100 108 40 Z' },
  { kind: 'circle', boneId: 'femur', cx: 100, cy: 36, r: 10 },
  { kind: 'path', boneId: 'tibia', d: 'M96 228 L114 228 L109 350 L99 350 Z' },
  { kind: 'path', boneId: 'fibula', d: 'M89 232 L94 232 L97 340 L92 340 Z' },
  { kind: 'path', boneId: 'calcaneus', d: 'M98 350 L109 350 L142 372 L92 372 Z' },
  { kind: 'circle', boneId: 'patella', cx: 120, cy: 214, r: 6 },
];

function muscleTone(selected: boolean, dimmed: boolean, intensity: Intensity | null): string {
  if (selected) return 'fill-cyan-400/60 stroke-cyan-300';
  if (dimmed) return 'fill-slate-500/10 stroke-slate-500/40';
  if (intensity === 3) return 'fill-emerald-400/60 stroke-emerald-300';
  if (intensity === 2) return 'fill-emerald-500/35 stroke-emerald-400/80';
  if (intensity === 1) return 'fill-emerald-500/15 stroke-emerald-400/50';
  return 'fill-emerald-500/25 stroke-emerald-400/70';
}

interface LegSchematicProps {
  selectedId: MuscleId;
  layers: LayersState;
  highlightedBone?: BoneId | null;
  movementId?: MovementId | null;
  matching?: ReadonlySet<MuscleId> | null;
  onSelect?: (id: MuscleId) => void;
  showLabels?: boolean;
  className?: string;
}

function LegSchematicBase({
  selectedId,
  layers,
  highlightedBone = null,
  movementId = null,
  matching = null,
  onSelect,
  showLabels = false,
  className,
}: LegSchematicProps) {
  const interactive = onSelect !== undefined;

  const handleKey = (event: KeyboardEvent<SVGPathElement>, id: MuscleId): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(id);
    }
  };

  const intensityOf = (id: MuscleId): Intensity | null =>
    movementId !== null ? MUSCLES_BY_ID[id].movements[movementId].intensity : null;

  return (
    <svg
      viewBox="-40 0 280 400"
      className={className}
      role="img"
      aria-label="Esquema lateral del miembro inferior con huesos y músculos"
    >
      {layers.bone.visible && (
        <g strokeWidth={1.2} style={{ opacity: layers.bone.opacity / 100 }}>
          {BONE_PARTS.map((part, index) => {
            const highlighted = part.boneId === highlightedBone;
            const tone = highlighted
              ? 'fill-cyan-300/40 stroke-cyan-200'
              : 'fill-slate-300/15 stroke-slate-300/60';
            const style = highlighted ? { filter: 'drop-shadow(0 0 5px rgba(165, 243, 252, 0.7))' } : undefined;
            return part.kind === 'path' ? (
              <path key={index} d={part.d} className={tone} style={style} />
            ) : (
              <circle key={index} cx={part.cx} cy={part.cy} r={part.r} className={tone} style={style} />
            );
          })}
        </g>
      )}

      {layers.muscle.visible && (
        <g strokeWidth={1.4} strokeLinejoin="round" style={{ opacity: layers.muscle.opacity / 100 }}>
          {MUSCLE_ORDER.map((id) => {
            const shape = MUSCLE_SHAPES[id];
            const selected = id === selectedId;
            const dimmed = matching !== null && !matching.has(id);
            const intensity = intensityOf(id);
            const hover = interactive && !selected ? 'cursor-pointer hover:fill-emerald-400/40' : '';
            const glow = selected
              ? 'drop-shadow(0 0 5px rgba(34, 211, 238, 0.7))'
              : intensity === 3 && !dimmed
                ? 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.6))'
                : undefined;
            return (
              <path
                key={id}
                d={shape.d}
                className={`${muscleTone(selected, dimmed, intensity)} ${hover} transition-colors`}
                style={glow ? { filter: glow } : undefined}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? shape.text : undefined}
                aria-pressed={interactive ? selected : undefined}
                onClick={interactive ? () => onSelect?.(id) : undefined}
                onKeyDown={interactive ? (event) => handleKey(event, id) : undefined}
              />
            );
          })}
        </g>
      )}

      {showLabels && layers.muscle.visible && (
        <g className="pointer-events-none fill-slate-400" fontSize={8} fontFamily="ui-monospace, monospace">
          {MUSCLE_ORDER.map((id) => {
            const shape = MUSCLE_SHAPES[id];
            const dimmed = matching !== null && !matching.has(id);
            const intensity = intensityOf(id);
            const tone = id === selectedId ? 'fill-cyan-300' : dimmed ? 'fill-slate-600' : undefined;
            return (
              <g key={id} className={tone}>
                <text x={shape.labelX} y={shape.labelY} textAnchor={shape.anchor}>
                  {shape.text}
                </text>
                {intensity !== null && !dimmed && (
                  <text
                    x={shape.labelX}
                    y={shape.labelY + 10}
                    textAnchor={shape.anchor}
                    className={intensity === 3 ? 'fill-emerald-300' : 'fill-slate-400'}
                  >
                    {INTENSITY_LABEL[intensity]}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}

const LegSchematic = memo(LegSchematicBase);

/* ============================================================================
 * HEADER
 * ========================================================================== */

interface SearchBarProps {
  query: string;
  results: readonly SearchResult[];
  onQueryChange: (query: string) => void;
  onSelect: (result: SearchResult) => void;
}

function SearchBar({ query, results, onQueryChange, onSelect }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const showList = open && query.trim().length >= 1;
  const optionId = (index: number): string => `${listId}-opt-${index}`;

  const choose = (result: SearchResult): void => {
    onSelect(result);
    setOpen(false);
    setActive(0);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onQueryChange(event.target.value);
    setActive(0);
    setOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (results.length === 0 ? 0 : (i + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (results.length === 0 ? 0 : (i - 1 + results.length) % results.length));
    } else if (event.key === 'Enter') {
      const picked = results[active];
      if (showList && picked) {
        event.preventDefault();
        choose(picked);
      }
    } else if (event.key === 'Escape') {
      if (open) setOpen(false);
      else onQueryChange('');
    }
  };

  return (
    <div className="relative w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Buscar músculo o estructura ósea
      </label>
      <input
        id={`${listId}-input`}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder="Buscar músculo o hueso…"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results.length > 0 ? optionId(active) : undefined}
        className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-3 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      />

      {query !== '' && (
        <button
          type="button"
          aria-label="Borrar búsqueda"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onQueryChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-sm text-slate-400 hover:text-slate-100"
        >
          ✕
        </button>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 py-1 shadow-xl"
        >
          {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Sin resultados</li>}
          {results.map((result, index) => (
            <li
              key={`${result.kind}-${result.id}`}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(result);
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                index === active ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-200'
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate">{result.label}</span>
                <span className="block truncate font-mono text-xs text-slate-400">{result.sublabel}</span>
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs uppercase tracking-wide ${
                  result.kind === 'muscle' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600 text-slate-200'
                }`}
              >
                {result.kind === 'muscle' ? 'Músculo' : 'Hueso'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SportSelector({ value, onChange }: { value: SportId; onChange: (sport: SportId) => void }) {
  const id = useId();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const next = SPORTS.find((sport) => sport.id === event.target.value);
    if (next) onChange(next.id);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-wider text-slate-400">
        Deporte
      </label>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      >
        {SPORTS.map((sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface HeaderProps {
  sport: SportId;
  query: string;
  results: readonly SearchResult[];
  onSportChange: (sport: SportId) => void;
  onQueryChange: (query: string) => void;
  onSearchSelect: (result: SearchResult) => void;
}

function Header({ sport, query, results, onSportChange, onQueryChange, onSearchSelect }: HeaderProps) {
  return (
    <header className="relative z-30 border-b border-slate-700 bg-slate-900 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              anato3D
            </span>
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            {APP_VERSION} · alpha
          </span>
        </div>

        <div className="lg:max-w-md lg:flex-1">
          <SearchBar query={query} results={results} onQueryChange={onQueryChange} onSelect={onSearchSelect} />
        </div>

        <div className="lg:ml-auto">
          <SportSelector value={sport} onChange={onSportChange} />
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
 * VISOR
 * ========================================================================== */

function FpsBadge({ fps }: { fps: number }) {
  const tone =
    fps >= 50
      ? 'text-emerald-400 border-emerald-500/40'
      : fps >= 30
        ? 'text-amber-400 border-amber-500/40'
        : 'text-rose-400 border-rose-500/40';

  return (
    <div
      className={`rounded-md border bg-slate-900/80 px-2.5 py-1 font-mono text-xs tabular-nums ${tone}`}
      role="status"
      aria-label={`Fotogramas por segundo: ${fps}`}
    >
      {fps > 0 ? fps : '--'} <span className="text-slate-400">FPS</span>
    </div>
  );
}

const TOOL_BTN =
  'rounded-md border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:border-cyan-500 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-600 disabled:hover:text-slate-100';
const LAYER_ON = 'border-emerald-500 bg-emerald-500/20 text-emerald-300';
const LAYER_OFF = 'border-slate-600 bg-slate-700 text-slate-300 hover:text-slate-100';

interface LayerControlProps {
  label: string;
  setting: LayerSetting;
  canHide: boolean;
  onToggle: () => void;
  onOpacity: (value: number) => void;
}

function LayerControl({ label, setting, canHide, onToggle, onOpacity }: LayerControlProps) {
  const id = useId();

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-700/60 px-2 py-1">
      <button
        type="button"
        aria-pressed={setting.visible}
        disabled={setting.visible && !canHide}
        onClick={onToggle}
        title={setting.visible && !canHide ? 'Debe quedar al menos una capa visible' : undefined}
        className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
          setting.visible ? LAYER_ON : LAYER_OFF
        }`}
      >
        {label}
      </button>
      <label htmlFor={id} className="sr-only">
        Opacidad de la capa {label.toLowerCase()}
      </label>
      <input
        id={id}
        type="range"
        min={10}
        max={100}
        step={5}
        value={setting.opacity}
        disabled={!setting.visible}
        onChange={(event) => onOpacity(Number(event.target.value))}
        className="h-1 w-20 cursor-pointer accent-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
      />
      <span className="w-10 text-right font-mono text-xs tabular-nums text-slate-300">{setting.opacity}%</span>
    </div>
  );
}

interface Viewer3DProps {
  camera: CameraState;
  layers: LayersState;
  selectedId: MuscleId;
  sport: SportId;
  movementId: MovementId | null;
  highlightedBone: BoneId | null;
  matching: ReadonlySet<MuscleId> | null;
  zoomMin: number;
  zoomMax: number;
  onSelectMuscle: (id: MuscleId) => void;
  onSelectMovement: (id: MovementId | null) => void;
  onClearBone: () => void;
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleLayer: (layer: LayerId) => void;
  onLayerOpacity: (layer: LayerId, value: number) => void;
  children?: ReactNode;
}

function Viewer3D({
  camera,
  layers,
  selectedId,
  sport,
  movementId,
  highlightedBone,
  matching,
  zoomMin,
  zoomMax,
  onSelectMuscle,
  onSelectMovement,
  onClearBone,
  onReset,
  onZoomIn,
  onZoomOut,
  onToggleLayer,
  onLayerOpacity,
  children,
}: Viewer3DProps) {
  const fps = useFps();

  const sportLabel = SPORTS.find((s) => s.id === sport)?.label ?? '';
  const movements = SPORT_MOVEMENTS[sport];
  const selectedMovement = movements.find((m) => m.id === movementId) ?? null;
  const visibleMuscles = matching ? MUSCLES.filter((m) => matching.has(m.id)) : MUSCLES;
  const boneName = BONES.find((b) => b.id === highlightedBone)?.name ?? null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 shadow-lg shadow-cyan-500/10">
      <div className="flex flex-wrap items-start justify-between gap-2 px-3 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <FpsBadge fps={fps} />
          {boneName !== null && (
            <button
              type="button"
              onClick={onClearBone}
              className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
              aria-label={`Quitar resaltado de ${boneName}`}
            >
              Hueso: {boneName} ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-1.5" role="group" aria-label="Seleccionar músculo">
          {visibleMuscles.length === 0 && (
            <span className="px-2 py-1 text-xs text-slate-400">Ningún músculo coincide con la búsqueda</span>
          )}
          {visibleMuscles.map((m) => {
            const active = m.id === selectedId;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectMuscle(m.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                {m.shortName}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 pb-2 pt-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Movimientos clave de ${sportLabel}`}>
          <span className="mr-1 font-mono text-xs uppercase tracking-wider text-slate-400">{sportLabel} ·</span>
          <button
            type="button"
            aria-pressed={movementId === null}
            onClick={() => onSelectMovement(null)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              movementId === null
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-slate-600 bg-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            Todos
          </button>
          {movements.map((m) => {
            const active = m.id === movementId;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectMovement(active ? null : m.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:text-slate-100'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 min-h-4 text-xs text-slate-400">
          {selectedMovement
            ? selectedMovement.description
            : 'Elige un gesto para resaltar la implicación de cada músculo.'}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {children ?? (
            <div
              className="flex h-full w-full items-center justify-center transition-transform duration-200 will-change-transform"
              style={{ transform: `scale(${camera.zoom})` }}
            >
              <LegSchematic
                selectedId={selectedId}
                layers={layers}
                highlightedBone={highlightedBone}
                movementId={movementId}
                matching={matching}
                onSelect={onSelectMuscle}
                showLabels
                className="h-full w-auto"
              />
            </div>
          )}
        </div>
        {children === undefined && (
          <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center font-mono text-xs text-slate-500">
            Vista previa 2D · integra tu &lt;Canvas&gt; de @react-three/fiber en este visor
          </p>
        )}
      </div>

      <div
        className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-700 bg-slate-800/80 p-2"
        role="toolbar"
        aria-label="Controles de cámara y capas"
      >
        <button type="button" className={TOOL_BTN} onClick={onReset}>
          Reset
        </button>

        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <button type="button" className={TOOL_BTN} onClick={onZoomOut} disabled={camera.zoom <= zoomMin} aria-label="Alejar">
            −
          </button>
          <span className="w-12 text-center font-mono text-xs tabular-nums text-slate-300">
            {Math.round(camera.zoom * 100)}%
          </span>
          <button type="button" className={TOOL_BTN} onClick={onZoomIn} disabled={camera.zoom >= zoomMax} aria-label="Acercar">
            +
          </button>
        </div>

        <LayerControl
          label="Ósea"
          setting={layers.bone}
          canHide={layers.muscle.visible}
          onToggle={() => onToggleLayer('bone')}
          onOpacity={(value) => onLayerOpacity('bone', value)}
        />
        <LayerControl
          label="Muscular"
          setting={layers.muscle}
          canHide={layers.bone.visible}
          onToggle={() => onToggleLayer('muscle')}
          onOpacity={(value) => onLayerOpacity('muscle', value)}
        />
      </div>
    </div>
  );
}

/* ============================================================================
 * FICHA + QUIZ POR MÚSCULO
 * ========================================================================== */

function optionTone(answered: boolean, isCorrect: boolean, isPicked: boolean): string {
  if (!answered) {
    return 'border-slate-600 bg-slate-700 text-slate-100 hover:border-cyan-500 hover:text-cyan-200';
  }
  if (isCorrect) return 'border-emerald-500 bg-emerald-500/20 text-emerald-200';
  if (isPicked) return 'border-rose-500 bg-rose-500/20 text-rose-200';
  return 'border-slate-700 bg-slate-800 text-slate-500';
}

function Quiz({ questions }: { questions: readonly QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const answeredCount = questions.filter((q) => {
    const picked: number | undefined = answers[q.id];
    return picked !== undefined;
  }).length;
  const score = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const finished = answeredCount === questions.length;

  const pick = (questionId: string, optionIndex: number): void => {
    setAnswers((prev) => (questionId in prev ? prev : { ...prev, [questionId]: optionIndex }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-xs text-slate-300">
        <span>
          Respondidas {answeredCount}/{questions.length}
        </span>
        <span className="text-emerald-400">Aciertos {score}</span>
      </div>

      {questions.map((question, qIndex) => {
        const picked: number | undefined = answers[question.id];
        const answered = picked !== undefined;
        return (
          <fieldset key={question.id} className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-slate-50">
              <span className="mr-1.5 font-mono text-cyan-400">{qIndex + 1}.</span>
              {question.prompt}
            </legend>

            {question.options.map((option, oIndex) => (
              <button
                key={option}
                type="button"
                disabled={answered}
                onClick={() => pick(question.id, oIndex)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${optionTone(
                  answered,
                  oIndex === question.correctIndex,
                  oIndex === picked,
                )}`}
              >
                {option}
              </button>
            ))}

            {answered && (
              <p
                className="rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-xs leading-relaxed text-slate-300"
                role="status"
              >
                {question.explanation}
              </p>
            )}
          </fieldset>
        );
      })}

      {finished && (
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-2.5">
          <span className="text-sm text-cyan-100">
            Resultado: {score} de {questions.length}
          </span>
          <button
            type="button"
            onClick={() => setAnswers({})}
            className="rounded-md border border-cyan-500 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}

type TabId = 'ficha' | 'quiz';

const TABS: readonly { id: TabId; label: string }[] = [
  { id: 'ficha', label: 'Ficha científica' },
  { id: 'quiz', label: 'Cuestionario' },
];

const CARD_LAYERS: LayersState = DEFAULT_LAYERS;

interface FieldProps {
  label: string;
  accent?: 'cyan' | 'emerald';
  children: ReactNode;
}

function Field({ label, accent = 'cyan', children }: FieldProps) {
  return (
    <div>
      <dt
        className={`mb-1 font-mono text-xs uppercase tracking-wider ${
          accent === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'
        }`}
      >
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-slate-200">{children}</dd>
    </div>
  );
}

function IntensityBadge({ intensity }: { intensity: Intensity }) {
  const tone =
    intensity === 3
      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
      : intensity === 2
        ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300'
        : 'border-slate-500 bg-slate-700 text-slate-300';
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs ${tone}`}>
      {INTENSITY_LABEL[intensity]}
    </span>
  );
}

interface MuscleCardProps {
  muscle: Muscle;
  sport: SportId;
  movementId: MovementId | null;
  onSelectMovement: (id: MovementId | null) => void;
}

function MuscleCard({ muscle, sport, movementId, onSelectMovement }: MuscleCardProps) {
  const [tab, setTab] = useState<TabId>('ficha');
  const baseId = useId();
  const sportLabel = SPORTS.find((s) => s.id === sport)?.label ?? '';
  const movements = SPORT_MOVEMENTS[sport];

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-800 shadow-lg shadow-cyan-500/10">
      <div className="flex items-center gap-4 border-b border-slate-700 p-4">
        <figure className="shrink-0">
          <div className="rounded-xl border border-slate-600 bg-slate-900 p-1.5">
            <LegSchematic selectedId={muscle.id} layers={CARD_LAYERS} className="h-28 w-20" />
          </div>
          <figcaption className="mt-1 text-center font-mono text-xs text-slate-400">Vista lateral</figcaption>
        </figure>

        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">{muscle.region}</p>
          <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-50">{muscle.name}</h2>
          <p className="mt-0.5 font-mono text-xs italic text-slate-400">{muscle.latinName}</p>
        </div>
      </div>

      <div role="tablist" aria-label="Contenido del músculo" className="flex border-b border-slate-700">
        {TABS.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              id={`${baseId}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex-1 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                selected ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div id={`${baseId}-panel-${tab}`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className="p-4">
        {tab === 'ficha' ? (
          <div className="space-y-4">
            <dl className="space-y-4">
              <Field label="Origen">{muscle.origin}</Field>
              <Field label="Inserción">{muscle.insertion}</Field>
              <Field label="Acción biomecánica principal">
                <span className="font-medium text-slate-50">{muscle.primaryAction}</span>
                {muscle.secondaryActions.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-300">
                    {muscle.secondaryActions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                )}
              </Field>
              <Field label="Inervación">{muscle.innervation}</Field>
            </dl>

            <section className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
              <dl>
                <Field label={`Aplicación deportiva · ${sportLabel}`} accent="emerald">
                  {muscle.sportApplications[sport]}
                </Field>
              </dl>

              <div>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-emerald-400">
                  Movimientos clave · {sportLabel}
                </h3>
                <ul className="space-y-1.5">
                  {movements.map((m) => {
                    const role = muscle.movements[m.id];
                    const selected = m.id === movementId;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onSelectMovement(selected ? null : m.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                            selected
                              ? 'border-cyan-400 bg-cyan-500/15'
                              : 'border-slate-600 bg-slate-800 hover:border-emerald-500'
                          }`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-slate-50">{m.label}</span>
                            <IntensityBadge intensity={role.intensity} />
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-300">{role.role}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          </div>
        ) : (
          <Quiz key={muscle.id} questions={muscle.quiz} />
        )}
      </div>
    </article>
  );
}

/* ============================================================================
 * QUIZ BIOMECÁNICO
 * ========================================================================== */

type ViewId = 'visor' | 'quiz' | 'soporte' | 'admin';

const VIEWS: readonly { id: ViewId; label: string }[] = [
  { id: 'visor', label: 'Visor anatómico' },
  { id: 'quiz', label: 'Autoevaluación' },
  { id: 'soporte', label: 'Atención al cliente' },
  { id: 'admin', label: 'Panel de gestión' },
];

type BiomechCategory = 'golpeo' | 'esprint' | 'cambio-direccion' | 'prevencion' | 'fundamentos';

const BIOMECH_CATEGORY_LABEL: Record<BiomechCategory, string> = {
  golpeo: 'Golpeo',
  esprint: 'Esprint',
  'cambio-direccion': 'Cambio de dirección',
  prevencion: 'Prevención',
  fundamentos: 'Fundamentos',
};

const BIOMECH_CATEGORIES = Object.keys(BIOMECH_CATEGORY_LABEL) as BiomechCategory[];

interface BiomechQuestion {
  readonly id: string;
  readonly category: BiomechCategory;
  readonly prompt: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
  readonly muscleId?: MuscleId;
  readonly movementId?: MovementId;
}

const BIOMECH_QUESTIONS: readonly BiomechQuestion[] = [
  {
    id: 'bq-1',
    category: 'golpeo',
    prompt:
      'En la fase de aceleración de la pierna de golpeo, justo antes del contacto con el balón, ¿qué acción realiza principalmente el cuádriceps?',
    options: [
      'Contracción excéntrica para frenar la flexión de rodilla',
      'Contracción concéntrica que extiende la rodilla a gran velocidad',
      'Contracción isométrica para mantener la rodilla bloqueada',
      'No interviene; la extensión es puramente pasiva',
    ],
    correctIndex: 1,
    explanation:
      'Tras la flexión de rodilla de la fase de armado, el cuádriceps se acorta de forma concéntrica y extiende la rodilla, generando gran parte de la velocidad final del pie.',
    muscleId: 'rectus-femoris',
    movementId: 'golpeo',
  },
  {
    id: 'bq-2',
    category: 'esprint',
    prompt:
      'Durante la fase final de oscilación del esprint, cuando la pierna se extiende hacia delante antes del contacto con el suelo, ¿qué tipo de contracción realizan los isquiotibiales?',
    options: [
      'Concéntrica, para acelerar la pierna hacia delante',
      'Isométrica, sin cambio de longitud',
      'Excéntrica, para frenar la extensión de rodilla y la flexión de cadera',
      'Están relajados en esta fase',
    ],
    correctIndex: 2,
    explanation:
      'En la oscilación terminal los isquiotibiales alcanzan su máxima longitud y trabajan de forma excéntrica para frenar la pierna. Es la fase de mayor exigencia y la más asociada a lesiones.',
    muscleId: 'biceps-femoris',
    movementId: 'esprint',
  },
  {
    id: 'bq-3',
    category: 'cambio-direccion',
    prompt:
      'En la fase de frenado previa a un cambio de dirección brusco, ¿qué rol cumple principalmente el cuádriceps de la pierna que frena?',
    options: [
      'Absorber carga de forma excéntrica controlando la flexión de rodilla',
      'Generar la propulsión lateral con un acortamiento rápido',
      'Rotar externamente la cadera',
      'Estabilizar únicamente el tobillo',
    ],
    correctIndex: 0,
    explanation:
      'Al frenar, la rodilla se flexiona bajo carga y el cuádriceps trabaja de forma excéntrica para controlar esa flexión y disipar la energía del cuerpo.',
    muscleId: 'rectus-femoris',
    movementId: 'cambio-direccion',
  },
  {
    id: 'bq-4',
    category: 'fundamentos',
    prompt:
      'En el apoyo monopodal de la pierna de soporte durante el golpeo, ¿qué músculo es clave para mantener la pelvis nivelada en el plano frontal?',
    options: ['Sóleo', 'Recto abdominal', 'Tibial anterior', 'Glúteo medio'],
    correctIndex: 3,
    explanation:
      'El glúteo medio evita que la pelvis caiga hacia el lado de la pierna libre. Un déficit de control favorece el valgo dinámico de rodilla, factor asociado a lesiones del ligamento cruzado anterior.',
    movementId: 'golpeo',
  },
  {
    id: 'bq-5',
    category: 'fundamentos',
    prompt: '¿Qué describe el ciclo estiramiento-acortamiento (CEA) y por qué es relevante en el fútbol?',
    options: [
      'Una contracción isométrica prolongada que mejora la resistencia',
      'El estiramiento estático previo al entrenamiento',
      'Una fase excéntrica seguida inmediatamente de una concéntrica que aprovecha energía elástica y el reflejo miotático',
      'La relajación completa del músculo entre repeticiones',
    ],
    correctIndex: 2,
    explanation:
      'En el CEA el músculo-tendón se estira y se acorta casi sin pausa, almacenando y devolviendo energía elástica. Está presente en el esprint, los saltos de cabeceo y los cambios de dirección.',
    movementId: 'esprint',
  },
  {
    id: 'bq-6',
    category: 'esprint',
    prompt: '¿Qué función cumple el tríceps sural (gastrocnemio y sóleo) en la fase de impulso del esprint?',
    options: [
      'Dorsiflexión del tobillo para preparar el contacto',
      'Extensión de la cadera',
      'Rotación interna de la tibia',
      'Flexión plantar que genera propulsión, apoyada por el almacenamiento elástico del tendón de Aquiles',
    ],
    correctIndex: 3,
    explanation:
      'El tríceps sural realiza la flexión plantar durante el despegue. El tendón de Aquiles almacena energía elástica y la devuelve en el impulso.',
    muscleId: 'gastrocnemius',
    movementId: 'esprint',
  },
  {
    id: 'bq-7',
    category: 'golpeo',
    prompt: '¿Qué principio explica que en un golpeo eficaz la velocidad se transfiera desde la pelvis hasta el pie?',
    options: [
      'Principio de sobrecarga progresiva',
      'Especificidad del entrenamiento',
      'Secuencia proximal-distal (cadena cinética)',
      'Ley de acción-reacción únicamente',
    ],
    correctIndex: 2,
    explanation:
      'En la secuencia proximal-distal los segmentos más cercanos al tronco aceleran primero y transfieren energía a los más distales (pierna, pie).',
    muscleId: 'rectus-femoris',
    movementId: 'golpeo',
  },
  {
    id: 'bq-8',
    category: 'prevencion',
    prompt: '¿Por qué se utiliza el ejercicio nórdico de isquiotibiales en la prevención de lesiones en fútbol?',
    options: [
      'Porque aumenta la fuerza excéntrica y favorece adaptaciones como el incremento de la longitud fascicular',
      'Porque trabaja los isquiotibiales de forma concéntrica y rápida',
      'Porque sustituye al calentamiento',
      'Porque entrena exclusivamente el glúteo mayor',
    ],
    correctIndex: 0,
    explanation:
      'El nórdico es un ejercicio de carga excéntrica elevada para los isquiotibiales. Los programas que lo incluyen han mostrado reducciones relevantes de lesiones musculares.',
    muscleId: 'biceps-femoris',
    movementId: 'esprint',
  },
  {
    id: 'bq-9',
    category: 'fundamentos',
    prompt: '¿Qué papel cumple la musculatura del core en acciones como el golpeo o el esprint?',
    options: [
      'Transmitir fuerzas entre tren inferior y superior y estabilizar la zona lumbopélvica',
      'Ninguno; solo trabajan las piernas',
      'Aumentar únicamente la flexibilidad lumbar',
      'Reemplazar la acción de los glúteos',
    ],
    correctIndex: 0,
    explanation:
      'El core estabiliza el tronco y la pelvis, permitiendo que las fuerzas generadas por las piernas se transfieran de forma eficiente y que la técnica se mantenga bajo fatiga.',
  },
  {
    id: 'bq-10',
    category: 'cambio-direccion',
    prompt: 'En un cambio de dirección, ¿qué estrategia técnica reduce la carga sobre la rodilla y mejora el control?',
    options: [
      'Mantener el tronco erguido y la rodilla en extensión completa',
      'Frenar siempre con la punta del pie',
      'Girar el tronco en sentido contrario a la dirección de salida',
      'Bajar el centro de gravedad, inclinar el tronco hacia el lado del giro y evitar el valgo de rodilla',
    ],
    correctIndex: 3,
    explanation:
      'Bajar el centro de gravedad con flexión de cadera y rodilla permite absorber la carga y orientar las fuerzas. Alinear la rodilla sobre el pie reduce el estrés en el LCA.',
    movementId: 'cambio-direccion',
  },
];

const BIOMECH_STORAGE_KEY = 'anato3d-biomech-quiz-best';

function readBestScore(): number | null {
  try {
    const raw = window.localStorage.getItem(BIOMECH_STORAGE_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeBestScore(value: number): void {
  try {
    window.localStorage.setItem(BIOMECH_STORAGE_KEY, String(value));
  } catch {
    // ignorar
  }
}

function biomechLevel(percent: number): string {
  if (percent >= 90) return 'Nivel élite';
  if (percent >= 70) return 'Nivel avanzado';
  if (percent >= 50) return 'Nivel intermedio';
  return 'A reforzar';
}

interface ViewTabsProps {
  view: ViewId;
  onChange: (view: ViewId) => void;
}

function ViewTabs({ view, onChange }: ViewTabsProps) {
  return (
    <nav aria-label="Secciones de la aplicación" className="border-b border-slate-700 bg-slate-900 px-4">
      <div role="tablist" className="flex flex-wrap gap-1">
        {VIEWS.map((v) => {
          const selected = v.id === view;
          return (
            <button
              key={v.id}
              id={`view-tab-${v.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`view-panel-${v.id}`}
              onClick={() => onChange(v.id)}
              className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                selected ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

interface BiomechQuizProps {
  onShowInViewer: (muscleId: MuscleId | undefined, movementId: MovementId | undefined) => void;
}

function BiomechQuiz({ onShowInViewer }: BiomechQuizProps) {
  const total = BIOMECH_QUESTIONS.length;

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<number | null>(readBestScore);

  const question = BIOMECH_QUESTIONS[index];
  const score = results.filter(Boolean).length;
  const answered = picked !== null;

  const handlePick = (optionIndex: number): void => {
    if (!question || answered) return;
    setPicked(optionIndex);
    setResults((prev) => [...prev, optionIndex === question.correctIndex]);
  };

  const handleNext = (): void => {
    if (!answered) return;
    if (index === total - 1) {
      if (best === null || score > best) {
        writeBestScore(score);
        setBest(score);
      }
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setPicked(null);
    }
  };

  const handleRestart = (): void => {
    setIndex(0);
    setPicked(null);
    setResults([]);
    setFinished(false);
  };

  const cardClass =
    'mx-auto w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg shadow-cyan-500/10';

  if (finished) {
    const percent = Math.round((score / total) * 100);
    const breakdown = BIOMECH_CATEGORIES.map((category) => {
      const items = BIOMECH_QUESTIONS.map((q, i) => ({ q, ok: results[i] === true })).filter(
        ({ q }) => q.category === category,
      );
      return { category, ok: items.filter((item) => item.ok).length, total: items.length };
    }).filter((row) => row.total > 0);
    const missed = BIOMECH_QUESTIONS.filter((_, i) => results[i] !== true);

    return (
      <section className={cardClass} aria-labelledby="biomech-result-title">
        <h2 id="biomech-result-title" className="font-mono text-xs uppercase tracking-wider text-emerald-400">
          Resultado de la autoevaluación
        </h2>

        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
          <span className="font-mono text-5xl font-bold text-cyan-400">
            {score}/{total}
          </span>
          <span className="pb-1 text-lg text-slate-200">
            {percent}% · {biomechLevel(percent)}
          </span>
        </div>
        {best !== null && <p className="mt-1 text-xs text-slate-400">Mejor marca guardada: {best}/{total}</p>}

        <div className="mt-5">
          <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-cyan-400">Rendimiento por bloque</h3>
          <ul className="space-y-3">
            {breakdown.map((row) => (
              <li key={row.category}>
                <div className="flex justify-between text-sm text-slate-200">
                  <span>{BIOMECH_CATEGORY_LABEL[row.category]}</span>
                  <span className="font-mono text-xs text-slate-400">
                    {row.ok}/{row.total}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.round((row.ok / row.total) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {missed.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-cyan-400">Preguntas a repasar</h3>
            <ul className="space-y-2">
              {missed.map((q) => (
                <li key={q.id} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm">
                  <p className="text-slate-200">{q.prompt}</p>
                  <p className="mt-1 text-xs text-emerald-300">
                    Respuesta correcta: {q.options[q.correctIndex]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-lg border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            Repetir test
          </button>
        </div>
      </section>
    );
  }

  if (!question) return null;

  const isCorrect = picked === question.correctIndex;
  const canOpenViewer = question.muscleId !== undefined || question.movementId !== undefined;
  const progressDone = results.length;

  return (
    <section className={cardClass} aria-labelledby="biomech-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="biomech-title" className="text-lg font-semibold text-slate-50">
            Quiz biomecánico de fútbol
          </h2>
          <p className="font-mono text-xs uppercase tracking-wider text-emerald-400">
            {BIOMECH_CATEGORY_LABEL[question.category]}
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-slate-300">
            Pregunta {index + 1}/{total}
          </span>
          <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-emerald-300">
            Puntos {score}
          </span>
          {best !== null && (
            <span className="hidden rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-slate-400 sm:inline">
              Mejor {best}/{total}
            </span>
          )}
        </div>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700"
        role="progressbar"
        aria-label="Progreso del test"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={progressDone}
      >
        <div
          className="h-full rounded-full bg-cyan-500 transition-all"
          style={{ width: `${(progressDone / total) * 100}%` }}
        />
      </div>

      <fieldset className="mt-5 space-y-2">
        <legend className="mb-3 text-sm font-medium leading-relaxed text-slate-50 sm:text-base">
          <span className="mr-1.5 font-mono text-cyan-400">{index + 1}.</span>
          {question.prompt}
        </legend>

        {question.options.map((option, oIndex) => (
          <button
            key={option}
            type="button"
            disabled={answered}
            onClick={() => handlePick(oIndex)}
            className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-default ${optionTone(
              answered,
              oIndex === question.correctIndex,
              oIndex === picked,
            )}`}
          >
            <span className="mr-2 font-mono text-slate-400">{String.fromCharCode(65 + oIndex)}.</span>
            {option}
          </button>
        ))}
      </fieldset>

           <div role="status" aria-live="polite" className="mt-4">
        {answered && (
          <div
            className={`rounded-lg border px-4 py-3 ${
              isCorrect ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'
            }`}
          >
            <p className={`text-sm font-semibold ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isCorrect ? '✔ ¡Correcto!' : '✘ Incorrecto'}
            </p>
            {!isCorrect && (
              <p className="mt-1 text-sm text-slate-200">
                Respuesta correcta: {String.fromCharCode(65 + question.correctIndex)}.{' '}
                {question.options[question.correctIndex]}
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{question.explanation}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        {answered && canOpenViewer ? (
          <button
            type="button"
            onClick={() => onShowInViewer(question.muscleId, question.movementId)}
            className={TOOL_BTN}
          >
            Ver en el visor
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={!answered}
          onClick={handleNext}
          className="rounded-lg border border-cyan-500 bg-cyan-500/10 px-5 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-cyan-500/10"
        >
          {index === total - 1 ? 'Ver resultado' : 'Siguiente'}
        </button>
      </div>
    </section>
  );
}

/* ============================================================================
 * ATENCIÓN AL CLIENTE: formulario + FAQ
 * ========================================================================== */

interface ContactMessage {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly createdAt: string;
}

const CONTACT_STORAGE_KEY = 'anato3d-contact-messages';

function readMessages(): ContactMessage[] {
  try {
    const raw = window.localStorage.getItem(CONTACT_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: ContactMessage[] = [];
    for (const item of parsed) {
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ContactMessage).id === 'string' &&
        typeof (item as ContactMessage).name === 'string' &&
        typeof (item as ContactMessage).email === 'string' &&
        typeof (item as ContactMessage).message === 'string' &&
        typeof (item as ContactMessage).createdAt === 'string'
      ) {
        out.push(item as ContactMessage);
      }
    }
    return out;
  } catch {
    return [];
  }
}

function writeMessages(messages: readonly ContactMessage[]): void {
  try {
    window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // almacenamiento no disponible
  }
}

type FaqCategory = 'app' | 'biomecanica' | 'privacidad';

const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  app: 'Uso de la app',
  biomecanica: 'Biomecánica',
  privacidad: 'Privacidad y datos',
};

interface FaqItem {
  readonly id: string;
  readonly category: FaqCategory;
  readonly question: string;
  readonly answer: string;
}

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'faq-1',
    category: 'app',
    question: '¿Cómo busco un músculo o un hueso?',
    answer:
      'Usa la barra del encabezado: escribe el nombre (con o sin tildes) y verás las coincidencias. Al elegir un músculo, se abre en la ficha; al elegir un hueso, se resalta sobre el esquema.',
  },
  {
    id: 'faq-2',
    category: 'app',
    question: '¿Qué significan las capas "Ósea" y "Muscular"?',
    answer:
      'Puedes mostrar u ocultar cada capa y ajustar su opacidad al 10–100%. Debe quedar siempre al menos una capa visible para que el esquema tenga sentido.',
  },
  {
    id: 'faq-3',
    category: 'app',
    question: '¿Puedo usar anato3D en el móvil?',
    answer:
      'Sí. La interfaz es responsive: en pantallas pequeñas las columnas se apilan y los controles se reorganizan. Está pensada para consultarse también en tableta en clase.',
  },
  {
    id: 'faq-4',
    category: 'biomecanica',
    question: '¿Qué es una contracción excéntrica y por qué importa tanto?',
    answer:
      'Es cuando el músculo se alarga mientras genera tensión (por ejemplo, al frenar una pierna en el esprint). Es la fase de mayor exigencia y la más asociada a lesiones de isquiotibiales.',
  },
  {
    id: 'faq-5',
    category: 'biomecanica',
    question: '¿Por qué el recto anterior es un músculo biarticular?',
    answer:
      'Porque cruza dos articulaciones: nace en la pelvis (espina ilíaca anteroinferior) y se inserta en la tibia. Por eso puede flexionar la cadera y extender la rodilla al mismo tiempo.',
  },
  {
    id: 'faq-6',
    category: 'biomecanica',
    question: '¿Qué es el ciclo estiramiento-acortamiento (CEA)?',
    answer:
      'Es la secuencia excéntrica → concéntrica casi sin pausa que aprovecha la energía elástica del tendón y el reflejo miotático. Explica por qué el esprint y los saltos son tan potentes.',
  },
  {
    id: 'faq-7',
    category: 'privacidad',
    question: '¿Dónde se guardan mis respuestas del quiz y mis mensajes?',
    answer:
      'Todo se guarda en el localStorage de tu navegador. Puedes borrarlo desde las herramientas del navegador o desde el panel de gestión.',
  },
  {
    id: 'faq-8',
    category: 'privacidad',
    question: '¿Se envían mis datos a algún servidor?',
    answer:
      'No. Este MVP es completamente frontend: no hay backend, no hay analítica y los formularios no se envían a ningún servicio externo.',
  },
];

interface SupportViewProps {
  messages: readonly ContactMessage[];
  onAddMessage: (message: Omit<ContactMessage, 'id' | 'createdAt'>) => void;
}

function SupportView({ messages, onAddMessage }: SupportViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle');
  const [errorText, setErrorText] = useState('');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const baseId = useId();

  const maxChars = 500;
  const charCount = message.length;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setStatus('error');
      setErrorText('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus('error');
      setErrorText('Introduce un correo electrónico válido.');
      return;
    }
    if (trimmedMessage.length < 10) {
      setStatus('error');
      setErrorText('El mensaje debe tener al menos 10 caracteres.');
      return;
    }

    onAddMessage({ name: trimmedName, email: trimmedEmail, message: trimmedMessage });
    setName('');
    setEmail('');
    setMessage('');
    setStatus('success');
    setErrorText('');
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header className="text-center">
        <h2 className="text-2xl font-semibold text-slate-50">Atención al cliente</h2>
        <p className="mt-1 text-sm text-slate-400">
          ¿Tienes dudas sobre biomecánica o sobre el uso de anato3D? Escríbenos o consulta la sección de preguntas frecuentes.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg shadow-cyan-500/10"
        >
          <h3 className="text-lg font-semibold text-slate-50">Formulario de contacto</h3>
          <p className="mt-1 text-xs text-slate-400">
            {messages.length === 0
              ? 'Los mensajes se guardan localmente en este navegador para el MVP.'
              : `Este navegador ya tiene ${messages.length} mensaje${messages.length === 1 ? '' : 's'} guardado${messages.length === 1 ? '' : 's'}.`}
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor={`${baseId}-name`} className="block text-xs font-medium text-slate-300">
                Nombre
              </label>
              <input
                id={`${baseId}-name`}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                placeholder="Tu nombre"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <label htmlFor={`${baseId}-email`} className="block text-xs font-medium text-slate-300">
                Correo electrónico
              </label>
              <input
                id={`${baseId}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={120}
                required
                placeholder="tu@correo.com"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor={`${baseId}-message`} className="block text-xs font-medium text-slate-300">
                  Mensaje
                </label>
                <span
                  className={`font-mono text-xs ${charCount > maxChars ? 'text-rose-400' : 'text-slate-500'}`}
                  aria-live="polite"
                >
                  {charCount}/{maxChars}
                </span>
              </div>
              <textarea
                id={`${baseId}-message`}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={maxChars}
                rows={5}
                required
                placeholder="Cuéntanos tu duda con el detalle que puedas…"
                className="mt-1 w-full resize-y rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
          </div>

          {status === 'error' && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
            >
              {errorText}
            </p>
          )}
          {status === 'success' && (
            <p
              role="status"
              className="mt-3 rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200"
            >
              ¡Gracias! Hemos recibido tu mensaje. Puedes consultarlo en el panel de gestión.
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg border border-cyan-500 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
          >
            Enviar mensaje
          </button>
        </form>

        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg shadow-cyan-500/10">
          <h3 className="text-lg font-semibold text-slate-50">Preguntas frecuentes</h3>
          <p className="mt-1 text-xs text-slate-400">Haz clic en cada pregunta para ver la respuesta.</p>

          <ul className="mt-4 space-y-2">
            {FAQ_ITEMS.map((item) => {
              const isOpen = openFaq === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : item.id)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-left transition-colors hover:border-cyan-500"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span>
                        <span className="block font-mono text-xs uppercase tracking-wider text-emerald-400">
                          {FAQ_CATEGORY_LABEL[item.category]}
                        </span>
                        <span className="mt-0.5 block text-sm font-medium text-slate-100">
                          {item.question}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`shrink-0 text-cyan-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        ▾
                      </span>
                    </span>
                    {isOpen && (
                      <p className="mt-2 border-t border-slate-700 pt-2 text-sm leading-relaxed text-slate-300">
                        {item.answer}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * PANEL DE GESTIÓN / ADMIN
 * ========================================================================== */

interface AdminViewProps {
  messages: readonly ContactMessage[];
  bestScore: number | null;
  totalQuizQuestions: number;
  onClearMessages: () => void;
  onResetBest: () => void;
}

function AdminView({
  messages,
  bestScore,
  totalQuizQuestions,
  onClearMessages,
  onResetBest,
}: AdminViewProps) {
  const totalMuscles = MUSCLES.length;
  const totalBones = BONES.length;
  const totalMovements = (Object.values(SPORT_MOVEMENTS) as readonly (readonly MovementInfo[])[]).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const totalQuizQuestionsAll =
    MUSCLES.reduce((sum, m) => sum + m.quiz.length, 0) + BIOMECH_QUESTIONS.length;

  const stats: readonly {
    readonly label: string;
    readonly value: string | number;
    readonly accent?: 'cyan' | 'emerald';
    readonly hint?: string;
  }[] = [
    { label: 'Músculos', value: totalMuscles, accent: 'emerald' },
    { label: 'Huesos', value: totalBones },
    { label: 'Gestos deportivos', value: totalMovements, accent: 'emerald' },
    { label: 'Preguntas en el catálogo', value: totalQuizQuestionsAll },
    { label: 'Mensajes recibidos', value: messages.length, accent: 'emerald' },
    {
      label: 'Mejor resultado del quiz',
      value: bestScore !== null ? `${bestScore}/${totalQuizQuestions}` : '—',
      hint: bestScore === null ? 'Sin intentos guardados' : undefined,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-slate-50">Panel de gestión</h2>
        <p className="mt-1 text-sm text-slate-400">
          Métricas básicas del MVP y herramientas de administración local.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`rounded-xl border bg-slate-800 p-4 ${
              stat.accent === 'emerald' ? 'border-emerald-500/40' : 'border-slate-700'
            }`}
          >
            <p className="font-mono text-xs uppercase tracking-wider text-slate-400">{stat.label}</p>
            <p
              className={`mt-2 font-mono text-3xl font-bold ${
                stat.accent === 'emerald' ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {stat.value}
            </p>
            {stat.hint !== undefined && <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>}
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg shadow-cyan-500/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-50">Mensajes recibidos</h3>
            <p className="text-xs text-slate-400">Los más recientes aparecen primero.</p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearMessages}
              className="rounded-md border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20"
            >
              Borrar todos
            </button>
          )}
        </div>

        {messages.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-600 bg-slate-900 px-4 py-6 text-center text-sm text-slate-500">
            Aún no hay mensajes. Envía uno desde la pestaña de atención al cliente.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {messages.map((msg) => (
              <li key={msg.id} className="rounded-lg border border-slate-600 bg-slate-900 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{msg.name}</p>
                    <p className="font-mono text-xs text-cyan-400">{msg.email}</p>
                  </div>
                  <time className="font-mono text-xs text-slate-500" dateTime={msg.createdAt}>
                    {new Date(msg.createdAt).toLocaleString('es-ES')}
                  </time>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{msg.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg shadow-cyan-500/10">
        <h3 className="text-lg font-semibold text-slate-50">Herramientas de mantenimiento</h3>
        <p className="mt-1 text-xs text-slate-400">
          Acciones de demostración para el MVP (afectan al almacenamiento local de tu navegador).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onResetBest}
            disabled={bestScore === null}
            className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reiniciar mejor resultado del quiz
          </button>
          <button
            type="button"
            onClick={onClearMessages}
            disabled={messages.length === 0}
            className="rounded-md border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Vaciar bandeja de mensajes
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================================
 * APP
 * ========================================================================== */

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.2;
const ZOOM_STEP = 0.2;

const clampZoom = (value: number): number =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 10) / 10));

const clampOpacity = (value: number): number => Math.min(100, Math.max(10, Math.round(value)));

export default function App() {
  const [view, setView] = useState<ViewId>('visor');
  const [sport, setSport] = useState<SportId>('futbol');
  const [muscleId, setMuscleId] = useState<MuscleId>(DEFAULT_MUSCLE_ID);
  const [movementId, setMovementId] = useState<MovementId | null>(null);
  const [highlightedBone, setHighlightedBone] = useState<BoneId | null>(null);
  const [query, setQuery] = useState('');
  const [layers, setLayers] = useState<LayersState>(DEFAULT_LAYERS);
  const [camera, setCamera] = useState<CameraState>({ zoom: 1, resetToken: 0 });
  const [messages, setMessages] = useState<ContactMessage[]>(readMessages);
  const [bestScore, setBestScore] = useState<number | null>(readBestScore);

  // Refrescar el mejor resultado cuando se entra al panel de gestión (por si el usuario terminó
  // un test y cambió de pestaña, queremos los datos más recientes del localStorage).
  useEffect(() => {
    if (view === 'admin') {
      setBestScore(readBestScore());
    }
  }, [view]);

  const muscle = MUSCLES_BY_ID[muscleId];

  const results = useMemo(() => searchStructures(query), [query]);
  const matching = useMemo<ReadonlySet<MuscleId> | null>(() => {
    if (toWords(query).length === 0) return null;
    const ids = new Set<MuscleId>();
    for (const result of results) {
      if (result.kind === 'muscle') ids.add(result.id);
    }
    return ids;
  }, [query, results]);

  const handleSelectMuscle = useCallback((id: MuscleId): void => {
    setMuscleId(id);
    setLayers((prev) => showLayer(prev, 'muscle'));
  }, []);

  const handleSearchSelect = useCallback(
    (result: SearchResult): void => {
      if (result.kind === 'muscle') {
        handleSelectMuscle(result.id);
        setHighlightedBone(null);
      } else {
        setHighlightedBone(result.id);
        setLayers((prev) => showLayer(prev, 'bone'));
      }
      setQuery('');
      setView('visor');
    },
    [handleSelectMuscle],
  );

  const handleSportChange = useCallback((next: SportId): void => {
    setSport(next);
    setMovementId(null);
  }, []);

  const handleShowInViewer = useCallback(
    (targetMuscle: MuscleId | undefined, targetMovement: MovementId | undefined): void => {
      setSport('futbol');
      if (targetMuscle !== undefined) handleSelectMuscle(targetMuscle);
      setMovementId(targetMovement ?? null);
      setHighlightedBone(null);
      setView('visor');
    },
    [handleSelectMuscle],
  );

  const handleClearBone = useCallback((): void => setHighlightedBone(null), []);

  const handleToggleLayer = useCallback((layer: LayerId): void => {
    setLayers((prev) => {
      const other: LayerId = layer === 'bone' ? 'muscle' : 'bone';
      const nextVisible = !prev[layer].visible;
      if (!nextVisible && !prev[other].visible) return prev;
      return { ...prev, [layer]: { ...prev[layer], visible: nextVisible } };
    });
  }, []);

  const handleLayerOpacity = useCallback((layer: LayerId, value: number): void => {
    setLayers((prev) => ({ ...prev, [layer]: { ...prev[layer], opacity: clampOpacity(value) } }));
  }, []);

  const handleZoomIn = useCallback((): void => {
    setCamera((c) => ({ ...c, zoom: clampZoom(c.zoom + ZOOM_STEP) }));
  }, []);

  const handleZoomOut = useCallback((): void => {
    setCamera((c) => ({ ...c, zoom: clampZoom(c.zoom - ZOOM_STEP) }));
  }, []);

  const handleReset = useCallback((): void => {
    setCamera((c) => ({ zoom: 1, resetToken: c.resetToken + 1 }));
  }, []);

  const handleAddMessage = useCallback(
    (msg: Omit<ContactMessage, 'id' | 'createdAt'>): void => {
      const newMsg: ContactMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: msg.name,
        email: msg.email,
        message: msg.message,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => {
        const next = [newMsg, ...prev];
        writeMessages(next);
        return next;
      });
    },
    [],
  );

  const handleClearMessages = useCallback((): void => {
    setMessages([]);
    writeMessages([]);
  }, []);

  const handleResetBest = useCallback((): void => {
    try {
      window.localStorage.removeItem(BIOMECH_STORAGE_KEY);
    } catch {
      // ignorar
    }
    setBestScore(null);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 font-sans text-slate-200 lg:h-screen lg:overflow-hidden">
      <Header
        sport={sport}
        query={query}
        results={results}
        onSportChange={handleSportChange}
        onQueryChange={setQuery}
        onSearchSelect={handleSearchSelect}
      />

      <ViewTabs view={view} onChange={setView} />

      {/* Cada panel se mantiene montado (solo se oculta con `hidden`) para no perder el estado
          interactivo del visor, las respuestas del quiz, el formulario o el FAQ abierto. */}
      <main
        id="view-panel-visor"
        role="tabpanel"
        aria-labelledby="view-tab-visor"
        className={`${
          view === 'visor' ? 'grid' : 'hidden'
        } min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-10 lg:grid-rows-1`}
      >
        <section aria-label="Visor 3D" className="h-screen min-h-0 lg:col-span-7 lg:h-auto">
          <Viewer3D
            camera={camera}
            layers={layers}
            selectedId={muscleId}
            sport={sport}
            movementId={movementId}
            highlightedBone={highlightedBone}
            matching={matching}
            zoomMin={ZOOM_MIN}
            zoomMax={ZOOM_MAX}
            onSelectMuscle={handleSelectMuscle}
            onSelectMovement={setMovementId}
            onClearBone={handleClearBone}
            onReset={handleReset}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onToggleLayer={handleToggleLayer}
            onLayerOpacity={handleLayerOpacity}
          />
        </section>

        <aside aria-label="Datos científicos" className="min-h-0 lg:col-span-3 lg:overflow-y-auto">
          <MuscleCard
            muscle={muscle}
            sport={sport}
            movementId={movementId}
            onSelectMovement={setMovementId}
          />
        </aside>
      </main>

      <main
        id="view-panel-quiz"
        role="tabpanel"
        aria-labelledby="view-tab-quiz"
        className={`${view === 'quiz' ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto p-4`}
      >
        <BiomechQuiz onShowInViewer={handleShowInViewer} />
      </main>

      <main
        id="view-panel-soporte"
        role="tabpanel"
        aria-labelledby="view-tab-soporte"
        className={`${view === 'soporte' ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto p-4`}
      >
        <SupportView messages={messages} onAddMessage={handleAddMessage} />
      </main>

      <main
        id="view-panel-admin"
        role="tabpanel"
        aria-labelledby="view-tab-admin"
        className={`${view === 'admin' ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto p-4`}
      >
        <AdminView
          messages={messages}
          bestScore={bestScore}
          totalQuizQuestions={BIOMECH_QUESTIONS.length}
          onClearMessages={handleClearMessages}
          onResetBest={handleResetBest}
        />
      </main>
    </div>
  );
}
