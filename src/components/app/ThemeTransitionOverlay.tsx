import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Group,
  ImageShader,
  Points,
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
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { subscribeThemeTransition, waitForThemePaint, type ThemeTransitionJob } from './themeTransition';

/** Collapse into the singularity, then blast the new theme back out. */
const COLLAPSE_MS = 700;
const RELEASE_MS = 750;
/**
 * Anticipation and recoil — the two beats that stop each big move from starting
 * flat out. The screen takes a short breath inward before it falls, and the
 * singularity gathers back on itself before it throws the new theme out.
 */
const ANTICIPATE_MS = 150;
const ANTICIPATE = 0.045;
const RECOIL_MS = 120;
/** A last slow drift after the blast, so the effect settles instead of stopping. */
const SETTLE_MS = 260;
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
/**
 * How many positions along each pixel's path are sampled and averaged per frame.
 *
 * Measured on a mid-range phone, this is close to free: the taps land on
 * neighbouring texels, so they hit cache and the GPU sits at 3-6ms whether this
 * is 9 or 32. What actually limits the look is how far back the trail is spread
 * (the `lag` term below) — past roughly one tap per two percent of that span the
 * samples stop adding anything the eye can see. Raise them together or not at
 * all. Dropping this degrades gracefully: one sample is the hard displacement
 * this started as.
 */
const MOTION_TAPS = 24;

const SOURCE = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float2 resolution;
uniform float2 origin;
uniform float progress;
uniform float3 incoming;
uniform float3 accent;
/** 0 runs the whole effect inward, 1 runs it outward. */
uniform float outward;

// What a distant observer actually sees is not the event horizon. Photons passing
// within sqrt(27)/2 horizon radii are captured, so the dark circle on screen — the
// shadow — is 2.6 times bigger than the hole itself. Everything here is scaled off
// that shadow rather than off the horizon.
const float SHADOW_OVER_RS = 2.598;

// How far the accretion disc is tilted, as how much its far side is squashed on
// screen. Near edge-on is what lets the far side lens up and over the shadow,
// which is the arc that makes a black hole read as one.
const float COS_I = 0.34;

// Orbital speed of the inner disc as a fraction of c. This single number is why
// one side blazes and the other nearly vanishes: the half coming toward the
// viewer is beamed at it.
const float BETA = 0.62;

float2 swirl(float2 v, float a) {
  float s = sin(a);
  float c = cos(a);
  return float2(v.x * c - v.y * s, v.x * s + v.y * c);
}

// Temperature ramp for the disc. A thin accretion disc runs hotter inward, so
// this goes from dull red at the rim to white at the innermost orbit.
float3 hot(float x) {
  x = clamp(x, 0.0, 1.0);
  float3 warm = mix(float3(0.30, 0.05, 0.01), float3(1.0, 0.44, 0.10), x);
  return mix(warm, float3(1.0, 0.94, 0.86), pow(x, 3.0));
}

// Emission from the accretion disc and the photon ring, to add on top of whatever
// the lensed background left behind.
float3 disc(float2 d, float r, float shadow, float spin) {
  // Disc coordinates: a circle lying in the disc plane projects to an ellipse.
  float2 p = float2(d.x, d.y / max(COS_I, 0.05));
  float rd = length(p);
  float phi = atan(p.y, p.x);

  // Keplerian shear: omega falls off as r^-3/2, so the inner disc laps the outer
  // one and the pattern winds up tighter the closer in it sits.
  float wind = spin * pow(max(rd, shadow) / shadow, -1.5) * 7.0;
  float turb = 0.65 + 0.35 * sin(phi * 3.0 + wind + log(max(rd, 4.0)) * 2.2);

  // Nothing orbits inside the innermost stable circular orbit, so the disc has a
  // hole in it a little outside the shadow, is brightest right at that edge, and
  // thins out further from the hole.
  float inner = shadow * 1.10;
  float outer = shadow * 4.8;
  float body = smoothstep(inner, inner * 1.22, rd) * (1.0 - smoothstep(outer * 0.5, outer, rd));
  float temp = pow(clamp(inner / max(rd, 1.0), 0.0, 1.0), 0.75);

  // It is a disc, not a shell: thin off the plane it lies in.
  float thick = exp(-pow(abs(d.y) / max(shadow * 0.32, 1.0), 2.0));

  // Relativistic beaming, roughly (1 + beta cos phi)^3.
  float beam = pow(clamp(1.0 + BETA * cos(phi), 0.05, 2.2), 3.0);

  float3 col = hot(temp * turb) * body * thick * beam * 0.5;

  // Doppler shift on top of the beaming: the approaching side runs blue, the
  // receding side red.
  float shift = BETA * cos(phi);
  col *= float3(1.0 - 0.30 * shift, 1.0 - 0.04 * abs(shift), 1.0 + 0.45 * shift);

  // The far side of the disc, bent up and over the shadow. Without this a black
  // hole looks like a ring seen flat; with it you are looking at the underside of
  // the disc behind the hole.
  float arcR = shadow * 1.07;
  float arc = exp(-pow((r - arcR) / max(shadow * 0.11, 1.0), 2.0));
  // Stronger above the midline, where the far side is lifted into view.
  float above = smoothstep(0.25, -0.55, d.y / max(r, 1.0));
  col += hot(0.85) * arc * (0.35 + 0.95 * above) * 0.8;

  // Photon ring: light that orbited the hole before escaping, piled up in a thin
  // bright circle right at the shadow's edge.
  float ring = exp(-pow((r - shadow) / max(shadow * 0.032, 0.8), 2.0));
  col += float3(1.0, 0.88, 0.74) * ring * 1.5;

  return col;
}

half4 main(float2 xy) {
  float2 d = xy - origin;
  float r = length(d);
  float a = atan(d.y, d.x);
  float maxR = length(max(origin, resolution - origin));

  // A heartbeat on the singularity, quickening as the effect runs. Driven off
  // progress rather than a clock, so it stays identical every run and lines up
  // with the rest of the timeline.
  float beat = sin(progress * 58.0 + pow(progress, 2.0) * 22.0);
  float throb = beat * 0.5 + 0.5;

  if (progress < 0.5) {
    float t = progress / 0.5;
    float e = t * t;

    // The hole grows through the collapse. Shadow radius is what everything is
    // measured against; the horizon is that over 2.6.
    float shadow = max(pow(t, 2.6) * maxR * 1.35 * (1.0 + 0.05 * beat * t), 1.0);
    float rs = shadow / SHADOW_OVER_RS;
    float spin = pow(t, 1.2) * 5.0;

    // --- Gravitational lensing -------------------------------------------------
    // Weak-field deflection is alpha = 2 rs / b for a ray with impact parameter b,
    // so a ray reaching this pixel started further out than it appears. Sampling
    // the snapshot at that larger radius is what magnifies the background around
    // the hole and piles it up into a ring at the edge.
    float b = max(r, 1.0);
    float deflect = 2.0 * rs / b;
    float lensed = b * (1.0 + deflect + deflect * deflect * 0.35);
    // Frame dragging: nearer pixels are swept round faster, omega ~ r^-3/2.
    float drag = spin * pow(max(b, shadow) / max(shadow, 1.0), -1.5) * 1.6;

    // Spaghettification: radial smearing toward the hole on top of the bending.
    float stretch = pow(t, 2.4) * maxR * 0.10 * exp(-r / (maxR * 0.5));

    // Taps spread back along the path each pixel is travelling, averaged. One
    // sample per frame is a hard displacement; sampling the intermediate
    // positions is the motion blur between them.
    float4 col = float4(0.0);
    float weight = 0.0;
    for (int k = 0; k < ${MOTION_TAPS}; k++) {
      float f = float(k) / ${MOTION_TAPS - 1}.0;
      float w = 1.0 - 0.55 * f;
      float lag = 1.0 - 0.14 * f * pow(t, 0.8);
      float2 dir = swirl(d / b, drag * lag);
      col += float4(image.eval(origin + dir * (lensed * lag + stretch * lag))) * w;
      weight += w;
    }
    col /= weight;

    // --- The colour is drawn out of the frame and into the hole ----------------
    // Chroma is stripped from the inside out, and what is left settles onto the
    // ground of the theme arriving, so the frame pales toward the new light
    // rather than going grey and dying.
    float luma = dot(col.rgb, float3(0.299, 0.587, 0.114));
    float drain = clamp(pow(t, 0.85) * (0.3 + 1.7 * exp(-r / (maxR * 0.6))), 0.0, 1.0);
    float3 emptied = mix(col.rgb, float3(luma), drain);
    emptied = mix(emptied, incoming * (0.5 + 0.5 * luma), drain * 0.8);
    float given = clamp(length(col.rgb - emptied) * 1.6, 0.0, 1.0);
    col.rgb = emptied;

    // --- Gravitational redshift ------------------------------------------------
    // Light climbing out of the well loses energy: sqrt(1 - rs/r) both dims it and
    // pushes it red, and it goes to zero at the horizon.
    float grav = sqrt(clamp(1.0 - rs / max(r, rs * 1.001), 0.0, 1.0));
    col.rgb *= grav;
    col.rgb = mix(col.rgb, col.rgb * float3(1.35, 0.62, 0.42), (1.0 - grav) * 0.85);

    // --- Disc, photon ring, shadow --------------------------------------------
    col.rgb += disc(d, r, shadow, spin) * (0.35 + 0.9 * t);
    // Streaks of what the screen gave up, winding in.
    float arm = sin(a * 2.0 + log(max(r, 4.0)) * 5.0 - pow(t, 1.3) * 14.0);
    col.rgb += accent * smoothstep(0.35, 1.0, arm) * exp(-r / (maxR * 0.85)) * pow(t, 1.6) * (0.2 + 1.2 * given);

    // The shadow itself. Sharp-edged, because the capture radius is a hard cutoff.
    float inShadow = 1.0 - smoothstep(shadow * 0.97, shadow * 1.01, r);
    col.rgb = mix(col.rgb, float3(0.0), inShadow);

    if (outward > 0.5) {
      // Going to dark, the same hole is running the other way: what it has passed
      // over is already the arriving colour, so the screen fills rather than
      // empties, and the disc is thrown outward ahead of it.
      float lobes = 1.0 + 0.055 * sin(a * 6.0 + t * 3.0) + 0.03 * sin(a * 11.0 - t * 5.0);
      float grow = pow(t, 1.5) * maxR * 1.2 * lobes;
      float lip = clamp(maxR * 0.05, 10.0, 55.0);
      float covered = 1.0 - smoothstep(grow, grow + lip, r);
      float3 filled = mix(col.rgb, incoming, covered);
      // Chroma runs ahead of the edge, so the colour reads as soaking outward.
      float baseLuma = dot(col.rgb, float3(0.299, 0.587, 0.114));
      float ahead = exp(-((r - grow) * (r - grow)) / (lip * lip * 12.0)) * (1.0 - covered);
      filled += (col.rgb - float3(baseLuma)) * ahead * 1.4;
      filled += accent * ahead * 0.35;
      filled += accent * exp(-((r - grow) * (r - grow)) / (lip * lip)) * (0.5 + 1.0 * e) * (0.72 + 0.55 * throb);
      return half4(half3(filled), 1.0);
    }

    return half4(half3(col.rgb), 1.0);
  }

  float t = (progress - 0.5) / 0.5;

  if (outward < 0.5) {
    // Going to light: the hole evaporates. The shadow contracts, the disc follows
    // it down, and the new theme is uncovered from the edges in.
    float shrink = (1.0 - pow(t, 1.25)) * maxR * 1.2 * (1.0 + 0.05 * beat * (1.0 - t));
    float shadow = max(shrink * 0.34, 1.0);
    float lip = clamp(maxR * 0.05, 10.0, 55.0);
    float3 col = incoming;
    // The mouth, still open in the middle, with the last of the disc round it.
    float inShadow = 1.0 - smoothstep(shadow * 0.97, shadow * 1.01, r);
    col = mix(col, float3(0.0), inShadow);
    col += disc(d, r, shadow, 5.0 + t * 5.0) * (1.0 - t) * 0.9;
    float arm = sin(a * 2.0 + log(max(r, 4.0)) * 6.0 - t * 16.0);
    col += accent * smoothstep(0.4, 1.0, arm) * exp(-r / (maxR * 0.5)) * (1.0 - t) * 0.25;
    col += accent * exp(-((r - shrink) * (r - shrink)) / (lip * lip)) * (0.6 + 1.3 * t) * (0.72 + 0.55 * throb);
    float alpha = 1.0 - smoothstep(shrink - lip, shrink, r);
    return half4(half3(col * alpha), half(alpha));
  }

  // Going to dark: act one already filled the screen with the arriving colour, so
  // this picks up on that ground — the fronts keep travelling out and the live app
  // is uncovered behind them.
  float wave = pow(t, 1.15) * maxR * 1.6;
  float reveal = pow(max(t - 0.18, 0.0) / 0.82, 1.25) * maxR * 1.6;
  float band = 1.0 - smoothstep(wave - maxR * 0.16, wave, r);
  float3 col = incoming;
  float incomingLuma = dot(incoming, float3(0.299, 0.587, 0.114));
  col += accent * band * (0.1 + 0.35 * (1.0 - incomingLuma)) * (1.0 - t);
  float front = clamp(maxR * 0.035, 8.0, 40.0);
  col += accent * exp(-((r - wave) * (r - wave)) / (front * front)) * 1.2 * (1.0 - 0.4 * t) * (0.78 + 0.42 * throb);
  float echo = pow(max(t - 0.14, 0.0) / 0.86, 1.5) * maxR * 1.4;
  col += accent * exp(-((r - echo) * (r - echo)) / (front * front * 3.0)) * 0.55 * (1.0 - t);
  float shells = sin(log(max(r, 4.0)) * 9.0 - t * 10.0);
  col += accent * smoothstep(0.6, 1.0, shells) * band * 0.08 * (1.0 - t);
  // The disc recedes with the front, shrinking away as the new theme takes.
  float shadowOut = max((1.0 - t) * maxR * 0.25, 1.0);
  col += disc(d, r, shadowOut, 5.0 - t * 3.0) * pow(1.0 - t, 2.0) * 0.7;
  float alpha = smoothstep(reveal - maxR * 0.12, reveal, r);
  return half4(half3(col * alpha), half(alpha));
}
`);

if (!SOURCE) {
  console.error('[ThemeTransition] shader failed to compile — falling back to an instant switch');
}

const PARTICLE_COUNT = 240;
const GOLDEN_ANGLE = 2.399963229728653;

function fract(n: number) {
  return n - Math.floor(n);
}

// Deterministic, so the effect is identical every run and nothing has to be
// randomised (or allocated) per frame.
//
// Two tiers rather than one cloud: every third one is inner debris — starting
// closer in, smaller, and whipping round faster — so the core has its own fine
// grain instead of the whole field moving at one scale.
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const inner = i % 3 === 0;
  return {
    angle: (i * GOLDEN_ANGLE) % (Math.PI * 2),
    radius: inner
      ? 0.06 + 0.34 * fract(i * 0.6180339887)
      : 0.2 + 0.8 * fract(i * 0.6180339887),
    size: inner ? 1.1 + 1.5 * fract(i * 0.7548776662) : 2.2 + 3.0 * fract(i * 0.7548776662),
    spin: inner ? 1.6 + 2.6 * fract(i * 0.3247179572) : 0.8 + 1.8 * fract(i * 0.3247179572),
    lead: inner ? 0.5 * fract(i * 0.9146) : 0.3 * fract(i * 0.9146),
  };
});

/**
 * The field is drawn as three batched nodes rather than ninety components.
 *
 * One `Circle` per particle means one Skia node and three shared values each,
 * and at ninety particles that was 270 values recomputed per frame — measured as
 * the whole cost of the effect (the shader's own GPU time is 4-7ms). `Points`
 * draws a whole bucket in one node, so the count can go up without the CPU
 * noticing. The price is that size and opacity are per bucket, not per particle,
 * which is why the buckets are cut by size: the stagger the eye actually reads
 * is in the positions, and those are still per particle.
 */
const PARTICLE_BUCKETS = [0, 1, 2].map((bucket) => {
  const seeds = PARTICLES.filter((_, i) => i % 3 === bucket);
  return {
    seeds,
    size: seeds.reduce((sum, seed) => sum + seed.size, 0) / Math.max(seeds.length, 1),
  };
});

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
  const { incoming, accent, outward, onPeak, onDone } = job;
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
        // Recoil, blast, settle. Decelerating out: the new theme is thrown back
        // off the singularity, then the last of it drifts to a stop rather than
        // the timeline simply ending.
        progress.value = withSequence(
          withTiming(PEAK + 0.02, { duration: RECOIL_MS, easing: Easing.in(Easing.quad) }),
          withTiming(0.94, { duration: RELEASE_MS, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: SETTLE_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
            if (finished) runOnJS(onDone)();
          })
        );
      });
    }

    progress.value = 0;
    // A breath inward, then accelerating in: the screen falls into the singularity.
    progress.value = withSequence(
      withTiming(ANTICIPATE, { duration: ANTICIPATE_MS, easing: Easing.out(Easing.quad) }),
      withTiming(PEAK, { duration: COLLAPSE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(handlePeak)();
      })
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
    outward: outward ? 1 : 0,
  }));

  /** The same heartbeat the shader runs on, so the core and the rim throb together. */
  const beat = useDerivedValue(
    () => Math.sin(progress.value * 58 + progress.value * progress.value * 22)
  );

  const coreRadius = useDerivedValue(() => {
    const p = progress.value;
    const t = p < PEAK ? p / PEAK : Math.max(1 - (p - PEAK) / 0.35, 0);
    return (4 + 95 * t * t) * (1 + 0.13 * beat.value * t);
  });

  // A white-hot center inside the orange halo — without it the singularity reads
  // as a flat orange disc rather than something too bright to look at.
  const hotRadius = useDerivedValue(() => {
    const p = progress.value;
    const t = p < PEAK ? p / PEAK : Math.max(1 - (p - PEAK) / 0.3, 0);
    // Counter-beat: the white core swells as the halo dips, so the two do not
    // simply scale together and the center reads as pumping.
    return (2 + 30 * t * t * t) * (1 - 0.16 * beat.value * t);
  });

  const coreOpacity = useDerivedValue(() => {
    const p = progress.value;
    const base = p < PEAK ? 0.35 + 0.65 * (p / PEAK) : Math.max(1 - (p - PEAK) / 0.3, 0);
    return Math.min(Math.max(base * (0.82 + 0.24 * (beat.value * 0.5 + 0.5)), 0), 1);
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
          {PARTICLE_BUCKETS.map((bucket, i) => (
            <ParticleField
              key={i}
              seeds={bucket.seeds}
              size={bucket.size}
              origin={origin}
              maxR={maxR}
              progress={progress}
              outward={outward}
              color={job.accentHex}
            />
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

interface Seed {
  angle: number;
  radius: number;
  size: number;
  spin: number;
  lead: number;
}

function ParticleField({
  seeds,
  size,
  origin,
  maxR,
  progress,
  outward,
  color,
}: {
  seeds: Seed[];
  size: number;
  origin: { x: number; y: number };
  maxR: number;
  progress: SharedValue<number>;
  outward: boolean;
  color: string;
}) {
  // Positions for the whole bucket, recomputed on the UI thread once per frame.
  //
  // One continuous sweep across both acts rather than in-then-out, so the field
  // agrees with the direction the rest of the effect is travelling: falling in
  // the whole way to light, thrown out the whole way to dark.
  const points = useDerivedValue(() => {
    const p = progress.value;
    const falling = !outward;
    const out: { x: number; y: number }[] = [];
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      // Staggered starts, so they travel as a stream instead of one ring.
      const t = Math.min(Math.max((p - seed.lead) / (1 - seed.lead), 0), 1);
      const eased = falling ? t * t : 1 - Math.pow(1 - t, 2.2);
      const radius = seed.radius * maxR * (falling ? 1 - eased : eased * 1.15);
      // Angular speed rises as the radius falls, so they whip around the core.
      const boost = (maxR * 0.28) / (radius + maxR * 0.05);
      const angle = seed.angle + (falling ? 1 : -0.55) * seed.spin * eased * boost * 1.2;
      out.push({
        x: origin.x + Math.cos(angle) * radius,
        y: origin.y + Math.sin(angle) * radius,
      });
    }
    return out;
  });

  // Snaps in, holds through the middle, gone before the overlay lifts.
  const opacity = useDerivedValue(() => {
    const p = progress.value;
    const fadeOut = 1 - Math.min(Math.max((p - 0.72) / 0.28, 0), 1);
    return Math.min(p * 7, 1) * fadeOut;
  });

  return (
    <Points
      points={points}
      mode="points"
      color={color}
      style="stroke"
      strokeWidth={size * 2}
      strokeCap="round"
      opacity={opacity}
    />
  );
}
