HTMLWidgets.widget({
  name: 'msaview',
  type: 'output',

  factory: function (el, width, height) {
    var root = null
    var model = null

    return {
      renderValue: function (x) {
        var RMV = window.ReactMSAView
        if (!RMV) {
          el.innerText = 'react-msaview bundle not loaded'
          return
        }

        var React = RMV.React
        var createRoot = RMV.createRoot
        var MSAView = RMV.MSAView
        var MSAModelF = RMV.MSAModelF

        var config = x.config
        if (height && !config.height) {
          config.height = height
        }

        model = MSAModelF().create(config)
        model.setWidth(width)

        if (!root) {
          root = createRoot(el)
        }

        root.render(React.createElement(MSAView, { model: model }))
      },

      resize: function (newWidth, newHeight) {
        if (model) {
          model.setWidth(newWidth)
          if (newHeight) {
            model.setHeight(newHeight)
          }
        }
      },
    }
  },
})
