'use strict';

/**
  * Assumptions:
  *   1. target el's boundary has positioning other than static
  *   2. target el's left and right properties use px units
  */

let dragNDrop =
(function factoryIIFE(window) {
  const targets = [],
        activeTargets = []

  document.addEventListener("mousedown", function (event) {
    targets.forEach((triple) => {
      let target = triple[0], pos = triple[1]

      if (event.target === target) {
        document.documentElement.addEventListener("mousemove", onMouseMove, false)
        activeTargets.push(triple)
      }
    })
  }, false)

  document.addEventListener("mouseup", function (event) {
    activeTargets.forEach((triple, ind) => {
      document.documentElement.removeEventListener("mousemove", onMouseMove)
    })
    activeTargets.splice(0, activeTargets.length)

  }, false)

  function onMouseMove(event) {
    // find pos
    activeTargets.forEach((triple) => {
      let target = triple[0],
          pos = triple[1],
          boundary = triple[2]

      if (!pos.isInElement(boundary)) return

      let xDelta = event.pageX - pos.x
      let yDelta = event.pageY - pos.y
      let cssStyleDec = window.getComputedStyle(target)
      let offsetX = (Number(cssStyleDec.left.slice(0, cssStyleDec.left.length -2)) + xDelta)
      let offsetY = (Number(cssStyleDec.top.slice(0, cssStyleDec.top.length -2 ))+ yDelta)
      let overflowX = offsetX + pxToInt(target.style.width)
      let overflowY = offsetY + pxToInt(target.style.height)
      let boundDomClient = boundary.getBoundingClientRect()

      overflowX = offsetX + ~~boundDomClient.left < ~~boundDomClient.left || overflowX > pxToInt(boundary.style.width)
      overflowY = offsetY + ~~boundDomClient.top < ~~boundDomClient.top || overflowY > pxToInt(boundary.style.height)


      if (overflowX || overflowY) return

      target.style.left = offsetX + "px"
      target.style.top = offsetY + "px"
    })
  }

  function MousePosition () {
    this.x = this.y = null
    this.init(document)
  }

  MousePosition.prototype.release = function () {
    this.eventTarget.removeEventListener("mousemove", this._onMouseMove)
  };

  MousePosition.prototype.init = function (eventTarget) {
    eventTarget.addEventListener("mousemove", this._onMouseMove.bind(this), false)
  };

  MousePosition.prototype._onMouseMove = function (event) {
    this.x = event.pageX
    this.y = event.pageY
  }

  // inside as in content width and padding width
  MousePosition.prototype.isInElement = function (htmlElement) {
    let domRect = htmlElement.getBoundingClientRect()
    let elX = htmlElement.clientWidth,
        elY = htmlElement.clientHeight,
        baseX = this.x - domRect.left,
        baseY = this.y - domRect.top;

    if (this.x === null || this.y === null) return null

    return  (0 <= baseX && baseX <= elX) &&
            (0 <= baseY && baseY <= elY)
  };

  function pxToInt(str) {
    return parseInt(str.split(/px/i)[0])
  }

  // TODO: bility to change the boundary of a registered target
  return function (target, boundary) {
    if (~targets.indexOf(target)) return;
    targets.push([target, new MousePosition, boundary])
  }

}(window))
