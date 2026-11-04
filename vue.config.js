const path = require('path')

function resolve(dir) {
  return path.join(__dirname, dir)
}
module.exports = {
  publicPath: './',
  assetsDir: './',
  productionSourceMap: false,
  chainWebpack: config => {
    config.resolve.alias
      .set('@', resolve('src'))
      .set('tim', resolve('src/sdk/tim.js'))
    // 删除预加载
    // config.plugins.delete('preload')
    // config.plugins.delete('prefetch')
    // 压缩代码
    config.optimization.minimize(true)
    // 分割代码
    config.optimization.splitChunks({
        chunks: 'all'
    })
    // cdn
    config.externals({
      vue: 'Vue',
      'element-ui': 'ELEMENT',
      sortablejs: 'Sortable',
      'js-cookie': 'Cookies',
      'vue-clipboard2': 'VueClipboard',
      vuex: 'Vuex',
      xlsx: 'XLSX',
      // for rpg-dice-roller
      mathjs: 'math',
      'random-js': 'Random' // babel 会处理出一堆很大的加密方法，其实不用处理
    })
    config.plugin('html').tap((args) => {
      // 依赖改为随项目一起发布（public/vendor），不再依赖 cdnjs：
      // GitHub Pages 在国内访问 cdnjs 经常超时，会导致整页白屏
      args[0].cdns = `
        <script src="./vendor/vue.runtime.min.js"></script>
        <script src="./vendor/element-ui.index.js"></script>
        <link href="./vendor/element-ui.index.css" rel="stylesheet">
        <script src="./vendor/vuex.min.js"></script>
        <script src="./vendor/js.cookie.min.js"></script>
        <script src="./vendor/Sortable.min.js"></script>
        <script src="./vendor/vue-clipboard.min.js"></script>
      `
      return args
    })
  },
  css: {
    extract: true,
    sourceMap: false,
    loaderOptions: {
      stylus: {
        'resolve url': true,
        // 自定义主题场景
        import: [path.resolve(__dirname, './src/assets/css/base.styl')]
      }
    }
  }
}
