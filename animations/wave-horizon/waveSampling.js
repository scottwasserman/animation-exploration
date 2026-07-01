function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function irregularWave(t, coord, speed, freq, phase) {
  const w1 = Math.sin(coord * freq - t * speed + phase);
  const w2 = Math.sin(coord * freq * 1.73 + t * speed * 0.67 + phase * 1.4) * 0.55;
  const w3 = Math.sin(coord * freq * 0.41 - t * speed * 1.35 + phase * 2.1) * 0.3;
  return w1 + w2 + w3;
}

function organicMask(dist, falloff) {
  return smoothstep(falloff, -2, dist);
}

function horizonSurge(t, x, z, crashX, crashZ) {
  const SURGE_PERIOD = 16;
  const SURGE_TRAVEL = 11;

  const cycleT = t % SURGE_PERIOD;
  if (cycleT > SURGE_TRAVEL) {
    return { wall: 0, impact: 0 };
  }

  const progress = cycleT / SURGE_TRAVEL;
  const front = -44 + (10 - -44) * progress ** 0.85;
  const behindFront = front - z;
  const xRipple = Math.sin(x * 0.22 + t * 0.35) * 0.35;
  const swell = Math.exp(-(((behindFront + xRipple) / 7) ** 2));
  const crest = Math.exp(-(((behindFront + xRipple) / 2.4) ** 2)) * 1.4;
  const wall = (swell * 2.2 + crest) * smoothstep(14, -2, behindFront);

  const crashDist = Math.hypot(x - crashX, z - crashZ);
  const frontNearCrash = Math.exp(-(((front - crashZ) / 4) ** 2));
  const impact = frontNearCrash * Math.exp(-crashDist * 0.12) * wall * 3.5;

  return { wall, impact };
}

export function sampleWaveHeight(t, x, z, crashX, crashZ) {
  const left = irregularWave(t, x - crashX, 2.1, 0.62, z * 0.11);
  const right = irregularWave(t, crashX - x, 2.35, 0.58, z * 0.13 + 1.7);
  const front = irregularWave(t, z - crashZ, 1.85, 0.55, x * 0.09);
  const back = irregularWave(t, crashZ - z, 2.05, 0.6, x * 0.12 + 2.3);

  const xDist = x - crashX;
  const zDist = z - crashZ;

  const leftMask = organicMask(-xDist, 13);
  const rightMask = organicMask(xDist, 13);
  const frontMask = organicMask(zDist, 13);
  const backMask = organicMask(-zDist, 13);

  const amp = 0.7;
  const lateralCrash = Math.max(0, left) * Math.max(0, right);
  const depthCrash = Math.max(0, front) * Math.max(0, back);
  const centerSurge = lateralCrash * amp + depthCrash * amp * 0.85 + lateralCrash * depthCrash * 1.8;

  const { wall, impact } = horizonSurge(t, x, z, crashX, crashZ);

  return (
    left * leftMask * amp * 0.5 +
    right * rightMask * amp * 0.5 +
    front * frontMask * amp * 0.42 +
    back * backMask * amp * 0.42 +
    centerSurge +
    wall +
    impact
  );
}

export class PeakDetector {
  constructor() {
    this.prevHeight = 0;
    this.prevVelocity = 0;
    this.prevImpact = 0;
    this.cooldown = 0;
  }

  update(t, crashX, crashZ, dt, onPeak) {
    const height = sampleWaveHeight(t, crashX, crashZ, crashX, crashZ);
    const velocity = (height - this.prevHeight) / Math.max(dt, 0.001);
    const { impact } = horizonSurge(t, crashX, crashZ, crashX, crashZ);

    this.cooldown -= dt;

    const crestPeak =
      this.prevVelocity > 0.04 &&
      velocity <= 0 &&
      height > 0.45 &&
      this.cooldown <= 0;

    const surgePeak =
      impact > 0.6 &&
      impact >= this.prevImpact &&
      this.prevImpact < impact * 0.92 &&
      this.cooldown <= 0;

    if (crestPeak || surgePeak) {
      const intensity = Math.min(1, surgePeak ? impact / 2.8 : height / 2.2);
      onPeak(intensity, surgePeak);
      this.cooldown = surgePeak ? 0.35 : 1.1;
    }

    this.prevHeight = height;
    this.prevVelocity = velocity;
    this.prevImpact = impact;
  }
}
