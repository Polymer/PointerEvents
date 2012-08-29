/*
 * Copyright 2012 The Toolkitchen Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

/*
 * This module contains the handlers for native platform events.
 * From here, the dispatcher is called to create unified pointer events.
 * Included are touch events (v1) and mouse events.
 */
(function(scope) {
  var dispatcher = scope.dispatcher;
  // returns true if a === b or a is inside b
  var isDescendant = function(inA, inB) {
    var a = inA;
    while(a) {
      if (a === inB) {
        return true;
      }
      a = a.parentNode;
    }
  };
  // handler block for native touch events
  var touchEvents = {
    events: [
      'click',
      'touchstart',
      'touchmove',
      'touchend'
    ],
    //TODO(dfreedm) make this actually split touch event into individuals
    splitEvents: function(inEvent) {
      var e = dispatcher.cloneEvent(inEvent.changedTouches[0]);
      e.target = this.findTarget(e);
      return [e];
    },
    findTarget: function(inEvent) {
      return document.elementFromPoint(inEvent.clientX, inEvent.clientY);
    },
    click: function(inEvent) {
      dispatcher.tap(inEvent);
    },
    touchstart: function(inEvent) {
      var es = this.splitEvents(inEvent);
      for (var i = 0, e; e = es[i]; i++) {
        dispatcher.down(e);
        //TODO (dfreedm) set up a registry for overEvents?
        this.overEvent = e;
        dispatcher.enter(e);
      }
    },
    touchmove: function(inEvent) {
      /*
       * must preventDefault first touchmove or document will scroll otherwise
       * Per Touch event spec section 5.6
       * http://www.w3.org/TR/touch-events/#the-touchmove-event
       */
      inEvent.preventDefault();
      var es = this.splitEvents(inEvent);
      for (var i = 0, e; e = es[i]; i++) {
        //TODO (dfreedm) needs refactor for multiple overEvents
        dispatcher.move(e);
        if (this.overEvent && this.overEvent.target !== e.target) {
          this.overEvent.relatedTarget = e.target;
          e.relatedTarget = this.overEvent.target;
          if (!isDescendant(this.overEvent.relatedTarget, this.overEvent.target)) {
            dispatcher.leave(this.overEvent);
          }
          if (!isDescendant(e.relatedTarget, e.target)) {
            dispatcher.enter(e);
          }
        }
        this.overEvent = e;
      }
    },
    touchend: function(inEvent) {
      var es = this.splitEvents(inEvent);
      for (var i = 0, e; e = es[i]; i++) {
        dispatcher.up(e);
        dispatcher.leave(e);
      }
    }
  };

  // handler block for native mouse events
  var mouseEvents = {
    events: [
      'click',
      'mousedown',
      'mousemove',
      'mouseup',
      'mouseover',
      'mouseout'
    ],
    click: function(inEvent) {
      dispatcher.tap(inEvent);
    },
    mousedown: function(inEvent) {
      dispatcher.down(inEvent);
    },
    mousemove: function(inEvent) {
      dispatcher.move(inEvent);
    },
    mouseup: function(inEvent) {
      dispatcher.up(inEvent);
    },
    mouseover: function(inEvent) {
      if (!isDescendant(inEvent.relatedTarget, inEvent.target)) {
        var e = dispatcher.cloneEvent(inEvent);
        e.bubbles = false;
        dispatcher.enter(e);
      }
    },
    mouseout: function(inEvent) {
      if (!isDescendant(inEvent.relatedTarget, inEvent.target)) {
        var e = dispatcher.cloneEvent(inEvent);
        e.bubbles = false;
        dispatcher.leave(e);
      }
    }
  };

  /*
   * We fork the initialization of dispatcher event listeners here because
   * current native touch event systems emulate mouse events. These
   * touch-emulated mouse events behave differently than normal mouse events.
   *
   * Touch-emulated mouse events will only occur if the target element has
   * either a native click handler, or the onclick attribute is set. In
   * addition, the touch-emulated mouse events fire only after the finger has
   * left the screen, negating any live-tracking ability a developer might want.
   *
   * The only way to disable mouse event emulation by native touch systems is to
   * preventDefault every touch event, which we feel is inelegant.
   *
   * Therefore we choose to only listen to native touche events if they exist.
   */

  if ('ontouchstart' in window) {
    dispatcher.registerSource('touch', touchEvents, touchEvents.events);
  } else {
    dispatcher.registerSource('mouse', mouseEvents, mouseEvents.events);
  }
})(window.PointerEventShim);
