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
	
	_classdir = {
		"1": "ibr_dir_left",
		"-1": "ibr_dir_right",
		"2": "ibr_dir_up",
		"-2": "ibr_dir_down"
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
			this.ele.$wrap = $(this.args.wrap).addClass("ibroller").addClass(_classdir[this.args.play.direction]);
			this.ele.$mask = $(this.args.mask).addClass("ibr_mask");
			this.ele.$group = $(this.args.group.element).addClass("ibr_group");
			this.ele.$unit = $(this.args.unit.element).addClass("ibr_unit");
			
			this.sizeOfGroup = this.args.group.col * this.args.group.row;
			this.totalUnit = this.ele.$unit.length;
			this.totalGroup = Math.floor(this.totalUnit / this.sizeOfGroup);
			
			this.maxWidth = this._maxWidth();
			this.maxHeight = this._maxHeight();
			
			this.paused = !this.args.play.auto;
			this.maxIndex = Math.ceil(this.totalUnit / this.args.play.movingCnt) - 1; 
			this.nowIndex = this.args.startIndex;
			this.intervalTime = (this.args.play.intervalTime > this.minimumTime) ? this.args.play.intervalTime : this.minimumTime;
			
			// css init 적용

			// css init를 설정하지 않으면 focus()를 대신 실행
			
			
			this.focus(this.nowIndex);
			
			// css3 prefix
			var b = $.browser;
			if (b.webkit || b.safari) {
				this.prefix = "-webkit-";
			} else if (b.msie) {
				this.prefix = "-ms-";
			} else if (b.mozilla) {
				this.prefix = "-moz-";
			} else if (b.opera) {
				this.prefix = "-o-";
			} else;
			
			
			
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
			var _this = this;
			if (idx !== undefined) this.nowIndex = idx;
			
			if (this.nowIndex < 0) {
				this.nowIndex = this.maxIndex;
			} else if (this.nowIndex > this.maxIndex) {
				this.nowIndex = 0;
			}
			
			
			this._setState("ready", this.nowIndex, function (idx) {
				_this._setState("active", idx, function (i) {
					_this._setState("idle", i, function () {
						
					});
					_this.focus(idx + 1);
				});
			});
		},
		"_setState": function (state, idx, end) {
			var _this = this,
				state = state || "ready",
				idx = idx || this.nowIndex,
				end = end || function () {},
				cls = "",
				cnt = 0,
				timeout = 0,
				maxtime = 0,
				$item = {};

			for (var i = idx * this.args.play.movingCnt; i < this.totalUnit; i++) {
				$item = this.ele.$unit.eq(i);
				
				switch (state) {
				case "ready":
					cls = "ibr_ready ibr_r" + cnt;
					break;
				case "active":
					cls = "ibr_active ibr_a" + cnt;
					break;
				case "idle":
					cls = "ibr_idle ibr_i" + cnt;
					break;
				}
				
				$item.removeClass("ibr_ready ibr_active ibr_idle ibr_r" + cnt + " ibr_a" + cnt + " ibr_i" + cnt).addClass(cls);
				
				maxtime = parseFloat($item.css("transition-duration")) + parseFloat($item.css("transition-delay"));
				if (maxtime > timeout) {
					timeout = maxtime;
				}
				
				if (++cnt >= this.args.play.movingCnt) break;
			}
			
			window.setTimeout(function () {
				end.apply(null, [idx]);
			}, timeout * 1000);
			
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