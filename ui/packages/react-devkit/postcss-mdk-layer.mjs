/**
 * postcss-mdk-layer
 *
 * Wraps every top-level rule that isn't already inside an `@layer` at-rule
 * into a single trailing `@layer mdk` block, and prepends a layer order
 * declaration `@layer base, mdk, app;` so consumers can override our styles
 * from their own `app` (or unlayered) styles without specificity wars.
 *
 * Rules already inside `@layer base { ... }` (the design tokens / reset
 * defined in `_base.scss` and `_colors.scss`) are left untouched.
 */

const PLUGIN_NAME = 'postcss-mdk-layer'

const isAtLayer = (node) => node.type === 'atrule' && node.name === 'layer'

const isCharset = (node) => node.type === 'atrule' && node.name === 'charset'

const plugin = () => ({
  postcssPlugin: PLUGIN_NAME,
  Once(root, { AtRule }) {
    const charsetNodes = []
    const layerNodes = []
    const layeredNodes = []

    root.each((node) => {
      if (isCharset(node)) {
        charsetNodes.push(node)
        return
      }
      if (isAtLayer(node)) {
        layerNodes.push(node)
        return
      }
      layeredNodes.push(node)
    })

    const orderDeclaration = new AtRule({ name: 'layer', params: 'base, mdk, app' })

    if (layeredNodes.length === 0) {
      root.removeAll()
      charsetNodes.forEach((n) => root.append(n))
      root.append(orderDeclaration)
      layerNodes.forEach((n) => root.append(n))
      return
    }

    const mdkLayer = new AtRule({ name: 'layer', params: 'mdk' })
    layeredNodes.forEach((node) => {
      node.remove()
      mdkLayer.append(node)
    })

    root.removeAll()
    charsetNodes.forEach((n) => root.append(n))
    root.append(orderDeclaration)
    layerNodes.forEach((n) => root.append(n))
    root.append(mdkLayer)
  },
})

plugin.postcss = true

export default plugin
