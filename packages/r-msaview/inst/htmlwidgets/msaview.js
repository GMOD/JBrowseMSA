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

        var config = x.config
        if (height && !config.height) {
          config.height = height
        }

        // a Shiny re-render replaces the model; destroying the old one runs
        // the disposers its autoruns registered, which nothing else would
        if (model && RMV.destroy) {
          RMV.destroy(model)
        }
        model = RMV.MSAModelF().create(config)
        model.setWidth(width)

        if (!root) {
          root = RMV.createRoot(el)
        }
        root.render(RMV.React.createElement(RMV.MSAView, { model: model }))
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
