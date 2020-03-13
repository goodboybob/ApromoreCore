// $.noConflict();
window.$j = jQuery.noConflict();
$j.browser = {};
$j.browser.mozilla =
    /mozilla/.test(navigator.userAgent.toLowerCase()) &&
    !/webkit/.test(navigator.userAgent.toLowerCase());
$j.browser.webkit = /webkit/.test(navigator.userAgent.toLowerCase());
$j.browser.opera = /opera/.test(navigator.userAgent.toLowerCase());
$j.browser.msie = /msie/.test(navigator.userAgent.toLowerCase());

ORYX.Plugins.ApromoreSave.apromoreSaveAs = function(xml, svg) {
  zAu.send(new zk.Event(zk.Widget.$(jq("$win")), "onSaveAs", xml));
};

ORYX.Plugins.ApromoreSave.apromoreSave = function(xml, svg) {
  zAu.send(new zk.Event(zk.Widget.$(jq("$win")), "onSave", xml));
};

Ap.la.session = (function() {
  const SPEED_CONTROL = "#speed-control";
  const STEP_VALUES = [
    0.00001,
    0.0001,
    0.0005,
    0.001,
    0.005,
    0.01,
    0.05,
    0.1,
    0.2,
    0.5,
    1,
    5,
    10,
    50,
    100,
    500,
    1000,
    2000,
    5000,
    10000
  ];
  let editor, controller, animationData;

  function init(xml, url, namespace, data) {
    animationData = data;
    editor = initEditor(xml, url, namespace);
    controller = new Ap.la.AnimationController(editor.getCanvas());
    initSpeedControl();
  }

  function initEditor(xml, url, namespace) {
    return new ORYX.Editor({
      xml,
      model: {
        id: "editorcanvas",
        stencilset: {
          url,
          namespace
        }
      },
      fullscreen: true // false
    });
  }

  function setPlayControls(disabled) {
    $j("#start").get(0).disabled = disabled;
    $j("#pause").get(0).disabled = disabled;
    $j("#forward").get(0).disabled = disabled;
    $j("#backward").get(0).disabled = disabled;
    $j("#nextTrace").get(0).disabled = disabled;
    $j("#previousTrace").get(0).disabled = disabled;
    $j("#end").get(0).disabled = disabled;
    $j(SPEED_CONTROL).get(0).disabled = disabled;
  }

  function initController() {
    if (!animationData) {
      // No data
      return;
    }
    // Disable play controls as the controller init. may take time
    setPlayControls(true);
    controller.reset(animationData);
    // Enable play controls back
    setPlayControls(false);
    document.title = "Apromore - Log Animator";
  }

  function initSpeedControl() {
    let speedControl = $j(SPEED_CONTROL)

    speedControl.slider({
      orientation: "horizontal",
      step: 1,
      min: 1,
      max: 20,
      value: 10
    });
    speedControl.slider("float", {
      handle: true,
      pips: true,
      labels: true,
      prefix: "",
      suffix: ""
    });
    // speedControl.slider('pips',{first: false, last: false, rest: false}).slider("float");

    let lastSliderValue = speedControl.slider("value");
    speedControl.on("slidechange", function(event, ui) {
      let speedRatio = STEP_VALUES[ui.value - 1] / STEP_VALUES[lastSliderValue - 1];
      controller.changeSpeed(speedRatio);
      lastSliderValue = ui.value;
    });
  }

  return {
    init: init,
    initController: initController,
    switchPlayPause: function(e) {
      controller.switchPlayPause(e);
    },
    fastForward: function() {
      controller.fastforward();
    },
    fastBackward: function() {
      controller.fastBackward();
    },
    nextTrace: function() {
      controller.nextTrace();
    },
    previousTrace: function() {
      controller.previousTrace();
    },
    start: function(e) {
      controller.start();
    },
    end: function(e) {
      controller.end();
    },
    toggleCaseLabelVisibility: function() {
      let input = $j("input#toggleCaseLabelVisibility")[0];
      controller.setCaseLabelsVisible(input.checked);
    }
  };
})();
