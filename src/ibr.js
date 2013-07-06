//
// # ibRoller2
// since: 2013.07.06
//
;(function (window, $, undefined) {
	var	_effects = {
		"noAni": 0, // 노 에니메이션
		"normal": 1, // 기본 에니메이션
		"delayed": 2,
		"randomDelayed": 3,
		"fade": 4,
		"fadeIn": 5,
		"fadeOut": 6
	},
	
	_direction = {
		"left": 1,
		"right": -1,
		"up": 2,
		"down": -2
	};
	
	_mergeProp = function (src, dest) {
		if (src === undefined) {
			return dest;
		}
		if (dest === undefined) {
			dest = {};
		}
		for (var key in src) {
			if (!src.hasOwnProperty(key)) {
				continue;
			}
			if (src[key] === undefined) {
				continue;
			} else if (src[key].constructor == Object) {
				_mergeProp(src[key], dest[key]);
			} else {
				dest[key] = src[key];
			}
		}
		return dest;
	};
		
	var _ibroller = function (args) {
		if (typeof args.group === "string") {
			args.group = {
				"element": args.group
			}
		}
		if (typeof args.unit === "string") {
			args.unit = {
				"element": args.unit
			}
		}
		if (typeof args.play === "boolean") {
			args.play = {
				"auto": args.play
			}
		}
		this.args = _mergeProp(args, {
			"wrap": "",
			"mask": "",
			"group": {
				"element": "",
				"row": 1,	// 열 개수 (세로 줄)
				"col": 1,	// 행 개수 (가로 줄)
				"top": 0,
				"right": 0,
				"bottom": 0,
				"left": 0
			},
			"unit": {
				"element": "",
				"width": 0,
				"height": 0,
			},
			"events": {
				"init": function () {},
				"focus": function () {},
				"on": function () {},
				"off": function () {},
				"timeout": function () {}
			},
			"play": {
				"auto": false,
				"fx": _effects.normal,
				"direction": _direction.left,
				"intervalTime": 3000
			},
			"startIndex": 0
		});
		
		this.ele = {
			"$wrap": {},
			"$mask": {},
			"$group": {},
			"$unit": {}
		};
		
		this.css = {
			"mask": {
				"overflow": "hidden"
			},
			"unit": {
				"position": "absolute"
			},
			"pos_left": {
				"top": 0,
				"right": 0
			},
			"pos_right": {
				"top": 0,
				"right": 0
			},
			"pos_top": {
				"top": 0,
				"left": 0
			},
			"pos_bottom": {
				"top": 0,
				"bottom": 0
			},
			"pos_selected": {
				"top": 0,
				"left": 0
			}
		};
		
		this.totalUnit = 0; // 총 unit 개 수
		this.totalGroup = 0; // 총 group 개 수
		this.sizeOfGroup = 0; // 총 group 당 unit 개 수
		this.nowIndex = 0;
		this.timeoutId = 0;
		this.paused = true;
		this.minimumTime = 3000; // 최소 자동롤링 간격 (milliseconds)
		this.intervalTime = this.minimumTime;
		
		// 초기화
		this.init();
		
		// 엘리먼트 속성 적용
		var _this = this;
		this.ele.$wrap.mouseover( function () {
			_this.paused = true;
		}).mouseout( function () {
			_this.paused = false;
		});
		
		// autoplay
		if (this.args.play.auto) {
			this.on(this.args.play.direction, this.args.play.fx);
		}
		
		return this;
	};
	
	_ibroller.prototype = {
		"init": function () {
			this.ele.$wrap = $(this.args.wrap).addClass("ibroller");
			this.ele.$mask = $(this.args.mask).addClass("ibr_mask").css(this.css.mask);
			this.ele.$group = $(this.args.group.element).addClass("ibr_group");
			this.ele.$unit = $(this.args.unit.element).addClass("ibr_unit").css(this.css.unit);
			
			this.sizeOfGroup = this.args.group.col * this.args.group.row;
			this.totalUnit = this.ele.$unit.length;
			this.totalGroup = Math.floor(this.totalUnit / this.sizeOfGroup);
			
			this.paused = !this.args.play.auto;
			this.nowIndex = this.args.startIndex;
			this.intervalTime = (this.args.play.intervalTime > this.minimumTime) ? this.args.play.intervalTime : this.minimumTime;
			
			this.focus(this.nowIndex);
			
			// init event call
			if (typeof this.args.events.init === "function") {
				this.args.events.init.apply(null, [this.nowIndex]);
			}
		},
		'applyFx': function (fx) {
			var _this = this,
				fx = fx || this.args.play.fx,
				$prev = this.ele.$group.find(".ibr_prev"),
				$selected = this.ele.$group.find(".ibr_selected"),
				$next = this.ele.$group.find(".ibr_next");
			switch (fx) {
			case _effects.noAni:
			default:
				break;
			case _effects.normal:
				$prev.each( function (i) {
					var $this = $(this),
						w = _this.args.unit.width || $this.width();
					$(this).css({
						"left": (w + 10 * (i + 1)) * -1,
						"right": ""
					});	
				});
				$selected.each( function (i) {
					var $this = $(this),
						w = _this.args.unit.width || $this.width();
					$(this).css({
						"left": _this.args.group.left + (w * i),
						"top": _this.args.group.top,
						"right": ""
					});
				});
				$next.each( function (i) {
					var $this = $(this),
						w = _this.args.unit.width || $this.width();
					$(this).css({
						"right": (w + 10 * (i + 1)) * -1,
						"left": ""
					});
				});
				break;
			case _effects.delayed:
				break;
			case _effects.fade:
				break;
			}			
		},
		"focus": function (idx) {
			var idx = idx  === undefined ? this.nowIndex : idx,
				s = idx * this.sizeOfGroup,
				e = s + this.sizeOfGroup;
				
			this.ele.$unit.removeClass("ibr_prev ibr_selected ibr_next");
			for (var i = 0; i < this.totalUnit; i++) {
				if (i < s) {
					this.ele.$unit.eq(i).addClass("ibr_prev");
				} else if (i >= e) {
					this.ele.$unit.eq(i).addClass("ibr_next");
				} else {
					this.ele.$unit.eq(i).addClass("ibr_selected");
				}
			}
			this.applyFx();
		},
	};
	
	window.ibr = _ibroller;
	window.ibr.dir = _direction;
	window.ibr.fx = _effects;
	
}(window, jQuery));