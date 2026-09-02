type LogoProps = {
  size?: number;
};

/** CHAMA app mark. The PNG already carries its own rounded-square shape with transparent corners. */
export function Logo({ size = 28 }: LogoProps) {
  return <img src="/logo.png" alt="CHAMA" width={size} height={size} />;
}
