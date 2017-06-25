'use strict';

/**
  * Assumptions:
  *   1. target el's boundary has positioning other than static
  *   2. target el's left and right properties use px units
  */

let dragNDrop =
(function factoryIIFE(window) {
  function MousePosition () {
    this.x = this.y = this.oldX = this.oldY = null
  }

  MousePosition.prototype.release = function () {
    this.eventTarget.removeEventListener("mousemove", this._onMouseMove)
  };

  MousePosition.prototype.init = function (eventTarget) {
    eventTarget.addEventListener("mousemove", this._onMouseMove.bind(this), false)
  };

  MousePosition.prototype._onMouseMove = function (event) {
    this.oldX = this.x
    this.oldY = this.y
    this.x = event.clientX
    this.y = event.clientY
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

  function Register() {
    this.items = []
  }

  Register.prototype.hasTarget = function (target) {
    let result = -1
    this.items.some((item, ind) => {
      if (item.target === target) {
        // exit loop and return ind
        result = ind
        return true
      }
    })
    return result
  };

  Register.prototype.findByTarget = function (target) {
    let ret = null,
        ind

    // FIXME: lots of parenthesis to avoid precedence errors
    if (~(ind = this.hasTarget(target))) {
      ret = this.items[ind]
    }

    return ret
  };

  Register.prototype.add = function (item) {
    this.items.push(item)
  };

  Register.prototype.remove = function (item) {
    let items = this.items, ind
    ind = items.indexOf(item)
    if (~ind) throw new Error("item not in register")
    // todo: is this how you deleete??
    this.items.splice(ind, 1)
  };

  Register.prototype.forEachOnMouseUp = function (fn, cxt) {
    this.items.forEach((item) => {
      fn.call(cxt, item.onMouseUp.bind(item.target, item.origOpacity))
    })
  };

  Register.prototype.forEachOnMouseMove = function (fn, cxt) {
    this.items.forEach((item) => {
      fn.call(cxt, item.onMouseMove)
    })
  };

  let targets, docOnMouseMove, docOnMouseUp, pos, register

  pos = new MousePosition

  // represents registered targets and their handlers
  register = new Register

  // TODO: if all onMouseMove() in register are inactive should we remove this
  // listener? The cost would be keeping track of how many (if all) are inactive
  function onMouseMove (event) {
    register.forEachOnMouseMove(handler => handler.active ? handler(event) : void(0))
  }

  function onMouseUp (event) {
    register.forEachOnMouseUp(handler => handler(), this)
  }

  function init() {
    pos.init(document)

    document.addEventListener("mousemove", onMouseMove, false)
    document.addEventListener("mouseup", onMouseUp, false)
  }

  function release() {
    pos.release()

    document.removeEventListener("mousemove", onMouseMove, false)
    document.removeEventListener("mouseup", onMouseUp, false)
  }

  // TODO: bility to change the boundary of a registered target
  return function (target, boundary) {
    if (~register.hasTarget(target)) return;

    targetInit()
    register.items.length === 1 ? init() : void(0)

    function targetInit() {
      let origOpacity = window.getComputedStyle(target).opacity

      register.add({
        target,
        onMouseMove,
        onMouseUp,
        origOpacity
      })

      target.addEventListener("mousedown", function onMouseDown(event) {
        onMouseMove.active = true
        this.style.opacity = (+origOpacity) / 2
      }, false)
    }

    function onMouseUp(origOpacity) {
      onMouseMove.active = false
      // todo: this.style.opacity = origOpacity
      this.style.opacity = origOpacity
    }

    onMouseMove.active = null
    function onMouseMove(event) {

        if (!pos.isInElement(boundary)) return

        // wait for next round so we can produce a delta
        if (pos.oldX === null && pos.oldY === null) return

        let xDelta = pos.x - pos.oldX
        let yDelta = pos.y - pos.oldY
        let cssStyleDec = window.getComputedStyle(target)
        let boundCssStyleDec = window.getComputedStyle(boundary)
        // TODO: use pxToInt()
        let offsetX = (Number(cssStyleDec.left.slice(0, cssStyleDec.left.length -2)) + xDelta)
        let offsetY = (Number(cssStyleDec.top.slice(0, cssStyleDec.top.length -2 ))+ yDelta)
        let overflowX = offsetX + pxToInt(cssStyleDec.width)
        let overflowY = offsetY + pxToInt(cssStyleDec.height)
        let boundDomClient = boundary.getBoundingClientRect()

        overflowX = offsetX + ~~boundDomClient.left < ~~boundDomClient.left || overflowX > pxToInt(boundCssStyleDec.width)
        overflowY = offsetY + ~~boundDomClient.top < ~~boundDomClient.top || overflowY > pxToInt(boundCssStyleDec.height)

        if (overflowX || overflowY) return

        target.style.left = offsetX + "px"
        target.style.top = offsetY + "px"
    }

    return function targetRelease() {
      let item = register.findByTarget(target)
      if (item === null) throw new Error("target to be removed not found")
      register.remove(item)
      target.removeEventListener("mousedown", onMouseDown, false)

      if (register.items.length === 0) release()
    }
  }

}(window))
