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
				"left": 0
			},
			"unit": {
				"element": "",
				"width": 0,
				"height": 0
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
				"intervalTime": 3000,
				"movingCnt": 1
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
			"pos_current": {
				"top": 0,
				"left": 0
			}
		};
		
		
		this.totalUnit = 0; // 총 unit 개 수
		this.totalGroup = 0; // 총 group 개 수
		this.sizeOfGroup = 0; // 총 group 당 unit 개 수
		this.maxWidth = 0;
		this.maxHeight = 0;
		this.maxIndex = 0;
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
			
			this.maxWidth = this._maxWidth();
			this.maxHeight = this._maxHeight();
			
			this.paused = !this.args.play.auto;
			this.maxIndex = Math.ceil(this.totalUnit / this.args.play.movingCnt) - 1; 
			this.nowIndex = this.args.startIndex;
			this.intervalTime = (this.args.play.intervalTime > this.minimumTime) ? this.args.play.intervalTime : this.minimumTime;
			this.focus(this.nowIndex);
			
			// init event call
			if (typeof this.args.events.init === "function") {
				this.args.events.init.apply(null, [this.nowIndex]);
			}
		},
		"next": function (dir) {
			var dir = dir || this.args.play.direction;
		
			if (this.nowIndex >= this.maxIndex) {
				this.nowIndex = 0;
			} else {
				this.nowIndex++;
			}
			this.focus(this.nowIndex, dir);
		},
		"prev": function (dir) {
			var dir = dir || this.args.play.direction;
			
			if (this.nowIndex <= 0) {
				this.nowIndex = this.maxIndex;
			} else {
				this.nowIndex--;
			}
			this.focus(this.nowIndex, dir);
		},
		"focus": function (idx, dir) {
			if (idx !== undefined) this.nowIndex = idx;
			for (var i = this.nowIndex * this.args.play.movingCnt, cnt = 0; i < this.totalUnit; i++) {
				this.ele.$unit.eq(i).addClass("ibr_ready");
				if (++cnt >= this.args.play.movingCnt) break;
			}
			this._applyFx();
		},
		"_applyFx": function (fx, dir) {
			var _this = this,
				fx = fx || this.args.play.fx,
				dir = dir || this.args.play.direction,
				$active = this.ele.$group.find(".ibr_active"),
				$ready = this.ele.$group.find(".ibr_ready"),
				$idle = this.ele.$group.find(".ibr_idle");
			
			if ($ready.length < 1) {
				return;
			}
			
			// "ready" -> "active" -> "idle"
			var ready = {},
				active = {},
				idle = {};
			
			switch (fx) {
			case _effects.noAni:
				this.ele.$unit.removeClass("ibr_fx*");
			default:
				break;
			case _effects.normal:
				this.ele.$unit.removeClass("ibr_fx*").addClass("ibr_fx_normal");
				
				var margin = 10;
								
				switch (dir) {
				case _direction.left:
					ready = {
						"top": _this.args.group.top,
						"left": "",
						"right": margin
					};
					active = {
						"top": _this.args.group.top
						"left": margin,
						"right": ""
					};
					idle = {
						"top": _this.args.group.top
						"left": margin,
						"right": ""
					};
					break;
				}

				$active.each( function (i) {
					//var w = _this.args.unit.width || $this.outerWidth(true);
					$(this).css(idle).removeClass("ibr_active").addClass("ibr_idle");
				});
				
				$ready.each( function (i) {
					$(this).css(active).removeClass("ibr_ready").addClass("ibr_active");;
				});
				
				$idle.removeClass("ibr_idle");
				
				break;
			case _effects.delayed:
				break;
			case _effects.fade:
				break;
			}			
		},
		// 가장 넓은 unit의 width를 반환
		"_maxWidth": function () {
			if (this.args.unit.width) {
				return this.ele.$unit.width;
			} else {
				this.ele.$unit.each( function (i) {
					var w = $(this).outerWidth(true);
					if (w > this.maxWidth) {
						this.maxWidth = w;
					} 
				});
				return this.maxWidth;
			}
		},
		"_maxHeight": function () {
			if (this.args.unit.height) {
				return this.ele.$unit.height;
			} else {
				this.ele.$unit.each( function (i) {
					var h = $(this).outerHeight(true);
					if (h > this.maxHeight) {
						this.maxHeight = h;
					} 
				});
				return this.maxHeight;
			}
		}
	};
	
	window.ibr = _ibroller;
	window.ibr.dir = _direction;
	window.ibr.fx = _effects;
	
}(window, jQuery));