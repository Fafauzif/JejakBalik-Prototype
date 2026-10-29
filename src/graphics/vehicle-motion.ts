/** A complete loop, so background traffic never teleports across the city. */
export function getAmbientTrafficPose(elapsedSeconds: number) {
  const perimeter = 2 * (105 + 75);
  const along = (((elapsedSeconds * 2 + 17) % perimeter) + perimeter) % perimeter;
  if (along < 105) return { x: -57 + along, z: -34, heading: Math.PI / 2 };
  if (along < 180) return { x: 48, z: -34 + along - 105, heading: 0 };
  if (along < 285) return { x: 48 - (along - 180), z: 41, heading: -Math.PI / 2 };
  return { x: -57, z: 41 - (along - 285), heading: Math.PI };
}
