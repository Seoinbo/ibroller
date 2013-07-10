//
// # ibRoller2
// since: 2013.07.06
//
;(function (window, $, undefined) {
	
	_direction = {
		"left": "right-to-left",
		"right": "left-to-right",
		"up": "down-to-up",
		"down": "up-to-down"
	};
	
	_moveto = {
		"left": "ibr_move_left",
		"right": "ibr_move_right",
		"up": "ibr_move_up",
		"down": "ibr_move_down"
	};
	
	_state = {
		"ready": "ibr_ready",
		"active": "ibr_active",
		"idle": "ibr_idle"
	}
	
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
		if (typeof args.play === "boolean") {
			args.play = {
				"auto": args.play
			}
		}
		this.args = _mergeProp(args, {
			"wrap": "",
			"mask": "",
			"group": "",
			"unit": "",
			"events": {
				"init": function () {},
				"focus": function () {},
				"on": function () {},
				"off": function () {},
				"timeout": function () {}
			},
			"play": {
				"auto": false,
				"direction": _direction.left,
				"moveto": _moveto.left,
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
		this.maxIndex = 0;
		this.activeIndex = 0;
		this.paused = true;
		this.intervalId = 0;
		this.intervalTime = this.minimumTime;
		this.minimumTime = 3000; // 최소 자동롤링 간격 (milliseconds)
		
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
			this.ele.$mask = $(this.args.mask).addClass("ibr_mask");
			this.ele.$group = $(this.args.group).addClass("ibr_group").addClass(this.args.play.moveto);
			this.ele.$unit = $(this.args.unit).addClass("ibr_unit");
			this.totalUnit = this.ele.$unit.length;
			
			this.paused = !this.args.play.auto;
			this.maxIndex = Math.ceil(this.totalUnit / this.args.play.movingCnt) - 1; 
			this.activeIndex = this.args.startIndex;
			this.currentDir = this.args.play.direction;
			this.currentMoveto = this.args.play.moveto;
			this.intervalTime = (this.args.play.intervalTime > this.minimumTime) ? this.args.play.intervalTime : this.minimumTime;
			
			// css init 적용

			// css init를 설정하지 않으면 focus()를 대신 실행
			
			
			// attribues
			this.ele.$wrap.attr({
				"active-index": this.activeIndex,
				"direction": this.currentDir
			});
			
			this.focus(this.activeIndex);
			
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
				this.args.events.init.apply(null, [this.activeIndex]);
			}
		},
		"next": function (dir) {
			var dir = dir || this.args.play.direction;
			this.focus(++this.activeIndex, _direction.left);
		},
		"prev": function (dir) {
			var dir = dir || this.args.play.direction;
			this.focus(--this.activeIndex, dir);
		},
		"focus": function (idx, dir) {
			var _this = this,
				dir = dir || this.args.play.direction,
				idx = idx || this.activeIndex,
				prevIndex = this.ele.$wrap.attr("active-index");
			
			if (idx < 0) {
				this.activeIndex = this.maxIndex;
			} else if (idx > this.maxIndex) {
				this.activeIndex = 0;
			}
			
			this._setState(_state.ready, this.activeIndex, function (nowIndex) {
				_this._setState(_state.active, nowIndex);
				_this._setState(_state.idle, prevIndex);
			});
		},
		"direction": function (dir) {
			if (dir === undefined) {
				return this.currentDir;
			}
			this.ele.$group.removeClass(_moveto.left + " " + _moveto.right + " " + _moveto.up + " " + _moveto.down).addClass(dir);
			this.currentDir = dir;
		},
		"moveTo": function (dir) {
			if (dir === undefined) {
				return this.currentDir;
			}
			this.ele.$group.removeClass(_moveto.left + " " + _moveto.right + " " + _moveto.up + " " + _moveto.down).addClass(dir);
			this.currentDir = dir;
		},
		"_setState": function (state, idx, end) {
			var _this = this,
				state = state || _state.ready,
				idx = idx || this.activeIndex,
				end = end || function () {},
				cls = "",
				cnt = 0,
				timeout = 0,
				maxtime = 0,
				$item = {};
				
			// set active index
			if (state == _state.active) {
				this.ele.$wrap.attr("active-index", idx);
			}

			for (var i = idx * this.args.play.movingCnt; i < this.totalUnit; i++) {
				$item = this.ele.$unit.eq(i);
				
				switch (state) {
				case _state.ready:
					cls = "ibr_ready ibr_r" + cnt;
					break;
				case _state.active:
					cls = "ibr_active ibr_a" + cnt;
					break;
				case _state.idle:
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
		}
	};
	
	window.ibr = _ibroller;
	window.ibr.dir = _direction;
	window.ibr.move = _moveto;
	
}(window, jQuery));