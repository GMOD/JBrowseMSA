HTMLWidgets.widget({
  name: 'msaview',
  type: 'output',

  factory: function (el, width, height) {
    var viewer = null

    // input$<id>_click and input$<id>_viewport; hover stays in the page, since
    // a Shiny input per pointer move floods the websocket
    function sendToShiny(name) {
      return function (value) {
        if (HTMLWidgets.shinyMode && el.id) {
          Shiny.setInputValue(
            el.id + '_' + name,
            value === undefined ? null : value,
          )
        }
      }
    }

    return {
      renderValue: function (x) {
        var RMV = window.ReactMSAView
        if (!RMV) {
          el.innerText = 'react-msaview bundle not loaded'
          return
        }
        var props = Object.assign({ height: height }, x.props, {
          onCellClick: sendToShiny('click'),
          onViewportChange: sendToShiny('viewport'),
        })
        // a Shiny re-render with the same alignment keeps the model, and the
        // reader's scroll and zoom with it
        if (viewer) {
          viewer.update(props)
        } else {
          viewer = RMV.mount(el, props)
        }
      },

      resize: function (newWidth, newHeight) {
        height = newHeight
        if (viewer && newHeight) {
          viewer.update({ height: newHeight })
        }
      },
    }
  },
})
