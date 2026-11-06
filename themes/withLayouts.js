export default function withLayouts(mod) {
  const layouts =
    mod.default && typeof mod.default === 'object' ? mod.default : mod
  return function ThemeLayout({
    layoutName = 'LayoutBase',
    children,
    ...props
  }) {
    const Layout =
      layouts[layoutName] ||
      (layoutName === 'LayoutBase' && typeof mod.default === 'function'
        ? mod.default
        : layouts.LayoutSlug)
    return Layout ? <Layout {...props}>{children}</Layout> : <>{children}</>
  }
}
