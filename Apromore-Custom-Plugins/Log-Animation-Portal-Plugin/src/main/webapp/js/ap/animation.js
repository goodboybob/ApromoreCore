/*
 * This file is part of "Apromore".
 *
 * Copyright (C) 2017 Queensland University of Technology.
 * Copyright (C) 2019 - 2020 The University of Melbourne.
 *
 * "Apromore" is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 3 of the
 * License, or (at your option) any later version.
 *
 * "Apromore" is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty
 * of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program.
 * If not, see <http://www.gnu.org/licenses/lgpl-3.0.html>.
 */
/**
 * Browser compatibility notes
 *
 * Chrome:
 * - Does not support reference variable to point DOM elements, must use selectors (getElementsBy)
 *   otherwise the innerHTML and element attributes are not updated
 * - svg.setCurrentTime is not processed properly, must call svg to reload via innerHTML
 *
 * Dependencies:
 * utils.js (for Clazz)
 *
 * The animation page has four animation components:
 *
 * 1. The process model with tokens moving along the nodes and edges
 * 2. The timeline bar with a tick moving along
 * 3. The circular progress bar showing the completion percentage for the log
 * 4. The digital clock running and showing the passing time
 *
 * These four components belong to four separate SVG document (<svg> tags).
 * Each SVG document has an internal SVG engine time
 *
 * The process model has nodes and edges which are SVG shapes. The animation shows tokens moving along these shapes.
 * Each token (or marker) belongs to a case in the log. A case is kept track in a LogCase object.
 * Each LogCase has multiple markers created and animated along certain nodes and edges
 * on the model in a continuous manner. Each marker is an SVG animateMotion element with a path attribute pointing
 * to the node or edge it has to move along. Two key attributes for animations are begin and dur (duration),
 * respectively when it begins and for how long. These attribute values are based on the time of the containing SVG document.
 *
 * The timeline bar has a number of equal slots configured in the configuration file, e.g. TimelineSlots = 120.
 * Each slot represents a duration of time in the event log, called SlotDataUnit, i.e. how many seconds per slot
 * Each slot also represents a duration of time in the animation engine, called SlotEngineUnit
 * For example, if the log spans a long period of time, SlotDataUnit will have a large value.
 * SlotEngineUnit is used to calculate the speed of the tick movement on the timeline bar
 * SlotDataUnit is used to calculate the location of a specific event date on the timeline bar
 * timeCoefficient: the ratio of SlotDataUnit to SlotEngineUnit, i.e. 1 second in the engine = how many seconds in the data.
 * The starting point of time in all logs is set in json data sent from the server: startDateMillis.
 *
 * The digital clock must keep running to show the clock jumping. It is governed by a timer property of
 * the controller. This timer is set to execute a function every interval of 100ms.
 * Starting from 0, it counts 100, 200, 300,...ms.
 * Call getCurrentTime() to the SVG document returns the current clock intervals = 100x (x = count)
 * The actual current time is: getCurrentTime()*timeCoefficient + startDateMillis.
 */

/**
 * Animation controller
 *
 * ID of the timer used by the digital clock on the replay control panel
 * The timer is set whenever the replay is started or restarted, and cleared whenevenr it is paused.
 * The synchronization between the digital clock and internal timer of SVG documents is done vie this timer
 * because the timer will read the internal time of every SVG documents at every internal instant
 *
 */
'use strict'

let AnimationController = {

  construct: function (canvas) {

    this.jsonModel = null // Parsed objects of the process model
    this.jsonServer = null // Parsed objects returned from the server
    this.timeline = null
    this.tracedates = null
    this.logs = null
    this.logNum = 0

    this.canvas = canvas // the editor canvas
    this.svgDocument = null // initialized in Controller.reset
    this.svgViewport = null // initialized in Controller.reset
    this.svgDocuments = []

    this.clockTimer = null
    this.timelineSVG = undefined
    this.timelineSlots = 120
    this.timelineEngineSeconds = 120
    this.timelineTick = undefined // keep track of the timeline tick for dragging action
    this.startDateMillis = 0

    this.slotDataUnit = 1000
    this.caseLabelsVisible = false

    this.PLAY_CLS = 'ap-mc-icon-play'
    this.PAUSE_CLS = 'ap-mc-icon-pause'
    this.apPalette = ['#84c7e3', '#bb3a50', '#3ac16d', '#f96100', '#FBA525']
    this.timelineOffset = 5
  },

  pauseAnimations: function () {
    this.svgDocuments.forEach(function (svgDoc) {
      svgDoc.pauseAnimations()
    })

    if (this.clockTimer) {
      clearInterval(this.clockTimer)
    }
  },

  /*
   * Only this method creates a timer.
   *
   * This timer is used to update the digital clock.
   * The mechanism is the digital clock reads SVG document current time every 100ms via updateClock() method.
   * This is pulling way.
   * In case of updating the clock once, it is safer to call updateClockOnce() method than updateClock(),
   * to avoid endless loop.
   */
  unpauseAnimations: function () {
    let me = this

    this.svgDocuments.forEach(function (svgDoc) {
      svgDoc.unpauseAnimations()
    })

    if (this.clockTimer) {
      clearInterval(this.clockTimer)
    }

    this.clockTimer = setInterval(function () {
      me.updateClock()
    }, 100)
  },

  reset: function (jsonRaw) {
    this.jsonServer = JSON.parse(jsonRaw)
    let { logs, timeline, tracedates } = this.jsonServer
    this.logs = logs
    this.logNum = logs.length
    this.timeline = timeline
    this.tracedates = tracedates

    this.svgDocument = this.canvas.getSVGContainer()
    this.svgViewport = this.canvas.getSVGViewport()
    this.timelineSVG = $j('div.ap-animator-timeline > svg')[0]

    this.svgDocuments.clear()
    this.svgDocuments.push(this.svgDocument)
    this.svgDocuments.push(this.timelineSVG)

    this.startPos = timeline.startDateSlot // start slot, starting from 0
    this.endPos = timeline.endDateSlot // end slot
    this.timelineSlots = timeline.timelineSlots
    this.timelineEngineSeconds = timeline.totalEngineSeconds // total engine seconds
    this.slotEngineUnit = timeline.slotEngineUnit * 1000 // number of engine milliseconds per slot
    this.startDateMillis = new Date(timeline.startDateLabel).getTime() // Start date in milliseconds
    // slotDataUnit is the number of data milliseconds per slot
    this.slotDataUnit =
      (new Date(timeline.endDateLabel).getTime() -
        new Date(timeline.startDateLabel).getTime()) /
      (timeline.endDateSlot - timeline.startDateSlot)
    // timeCoefficient the number of data milliseconds per one engine second (millis)
    this.timeCoefficient = this.slotDataUnit / this.slotEngineUnit

    // Reconstruct this.logCasess
    this.logCases = []
    let offsets = [3, -3, 9, -9, 12, -12, 15, -15]

    for (let i = 0; i < this.logNum; i++) {
      let log = logs[i]
      this.logCases[i] = []
      for (let j = 0; j < log.tokenAnimations.length; j++) {
        let tokenAnimation = log.tokenAnimations[j]
        let color = this.apPalette[i] || log.color
        this.logCases[i][j] = new Ap.la.LogCase(
          this,
          tokenAnimation,
          color,
          tokenAnimation.caseId,
          offsets[i],
        )
      }
    }
    let tokenE = this.svgDocument.getElementById('progressAnimation')
    if (tokenE != null) {
      this.svgDocument.removeChild(tokenE)
    }

    // Recreate progress indicators (deprecated)
    // let progressIndicatorE = this.createProgressIndicatorsDeprecated(logs, timeline);
    // $j("div#progress_display svg")[0].append(progressIndicatorE);

    this.createProgressIndicators()

    //Recreate timeline to update date labels
    //$j("#timeline").remove();
    let timelineE = this.createTimeline(timeline.logs.length)
    this.timelineSVG.append(timelineE)

    // Add log intervals to timeline: must be after the timeline creation
    //let timelineElement = $j("#timeline")[0];
    let startTopX = 20
    let startTopY = 18
    let showOtherLogsTimeSpan = false
    for (let j = 0; j < timeline.logs.length; j++) {
      let log = timeline.logs[j]
      let logInterval = document.createElementNS(SVG_NS, 'line')
      logInterval.setAttributeNS(null, 'x1', startTopX + 9 * log.startDatePos) // magic number 10 is slotWidth / slotEngineDur
      logInterval.setAttributeNS(
        null,
        'y1',
        startTopY + 8 + 7 * j + this.timelineOffset,
      )
      logInterval.setAttributeNS(null, 'x2', startTopX + 9 * log.endDatePos)
      logInterval.setAttributeNS(
        null,
        'y2',
        startTopY + 8 + 7 * j + this.timelineOffset,
      )
      logInterval.setAttributeNS(
        null,
        'style',
        'stroke: ' + (this.apPalette[j] || log.color) + '; stroke-width: 5',
      )
      timelineE.insertBefore(logInterval, timelineE.lastChild)

      //display date label at the two ends
      if (showOtherLogsTimeSpan && log.startDatePos % 10 != 0) {
        let logDateTextE = document.createElementNS(SVG_NS, 'text')
        logDateTextE.setAttributeNS(
          null,
          'x',
          startTopX + 9 * log.startDatePos - 50,
        )
        logDateTextE.setAttributeNS(
          null,
          'y',
          startTopY + 8 + 7 * j + 5 + this.timelineOffset,
        )
        logDateTextE.setAttributeNS(null, 'text-anchor', 'middle')
        logDateTextE.setAttributeNS(null, 'font-size', '11')
        logDateTextE.innerHTML = log.startDateLabel.substr(0, 19)
        timelineE.insertBefore(logDateTextE, timelineE.lastChild)
      }
    }
    this.createMetricTables()
    this.start()
  },

  createMetricTables: function () {
    let logs = this.logs;
    // Show metrics for every log
    let metricsTable = $j('#metrics_table')[0]
    for (let i = 0; i < logs.length; i++) {
      let row = metricsTable.insertRow(i + 1)
      let cellLogNo = row.insertCell(0)
      let cellLogName = row.insertCell(1)
      let cellTotalCount = row.insertCell(2)
      let cellPlayCount = row.insertCell(3)
      let cellReliableCount = row.insertCell(4)
      let cellExactFitness = row.insertCell(5)
      //let cellExactFitnessFormulaTime = row.insertCell(5);
      //let cellApproxFitness = row.insertCell(6);
      //let cellApproxFitnessFormulaTime = row.insertCell(7);
      //let cellAlgoTime = row.insertCell(8);

      cellLogNo.innerHTML = i + 1
      cellLogNo.style.backgroundColor = logs[i].color
      cellLogNo.style.textAlign = 'center'

      if (logs[i].filename.length > 50) {
        cellLogName.innerHTML = logs[i].filename.substr(0, 50) + '...'
      } else {
        cellLogName.innerHTML = logs[i].filename
      }
      cellLogName.title = logs[i].filename
      cellLogName.style.font = '1em monospace'
      //cellLogName.style.backgroundColor = logs[i].color;

      cellTotalCount.innerHTML = logs[i].total
      cellTotalCount.style.textAlign = 'center'
      cellTotalCount.style.font = '1em monospace'

      cellPlayCount.innerHTML = logs[i].play
      cellPlayCount.title = logs[i].unplayTraces
      cellPlayCount.style.textAlign = 'center'
      cellPlayCount.style.font = '1em monospace'

      cellReliableCount.innerHTML = logs[i].reliable
      cellReliableCount.title = logs[i].unreliableTraces
      cellReliableCount.style.textAlign = 'center'
      cellReliableCount.style.font = '1em monospace'

      cellExactFitness.innerHTML = logs[i].exactTraceFitness
      cellExactFitness.style.textAlign = 'center'
      cellExactFitness.style.font = '1em monospace'

      //cellExactFitnessFormulaTime.innerHTML = logs[i].exactFitnessFormulaTime;

      //cellApproxFitness.innerHTML = logs[i].approxTraceFitness;

      //cellApproxFitnessFormulaTime.innerHTML = logs[i].approxFitnessFormulaTime;

      //cellAlgoTime.innerHTML = logs[i].algoTime;
    }
  },

  createProgressIndicators: function () {
    let { logs } = this

    let indicators = []
    $j('#progress_display').empty()
    for (let i = 0; i < logs.length; i++) {
      let log = logs[i]
      let container = $j(`<div id="progress-c-${i}"></div>`)
      let svg = $j(
        `<svg id="progressbar-${i}" xmlns="http://www.w3.org/2000/svg" viewBox="-10 0 20 40" ></svg>`,
      )
      let label = $j(`<div class="label">${log.filename}</div>`)
      svg.appendTo(container)
      label.appendTo(container)
      container.appendTo('#progress_display')
      indicators.push(svg)
      this.svgDocuments.push(svg[0])
    }
    for (let i = 0; i < logs.length; i++) {
      let progSVG = indicators[i]
      let progIndicator = this.createProgressIndicatorsForLog(
        i + 1,
        logs[i],
        this.timeline,
        0,
        0,
      )
      progSVG.append(progIndicator)
    }
    let props = [
      'info-no',
      'info-log',
      'info-traces',
      'info-relayed',
      'info-reliable',
      'info-fitness',
    ]

    function getProps (logIdx) {
      let source = $j('#metrics_table tr:nth-child(' + (logIdx + 1) + ') td')
      props.forEach(function (prop, idx) {
        $j('#' + prop).text($j(source[idx]).text() || '')
      })
    }

    for (let i = 0; i < logs.length; i++) {
      let pId = '#ap-la-progress-' + (i + 1)
      $j(pId).hover(
        (function (i) {
          return function () {
            getProps(i)
            let { top, left } = $j(pId).offset()
            let bottom = `calc(100vh - ${top - 10}px)`
            left += 20
            $j('#ap-animator-info-tip').attr('data-log-idx', i)
            $j('#ap-animator-info-tip').css({ bottom, left })
            $j('#ap-animator-info-tip').show()
          }
        })(i + 1),
        (function (i) {
          return function () {
            $j('#ap-animator-info-tip').hide()
          }
        })(i + 1),
      )
    }
  },

  // Note: the engine time is changed in two situations:
  // 1. Change the token speed: go slower/faster
  // 2. Change the engine time to move the token forward/backward
  // In changing speed situation: the tokens (or markers) and clock are not updated. Their settings must be the same
  // after the engine time is changed, e.g. tokens must stay in the same position, clock must show the same datetime
  setCurrentTime: function (time, changeSpeed) {
    this.svgDocuments.forEach(function (s) {
      s.setCurrentTime(time)
    })

    if (!changeSpeed) {
      this.updateMarkersOnce()
      this.updateClockOnce(
        time * this.timeCoefficient * 1000 + this.startDateMillis,
      )
    }
  },

  getCurrentTime: function () {
    return this.svgDocuments[0].getCurrentTime()
  },

  /*
   * This method is used to read SVG document current time at every interval based on timer mechanism
   * It stops reading when SVG document time reaches the end of the timeline
   * The end() method is used for ending tasks for the replay completion scenario
   * Thus, the end() method should NOT create a loopback to this method.
   */
  updateClock: function () {
    this.updateMarkersOnce()

    // Original implementation -- checks for termination, updates clock view
    if (this.getCurrentTime() > (this.endPos * this.slotEngineUnit) / 1000) {
      this.end()
    } else {
      this.updateClockOnce(
        this.getCurrentTime() * this.timeCoefficient * 1000 +
        this.startDateMillis,
      )
    }
  },

  /*
   * Update all tokens (LogCase objects) with the new current time
   */
  updateMarkersOnce: function () {
    let t = this.getCurrentTime()
    let dt = (this.timeCoefficient * 1000) / this.slotDataUnit // 1/this.SlotEngineUnit
    t *= dt //number of engine slots: t = t/this.SlotEngineUnit

    // Display all the log trace markers
    for (let logIdx = 0; logIdx < this.logs.length; logIdx++) {
      for (
        let tokenAnimIdx = 0;
        tokenAnimIdx < this.logs[logIdx].tokenAnimations.length;
        tokenAnimIdx++
      ) {
        this.logCases[logIdx][tokenAnimIdx].updateMarker(t, dt)
      }
    }
  },

  /*
   * This method is used to call to update the digital clock display.
   * This update is one-off only.
   * It is safer to call this method than calling updateClock() method which is for timer.
   * param - time: is the
   */
  updateClockOnce: function (time) {
    let date = new Date()
    date.setTime(time)
    if (window.Intl) {
      document.getElementById('date').innerHTML = new Intl.DateTimeFormat([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
      document.getElementById('time').innerHTML = new Intl.DateTimeFormat([], {
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      }).format(date)
      //document.getElementById("subtitle").innerHTML = new Intl.NumberFormat([], {
      //        minimumIntegerDigits: 3
      //}).format(date.getMilliseconds();
    } else {
      // Fallback for browsers that don't support Intl (e.g. Safari 8.0)
      document.getElementById('date').innerHTML = date.toDateString()
      document.getElementById('time').innerHTML = date.toTimeString()
    }
  },

  start: function () {
    this.pause()
    this.setCurrentTime(this.startPos) // The startPos timing could be a little less than the first event timing in the log to accomodate the start event of BPMN

    let date = new Date()
    date.setTime(this.startPos)
    let dayString = new Intl.DateTimeFormat([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
    let timeString = new Intl.DateTimeFormat([], {
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    }).format(date)
    //console.log(dayString + " " + timeString);
  },

  /*
   * This method is used to process tasks when replay reaches the end of the timeline
   */
  end: function () {
    this.pause()
    this.setCurrentTime((this.endPos * this.slotEngineUnit) / 1000)
    this.updateClockOnce(
      this.endPos * this.slotEngineUnit * this.timeCoefficient +
      this.startDateMillis,
    )
    if (this.clockTimer) {
      clearInterval(this.clockTimer)
    }
  },

  /**
   * Let L be the total length of an element where tokens are moved along (e.g. a sequence flow)
   * Let X be the current time duration set for the token to finish the length L (X is the value of dur attribute)
   * Let D be the distance that the token has done right before the speed is changed
   * Let Cx be the current engine time right before the speed is changed, e.g. Cx = svgDoc.getCurrentTime().
   * Let Y be the NEW time duration set for the token to travel through the length L.
   * Let Cy be the current engine time assuming that Y has been set and the token has finished the D distance.
   * Thus, the token can move faster or lower if Y < X or Y > X, respectively (Y is the new value of the dur attribute)
   * A requirement when changing the animation speed is all tokens must keep running from
   * the last position they were right before the speed change.
   * We have: D = Cy*L/Y = Cx*L/X => Cy = (Y/X)*Cx
   * Thus, for the token to start from the same position it was before the speed changes (i.e. dur changes from X to Y),
   * the engine time must be set to (Y/X)*Cx, where Cx = svgDoc.getCurrentTime().
   * Y/X is called the TimeRatio.
   * Instead of making changes to the distances, the user sets the speed through a speed slider control.
   * Each level represents a speed rate of the tokens
   * The SpeedRatio Sy/Sx is the inverse of the TimeRatio Y/X.
   * In the formula above: Cy = Cx/SpeedRatio, i.e. if the more the speed increases, the shorter the time
   * In summary, by setting the engine current time (svgDoc.setCurrentTime) and keeping the begin and dur
   * attributes of tokens unchangeed, the engine will automatically adjust the tokens to go faster or slower
   * @param speedRatio
   */
  changeSpeed: function (speedRatio) {
    //------------------------------------------
    // Update the speed of circle progress bar
    //------------------------------------------
    let animations = $j('.progressAnimation')
    for (let i = 0; i < animations.length; i++) {
      animateE = animations[i]

      curDur = animateE.getAttribute('dur')
      curDur = curDur.substr(0, curDur.length - 1)

      curBegin = animateE.getAttribute('begin')
      curBegin = curBegin.substr(0, curBegin.length - 1)

      animateE.setAttributeNS(null, 'dur', curDur / speedRatio + 's')
      animateE.setAttributeNS(null, 'begin', curBegin / speedRatio + 's')
    }

    //-----------------------------------------
    // Update timeline tick with the new speed
    //-----------------------------------------
    let timelineTickE = $j('#timelineTick').get(0)
    curDur = timelineTickE.getAttribute('dur')
    curDur = curDur.substr(0, curDur.length - 1)
    curBegin = timelineTickE.getAttribute('begin')
    curBegin = curBegin.substr(0, curBegin.length - 1)

    timelineTickE.setAttributeNS(null, 'dur', curDur / speedRatio + 's')
    timelineTickE.setAttributeNS(null, 'begin', curBegin / speedRatio + 's')

    //----------------------------------------
    // Update Coefficients and units to ensure consistency
    // between the clock, timeline and SVG documents
    //----------------------------------------
    if (this.slotEngineUnit) {
      this.slotEngineUnit = this.slotEngineUnit / speedRatio
      if (this.timeCoefficient) {
        this.timeCoefficient = this.slotDataUnit / this.slotEngineUnit
      }
    }

    // Update markers: this is needed the moment before
    // changing the engine time to update existing and new markers?
    this.updateMarkersOnce()

    // Now, change the engine time to auto ajust the tokens faster/slower
    // Note: update engine time without updating markers and the clock
    let currentTime = this.getCurrentTime()
    let newTime = currentTime / speedRatio
    this.setCurrentTime(newTime, true)
  },

  fastforward: function () {
    if (this.getCurrentTime() >= (this.endPos * this.slotEngineUnit) / 1000) {
      return
    } else {
      this.setCurrentTime(
        this.getCurrentTime() + (1 * this.slotEngineUnit) / 1000,
      ) //move forward 1 slots
    }
  },

  fastBackward: function () {
    if (this.getCurrentTime() <= (this.startPos * this.slotEngineUnit) / 1000) {
      return
    } else {
      this.setCurrentTime(
        this.getCurrentTime() - (1 * this.slotEngineUnit) / 1000,
      ) //move backward 1 slots
    }
  },

  nextTrace: function () {
    if (this.getCurrentTime() >= (this.endPos * this.slotEngineUnit) / 1000) {
      return
    } else {
      let tracedates = this.tracedates //assume that this.jsonServer.tracedates has been sorted in ascending order
      let currentTimeMillis =
        this.getCurrentTime() * this.timeCoefficient * 1000 +
        this.startDateMillis
      //search for the next trace date/time immediately after the current time
      for (let i = 0; i < tracedates.length; i++) {
        if (currentTimeMillis < tracedates[i]) {
          this.setCurrentTime(
            (tracedates[i] - this.startDateMillis) /
            (1000 * this.timeCoefficient),
          )
          return
        }
      }
    }
  },

  previousTrace: function () {
    if (this.getCurrentTime() <= (this.startPos * this.slotEngineUnit) / 1000) {
      return
    } else {
      let tracedates = this.tracedates //assume that this.jsonServer.tracedates has been sorted in ascending order
      let currentTimeMillis =
        this.getCurrentTime() * this.timeCoefficient * 1000 +
        this.startDateMillis
      //search for the previous trace date/time immediately before the current time
      for (let i = tracedates.length - 1; i >= 0; i--) {
        if (currentTimeMillis > tracedates[i]) {
          this.setCurrentTime(
            (tracedates[i] - this.startDateMillis) /
            (1000 * this.timeCoefficient),
          )
          return
        }
      }
    }
  },

  isPaused: function () {
    return $j('#pause').hasClass(this.PAUSE_CLS)
  },

  setPlayPauseBtn: function (state) {
    const { PAUSE_CLS, PLAY_CLS } = this
    const btn = $j('#pause')

    if (typeof state === 'undefined') {
      state = this.isPaused() // do toggle
    }
    if (state) {
      btn.removeClass(PAUSE_CLS).addClass(PLAY_CLS)
    } else {
      btn.removeClass(PLAY_CLS).addClass(PAUSE_CLS)
    }
  },

  pause: function () {
    // let img = document.getElementById("pause").getElementsByTagName("img")[0];
    this.pauseAnimations()
    this.setPlayPauseBtn(true)
    // img.alt = "Play";
    // img.src = "images/control_play.png";
  },

  play: function () {
    // let img = document.getElementById("pause").getElementsByTagName("img")[0];
    this.unpauseAnimations()
    this.setPlayPauseBtn(false)
    // img.alt = "Pause";
    // img.src = "images/control_pause.png";
  },

  switchPlayPause: function () {
    // let img = document.getElementById("pause").getElementsByTagName("img")[0];
    if (this.isPaused()) {
      this.pause()
    } else {
      this.play()
    }
  },

  /*
   * Create progress indicator for one log
   * log: the log object (name, color, traceCount, progress, tokenAnimations)
   * x,y: the coordinates to draw the progress bar
   */
  createProgressIndicatorsForLog: function (logNo, log, timeline, x, y) {
    let pieE = document.createElementNS(SVG_NS, 'g')
    pieE.setAttributeNS(null, 'id', 'ap-la-progress-' + logNo)
    pieE.setAttributeNS(null, 'class', 'progress')

    let color = this.apPalette[logNo - 1] || log.color
    let pathE = document.createElementNS(SVG_NS, 'path')
    pathE.setAttributeNS(
      null,
      'd',
      'M ' + x + ',' + y + ' m 0, 0 a 20,20 0 1,0 0.00001,0',
    )
    // pathE.setAttributeNS(null,"fill","#CCCCCC");
    pathE.setAttributeNS(null, 'fill', color)
    pathE.setAttributeNS(null, 'fill-opacity', 0.5)
    pathE.setAttributeNS(null, 'stroke', color)
    pathE.setAttributeNS(null, 'stroke-width', '5')
    pathE.setAttributeNS(null, 'stroke-dasharray', '0 126 126 0')
    pathE.setAttributeNS(null, 'stroke-dashoffset', '1')

    let animateE = document.createElementNS(SVG_NS, 'animate')
    animateE.setAttributeNS(null, 'class', 'progressAnimation')
    animateE.setAttributeNS(null, 'attributeName', 'stroke-dashoffset')
    animateE.setAttributeNS(null, 'values', log.progress.values)
    animateE.setAttributeNS(null, 'keyTimes', log.progress.keyTimes)
    //console.log("values:" + log.progress.values);
    //console.log("keyTimes:" + log.progress.keyTimes);
    animateE.setAttributeNS(null, 'begin', log.progress.begin + 's')
    //animateE.setAttributeNS(null,"dur",timeline.timelineSlots*this.slotEngineUnit/1000 + "s");
    animateE.setAttributeNS(null, 'dur', log.progress.dur + 's')
    animateE.setAttributeNS(null, 'fill', 'freeze')
    animateE.setAttributeNS(null, 'repeatCount', '1')

    pathE.appendChild(animateE)

    // let textE = document.createElementNS(SVG_NS,"text");
    // textE.setAttributeNS(null,"x", x);
    // textE.setAttributeNS(null,"y", y - 10);
    // textE.setAttributeNS(null,"text-anchor","middle");
    // let textNode = document.createTextNode(log.name);
    // textE.appendChild(textNode);

    // let tooltip = document.createElementNS(SVG_NS,"title");
    // tooltip.appendChild(document.createTextNode(log.name));
    // textE.appendChild(tooltip);

    pieE.appendChild(pathE)
    // pieE.appendChild(textE);

    return pieE
  },

  /*
   * <g id="timeline">
   *      ---- timeline bar
   *      <line>
   *      <text>
   *      ...
   *      <line>
   *      <text>
   *      ----- timeline tick
   *      <rect>
   *          <animationMotion>
   * Use: this.timelineSlots, this.slotEngineUnit.
   */
  createTimeline: function (logNum) {
    function addTimelineBar (
      lineX,
      lineY,
      lineLen,
      lineColor,
      textX,
      textY,
      text1,
      text2,
      parent,
    ) {
      let lineElement = document.createElementNS(SVG_NS, 'line')
      lineElement.setAttributeNS(null, 'x1', lineX)
      lineElement.setAttributeNS(null, 'y1', lineY + 6)
      lineElement.setAttributeNS(null, 'x2', lineX)
      // lineElement.setAttributeNS(null,"y2", lineY+lineLen);
      lineElement.setAttributeNS(null, 'y2', lineY + 15)

      if (lineColor === 'red') {
        lineElement.setAttributeNS(null, 'stroke', 'black')
        lineElement.setAttributeNS(null, 'stroke-width', '0.5')
        parent.appendChild(lineElement)
      } else {
        lineElement.setAttributeNS(null, 'stroke-width', '.5')
      }

      let textElement1 = document.createElementNS(SVG_NS, 'text')
      textElement1.setAttributeNS(null, 'x', textX)
      textElement1.setAttributeNS(null, 'y', textY - 10)
      textElement1.setAttributeNS(null, 'text-anchor', 'middle')
      textElement1.setAttributeNS(null, 'font-size', '11')
      textElement1.innerHTML = text1

      let textElement2 = document.createElementNS(SVG_NS, 'text')
      textElement2.setAttributeNS(null, 'x', textX)
      textElement2.setAttributeNS(null, 'y', textY + 5)
      textElement2.setAttributeNS(null, 'text-anchor', 'middle')
      textElement2.setAttributeNS(null, 'font-size', '11')
      textElement2.innerHTML = text2

      parent.appendChild(textElement1)
      parent.appendChild(textElement2)
    }

    let timelineElement = document.createElementNS(SVG_NS, 'g')
    timelineElement.setAttributeNS(null, 'id', 'timeline')
    timelineElement.setAttributeNS(
      null,
      'style',
      '-webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none',
    )

    let startTopX = 20
    let startTopY = 15
    let slotWidth = 9
    let slotEngineDur = this.slotEngineUnit / 1000 //number of SVG engine seconds for one slot
    let lineLen = 30
    let textToLineGap = 5
    let startValue = 0
    let textValue = -slotEngineDur
    let lineTopX = -slotWidth + startTopX
    let slotNum = this.timelineSlots // the number of timeline vertical bars
    let lineColor

    /*---------------------------
        Add text and line for the bar
        ---------------------------*/

    for (let i = 0; i <= slotNum; i++) {
      lineTopX += slotWidth
      //textValue += slotEngineDur;
      if (i % 10 == 0) {
        let date = new Date()
        date.setTime(this.startDateMillis + i * this.slotDataUnit)
        textValue1 =
          date.getDate() +
          '/' +
          (date.getMonth() + 1) +
          '/' +
          (date.getFullYear() + '').substr(2, 2)
        textValue2 =
          date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds()
        lineColor = 'red'
      } else {
        textValue1 = ''
        textValue2 = ''
        lineColor = 'black'
      }
      addTimelineBar(
        lineTopX,
        startTopY,
        lineLen,
        lineColor,
        lineTopX,
        startTopY - textToLineGap,
        textValue1,
        textValue2,
        timelineElement,
      )
    }

    /*---------------------------
        Add timeline tick
        ---------------------------*/
    let indicatorE = document.createElementNS(SVG_NS, 'rect')
    indicatorE.setAttributeNS(null, 'fill', '#FAF0E6')
    indicatorE.setAttributeNS(null, 'height', 8 * logNum + 10)
    indicatorE.setAttributeNS(null, 'width', '12')
    indicatorE.setAttributeNS(null, 'stroke', 'grey')
    indicatorE.setAttributeNS(null, 'rx', '2')
    indicatorE.setAttributeNS(null, 'ry', '2')
    // indicatorE.setAttributeNS(null,"x", -3); // note: the Y-axis of the tick is controlled by the animateMotion path it attaches to
    indicatorE.setAttributeNS(null, 'x', -6)
    indicatorE.setAttributeNS(null, 'style', 'cursor: move')

    let indicatorAnimation = document.createElementNS(SVG_NS, 'animateMotion')
    indicatorAnimation.setAttributeNS(null, 'id', 'timelineTick')
    indicatorAnimation.setAttributeNS(null, 'begin', '0s')
    indicatorAnimation.setAttributeNS(
      null,
      'dur',
      slotNum * slotEngineDur + 's',
    )
    indicatorAnimation.setAttributeNS(null, 'by', slotEngineDur)
    indicatorAnimation.setAttributeNS(
      null,
      'from',
      startTopX + ',' + (startTopY + 5),
    )
    indicatorAnimation.setAttributeNS(
      null,
      'to',
      lineTopX + ',' + (startTopY + 5),
    )
    indicatorAnimation.setAttributeNS(null, 'fill', 'freeze')
    indicatorE.appendChild(indicatorAnimation)
    timelineElement.appendChild(indicatorE)

    /*---------------------------
        Control dragging of the timeline stick
        ---------------------------*/
    indicatorE.addEventListener('mousedown', startDragging.bind(this))
    this.timelineSVG.addEventListener('mousemove', onDragging.bind(this))
    this.timelineSVG.addEventListener('mouseup', stopDragging.bind(this))
    this.timelineSVG.addEventListener('mouseleave', stopDragging.bind(this))

    let dragging = false
    let offset
    let lastPos = -3
    let svg = this.timelineSVG

    let elementWithFocus = null
    let clickX, clickY
    let lastMoveX = 0,
      lastMoveY = 0

    function startDragging (evt) {
      evt.preventDefault()
      dragging = true
      elementWithFocus = evt.target
      // clickX = evt.clientX;
      offset = getMousePosition(evt)
      offset.x -= parseFloat(indicatorE.getAttributeNS(null, 'x'))
      clickX = offset.x
      this.pause()
    }

    function onDragging (evt) {
      evt.preventDefault()
      if (dragging) {
        moveX = lastMoveX + (evt.clientX - clickX)
        //let coord = getMousePosition(evt);
        //lastPos = coord.x - offset.x;
        //elementWithFocus.setAttributeNS(null, "x",  lastPos);
        elementWithFocus.setAttributeNS(null, 'x', moveX)
      }
    }

    // Only update SVG current time when the dragging finishes to avoid heavy on-the-fly updates
    // After every call setCurrentTime, the SVG coordinate is moved to the new position of the tick
    // As calling setCurrentTime will also update the tick's position, we have to move the tick
    // back to its original position before the call to setCurrentTime, otherwise it is moved two times
    // The dragging flag is checked to avoid doing two times for mouseup and mouseleave events
    function stopDragging (evt) {
      if (!dragging) return //avoid doing the below two times
      if (evt.type == 'mouseleave' && dragging) {
        return
      }
      dragging = false
      elementWithFocus = null
      let slotCount = moveX / slotWidth
      lastMoveX = 0
      lastMoveY = 0
      //alert("moveX: " + moveX);
      //alert("slotCount: " + slotCount);
      if (slotCount != 0) {
        indicatorE.setAttributeNS(null, 'x', 0)
        this.setCurrentTime(
          this.getCurrentTime() +
          (1.0 * slotCount * this.slotEngineUnit) / 1000.0,
        )
        //this.play();
      }
    }

    function updateTimeline () {
      let slotCount = moveX / slotWidth
      //alert("moveX: " + moveX);
      //alert("slotCount: " + slotCount);
      if (slotCount != 0) {
        this.setCurrentTime(
          this.getCurrentTime() +
          (1.0 * slotCount * this.slotEngineUnit) / 1000.0,
        )
      }
    }

    //Convert from screen coordinates to SVG document coordinates
    function getMousePosition (evt) {
      let matrix = svg.getScreenCTM()
      let pt = svg.createSVGPoint()
      pt.x = evt.clientX
      pt.y = evt.clientY
      pt.matrixTransform(matrix)
      return { x: pt.x, y: pt.y }
      // return {
      //   x: (evt.clientX - CTM.e) / CTM.a,
      //   y: (evt.clientY - CTM.f) / CTM.d
      // };
    }

    return timelineElement
  },

  setCaseLabelsVisible: function (visible) {
    if (this.caseLabelsVisible != visible) {
      this.caseLabelsVisible = visible
      this.updateMarkersOnce()
    }
  },

  /*
   * <g id="progressAnimation"><g class='progress'><path><animate class='progressanimation'>
   * logs: array of log object
   * timeline: object containing timeline information
   */
  createProgressIndicatorsDeprecated: function (logs, timeline) {
    let progressE = document.createElementNS(SVG_NS, 'g')
    progressE.setAttributeNS(null, 'id', 'progressAnimation')

    let x = 30
    let y = 20
    for (let i = 0; i < logs.length; i++) {
      progressE.appendChild(
        this.createProgressIndicatorsForLog(i + 1, logs[i], timeline, x, y),
      )
      x += 150
    }
    return progressE
  },
}

Ap.la.AnimationController = Clazz.extend(AnimationController)
