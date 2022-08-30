(function ($) {
  $.fn.redraw = function () {
    return this.map(function () {
      this.offsetTop;
      return this;
    });
  };
})(jQuery);

var Cafe = {
  modeOrder: false,
  totalPrice: 0,
  active_match_index: 1,
  active_match: "partido1",
  active_team: "local",
  roundMetadata: {},
  

  init: function (options) {
    Telegram.WebApp.ready();
    Cafe.apiUrl = options.apiUrl;
    Cafe.userId = options.userId;
    Cafe.userHash = options.userHash;
    Cafe.number_of_matches = $(".encuentro").length;
    $("body").show();
/*  PEI REMOVED
    if (
      !Telegram.WebApp.initDataUnsafe ||
      !Telegram.WebApp.initDataUnsafe.query_id
    ) {
      Cafe.isClosed = true;
      $("body").addClass("closed");
      Cafe.showStatus("Cafe is temporarily closed");
      return;
    }
*/
    $("body").on("swipeleft", Cafe.swipeleftHandler);
    $("body").on("swiperight", Cafe.swiperightHandler);
    $(".marcador").on("click", Cafe.showTeamPlayers);
    $("#mensaje-ok").on("click", Cafe.leaveApp);
    $("#mensaje-cancelar").on("click", Cafe.dismissWarning);
    $(".escudo-item-photo").on("click", Cafe.toggleWinner);
    $(".js-item-incr-btn").on("click", Cafe.eIncrClicked);
    $(".js-item-decr-btn").on("click", Cafe.eDecrClicked);
//    $(".js-order-edit").on("click", Cafe.eEditClicked);
    $(".js-status").on("click", Cafe.eStatusClicked);
    $(".js-order-comment-field").each(function () {
      autosize(this);
    });
    Telegram.WebApp.MainButton.setParams({
      text_color: "#fff",
      text: "HACER APUESTA!",
      color: "#50AA50",
      is_visible: false,
    }).onClick(Cafe.mainBtnClicked);
    Telegram.WebApp.BackButton.show();
    Telegram.WebApp.BackButton.onClick(Cafe.backBtnClicked);
    initRipple();
  },
  swipeleftHandler: function(event) {
    Cafe.nextMatch();
  },
  swiperightHandler: function(event) {
    Cafe.previousMatch();
  },
  showTeamPlayers: function() {
    scoreboard_id = $(this)[0].id;
    scoreboard_id_array = scoreboard_id.split("-");
    // If is the same already selected do nothing
//   if (Cafe.active_team == scoreboard_id_array[1] &&
//       Cafe.active_match == scoreboard_id_array[2]) {
//      return false
//    }
    Cafe.active_team = scoreboard_id_array[1];
    Cafe.active_match = scoreboard_id_array[2];
    clicked_team = $("#" + Cafe.active_match + " .jugadores ." + Cafe.active_team);
    if (Cafe.active_team == "local") {
      non_clicked_team = $("#" + Cafe.active_match + " .jugadores .visitante");
      opposite_team_class = "visitante"
    } else {
      non_clicked_team = $("#" + Cafe.active_match + " .jugadores .local");
      opposite_team_class = "local"
    }
    // Activate clicked team players and deactivate
    // the other one
    clicked_team.removeClass("deactivated");
    non_clicked_team.addClass("deactivated");
    // Always display the top of the list
    window.scrollTo(0, 0);
    // Add shadow to scoreboard box of the clicked team to differentiate
    scoreboard_to_select = $("#marcador-" + Cafe.active_team + "-" + Cafe.active_match);
    scoreboard_to_unselect = $("#marcador-" + opposite_team_class + "-" + Cafe.active_match);
    scoreboard_to_select.addClass("selected-scoreboard-side");
    scoreboard_to_unselect.removeClass("selected-scoreboard-side");
  },
  toggleWinner: function() {
    clicked_team = $(this).find("img");
    clicked_team_element = clicked_team[0];
    clicked_team_id_array = clicked_team_element.id.split("-");
    team_class = clicked_team_id_array[1];
    if (team_class == "local") {
      non_clicked_team = $("#escudo-visitante-" + Cafe.active_match);
      score_1x2 = $("#" + Cafe.active_match + " .resultado-1x2 .uno");
    } else {
      non_clicked_team = $("#escudo-local-" + Cafe.active_match);
      score_1x2 = $("#" + Cafe.active_match + " .resultado-1x2 .dos");
    }
    // Check if clicked team is marked as winner already,
    // and if it is, unmark both.
    if (clicked_team.hasClass("winner")) {
      clicked_team.removeClass("winner");
      score_1x2 = $("#" + Cafe.active_match + " .resultado-1x2 .equis");
    } else {
      clicked_team.addClass("winner");
    }
    non_clicked_team.removeClass("winner");
    // Clean 1X2 scoreboard before assignin new result
    Cafe.clean1x2(Cafe.active_match);
    score_1x2.addClass("selected-1x2");
  },
  clean1x2: function (match_id) {
    $("#" + match_id + " .resultado-1x2").find("span").removeClass("selected-1x2");
  },
  activateMatch(match_index) {
    Cafe.active_match = "partido" + match_index;

    // Disabling all of the matches
    $(".encuentro").removeClass("active")
    $(".encuentro").addClass("deactivated");

    // Always display the top of the list
    window.scrollTo(0, 0);

    // Make new current match visible
    $("#" + Cafe.active_match).removeClass("deactivated");
    $("#" + Cafe.active_match).addClass("active");
  },
  curtainAnimation: function(direction) {
    $("#cortina").removeClass("animation-rtl animation-ltr");
    // WARNING: This timeout is mandatory, because adding and removing the same
    //          class from the same element in succession does not trigger the 
    //          animation.
    setTimeout(function() {
      $("#cortina").addClass("animation-" + direction);
    }, 10);
  },
  nextMatch: function() {
    if (Cafe.active_match_index < Cafe.number_of_matches) {
      // Increment match index and update current match
      Cafe.active_match_index += 1;

      // Show new current match
      Cafe.curtainAnimation("rtl");
      Cafe.activateMatch(Cafe.active_match_index);

      // Update telegram main button (if last match, action should be 
      // Make bet! or similar)
      Cafe.updateMainButton();
    }
  },
  previousMatch: function() {
    if (Cafe.active_match_index > 1) {
      // Decrement match index and update current match
      Cafe.active_match_index -= 1;
      
      // Show new current match
      Cafe.curtainAnimation("ltr");
      Cafe.activateMatch(Cafe.active_match_index);

      // Update telegram main button (if last match, action should be 
      // Make bet! or similar)
      Cafe.updateMainButton();
    }
  },
  compileBidData: function() {
    Cafe.roundMetadata.il = $("#game_metadata").data("idliga");
    Cafe.roundMetadata.j = $("#game_metadata").data("jornada");
    Cafe.roundMetadata.p = [];
    $(".encuentro").each(function(i, encuentro) {
      var matchId = $(encuentro).data("id-encuentro");
      var result1x2 = $(encuentro).find(".selected-1x2").data("value");
      // Iterate over home players and get playerids associated with the number or goals
      var homePlayersData = []
      $(encuentro).find(".local-items .selected").each(function(i, player) {
        var playerId = $(player).data("id-jugador");
        var playerGoals = $(player).find(".js-item-counter").text();
        var playerDataString = playerId + "-" + playerGoals;
        homePlayersData.push(playerDataString);
      });

      // Iterate over away players and get playerids associated with the number or goals
      var awayPlayersData = []
      $(encuentro).find(".visitante-items .selected").each(function(i, player) {
        var playerId = $(player).data("id-jugador");
        var playerGoals = $(player).find(".js-item-counter").text();
        var playerDataString = playerId + "-" + playerGoals;
        awayPlayersData.push(playerDataString);
      });

      // Compile all the data for the bid
      var matchTagName = "p"+matchId;
      Cafe.roundMetadata.p[i] = { 
        [matchTagName]: {
          "q": result1x2,
          "l": homePlayersData,
          "v": awayPlayersData,
        }
      };

/*    for (i=1; i<=Cafe.number_of_matches; i++) {
      Cafe.roundMetadata.p["p"+i] = {"q":"x", "l":[], "v":[]};
    }
*/
    });
  },
  eIncrClicked: function (e) {
    e.preventDefault();
    var itemEl = $(this).parents(".js-item");
    Cafe.incrClicked(itemEl, 1);
  },
  eDecrClicked: function (e) {
    e.preventDefault();
    var itemEl = $(this).parents(".js-item");
    Cafe.incrClicked(itemEl, -1);
  },
/*
  eEditClicked: function (e) {
    e.preventDefault();
    Cafe.toggleMode(false);
  },
*/
  getOrderItem: function (itemEl) {
    var id = itemEl.data("item-id");
    return $(".js-order-item").filter(function () {
      return $(this).data("item-id") == id;
    });
  },
  updateItem: function (itemEl, delta) {
    var count = +itemEl.data("item-count") || 0;
    var counterEl = $(".js-item-counter", itemEl);
    counterEl.text(count ? count : 1);
    var isSelected = itemEl.hasClass("selected");
    var anim_name = isSelected
      ? delta > 0
        ? "badge-incr"
        : count > 0
        ? "badge-decr"
        : "badge-hide"
      : "badge-show";
    var cur_anim_name = counterEl.css("animation-name");
    if (
      (anim_name == "badge-incr" || anim_name == "badge-decr") &&
      anim_name == cur_anim_name
    ) {
      anim_name += "2";
    }
    counterEl.css("animation-name", anim_name);
    itemEl.toggleClass("selected", count > 0);
/*
    var orderItemEl = Cafe.getOrderItem(itemEl);
    var orderCounterEl = $(".js-order-item-counter", orderItemEl);
    orderCounterEl.text(count ? count : 1);
    orderItemEl.toggleClass("selected", count > 0);
    var orderPriceEl = $(".js-order-item-price", orderItemEl);
    var item_price = count * price;
    orderPriceEl.text(Cafe.formatPrice(item_price));

    Cafe.updateTotalPrice();
*/
  },
  incrClicked: function (itemEl, delta) {
    if (Cafe.isLoading || Cafe.isClosed) {
      return false;
    }
    var count = +itemEl.data("item-count") || 0;
    count += delta;
    if (count < 0) {
      count = 0;
    }
    itemEl.data("item-count", count);
    Cafe.updateItem(itemEl, delta);
    // Update scoreboard
    scoreboard_to_change = $("#marcador-" + Cafe.active_team + "-" + Cafe.active_match);
    current_score = +scoreboard_to_change.text();
    current_score += delta;
    if (current_score < 0) {
      current_score = 0;
    }
    scoreboard_to_change.text(current_score)
  },
  formatPrice: function (price) {
    return "$" + Cafe.formatNumber(price / 1000, 2, ".", ",");
  },
  formatNumber: function (number, decimals, decPoint, thousandsSep) {
    number = (number + "").replace(/[^0-9+\-Ee.]/g, "");
    var n = !isFinite(+number) ? 0 : +number;
    var prec = !isFinite(+decimals) ? 0 : Math.abs(decimals);
    var sep = typeof thousandsSep === "undefined" ? "," : thousandsSep;
    var dec = typeof decPoint === "undefined" ? "." : decPoint;
    var s = "";
    var toFixedFix = function (n, prec) {
      if (("" + n).indexOf("e") === -1) {
        return +(Math.round(n + "e+" + prec) + "e-" + prec);
      } else {
        var arr = ("" + n).split("e");
        var sig = "";
        if (+arr[1] + prec > 0) {
          sig = "+";
        }
        return (+(
          Math.round(+arr[0] + "e" + sig + (+arr[1] + prec)) +
          "e-" +
          prec
        )).toFixed(prec);
      }
    };
    s = (prec ? toFixedFix(n, prec).toString() : "" + Math.round(n)).split(".");
    if (s[0].length > 3) {
      s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || "").length < prec) {
      s[1] = s[1] || "";
      s[1] += new Array(prec - s[1].length + 1).join("0");
    }
    return s.join(dec);
  },
  inFirstMatch: function() {
    return Cafe.active_match_index == 1;
  },
  inLastMatch: function() {
    return Cafe.active_match_index == Cafe.number_of_matches;
  },
  updateMainButton: function () {
    var mainButton = Telegram.WebApp.MainButton;
    if (Cafe.inLastMatch()) {
/*      if (Cafe.isLoading) {
        mainButton
          .setParams({
            is_visible: true,
            color: "#65c36d",
          })
          .showProgress();
      } else {
        mainButton
          .setParams({
            is_visible: true,
            text: "HACER APUESTA!",
            color: "#50AA50",
          })
          .hideProgress();
      }
*/
      mainButton.show();
    } else {
      mainButton.hide();
    }
  },
/*  updateTotalPrice: function () {
    var total_price = 0;
    $(".js-item").each(function () {
      var itemEl = $(this);
      var price = +itemEl.data("item-price");
      var count = +itemEl.data("item-count") || 0;
      total_price += price * count;
    });
    Cafe.totalPrice = total_price;
    Cafe.updateMainButton();
  },
  getOrderData: function () {
    var order_data = [];
    $(".js-item").each(function () {
      var itemEl = $(this);
      var id = itemEl.data("item-id");
      var count = +itemEl.data("item-count") || 0;
      if (count > 0) {
        order_data.push({ id: id, count: count });
      }
    });
    return JSON.stringify(order_data);
  },
  toggleMode: function (mode_order) {
    Cafe.modeOrder = mode_order;
    var anim_duration, match;
    try {
      anim_duration = window
        .getComputedStyle(document.body)
        .getPropertyValue("--page-animation-duration");
      if ((match = /([\d\.]+)(ms|s)/.exec(anim_duration))) {
        anim_duration = +match[1];
        if (match[2] == "s") {
          anim_duration *= 1000;
        }
      } else {
        anim_duration = 400;
      }
    } catch (e) {
      anim_duration = 400;
    }
    if (mode_order) {
      var height = $(".cafe-items").height();
      $(".cafe-order-overview").show();
      $(".cafe-items").css("maxHeight", height).redraw();
      $("body").addClass("order-mode");
      $(".js-order-comment-field").each(function () {
        autosize.update(this);
      });
      Telegram.WebApp.expand();
    } else {
      $("body").removeClass("order-mode");
      setTimeout(function () {
        $(".cafe-items").css("maxHeight", "");
        $(".cafe-order-overview").hide();
      }, anim_duration);
    }
    Cafe.updateMainButton();
  },
  toggleLoading: function (loading) {
    Cafe.isLoading = loading;
    Cafe.updateMainButton();
    $("body").toggleClass("loading", !!Cafe.isLoading);
    Cafe.updateTotalPrice();
  },
*/
  sendBidData: function() {
    Cafe.compileBidData();
    Telegram.WebApp.sendData(
      JSON.stringify(Cafe.roundMetadata)
    );
  },
  mainBtnClicked: function () {
    if (Cafe.isLoading || Cafe.isClosed) {
      return false;
    }
    Cafe.sendBidData();
/*    if (Cafe.modeOrder) {
      var comment = $(".js-order-comment-field").val();
      var params = {
        order_data: Cafe.getOrderData(),
        comment: comment,
      };
      if (Cafe.userId && Cafe.userHash) {
        params.user_id = Cafe.userId;
        params.user_hash = Cafe.userHash;
      }
      Cafe.toggleLoading(true);
      Cafe.apiRequest("makeOrder", params, function (result) {
        Cafe.toggleLoading(false);
        if (result.ok) {
          Telegram.WebApp.close();
        }
        if (result.error) {
          Cafe.showStatus(result.error);
        }
      });

    } else {
//      Cafe.toggleMode(true);
        // For now, we don't use "summary" modes as the Cafe example so
        // here we change the main button behaviour to fit our needs
        if (Cafe.inLastMatch()) {
            // Send bid data to the bot and close
        } else {
            Cafe.nextMatch();
        }
    }
*/
  },
  backBtnClicked: function() {
    // Warn user that leaving the webapp implies not saving the bid
    $("#avisos").removeClass("aviso-off");
  },
  leaveApp: function() {
    Telegram.WebApp.close();
  },
  dismissWarning: function() {
    $("#avisos").addClass("aviso-off");
  },
  eStatusClicked: function () {
    Cafe.hideStatus();
  },
  showStatus: function (text) {
    clearTimeout(Cafe.statusTo);
    $(".js-status").text(text).addClass("shown");
    if (!Cafe.isClosed) {
      Cafe.statusTo = setTimeout(function () {
        Cafe.hideStatus();
      }, 2500);
    }
  },
  hideStatus: function () {
    clearTimeout(Cafe.statusTo);
    $(".js-status").removeClass("shown");
  },
  apiRequest: function (method, data, onCallback) {
    var authData = Telegram.WebApp.initData || "";
    $.ajax(Cafe.apiUrl, {
      type: "POST",
      data: $.extend(data, { _auth: authData, method: method }),
      dataType: "json",
      xhrFields: {
        withCredentials: true,
      },
      success: function (result) {
        onCallback && onCallback(result);
      },
      error: function (xhr) {
        onCallback && onCallback({ error: "Server error" });
      },
    });
  },
};

/*!
    Autosize 3.0.20
    license: MIT
    http://www.jacklmoore.com/autosize
  */
!(function (e, t) {
  if ("function" == typeof define && define.amd)
    define(["exports", "module"], t);
  else if ("undefined" != typeof exports && "undefined" != typeof module)
    t(exports, module);
  else {
    var n = { exports: {} };
    t(n.exports, n), (e.autosize = n.exports);
  }
})(this, function (e, t) {
  "use strict";
  function n(e) {
    function t() {
      var t = window.getComputedStyle(e, null);
      "vertical" === t.resize
        ? (e.style.resize = "none")
        : "both" === t.resize && (e.style.resize = "horizontal"),
        (s =
          "content-box" === t.boxSizing
            ? -(parseFloat(t.paddingTop) + parseFloat(t.paddingBottom))
            : parseFloat(t.borderTopWidth) + parseFloat(t.borderBottomWidth)),
        isNaN(s) && (s = 0),
        l();
    }
    function n(t) {
      var n = e.style.width;
      (e.style.width = "0px"),
        e.offsetWidth,
        (e.style.width = n),
        (e.style.overflowY = t);
    }
    function o(e) {
      for (var t = []; e && e.parentNode && e.parentNode instanceof Element; )
        e.parentNode.scrollTop &&
          t.push({ node: e.parentNode, scrollTop: e.parentNode.scrollTop }),
          (e = e.parentNode);
      return t;
    }
    function r() {
      var t = e.style.height,
        n = o(e),
        r = document.documentElement && document.documentElement.scrollTop;
      e.style.height = "auto";
      var i = e.scrollHeight + s;
      return 0 === e.scrollHeight
        ? void (e.style.height = t)
        : ((e.style.height = i + "px"),
          (u = e.clientWidth),
          n.forEach(function (e) {
            e.node.scrollTop = e.scrollTop;
          }),
          void (r && (document.documentElement.scrollTop = r)));
    }
    function l() {
      r();
      var t = Math.round(parseFloat(e.style.height)),
        o = window.getComputedStyle(e, null),
        i = Math.round(parseFloat(o.height));
      if (
        (i !== t
          ? "visible" !== o.overflowY &&
            (n("visible"),
            r(),
            (i = Math.round(
              parseFloat(window.getComputedStyle(e, null).height)
            )))
          : "hidden" !== o.overflowY &&
            (n("hidden"),
            r(),
            (i = Math.round(
              parseFloat(window.getComputedStyle(e, null).height)
            ))),
        a !== i)
      ) {
        a = i;
        var l = d("autosize:resized");
        try {
          e.dispatchEvent(l);
        } catch (e) {}
      }
    }
    if (e && e.nodeName && "TEXTAREA" === e.nodeName && !i.has(e)) {
      var s = null,
        u = e.clientWidth,
        a = null,
        p = function () {
          e.clientWidth !== u && l();
        },
        c = function (t) {
          window.removeEventListener("resize", p, !1),
            e.removeEventListener("input", l, !1),
            e.removeEventListener("keyup", l, !1),
            e.removeEventListener("autosize:destroy", c, !1),
            e.removeEventListener("autosize:update", l, !1),
            Object.keys(t).forEach(function (n) {
              e.style[n] = t[n];
            }),
            i.delete(e);
        }.bind(e, {
          height: e.style.height,
          resize: e.style.resize,
          overflowY: e.style.overflowY,
          overflowX: e.style.overflowX,
          wordWrap: e.style.wordWrap,
        });
      e.addEventListener("autosize:destroy", c, !1),
        "onpropertychange" in e &&
          "oninput" in e &&
          e.addEventListener("keyup", l, !1),
        window.addEventListener("resize", p, !1),
        e.addEventListener("input", l, !1),
        e.addEventListener("autosize:update", l, !1),
        (e.style.overflowX = "hidden"),
        (e.style.wordWrap = "break-word"),
        i.set(e, { destroy: c, update: l }),
        t();
    }
  }
  function o(e) {
    var t = i.get(e);
    t && t.destroy();
  }
  function r(e) {
    var t = i.get(e);
    t && t.update();
  }
  var i =
      "function" == typeof Map
        ? new Map()
        : (function () {
            var e = [],
              t = [];
            return {
              has: function (t) {
                return e.indexOf(t) > -1;
              },
              get: function (n) {
                return t[e.indexOf(n)];
              },
              set: function (n, o) {
                e.indexOf(n) === -1 && (e.push(n), t.push(o));
              },
              delete: function (n) {
                var o = e.indexOf(n);
                o > -1 && (e.splice(o, 1), t.splice(o, 1));
              },
            };
          })(),
    d = function (e) {
      return new Event(e, { bubbles: !0 });
    };
  try {
    new Event("test");
  } catch (e) {
    d = function (e) {
      var t = document.createEvent("Event");
      return t.initEvent(e, !0, !1), t;
    };
  }
  var l = null;
  "undefined" == typeof window || "function" != typeof window.getComputedStyle
    ? ((l = function (e) {
        return e;
      }),
      (l.destroy = function (e) {
        return e;
      }),
      (l.update = function (e) {
        return e;
      }))
    : ((l = function (e, t) {
        return (
          e &&
            Array.prototype.forEach.call(e.length ? e : [e], function (e) {
              return n(e, t);
            }),
          e
        );
      }),
      (l.destroy = function (e) {
        return e && Array.prototype.forEach.call(e.length ? e : [e], o), e;
      }),
      (l.update = function (e) {
        return e && Array.prototype.forEach.call(e.length ? e : [e], r), e;
      })),
    (t.exports = l);
});

/* Ripple */

function initRipple() {
  if (!document.querySelectorAll) return;
  var rippleHandlers = document.querySelectorAll(".ripple-handler");
  var redraw = function (el) {
    el.offsetTop + 1;
  };
  var isTouch = "ontouchstart" in window;
  for (var i = 0; i < rippleHandlers.length; i++) {
    (function (rippleHandler) {
      function onRippleStart(e) {
        var rippleMask = rippleHandler.querySelector(".ripple-mask");
        if (!rippleMask) return;
        var rect = rippleMask.getBoundingClientRect();
        if (e.type == "touchstart") {
          var clientX = e.targetTouches[0].clientX;
          var clientY = e.targetTouches[0].clientY;
        } else {
          var clientX = e.clientX;
          var clientY = e.clientY;
        }
        var rippleX = clientX - rect.left - rippleMask.offsetWidth / 2;
        var rippleY = clientY - rect.top - rippleMask.offsetHeight / 2;
        var ripple = rippleHandler.querySelector(".ripple");
        ripple.style.transition = "none";
        redraw(ripple);
        ripple.style.transform =
          "translate3d(" +
          rippleX +
          "px, " +
          rippleY +
          "px, 0) scale3d(0.2, 0.2, 1)";
        ripple.style.opacity = 1;
        redraw(ripple);
        ripple.style.transform =
          "translate3d(" +
          rippleX +
          "px, " +
          rippleY +
          "px, 0) scale3d(1, 1, 1)";
        ripple.style.transition = "";

        function onRippleEnd(e) {
          ripple.style.transitionDuration = "var(--ripple-end-duration, .2s)";
          ripple.style.opacity = 0;
          if (isTouch) {
            document.removeEventListener("touchend", onRippleEnd);
            document.removeEventListener("touchcancel", onRippleEnd);
          } else {
            document.removeEventListener("mouseup", onRippleEnd);
          }
        }
        if (isTouch) {
          document.addEventListener("touchend", onRippleEnd);
          document.addEventListener("touchcancel", onRippleEnd);
        } else {
          document.addEventListener("mouseup", onRippleEnd);
        }
      }
      if (isTouch) {
        rippleHandler.removeEventListener("touchstart", onRippleStart);
        rippleHandler.addEventListener("touchstart", onRippleStart);
      } else {
        rippleHandler.removeEventListener("mousedown", onRippleStart);
        rippleHandler.addEventListener("mousedown", onRippleStart);
      }
    })(rippleHandlers[i]);
  }
}
