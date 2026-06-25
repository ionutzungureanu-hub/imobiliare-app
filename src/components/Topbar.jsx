export default function Topbar({ title, subtitle, children }) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-right">{children}</div>
    </div>
  )
}
