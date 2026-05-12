/**
 * Avaniko logo — static, no animation.
 *
 * Props:
 *   size      — pixel size (default 32)
 *   className — extra classes on wrapper
 */
export default function AvanikoLogo({ size = 32, className = '' }) {
  return (
    <div
      className={`relative shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/avaniko-logo.png"
        alt="Avaniko"
        draggable={false}
        className="select-none w-full h-full object-contain block"
      />
    </div>
  )
}
