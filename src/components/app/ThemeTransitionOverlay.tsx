import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  ImageShader,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Easing,
  runOnJS,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { subscribeThemeTransition, waitForThemePaint, type ThemeTransitionJob } from './themeTransition';

/** Collapse into the singularity, then blast the new theme back out. */
const COLLAPSE_MS = 700;
const RELEASE_MS = 750;
/**
 * Dwell at full cover after the theme flips, until the app reports it has actually
 * repainted. Switching themes remounts the whole navigation tree — that repaint is
 * the flicker this whole effect exists to hide, and how long it takes depends on
 * the device and the screen, so it is waited for rather than guessed at. The floor
 * keeps the beat at the singularity even when the repaint is instant; the ceiling
 * stops a missing signal from stalling the animation.
 */
const MIN_PEAK_HOLD_MS = 100;
const MAX_PEAK_HOLD_MS = 700;
/** Progress value at the peak — the frame the theme actually changes on. */
const PEAK = 0.5;

/**
 * Everything below `progress` 0.5 distorts the outgoing screen (a snapshot taken
 * on press) inward; everything above it paints the incoming theme back outward and
 * uncovers the live, already-reswitched app through a hole trailing the wavefront.
 *
 * Rotation is scaled by 1/(r + k) throughout, so pixels and particles nearer the
 * center travel faster and the motion reads as a spiral rather than a zoom.
 */
const SOURCE = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 resolution;
uniform float2 origin;
uniform float progress;
uniform float3 incoming;
uniform float3 accent;

float2 swirl(float2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return float2(v.x * c - v.y * s, v.x * s + v.y * c);
}

half4 main(float2 xy) {
  float2 d = xy - origin;
  float r = length(d);
  float a = atan(d.y, d.x);
  float maxR = length(max(origin, resolution - origin));

  if (progress < 0.5) {
    float t = progress / 0.5;
    float e = t * t;

    float twist = pow(t, 1.4) * 4.2 * (190.0 / (r + 190.0));
    // Sampling further out than we draw shrinks the frame toward the origin. The
    // exponential falloff is what makes it read as gravity: the far edges barely
    // move early on while the mouth of the well is already a whirlpool.
    float pull = 1.0 + pow(t, 3.0) * (0.8 + 10.0 * exp(-r / (maxR * 0.45)));
    float4 col = float4(image.eval(origin + swirl(d, twist) * pull));

    // Accretion streaks: logarithmic spiral arms winding inward, so the space the
    // collapsing UI vacates fills with rotating matter instead of flat black.
    float arm = sin(a * 2.0 + log(max(r, 4.0)) * 5.0 - pow(t, 1.3) * 14.0);
    float haze = smoothstep(0.35, 1.0, arm) * exp(-r / (maxR * 0.85)) * pow(t, 1.6);
    col.rgb += accent * haze * 0.28;

    // Event horizon: a black disc eating the frame from the center outward. The
    // steep exponent keeps the UI legible (and visibly spiralling) for most of the
    // collapse, then slams shut over the last few frames.
    float voidR = max(pow(t, 5.0) * maxR * 2.2, 0.001);
    float swallowed = 1.0 - smoothstep(voidR * 0.55, voidR, r);
    col.rgb = mix(col.rgb, float3(0.0), swallowed);

    // Accretion glow riding the horizon's edge.
    float edge = clamp(voidR * 0.09, 6.0, 45.0);
    float ring = exp(-((r - voidR) * (r - voidR)) / (edge * edge));
    col.rgb += accent * ring * (0.3 + 1.1 * e);
    col.rgb *= 1.0 - 0.35 * e;

    return half4(half3(col.rgb), 1.0);
  }

  float t = (progress - 0.5) / 0.5;
  float wave = pow(t, 1.15) * maxR * 1.6;
  // Trails the wavefront, and lags it far enough that the app behind has had time
  // to re-render into the new theme before any of it is uncovered.
  float reveal = pow(max(t - 0.18, 0.0) / 0.82, 1.25) * maxR * 1.6;

  // Incoming theme fills in behind the shockwave...
  float band = 1.0 - smoothstep(wave - maxR * 0.16, wave, r);
  float3 col = mix(float3(0.0), incoming, band);
  // ...with an accent afterglow scaled by how dark that theme is, so switching *to*
  // dark still reads as a blast of light rather than black spreading over black,
  // without blowing the near-white peach theme out to pure white.
  float incomingLuma = dot(incoming, float3(0.299, 0.587, 0.114));
  col += accent * band * (0.1 + 0.35 * (1.0 - incomingLuma)) * (1.0 - t);
  float front = clamp(maxR * 0.035, 8.0, 40.0);
  col += accent * exp(-((r - wave) * (r - wave)) / (front * front)) * 1.2 * (1.0 - 0.4 * t);

  // ...and the real app is uncovered by a hole trailing just behind it.
  float alpha = smoothstep(reveal - maxR * 0.12, reveal, r);
  return half4(half3(col * alpha), half(alpha));
}
`);

if (!SOURCE) {
  console.error('[ThemeTransition] shader failed to compile — falling back to an instant switch');
}

const PARTICLE_COUNT = 30;
const GOLDEN_ANGLE = 2.399963229728653;

function fract(n: number) {
  return n - Math.floor(n);
}

// Deterministic, so the effect is identical every run and nothing has to be
// randomised (or allocated) per frame.
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  angle: (i * GOLDEN_ANGLE) % (Math.PI * 2),
  radius: 0.2 + 0.8 * fract(i * 0.6180339887),
  size: 2.2 + 3.0 * fract(i * 0.7548776662),
  spin: 0.8 + 1.8 * fract(i * 0.3247179572),
  lead: 0.3 * fract(i * 0.9146),
}));

export function ThemeTransitionOverlay() {
  const [job, setJob] = useState<ThemeTransitionJob | null>(null);

  useEffect(() => subscribeThemeTransition(setJob), []);

  if (!job) return null;
  // Keyed so each run gets a fresh timeline instead of resuming the previous one.
  return <Overlay key={job.runId} job={job} />;
}

function Overlay({ job }: { job: ThemeTransitionJob }) {
  const { width, height } = job.size;
  const origin = job.origin;
  // Pulled out of `job` deliberately: worklets capture whatever they reference, and
  // `job` also carries a native SkImage that cannot cross onto the UI runtime.
  const { incoming, accent, onPeak, onDone } = job;
  // Distance to the furthest corner — matches the shader's own maxR so the
  // particles and the distortion share one coordinate scale.
  const maxR = Math.hypot(
    Math.max(origin.x, width - origin.x),
    Math.max(origin.y, height - origin.y)
  );
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!SOURCE) {
      // No shader, no illusion to hide the switch behind — just switch.
      onPeak();
      onDone();
      return;
    }
    let cancelled = false;

    // Split rather than one withSequence: the release can only start once the app
    // behind the overlay has repainted, which is known on the JS thread, not here.
    function handlePeak() {
      if (cancelled) return;
      onPeak();
      // Drift on rather than freeze: the overlay is still solid black this side of
      // the reveal, so the core keeps building instead of the effect stalling while
      // the app rebuilds. Capped short of where the reveal would start uncovering.
      progress.value = withTiming(PEAK + 0.06, {
        duration: MAX_PEAK_HOLD_MS,
        easing: Easing.linear,
      });
      Promise.all([
        waitForThemePaint(MAX_PEAK_HOLD_MS),
        new Promise((resolve) => setTimeout(resolve, MIN_PEAK_HOLD_MS)),
      ]).then(() => {
        if (cancelled) return;
        // Decelerating out: the new theme is thrown back off the singularity.
        progress.value = withTiming(
          1,
          { duration: RELEASE_MS, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(onDone)();
          }
        );
      });
    }

    progress.value = 0;
    // Accelerating in: the screen falls into the singularity.
    progress.value = withTiming(
      PEAK,
      { duration: COLLAPSE_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(handlePeak)();
      }
    );

    return () => {
      cancelled = true;
    };
  }, [onPeak, onDone, progress]);

  const uniforms = useDerivedValue(() => ({
    resolution: [width, height],
    origin: [origin.x, origin.y],
    progress: progress.value,
    incoming,
    accent,
  }));

  // One flat [x, y, size, opacity, ...] buffer per frame, computed on the UI
  // thread — cheaper than 30 components each running their own maths.
  const particles = useDerivedValue(() => {
    const p = progress.value;
    const inward = p < PEAK;
    const phase = inward ? p / PEAK : (p - PEAK) / (1 - PEAK);
    const buffer: number[] = [];
    for (let i = 0; i < PARTICLES.length; i++) {
      const seed = PARTICLES[i];
      // Staggered starts, so they spiral in as a stream instead of one ring.
      const lead = inward ? seed.lead : 0;
      const t = Math.min(Math.max((phase - lead) / (1 - lead), 0), 1);
      const eased = inward ? t * t : 1 - Math.pow(1 - t, 2.2);
      const radius = seed.radius * maxR * (inward ? 1 - eased : eased * 1.15);
      // Angular speed rises as the radius falls, so they whip around the core.
      const boost = (maxR * 0.28) / (radius + maxR * 0.05);
      const angle = seed.angle + (inward ? 1 : -0.55) * seed.spin * eased * boost * 1.2;
      const opacity = inward
        ? Math.min(t * 7, 1)
        : 1 - Math.min(Math.max((t - 0.5) / 0.5, 0), 1);
      buffer.push(
        origin.x + Math.cos(angle) * radius,
        origin.y + Math.sin(angle) * radius,
        seed.size,
        opacity
      );
    }
    return buffer;
  });

  const coreRadius = useDerivedValue(() => {
    const p = progress.value;
    const t = p < PEAK ? p / PEAK : Math.max(1 - (p - PEAK) / 0.35, 0);
    return 4 + 95 * t * t;
  });

  // A white-hot center inside the orange halo — without it the singularity reads
  // as a flat orange disc rather than something too bright to look at.
  const hotRadius = useDerivedValue(() => {
    const p = progress.value;
    const t = p < PEAK ? p / PEAK : Math.max(1 - (p - PEAK) / 0.3, 0);
    return 2 + 30 * t * t * t;
  });

  const coreOpacity = useDerivedValue(() => {
    const p = progress.value;
    return p < PEAK ? 0.35 + 0.65 * (p / PEAK) : Math.max(1 - (p - PEAK) / 0.3, 0);
  });

  if (!SOURCE) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        // Explicit ordering: an absolutely positioned sibling is not reliably
        // above a flex sibling on Android without elevation.
        { zIndex: 999, elevation: 999 },
      ]}
      pointerEvents="none"
    >
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Fill>
          <Shader source={SOURCE} uniforms={uniforms}>
            <ImageShader
              image={job.image}
              fit="fill"
              rect={{ x: 0, y: 0, width, height }}
              tx="clamp"
              ty="clamp"
            />
          </Shader>
        </Fill>
        <Group>
          <BlurMask blur={6} style="normal" />
          {PARTICLES.map((_, i) => (
            <Particle key={i} index={i} buffer={particles} color={job.accentHex} />
          ))}
        </Group>
        <Circle c={vec(origin.x, origin.y)} r={coreRadius} color={job.accentHex} opacity={coreOpacity}>
          <BlurMask blur={34} style="normal" />
        </Circle>
        <Circle c={vec(origin.x, origin.y)} r={hotRadius} color="#FFEADC" opacity={coreOpacity}>
          <BlurMask blur={12} style="normal" />
        </Circle>
      </Canvas>
    </View>
  );
}

function Particle({
  index,
  buffer,
  color,
}: {
  index: number;
  buffer: SharedValue<number[]>;
  color: string;
}) {
  const offset = index * 4;
  const center = useDerivedValue(() => vec(buffer.value[offset], buffer.value[offset + 1]));
  const radius = useDerivedValue(() => buffer.value[offset + 2]);
  const opacity = useDerivedValue(() => buffer.value[offset + 3]);
  return <Circle c={center} r={radius} color={color} opacity={opacity} />;
}
