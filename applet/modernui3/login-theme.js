/* ModernUI3 Cyber-Tech Login Theme Runtime Enhancer */
(function () {
	var version = "1.350.1";
	try {
		var cur = document.currentScript;
		if (cur && cur.src) {
			var match = cur.src.match(/[?&]v=([^&]+)/i);
			if (match && match[1]) {
				version = match[1];
			}
		}
	} catch (e) {}

	function buildCircuitBackground() {
		var wrapper = document.createElement("div");
		wrapper.className = "cyber-bg-wrapper";
		wrapper.setAttribute("aria-hidden", "true");
		wrapper.innerHTML =
			'<svg class="cyber-circuit-svg" viewBox="0 0 600 1000" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
			+ '<defs>'
			+ '<linearGradient id="traceGradL" x1="0%" y1="0%" x2="100%" y2="100%">'
			+ '<stop offset="0%" stop-color="#00E5FF" stop-opacity="0.12" />'
			+ '<stop offset="55%" stop-color="#00E5FF" stop-opacity="0.55" />'
			+ '<stop offset="100%" stop-color="#00E5FF" stop-opacity="0.85" />'
			+ '</linearGradient>'
			+ '<linearGradient id="traceGradR" x1="100%" y1="0%" x2="0%" y2="100%">'
			+ '<stop offset="0%" stop-color="#00E5FF" stop-opacity="0.12" />'
			+ '<stop offset="55%" stop-color="#00E5FF" stop-opacity="0.55" />'
			+ '<stop offset="100%" stop-color="#00E5FF" stop-opacity="0.85" />'
			+ '</linearGradient>'
			+ '<linearGradient id="traceDim" x1="0%" y1="0%" x2="0%" y2="100%">'
			+ '<stop offset="0%" stop-color="#00E5FF" stop-opacity="0.32" />'
			+ '<stop offset="50%" stop-color="#00A8E8" stop-opacity="0.16" />'
			+ '<stop offset="100%" stop-color="#00E5FF" stop-opacity="0.28" />'
			+ '</linearGradient>'
			+ '<radialGradient id="lensAura" cx="50%" cy="21%" r="36%">'
			+ '<stop offset="0%" stop-color="#00E5FF" stop-opacity="0.28" />'
			+ '<stop offset="55%" stop-color="#0077B6" stop-opacity="0.08" />'
			+ '<stop offset="100%" stop-color="#090D14" stop-opacity="0" />'
			+ '</radialGradient>'
			+ '<filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">'
			+ '<feGaussianBlur stdDeviation="2.5" result="blur" />'
			+ '<feComposite in="SourceGraphic" in2="blur" operator="over" />'
			+ '</filter>'
			+ '</defs>'
			+ '<rect width="600" height="1000" fill="url(#lensAura)" />'
			+ '<g stroke="url(#traceGradL)" stroke-width="1.8" fill="none" filter="url(#cyanGlow)">'
			+ '<path d="M 45 20 L 45 75 L 95 125 L 195 125" />'
			+ '<path d="M 75 10 L 75 60 L 120 105 L 160 105 L 210 155" />'
			+ '<path d="M 115 10 L 115 55 L 155 95 L 225 95 L 245 125" />'
			+ '<path d="M 155 15 L 195 55 L 195 78 L 260 78 L 272 110" />'
			+ '<path d="M 15 130 L 80 130 L 115 165 L 190 165" />'
			+ '<path d="M 15 155 L 65 155 L 98 188 L 185 188" />'
			+ '<path d="M 15 205 L 182 205" />'
			+ '<path d="M 15 230 L 90 230 L 115 255 L 190 255" />'
			+ '<path d="M 35 385 L 35 280 L 75 240 L 186 240" />'
			+ '<path d="M 55 415 L 55 300 L 90 265 L 196 265" />'
			+ '<path d="M 95 355 L 95 290 L 115 275 L 208 275" />'
			+ '<path d="M 135 340 L 135 300 L 222 300" />'
			+ '</g>'
			+ '<g fill="#00E5FF" filter="url(#cyanGlow)">'
			+ '<circle cx="45" cy="20" r="3" />'
			+ '<circle cx="195" cy="125" r="3.5" />'
			+ '<circle cx="210" cy="155" r="3.5" />'
			+ '<circle cx="190" cy="165" r="3.5" />'
			+ '<circle cx="185" cy="188" r="3.5" />'
			+ '<circle cx="182" cy="205" r="3.5" />'
			+ '<circle cx="186" cy="240" r="3.5" />'
			+ '<circle cx="190" cy="255" r="3.5" />'
			+ '<circle cx="196" cy="265" r="3.5" />'
			+ '<circle cx="208" cy="275" r="3.5" />'
			+ '<circle cx="95" cy="355" r="3.5" />'
			+ '<circle cx="135" cy="340" r="3.5" />'
			+ '</g>'
			+ '<g stroke="url(#traceGradR)" stroke-width="1.8" fill="none" filter="url(#cyanGlow)">'
			+ '<path d="M 555 20 L 555 75 L 505 125 L 405 125" />'
			+ '<path d="M 525 10 L 525 60 L 480 105 L 440 105 L 390 155" />'
			+ '<path d="M 485 10 L 485 55 L 445 95 L 375 95 L 355 125" />'
			+ '<path d="M 445 15 L 405 55 L 405 78 L 340 78 L 328 110" />'
			+ '<path d="M 585 130 L 520 130 L 485 165 L 410 165" />'
			+ '<path d="M 585 155 L 535 155 L 502 188 L 415 188" />'
			+ '<path d="M 585 205 L 418 205" />'
			+ '<path d="M 585 230 L 510 230 L 485 255 L 410 255" />'
			+ '<path d="M 565 385 L 565 280 L 525 240 L 414 240" />'
			+ '<path d="M 545 415 L 545 300 L 510 265 L 404 265" />'
			+ '<path d="M 505 355 L 505 290 L 485 275 L 392 275" />'
			+ '<path d="M 465 340 L 465 300 L 378 300" />'
			+ '</g>'
			+ '<g fill="#00E5FF" filter="url(#cyanGlow)">'
			+ '<circle cx="555" cy="20" r="3" />'
			+ '<circle cx="405" cy="125" r="3.5" />'
			+ '<circle cx="390" cy="155" r="3.5" />'
			+ '<circle cx="410" cy="165" r="3.5" />'
			+ '<circle cx="415" cy="188" r="3.5" />'
			+ '<circle cx="418" cy="205" r="3.5" />'
			+ '<circle cx="414" cy="240" r="3.5" />'
			+ '<circle cx="410" cy="255" r="3.5" />'
			+ '<circle cx="404" cy="265" r="3.5" />'
			+ '<circle cx="392" cy="275" r="3.5" />'
			+ '<circle cx="505" cy="355" r="3.5" />'
			+ '<circle cx="465" cy="340" r="3.5" />'
			+ '</g>'
			+ '<g stroke="url(#traceDim)" stroke-width="1.5" fill="none">'
			+ '<path d="M 22 250 L 22 610 L 52 640 L 52 840 L 25 870" />'
			+ '<path d="M 38 400 L 38 595 L 68 625 L 68 825 L 45 850" />'
			+ '<path d="M 88 640 L 88 790 L 65 815" />'
			+ '<path d="M 578 250 L 578 610 L 548 640 L 548 840 L 575 870" />'
			+ '<path d="M 562 400 L 562 595 L 532 625 L 532 825 L 555 850" />'
			+ '<path d="M 512 640 L 512 790 L 535 815" />'
			+ '</g>'
			+ '<g fill="#00E5FF" opacity="0.45">'
			+ '<circle cx="68" cy="725" r="3" />'
			+ '<circle cx="88" cy="745" r="3" />'
			+ '<circle cx="532" cy="725" r="3" />'
			+ '<circle cx="512" cy="745" r="3" />'
			+ '</g>'
			+ '</svg>';
		return wrapper;
	}

	function buildLensHeader() {
		var container = document.createElement("div");
		container.className = "cyber-lens-container";
		container.appendChild(buildCircuitBackground());

		var ring = document.createElement("div");
		ring.className = "cyber-lens-ring";
		var img = document.createElement("img");
		img.className = "cyber-lens-img";
		img.alt = "Blue Iris Lens";
		img.src = "applet/modernui3/login_lens.webp?v=" + encodeURIComponent(version);
		ring.appendChild(img);
		container.appendChild(ring);
		return container;
	}

	function createFieldIcon(pathData) {
		var icon = document.createElement("div");
		icon.className = "cyber-field-icon";
		icon.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + pathData + '"/></svg>';
		return icon;
	}

	function createFieldLabel(text) {
		var label = document.createElement("div");
		label.className = "cyber-field-label";
		label.textContent = text;
		return label;
	}

	function buildTelemetryFooter() {
		var footer = document.createElement("div");
		footer.className = "cyber-telemetry-footer";
		footer.setAttribute("aria-hidden", "true");
		footer.innerHTML =
			'<div class="cyber-telemetry-charts">'
			+ '<div class="cyber-chart-box"><svg viewBox="0 0 120 42" preserveAspectRatio="none">'
			+ '<defs><linearGradient id="chartFill1" x1="0" y1="0" x2="0" y2="1">'
			+ '<stop offset="0%" stop-color="#00E5FF" stop-opacity="0.32"/><stop offset="100%" stop-color="#00E5FF" stop-opacity="0.02"/>'
			+ '</linearGradient></defs>'
			+ '<line x1="0" y1="10" x2="120" y2="10" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<line x1="0" y1="20" x2="120" y2="20" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<line x1="0" y1="30" x2="120" y2="30" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<polygon points="0,40 0,34 18,22 36,28 54,15 72,24 92,11 108,18 120,6 120,40" fill="url(#chartFill1)"/>'
			+ '<polyline points="0,34 18,22 36,28 54,15 72,24 92,11 108,18 120,6" fill="none" stroke="#00E5FF" stroke-width="1.2" opacity="0.7"/>'
			+ '</svg></div>'
			+ '<div class="cyber-chart-box"><svg viewBox="0 0 120 42" preserveAspectRatio="none">'
			+ '<line x1="0" y1="10" x2="120" y2="10" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<line x1="0" y1="20" x2="120" y2="20" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<line x1="0" y1="30" x2="120" y2="30" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<polygon points="0,40 0,36 16,14 34,29 52,18 70,12 88,31 104,19 120,25 120,40" fill="url(#chartFill1)"/>'
			+ '<polyline points="0,36 16,14 34,29 52,18 70,12 88,31 104,19 120,25" fill="none" stroke="#00E5FF" stroke-width="1.2" opacity="0.7"/>'
			+ '</svg></div>'
			+ '<div class="cyber-chart-box"><svg viewBox="0 0 120 42" preserveAspectRatio="none">'
			+ '<line x1="0" y1="10" x2="120" y2="10" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<line x1="0" y1="20" x2="120" y2="20" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<line x1="0" y1="30" x2="120" y2="30" stroke="rgba(0,229,255,0.08)" stroke-width="0.6"/>'
			+ '<polygon points="0,40 0,35 20,32 38,24 58,26 76,16 96,19 110,9 120,12 120,40" fill="url(#chartFill1)"/>'
			+ '<polyline points="0,35 20,32 38,24 58,26 76,16 96,19 110,9 120,12" fill="none" stroke="#00E5FF" stroke-width="1.2" opacity="0.7"/>'
			+ '</svg></div>'
			+ '</div>'
			+ '<div class="cyber-telemetry-meta">'
			+ '<span>DATA TELEMETRY</span>'
			+ '<span class="cyber-telemetry-bars"><i></i><i></i><i></i></span>'
			+ '<span>SECURED // UI3</span>'
			+ '</div>';
		return footer;
	}

	function enhanceLoginDom() {
		var loginBox = document.getElementById("login");
		if (!loginBox || loginBox.getAttribute("data-modernui3-themed") === "1") {
			return;
		}
		loginBox.setAttribute("data-modernui3-themed", "1");

		if (!loginBox.querySelector(".cyber-lens-container")) {
			loginBox.insertBefore(buildLensHeader(), loginBox.firstChild);
		}

		var txtUn = document.getElementById("txtUn");
		if (txtUn && !(txtUn.closest && txtUn.closest(".cyber-field-card"))) {
			var userCard = document.createElement("div");
			userCard.className = "cyber-field-card";
			userCard.appendChild(createFieldIcon("M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2.5c-3.33 0-10 1.67-10 5V22h20v-2.5c0-3.33-6.67-5-10-5z"));

			var userBody = document.createElement("div");
			userBody.className = "cyber-field-body";
			userBody.appendChild(createFieldLabel("USER ID"));

			txtUn.parentNode.insertBefore(userCard, txtUn);
			txtUn.placeholder = "Enter your ID";
			userBody.appendChild(txtUn);
			userCard.appendChild(userBody);
		}

		var txtPw = document.getElementById("txtPw");
		if (txtPw) {
			var pwWrap = txtPw.closest ? txtPw.closest(".pwFieldWrap") : null;
			if (!pwWrap && txtPw.parentNode && txtPw.parentNode.classList && txtPw.parentNode.classList.contains("pwFieldWrap")) {
				pwWrap = txtPw.parentNode;
			}
			if (pwWrap && !pwWrap.querySelector(".cyber-field-body")) {
				pwWrap.classList.add("cyber-field-card");
				var toggleBtn = pwWrap.querySelector(".pwToggleBtn");
				var pwBody = document.createElement("div");
				pwBody.className = "cyber-field-body";
				pwBody.appendChild(createFieldLabel("PASSWORD"));

				var pwRow = document.createElement("div");
				pwRow.className = "cyber-pw-row";
				txtPw.placeholder = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
				pwRow.appendChild(txtPw);
				if (toggleBtn) {
					pwRow.appendChild(toggleBtn);
				}
				pwBody.appendChild(pwRow);

				while (pwWrap.firstChild) {
					pwWrap.removeChild(pwWrap.firstChild);
				}
				pwWrap.appendChild(createFieldIcon("M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"));
				pwWrap.appendChild(pwBody);
			}
		}

		var btnLogin = document.getElementById("btnLogin");
		if (btnLogin && !(btnLogin.parentNode && btnLogin.parentNode.classList && btnLogin.parentNode.classList.contains("cyber-auth-btn-bezel"))) {
			var bezel = document.createElement("div");
			bezel.className = "cyber-auth-btn-bezel";
			btnLogin.parentNode.insertBefore(bezel, btnLogin);
			bezel.appendChild(btnLogin);
			if (/^\s*log\s*in\s*$/i.test(btnLogin.value || "")) {
				btnLogin.value = "AUTHENTICATE";
			}
		}

		if (!loginBox.querySelector(".cyber-telemetry-footer")) {
			loginBox.appendChild(buildTelemetryFooter());
		}
	}

	function setLoginButtonState(disabled, label) {
		var btn = document.getElementById("btnLogin");
		if (!btn) {
			return;
		}
		btn.disabled = !!disabled;
		if (label) {
			btn.value = label;
		}
	}

	function escapeHtml(text) {
		return String(text)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function hookLoginHandlers() {
		window.resized = function () {
			var loginBox = document.getElementById("login");
			if (loginBox) {
				loginBox.style.position = "";
				loginBox.style.left = "";
				loginBox.style.top = "";
			}
			var lbl = document.getElementById("lblLoginAutomatically");
			if (lbl && lbl.parentNode) {
				lbl.parentNode.style.paddingLeft = "";
			}
			var statusEl = document.getElementById("status");
			var lowerEl = document.getElementById("status_wrapper_lower");
			if (statusEl) {
				statusEl.style.maxWidth = "100%";
				if (lowerEl && statusEl.parentNode !== lowerEl) {
					lowerEl.appendChild(statusEl);
				}
			}
		};

		if (typeof window.login === "function" && !window.login.__modernui3Wrapped) {
			var origLogin = window.login;
			var wrappedLogin = function () {
				var btn = document.getElementById("btnLogin");
				if (btn && btn.disabled) {
					return;
				}
				setLoginButtonState(true, "AUTHENTICATING...");
				try {
					return origLogin.apply(this, arguments);
				} finally {
					var btnAfter = document.getElementById("btnLogin");
					if (btnAfter && /logging\s*in/i.test(btnAfter.value || "")) {
						btnAfter.value = "AUTHENTICATING...";
					}
				}
			};
			wrappedLogin.__modernui3Wrapped = true;
			window.login = wrappedLogin;
		}

		if (typeof window.loginFail === "function" && !window.loginFail.__modernui3Wrapped) {
			var origLoginFail = window.loginFail;
			var wrappedLoginFail = function () {
				try {
					return origLoginFail.apply(this, arguments);
				} finally {
					setLoginButtonState(false, "AUTHENTICATE");
				}
			};
			wrappedLoginFail.__modernui3Wrapped = true;
			window.loginFail = wrappedLoginFail;
		}

		if (typeof window.HandleError === "function" && !window.HandleError.__modernui3Wrapped) {
			var origHandleError = window.HandleError;
			var wrappedHandleError = function (error) {
				var safeError = (typeof error === "string") ? escapeHtml(error) : error;
				try {
					return origHandleError.call(this, safeError);
				} finally {
					setLoginButtonState(false, "AUTHENTICATE");
				}
			};
			wrappedHandleError.__modernui3Wrapped = true;
			window.HandleError = wrappedHandleError;
		}

		if (typeof window.cancelAutoLogin === "function" && !window.cancelAutoLogin.__modernui3Wrapped) {
			var origCancel = window.cancelAutoLogin;
			var wrappedCancel = function () {
				try {
					return origCancel.apply(this, arguments);
				} finally {
					var btn = document.getElementById("btnLogin");
					if (btn) {
						if (/redirecting/i.test(btn.value || "")) {
							btn.value = "REDIRECTING...";
						} else if (/^\s*log\s*in\s*$/i.test(btn.value || "")) {
							btn.value = "AUTHENTICATE";
						}
					}
				}
			};
			wrappedCancel.__modernui3Wrapped = true;
			window.cancelAutoLogin = wrappedCancel;
		}

		if (typeof window.LeaveLoginPage === "function" && !window.LeaveLoginPage.__modernui3Wrapped) {
			var origLeave = window.LeaveLoginPage;
			var wrappedLeave = function () {
				setLoginButtonState(true, "REDIRECTING...");
				return origLeave.apply(this, arguments);
			};
			wrappedLeave.__modernui3Wrapped = true;
			window.LeaveLoginPage = wrappedLeave;
		}
	}

	enhanceLoginDom();
	hookLoginHandlers();
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", function () {
			enhanceLoginDom();
			hookLoginHandlers();
		});
	}
})();
