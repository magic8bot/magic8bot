import { terminal } from 'terminal-kit'

export const progressBar = (options) => {
  if (!options || typeof options !== 'object') {
    options = {}
  }

  var progress,
    ready = false,
    pause = false,
    maxItems,
    itemsDone = 0,
    itemsStarted = [],
    itemFiller,
    title,
    titleFiller,
    width,
    y,
    startX,
    endX,
    oldWidth,
    wheel,
    wheelCounter = 0,
    itemRollCounter = 0,
    progressUpdateCount = 0,
    lastUpdateTime,
    lastRedrawTime,
    startingTime,
    redrawTimer,
    etaStartingTime,
    etaFiller

  const dst = options.dst

  etaStartingTime = startingTime = new Date().getTime()

  wheel = ['|', '/', '-', '\\']

  options.syncMode = !!options.syncMode

  width = options.width || dst.width - 1

  if (!options.barBracketStyle) {
    if (options.barStyle) {
      options.barBracketStyle = options.barStyle
    } else {
      options.barBracketStyle = (str) => dst.put({ attr: { color: 'blue' } }, str)
    }
  }

  if (!options.barStyle) {
    options.barStyle = (str) => dst.put({ attr: { color: 'cyan' } }, str)
  }
  if (!options.percentStyle) {
    options.percentStyle = (str) => dst.put({ attr: { color: 'yellow' } }, str)
  }
  if (!options.etaStyle) {
    options.etaStyle = (str) => dst.put({ attr: { color: 'white', bold: true } }, str)
  }
  if (!options.itemStyle) {
    options.itemStyle = (str) => dst.put({ attr: { color: 'dim' } }, str)
  }
  if (!options.titleStyle) {
    options.titleStyle = (str) => dst.put({ attr: { color: 'white', bold: true } }, str)
  }

  if (!options.barChar) {
    options.barChar = '='
  } else {
    options.barChar = options.barChar[0]
  }

  if (!options.barHeadChar) {
    options.barHeadChar = '>'
  } else {
    options.barHeadChar = options.barHeadChar[0]
  }

  if (typeof options.maxRefreshTime !== 'number') {
    options.maxRefreshTime = 500
  }
  if (typeof options.minRefreshTime !== 'number') {
    options.minRefreshTime = 100
  }

  if (typeof options.items === 'number') {
    maxItems = options.items
  }
  if (maxItems && typeof options.itemSize !== 'number') {
    options.itemSize = Math.round(width / 3)
  }

  itemFiller = ' '.repeat(options.itemSize)

  if (options.title && typeof options.title === 'string') {
    title = options.title

    if (typeof options.titleSize !== 'number') {
      options.titleSize = Math.round(Math.min(options.title.length + 1, width / 3))
    }
  }

  titleFiller = ' '.repeat(options.titleSize)

  etaFiller = '           ' // 11 chars

  // This is a naive ETA for instance...
  var etaString = (updated) => {
    var eta = '',
      elapsedEtaTime,
      remainingTime,
      averageUpdateDelay,
      averageUpdateProgress,
      lastUpdateElapsedTime,
      fakeProgress

    if (progress >= 1) {
      eta = ' done'
    } else if (progress > 0) {
      elapsedEtaTime = new Date().getTime() - etaStartingTime

      if (!updated && progressUpdateCount > 1) {
        lastUpdateElapsedTime = new Date().getTime() - lastUpdateTime
        averageUpdateDelay = elapsedEtaTime / progressUpdateCount
        averageUpdateProgress = progress / progressUpdateCount

        //console.log( '\n' , elapsedEtaTime , lastUpdateElapsedTime , averageUpdateDelay , averageUpdateProgress , '\n' ) ;

        // Do not update ETA if it's not an update, except if update time is too long
        if (lastUpdateElapsedTime < averageUpdateDelay) {
          fakeProgress = progress + (averageUpdateProgress * lastUpdateElapsedTime) / averageUpdateDelay
        } else {
          fakeProgress = progress + averageUpdateProgress
        }

        if (fakeProgress > 0.99) {
          fakeProgress = 0.99
        }
      } else {
        fakeProgress = progress
      }

      remainingTime = (elapsedEtaTime * ((1 - fakeProgress) / fakeProgress)) / 1000

      eta = ' in '

      if (remainingTime < 10) {
        eta += Math.round(remainingTime * 10) / 10 + 's'
      } else if (remainingTime < 120) {
        eta += Math.round(remainingTime) + 's'
      } else if (remainingTime < 7200) {
        eta += Math.round(remainingTime / 60) + 'min'
      } else if (remainingTime < 172800) {
        eta += Math.round(remainingTime / 3600) + 'hours'
      } else if (remainingTime < 31536000) {
        eta += Math.round(remainingTime / 86400) + 'days'
      } else {
        eta = 'few years'
      }
    } else {
      etaStartingTime = new Date().getTime()
    }

    eta = (eta + etaFiller).slice(0, etaFiller.length)

    return eta
  }

  var redraw = (updated?) => {
    var time,
      itemIndex,
      itemName = itemFiller,
      titleName = titleFiller,
      innerBarSize,
      progressSize,
      voidSize,
      progressBar = '',
      voidBar = '',
      percent = '',
      eta = ''

    if (!ready || pause) {
      return
    }

    time = new Date().getTime()

    // If progress is >= 1, then it's finished, so we should redraw NOW (before the program eventually quit)
    if ((!progress || progress < 1) && lastRedrawTime && time < lastRedrawTime + options.minRefreshTime) {
      if (!options.syncMode) {
        if (redrawTimer) {
          clearTimeout(redrawTimer)
        }
        redrawTimer = setTimeout(redraw.bind(terminal, updated), lastRedrawTime + options.minRefreshTime - time)
      }
      return
    }

    // If 'y' is null, we are in the blind mode, we haven't get the cursor location
    if (y === null) {
      dst.column(startX)
    } else {
      dst.moveTo(startX, y)
    }

    //dst.noFormat( Math.floor( progress * 100 ) + '%' ) ;

    innerBarSize = width - 2

    if (options.percent) {
      innerBarSize -= 4
      percent = ('   ' + Math.round((progress || 0) * 100) + '%').slice(-4)
    }

    if (options.eta) {
      eta = etaString(updated)
      innerBarSize -= eta.length
    }

    innerBarSize -= options.itemSize || 0
    if (maxItems) {
      if (!itemsStarted.length) {
        itemName = ''
      } else if (itemsStarted.length === 1) {
        itemName = ' ' + itemsStarted[0]
      } else {
        itemIndex = itemRollCounter++ % itemsStarted.length
        itemName = ' [' + (itemIndex + 1) + '/' + itemsStarted.length + '] ' + itemsStarted[itemIndex]
      }

      if (itemName.length > itemFiller.length) {
        itemName = itemName.slice(0, itemFiller.length - 1) + '…'
      } else if (itemName.length < itemFiller.length) {
        itemName = (itemName + itemFiller).slice(0, itemFiller.length)
      }
    }

    innerBarSize -= options.titleSize || 0
    if (title) {
      titleName = title

      if (titleName.length >= titleFiller.length) {
        titleName = titleName.slice(0, titleFiller.length - 2) + '… '
      } else {
        titleName = (titleName + titleFiller).slice(0, titleFiller.length)
      }
    }

    progressSize = progress === undefined ? 1 : Math.round(innerBarSize * Math.max(Math.min(progress, 1), 0))
    voidSize = innerBarSize - progressSize

    /*
		console.log( "Size:" , width ,
			voidSize , innerBarSize , progressSize , eta.length , title.length , itemName.length ,
			voidSize + progressSize + eta.length + title.length + itemName.length
		) ;
		//*/

    if (progressSize) {
      if (progress === undefined) {
        progressBar = wheel[++wheelCounter % wheel.length]
      } else {
        progressBar += options.barChar.repeat(progressSize - 1)
        progressBar += options.barHeadChar
      }
    }

    voidBar += ' '.repeat(voidSize)

    options.titleStyle(titleName)

    if (percent) {
      options.percentStyle(percent)
    }

    if (progress === undefined) {
      dst.put({}, ' ')
    } else {
      options.barBracketStyle('[')
    }

    options.barStyle(progressBar)
    dst.put({}, voidBar)

    if (progress === undefined) {
      dst.put({}, ' ')
    } else {
      options.barBracketStyle(']')
    }

    options.etaStyle(eta)

    options.itemStyle(itemName)

    if (!options.syncMode) {
      if (redrawTimer) {
        clearTimeout(redrawTimer)
      }
      if (!progress || progress < 1) {
        redrawTimer = setTimeout(redraw, options.maxRefreshTime)
      }
    }

    lastRedrawTime = time
  }

  if (options.syncMode || options.inline) {
    oldWidth = width

    startX = 1
    endX = Math.min(1 + width, dst.width)
    y = null
    width = endX - startX

    if (width !== oldWidth) {
      // Should resize all part here
      if (options.titleSize) {
        options.titleSize = Math.floor((options.titleSize * width) / oldWidth)
      }
      if (options.itemSize) {
        options.itemSize = Math.floor((options.itemSize * width) / oldWidth)
      }
    }

    ready = true
    redraw()
  } else {
    // Get the cursor location before getting started

    terminal.getCursorLocation((error, x_, y_) => {
      var oldWidth_ = width

      startX = x_
      endX = Math.min(x_ + width, dst.width)
      y = y_
      width = endX - startX

      if (width !== oldWidth_) {
        // Should resize all part here
        if (options.titleSize) {
          options.titleSize = Math.floor((options.titleSize * width) / oldWidth_)
        }
        if (options.itemSize) {
          options.itemSize = Math.floor((options.itemSize * width) / oldWidth_)
        }
      }

      ready = true
      redraw()
    })
  }

  const controller: Record<string, any> = {}

  controller.startItem = (name) => {
    itemsStarted.push(name)

    // No need to redraw NOW if there are other items running.
    // Let the timer do the job.
    if (itemsStarted.length === 1) {
      // If progress is >= 1, then it's finished, so we should redraw NOW (before the program eventually quit)
      if (progress >= 1) {
        redraw()
        return
      }

      if (options.syncMode) {
        redraw()
      } else {
        // Using a setTimeout with a 0ms time and redrawTimer clearing has a nice effect:
        // if multiple synchronous update are performed, redraw will be called once
        if (redrawTimer) {
          clearTimeout(redrawTimer)
        }
        redrawTimer = setTimeout(redraw, 0)
      }
    }
  }

  controller.itemDone = (name) => {
    var index

    itemsDone++

    if (maxItems) {
      progress = itemsDone / maxItems
    } else {
      progress = undefined
    }

    lastUpdateTime = new Date().getTime()
    progressUpdateCount++

    index = itemsStarted.indexOf(name)
    if (index >= 0) {
      itemsStarted.splice(index, 1)
    }

    // If progress is >= 1, then it's finished, so we should redraw NOW (before the program eventually quit)
    if (progress >= 1) {
      redraw(true)
      return
    }

    if (options.syncMode) {
      redraw()
    } else {
      // Using a setTimeout with a 0ms time and redrawTimer clearing has a nice effect:
      // if multiple synchronous update are performed, redraw will be called once
      if (redrawTimer) {
        clearTimeout(redrawTimer)
      }
      redrawTimer = setTimeout(redraw.bind(terminal, true), 0)
    }
  }

  controller.update = (toUpdate) => {
    if (!toUpdate) {
      toUpdate = {}
    } else if (typeof toUpdate === 'number') {
      toUpdate = { progress: toUpdate }
    }

    if ('progress' in toUpdate) {
      if (typeof toUpdate.progress !== 'number') {
        progress = undefined
      } else {
        // Not sure if it is a good thing to let the user set progress to a value that is lesser than the current one
        progress = toUpdate.progress

        if (progress > 1) {
          progress = 1
        } else if (progress < 0) {
          progress = 0
        }

        if (progress > 0) {
          progressUpdateCount++
        }

        lastUpdateTime = new Date().getTime()
      }
    }

    if (typeof toUpdate.items === 'number') {
      maxItems = toUpdate.items
      if (maxItems) {
        progress = itemsDone / maxItems
      }

      if (typeof options.itemSize !== 'number') {
        options.itemSize = Math.round(width / 3)
        itemFiller = ' '.repeat(options.itemSize)
      }
    }

    if (typeof toUpdate.title === 'string') {
      title = toUpdate.title

      if (typeof options.titleSize !== 'number') {
        options.titleSize = Math.round(width / 3)
        titleFiller = ' '.repeat(options.titleSize)
      }
    }

    // If progress is >= 1, then it's finished, so we should redraw NOW (before the program eventually quit)
    if (progress >= 1) {
      redraw(true)
      return
    }

    if (options.syncMode) {
      redraw()
    } else {
      // Using a setTimeout with a 0ms time and redrawTimer clearing has a nice effect:
      // if multiple synchronous update are performed, redraw will be called once
      if (redrawTimer) {
        clearTimeout(redrawTimer)
      }
      redrawTimer = setTimeout(redraw.bind(terminal, true), 0)
    }
  }

  controller.pause = controller.stop = () => {
    pause = true
  }

  controller.resume = () => {
    if (pause) {
      pause = false
      redraw()
    }
  }

  return controller
}
